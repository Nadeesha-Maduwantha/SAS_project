import requests
import os
import re
from dotenv import load_dotenv

load_dotenv()

CARGOWISE_API_URL = os.getenv('CARGOWISE_API_URL')
CARGOWISE_USERNAME = os.getenv('CARGOWISE_USERNAME')
CARGOWISE_PASSWORD = os.getenv('CARGOWISE_PASSWORD')

# Fallback map: which CargoWise API fields belong to which milestone.
# The live source of truth is the milestone_field_map table (registry) in
# Supabase — admins/builder add rows there, no code change needed.
# This fallback only keeps the sync alive if that table is unreachable.
# canonical_field: the name the milestone definition reads. Differs from
# api_field only for admin-resolved mismatches (aliases).
DEFAULT_FIELD_MAP = {
    'cargo_ready':  [{'api_field': 'cargo_ready_date',   'canonical_field': 'cargo_ready_date'}],
    'cargo_pickup': [{'api_field': 'cargo_pickup_date',  'canonical_field': 'cargo_pickup_date'},
                     {'api_field': 'pickup_date_status', 'canonical_field': 'pickup_date_status'}],
}

def load_field_map():
    """Read the milestone field registry:
    milestone_key -> [{'api_field': ..., 'canonical_field': ...}, ...].
    Loaded once per sync run."""
    try:
        from services.supabase_client import supabase
        rows = (
            supabase.table('milestone_field_map')
            .select('milestone_key, api_field, canonical_field')
            .eq('is_active', True)
            .execute()
        ).data or []
        field_map = {}
        for r in rows:
            field_map.setdefault(r['milestone_key'], []).append({
                'api_field': r['api_field'],
                'canonical_field': r.get('canonical_field') or r['api_field'],
            })
        return field_map or DEFAULT_FIELD_MAP
    except Exception as e:
        print(f'milestone_field_map load failed, using default map: {e}')
        return DEFAULT_FIELD_MAP

# Date formats the CargoWise API sends (e.g. "8/15/2025 3:21:00 PM", "9/2/2025").
# The legacy timestamptz columns auto-normalized these on insert; the jsonb
# column does not, so we normalize to ISO here to keep one consistent format.
_API_DATE_FORMATS = (
    '%m/%d/%Y %I:%M:%S %p',
    '%m/%d/%Y %H:%M:%S',
    '%m/%d/%Y',
    '%Y-%m-%dT%H:%M:%S',
    '%Y-%m-%d %H:%M:%S',
    '%Y-%m-%d',
)

def _normalize_date(value):
    """Convert a date-looking string to ISO format; leave everything else
    (statuses like 'Delayed', None, numbers) untouched."""
    if not isinstance(value, str):
        return value
    from datetime import datetime
    v = value.strip()
    for fmt in _API_DATE_FORMATS:
        try:
            return datetime.strptime(v, fmt).isoformat()
        except ValueError:
            continue
    return value

def notify_sync_outcome(status, updated, error_list, duration):
    """Email administrators about a synchronisation run, according to the alert
    preferences held on sync_settings.

    Two independent conditions, each with its own preference:
      alert_on_failure     — the run itself failed
      alert_on_validation  — validation issues reached min_errors_threshold

    Defined here rather than in the route so that both the manual and the
    scheduled sync use identical logic. Returns a short summary for logging;
    never raises, since a notification problem must not fail a sync."""
    result = {'sent': 0, 'reason': None}
    try:
        from services.supabase_service import get_sync_settings

        settings = get_sync_settings() or {}
        recipients = [
            e.strip() for e in re.split(r'[,;\s]+', settings.get('admin_emails') or '')
            if e.strip()
        ]
        if not recipients:
            result['reason'] = 'no admin_emails configured'
            return result

        failed = status == 'failed'
        threshold = settings.get('min_errors_threshold') or 1
        many_errors = len(error_list) >= threshold

        subject = body = None
        if failed and settings.get('alert_on_failure', True):
            subject = '[SAS] CargoWise synchronisation failed'
            body = (
                f'A CargoWise synchronisation run failed.\n\n'
                f'Records updated: {updated}\n'
                f'Validation issues: {len(error_list)}\n'
                f'Duration: {duration}s\n\n'
                f'Review the run on the Sync Management page.'
            )
        elif many_errors and settings.get('alert_on_validation', True):
            fields = sorted({e['field_name'] for e in error_list})
            subject = f'[SAS] {len(error_list)} validation issues in CargoWise synchronisation'
            body = (
                f'A CargoWise synchronisation run completed with validation issues.\n\n'
                f'Status: {status}\n'
                f'Records updated: {updated}\n'
                f'Validation issues: {len(error_list)} (threshold {threshold})\n'
                f'Fields affected: {", ".join(fields)}\n\n'
                f'Review the issues on the Sync Management page.'
            )

        if not subject:
            result['reason'] = 'no condition met or alerts disabled'
            return result

        from services.email_service import send_email
        for to in recipients:
            try:
                send_email(to, subject, body)
                result['sent'] += 1
            except Exception as e:
                print(f'sync notification to {to} failed: {e}')

    except Exception as e:
        result['reason'] = str(e)
        print(f'sync notification failed (non-fatal): {e}')

    return result


# API fields the sync maps directly to shipments columns. Together with the
# fields declared in milestone_field_map these account for everything we
# currently understand; anything else the API sends is unclaimed.
# NOTE: keep this in step with the shipment dict in routes/sync.py and app.py —
# a field added there but not here would be reported as unknown for ever.
MAPPED_API_FIELDS = {
    'branch', 'cargo_pickup_date', 'consignee', 'gb_code', 'gc_code',
    'gen_custom_last_edit_time', 'house_bill_number', 'job_docs_last_edit_time',
    'job_number', 'job_shipment_last_edit_time', 'js_pk', 'llm_cargo_pickup_date',
    'llm_identified_type', 'llm_note', 'note_last_edit_time', 'note_number',
    'oh_full_name', 'running_date_time', 'st_description', 'st_note_text',
    'transport_mode',
}

def find_unknown_fields(item, field_map):
    """Fields present in an API record that are neither mapped to a column nor
    registered against a milestone — i.e. data arriving that nobody has claimed.

    The value is kept in shipments.raw_json regardless, so nothing is lost;
    this only surfaces the field so an administrator can decide what it is."""
    registered = {f['api_field'] for fields in field_map.values() for f in fields}
    return set(item.keys()) - MAPPED_API_FIELDS - registered


def build_milestones(item, field_map):
    """Build the shipments.milestones jsonb value from one API record.
    Values are read from the API under api_field but written under
    canonical_field — the name the milestone definition reads — so
    admin-resolved field-name mismatches (aliases) actually resolve."""
    return {
        key: {
            f['canonical_field']: _normalize_date(item.get(f['api_field']))
            for f in fields
        }
        for key, fields in field_map.items()
    }

def get_access_token():
    try:
        response = requests.post(
            f'{CARGOWISE_API_URL}/auth/login',
            data={
                'username': CARGOWISE_USERNAME,
                'password': CARGOWISE_PASSWORD,
                'grant_type': 'password'
            },
            timeout=30
        )
        response.raise_for_status()
        return response.json().get('access_token')
    except Exception as e:
        print(f'Login error: {e}')
        return None

# to use token to fetch data from api
def fetch_shipments_from_api():
    try:
        token = get_access_token()
        if not token:
            return []

        response = requests.get(
            f'{CARGOWISE_API_URL}/cargo-pickup-date',
            headers={'Authorization': f'Bearer {token}'},
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'CargoWise API error: {e}')
        return []