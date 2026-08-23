"""
field_registry.py — SAS milestone field registry helpers.

This is the bridge between the milestone builder (Ronaka) and the CargoWise
sync + `milestones` jsonb column (Isiri's migration package, 2026-07-22).

It provides:
  • slugify()                     — stable milestone_key from a milestone name
  • normalize()                   — key used for case/separator-insensitive matching
  • resolve_field_value()         — read a field for a milestone: json group first,
                                    normalized alias next, plain shipment column last
  • register_milestone_fields()   — Door 2: upsert a milestone's fields into the registry
  • deactivate_milestone_fields() — on delete/deactivate
  • sync_registered_fields()      — on edit: upsert current, deactivate removed
  • suggest_field()               — fuzzy "did you mean" against real API fields
  • detect_field_mismatches()     — data-quality: registered field not in the API but a
                                    similar field exists → one issue per (milestone, field)
  • notify_admins()               — email the designated admin(s) about mismatches

Nothing here writes to `shipments.milestones` — only the CargoWise sync does that.
"""

import re
import uuid
from difflib import SequenceMatcher, get_close_matches

from services.supabase_client import supabase

# Builder columns that hold a *field name* (not a value). fixed_value / threshold
# are literal values, so they are intentionally excluded.
FIELD_COLUMNS = ('primary_field', 'expected_date_field', 'field_a', 'field_b', 'tracking_field')

# Similarity above this ⇒ we treat it as a likely naming mismatch worth alerting.
_SUGGEST_THRESHOLD = 0.6


# ── Key + name helpers ────────────────────────────────────────────────────────
def slugify(name: str) -> str:
    """'Cargo Pickup Confirmation' -> 'cargo_pickup_confirmation'."""
    s = re.sub(r'[^a-z0-9]+', '_', (name or '').strip().lower()).strip('_')
    return s or 'milestone'


def make_milestone_key(name: str) -> str:
    """Stable, collision-safe key. Generated once at create; never changed on rename."""
    return f"{slugify(name)}_{uuid.uuid4().hex[:6]}"


def normalize(field: str) -> str:
    """
    Canonical form for alias matching: lowercase, strip separators, and drop a
    trailing date/time token. Makes 'First-Transit', 'first_transit',
    'firsttransit' and 'first_transit_date' all compare equal.
    """
    if not field:
        return ''
    s = re.sub(r'[^a-z0-9]+', '', str(field).lower())
    for suffix in ('datetime', 'date', 'time', 'dt'):
        if s.endswith(suffix) and len(s) > len(suffix):
            s = s[: -len(suffix)]
            break
    return s


# ── Field value resolution (used by the future alert engine) ──────────────────
def resolve_field_value(shipment: dict, milestone_key: str, api_field: str):
    """
    Read one field's value for a milestone:
      1. exact sub-key inside the milestone's json group
      2. normalized/alias match inside that json group
      3. plain shipment column (for normal fields like consignee_email)
    Returns None if not found anywhere.
    """
    if not api_field:
        return None

    ms = (shipment.get('milestones') or {})
    group = ms.get(milestone_key) or {}

    if api_field in group:
        return group[api_field]

    target = normalize(api_field)
    for k, v in group.items():
        if normalize(k) == target:
            return v

    # Fallback: a normal shipment column.
    return shipment.get(api_field)


# ── Door 2 — registry writes ──────────────────────────────────────────────────
def _milestone_field_names(milestone: dict) -> list:
    out = []

    def _collect(d):
        for col in FIELD_COLUMNS:
            f = (d or {}).get(col)
            if f and isinstance(f, str) and f.strip():
                out.append(f.strip())

    # Primary check fields...
    _collect(milestone)
    # ...plus any fields used inside additional logic blocks (multi-check /
    # custom milestones), so Door 2 registers those too.
    for block in (milestone or {}).get('extra_logics') or []:
        _collect(block)

    # de-dupe, keep order
    seen, uniq = set(), []
    for f in out:
        if f not in seen:
            seen.add(f)
            uniq.append(f)
    return uniq


