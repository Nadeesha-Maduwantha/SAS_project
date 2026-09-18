"""
user_types.py — admin-defined custom user types (a 5th+ role beyond the
fixed 4: admin/superuser/salesuser/operationuser, which stay hardcoded and
unchanged elsewhere in the app).

A custom type is meant to behave like Operation/Sales:
  • Visibility — which shipments/milestones a user of this type can see —
    is driven by field_table.field_column, the SAME field-registry column
    picker System Settings -> User Type Rules already uses (see
    services/user_type_rules.list_allowed_tables / _column_shape). Wired
    into services/scope.py.
  • Cover Access — can_request_cover, gating whether this type's users can
    use the request-cover flow with OTHER users of the SAME type (mirrors
    operation-covers-operation). Wired into services/cover_access.py.
  • Alerts — receive_alerts is stored but, as of this module, not wired to
    an actual digest sender (operations_digest.py / sales_digest.py are
    still role-specific, standalone files) — see the migration's comment.
    Default false: "no email, check the dashboard" is the safe, working
    default described when this was scoped.
  • Manual email — can_email_clients, gating the per-alert / per-milestone
    "Email" compose button (sends directly to a shipment's consignee) that
    Sales/Operation already have. Separate from receive_alerts: this one is
    an outbound action a user takes themselves, not an inbound digest.
    Default true (matches the button's unconditional behavior before this
    toggle existed) — enforced in the frontend (useEmailEligibility).

Once created, a type's key becomes a selectable Role on the Create User
pages, and profiles.role can hold it directly — the same way it already
holds 'operationuser' etc. Deleting a type only deactivates it (never a
hard delete) so existing accounts with that role never get orphaned.
"""

import re
from datetime import datetime, timezone

from services.supabase_client import supabase, run_with_retry

# The 4 built-in roles a custom type's key may never collide with.
FIXED_ROLE_KEYS = ('admin', 'superuser', 'operationuser', 'salesuser')

_KEY_RE = re.compile(r'^[a-z][a-z0-9_]{1,49}$')


def _now():
    return datetime.now(timezone.utc).isoformat()


def slugify_key(label: str) -> str:
    """'Finance User' -> 'finance_user'. Used both as a live preview in the
    admin UI and as the server-side source of truth if no key is supplied."""
    s = re.sub(r'[^a-z0-9]+', '_', (label or '').strip().lower()).strip('_')
    return s


def _validate_field_mapping(table_name, column_name):
    """Reuse the exact same vetted allowlist identification rules use — a
    custom type's visibility field is never arbitrary admin free text hitting
    an unvetted column, same safety posture as user_type_rules."""
    from services.user_type_rules import _validate_table_column
    return _validate_table_column(table_name, column_name)


def list_types(include_inactive=True):
    q = supabase.table('user_types').select('*')
    if not include_inactive:
        q = q.eq('is_active', True)
    return run_with_retry(lambda: q.order('label').execute()).data or []


def get_type(key):
    key = (key or '').strip().lower()
    rows = run_with_retry(lambda: supabase.table('user_types')
                          .select('*').eq('key', key).limit(1).execute()).data or []
    return rows[0] if rows else None


def create_type(label, field_table, field_column, description=None, key=None,
                 can_request_cover=True, receive_alerts=False, can_email_clients=True, created_by=None):
    label = (label or '').strip()
    if not label:
        return {'error': 'label is required'}, 400

    key = (key or slugify_key(label)).strip().lower()
    if not _KEY_RE.match(key):
        return {'error': "key must be lowercase letters, numbers and underscores, starting with a letter (e.g. 'finance_user')"}, 400
    if key in FIXED_ROLE_KEYS:
        return {'error': f"'{key}' is one of the built-in roles and can't be reused for a custom type"}, 400

    err = _validate_field_mapping(field_table, field_column)
    if err:
        return {'error': err}, 400

    row = {
        'key': key, 'label': label, 'description': description,
        'field_table': field_table, 'field_column': field_column,
        'can_request_cover': bool(can_request_cover), 'receive_alerts': bool(receive_alerts),
        'can_email_clients': bool(can_email_clients),
        'is_active': True, 'created_by': created_by,
        'created_at': _now(), 'updated_at': _now(),
    }
    try:
        created = run_with_retry(lambda: supabase.table('user_types').insert(row).execute()).data[0]
        return {'data': created}, 201
    except Exception as e:
        msg = str(e)
        if 'duplicate' in msg.lower() or 'unique' in msg.lower():
            return {'error': f"A user type with key '{key}' already exists."}, 409
        return {'error': msg}, 500


def update_type(type_id, patch, updated_by=None):
    patch = dict(patch or {})
    # key is immutable once created — profiles.role rows already reference it.
    patch.pop('key', None)

    if 'field_table' in patch or 'field_column' in patch:
        existing_rows = run_with_retry(lambda: supabase.table('user_types')
                                       .select('field_table, field_column').eq('id', type_id).limit(1).execute()).data or []
        if not existing_rows:
            return {'error': 'User type not found'}, 404
        table_name = patch.get('field_table', existing_rows[0]['field_table'])
        column_name = patch.get('field_column', existing_rows[0]['field_column'])
        err = _validate_field_mapping(table_name, column_name)
        if err:
            return {'error': err}, 400

    patch['updated_at'] = _now()
    updated = run_with_retry(lambda: supabase.table('user_types')
                             .update(patch).eq('id', type_id).execute()).data
    if not updated:
        return {'error': 'User type not found'}, 404
    return {'data': updated[0]}, 200


def deactivate_type(type_id):
    """Soft delete — keeps the key resolvable for any profile still using it."""
    updated = run_with_retry(lambda: supabase.table('user_types')
                             .update({'is_active': False, 'updated_at': _now()})
                             .eq('id', type_id).execute()).data
    if not updated:
        return {'error': 'User type not found'}, 404
    return {'data': updated[0]}, 200
