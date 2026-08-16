import requests
import os
from dotenv import load_dotenv

load_dotenv()

CARGOWISE_API_URL = os.getenv('CARGOWISE_API_URL')
CARGOWISE_USERNAME = os.getenv('CARGOWISE_USERNAME')
CARGOWISE_PASSWORD = os.getenv('CARGOWISE_PASSWORD')

# Fallback map: which CargoWise API fields belong to which milestone.
# The live source of truth is the milestone_field_map table (registry) in
# Supabase — admins/builder add rows there, no code change needed.
# This fallback only keeps the sync alive if that table is unreachable.
DEFAULT_FIELD_MAP = {
    'cargo_ready':  ['cargo_ready_date'],
    'cargo_pickup': ['cargo_pickup_date', 'pickup_date_status'],
}

def load_field_map():
    """Read the milestone field registry: milestone_key -> [api_field, ...].
    Loaded once per sync run."""
    try:
        from services.supabase_client import supabase
        rows = (
            supabase.table('milestone_field_map')
            .select('milestone_key, api_field')
            .eq('is_active', True)
            .execute()
        ).data or []
        field_map = {}
        for r in rows:
            field_map.setdefault(r['milestone_key'], []).append(r['api_field'])
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

def build_milestones(item, field_map):
    """Build the shipments.milestones jsonb value from one API record.
    Sub-keys are the real API field names, so milestone definitions
    (primary_field / field_a / field_b) resolve against them directly."""
    return {
        key: {f: _normalize_date(item.get(f)) for f in fields}
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