def register_milestone_fields(milestone_key: str, milestone: dict, source: str = 'builder') -> list:
    """
    Door 2: make the CargoWise sync collect this milestone's fields.
    Upserts one row per field into milestone_field_map. Best-effort — never
    raises, so it can't break milestone creation.
    """
    fields = _milestone_field_names(milestone)
    for f in fields:
        try:
            supabase.table('milestone_field_map').upsert(
                {'milestone_key': milestone_key, 'api_field': f, 'source': source, 'is_active': True},
                on_conflict='milestone_key,api_field',
            ).execute()
        except Exception as e:
            print(f"[field_registry] register failed ({milestone_key}, {f}): {e}")
    return fields


def deactivate_milestone_fields(milestone_key: str) -> None:
    """On milestone delete/deactivate: set its registry rows is_active=false (never hard-delete)."""
    try:
        supabase.table('milestone_field_map') \
            .update({'is_active': False}) \
            .eq('milestone_key', milestone_key) \
            .execute()
    except Exception as e:
        print(f"[field_registry] deactivate failed ({milestone_key}): {e}")


def sync_registered_fields(milestone_key: str, milestone: dict, source: str = 'builder') -> None:
    """
    On edit: upsert the milestone's current fields, and deactivate any registry
    rows for this key whose field is no longer used.
    """
    current = set(register_milestone_fields(milestone_key, milestone, source))
    try:
        existing = (
            supabase.table('milestone_field_map')
            .select('id, api_field, is_active')
            .eq('milestone_key', milestone_key)
            .execute()
        ).data or []
        for row in existing:
            if row['api_field'] not in current and row.get('is_active'):
                supabase.table('milestone_field_map') \
                    .update({'is_active': False}) \
                    .eq('id', row['id']) \
                    .execute()
    except Exception as e:
        print(f"[field_registry] sync_registered_fields failed ({milestone_key}): {e}")


# ── Fuzzy suggestion + mismatch detection (data-quality) ──────────────────────
def suggest_field(target: str, candidates):
    """
    Best 'did you mean' among candidate API field names. Compares on normalized
    forms so case/separator differences score high. Returns {field, score} or None.
    """
    cand = [c for c in (candidates or []) if c]
    if not target or not cand:
        return None
    t = normalize(target)
    best, best_score = None, 0.0
    for c in cand:
        score = SequenceMatcher(None, t, normalize(c)).ratio()
        if score > best_score:
            best, best_score = c, score
    if best is None:
        return None
    return {'field': best, 'score': round(best_score, 3)}


def _sample_api_fields(limit: int = 60) -> set:
    """Union of the top-level keys seen in recent shipments' raw_json (the real API field names)."""
    try:
        rows = (
            supabase.table('shipments')
            .select('raw_json')
            .order('updated_at', desc=True)
            .limit(limit)
            .execute()
        ).data or []
    except Exception as e:
        print(f"[field_registry] could not sample raw_json: {e}")
        return set()

    fields = set()
    for r in rows:
        raw = r.get('raw_json')
        if isinstance(raw, dict):
            fields.update(raw.keys())
    return fields


def find_field_mismatches() -> list:
    """
    Pure detection (no logging / no email). Returns the *current* set of naming
    mismatches: a registered field the CargoWise feed does not provide, but for
    which a similarly-named field exists. One issue per (milestone_key, api_field).

    A registered field simply absent with NO lookalike = a future field waiting
    in raw_json — not a mismatch, not returned here.
    """
    api_fields = _sample_api_fields()
    if not api_fields:
        return []

    norm_api = {normalize(f) for f in api_fields}

    try:
        registered = (
            supabase.table('milestone_field_map')
            .select('milestone_key, api_field, source')
            .eq('is_active', True)
            .execute()
        ).data or []
    except Exception as e:
        print(f"[field_registry] could not load registry: {e}")
        return []

    registered_names = {r['api_field'] for r in registered}
    unmapped = [f for f in api_fields if f not in registered_names]

    mismatches = []
    for r in registered:
        api_field = r['api_field']
        if api_field in api_fields or normalize(api_field) in norm_api:
            continue
        suggestion = suggest_field(api_field, unmapped)
        if suggestion and suggestion['score'] >= _SUGGEST_THRESHOLD:
            mismatches.append({
                'milestone_key':   r['milestone_key'],
                'expected_field':  api_field,
                'suggested_field': suggestion['field'],
                'score':           suggestion['score'],
                'severity':        'warning',
                'reason':          (f"Milestone '{r['milestone_key']}' expects API field "
                                    f"'{api_field}', which the CargoWise data does not contain. "
                                    f"Closest available field: '{suggestion['field']}'."),
            })
    return mismatches


def _already_flagged(milestone_key: str, field: str) -> bool:
    """True if this mismatch is already recorded in sync_errors (avoid re-emailing)."""
    try:
        rows = (
            supabase.table('sync_errors')
            .select('id')
            .eq('job_number', f"[field-map] {milestone_key}")
            .eq('field_name', field)
            .limit(1)
            .execute()
        ).data or []
        return len(rows) > 0
    except Exception:
        return False


def detect_field_mismatches() -> list:
    """Detect + log every current mismatch to sync_errors. Returns them."""
    mismatches = find_field_mismatches()
    for m in mismatches:
        _log_sync_error(m)
    return mismatches


def detect_and_notify() -> dict:
    """
    Automatic path (scheduled). Detect mismatches, but log + email only the NEW
    ones so a persistent mismatch doesn't spam the admin every run.
    """
    current = find_field_mismatches()
    new = [m for m in current if not _already_flagged(m['milestone_key'], m['expected_field'])]
    for m in new:
        _log_sync_error(m)
    notified = notify_admins(new) if new else {'sent': 0, 'reason': 'no new mismatches'}
    return {'current': current, 'new': new, 'notified': notified}


def _log_sync_error(issue: dict) -> None:
    """Record a mismatch in sync_errors (dedup handled by caller returning one per field)."""
    try:
        supabase.table('sync_errors').insert({
            'job_number':   f"[field-map] {issue['milestone_key']}",
            'field_name':   issue['expected_field'],
            'error_reason': issue['reason'],
            'severity':     issue.get('severity', 'warning'),
        }).execute()
    except Exception as e:
        print(f"[field_registry] could not log sync_error: {e}")


# ── Admin notification ────────────────────────────────────────────────────────
def _admin_emails() -> list:
    """
    Recipients for milestone field-mismatch alerts. Prefers the admin chosen in
    System Settings (sync_settings.mismatch_alert_email); falls back to the
    general admin_emails list. Respects alert_on_validation.
    """
    try:
        row = (
            supabase.table('sync_settings')
            .select('admin_emails, mismatch_alert_email, alert_on_validation')
            .limit(1)
            .execute()
        ).data
        if not row:
            return []
        row = row[0]
        if row.get('alert_on_validation') is False:
            return []
        target = row.get('mismatch_alert_email') or row.get('admin_emails') or ''
        return [e.strip() for e in re.split(r'[,;\s]+', target) if e.strip()]
    except Exception as e:
        print(f"[field_registry] could not load admin_emails: {e}")
        return []


def notify_admins(mismatches: list) -> dict:
    """Email the designated admin(s) a single digest of field-naming mismatches."""
    if not mismatches:
        return {'sent': 0, 'recipients': [], 'reason': 'no mismatches'}

    recipients = _admin_emails()
    if not recipients:
        return {'sent': 0, 'recipients': [], 'reason': 'no admin_emails / alert_on_validation off'}

    lines = [
        f"• Milestone '{m['milestone_key']}' expects '{m['expected_field']}' — "
        f"not in the CargoWise feed. Closest field: '{m['suggested_field']}' "
        f"(similarity {m['score']}). Map it in milestone_field_map."
        for m in mismatches
    ]
    subject = f"[SAS] {len(mismatches)} milestone field naming issue(s) detected"
    body = (
        "The CargoWise sync found milestone fields that don't match any API field name.\n"
        "Each is likely the same data under a different name. Please review and map:\n\n"
        + "\n".join(lines)
        + "\n\nOnce mapped in milestone_field_map, the next sync collects it automatically "
          "for all shipments on that route — no further alerts."
    )

    sent = 0
    errors = []
    try:
        from services.email_service import send_email
        for to in recipients:
            try:
                send_email(to, subject, body)
                sent += 1
            except Exception as e:
                errors.append({'to': to, 'error': str(e)})
    except Exception as e:
        # SMTP not configured — the sync_errors rows still record it for the admin UI.
        return {'sent': 0, 'recipients': recipients, 'reason': f'email unavailable: {e}'}

    return {'sent': sent, 'recipients': recipients, 'errors': errors}
