"""
scope.py — role-based data scoping.

Given the viewer's role + identity, decides which shipments they may see:
  • sales      → shipments where sales_user_email == their email
  • operation  → shipments that have a milestone assigned to them
                 (shipment_milestones.assigned_email == their email)
  • sales/operation (both) → PLUS any shipment listing them in
                 shipments.assigned_emails (a jsonb list of emails — the
                 generic "who else is tied to this shipment" field an admin
                 opts a field into via Field meanings -> Usage: User
                 management, Value shape: List of emails)
  • super      → shipments whose transport_mode == their department (SEA / AIR)
  • admin / unknown → everything

Identity currently comes from the client (mock auth). When real auth is wired,
the same params can be read from the verified session instead — the rules below
do not change.
"""

import json

from services.supabase_client import supabase


def read_scope(args):
    """Pull (role, email, department) from request query args, normalized."""
    role = (args.get('role') or '').strip().lower()
    email = (args.get('email') or '').strip().lower()
    dept = (args.get('department') or '').strip().upper()
    if role in ('operation_user', 'operations', 'ops'):
        role = 'operation'
    if role in ('super_user', 'superuser'):
        role = 'super'
    if role == 'sales_user':
        role = 'sales'
    return role, email, dept


def is_scoped(role):
    """True when this role restricts the visible shipments."""
    if role in ('sales', 'operation', 'super'):
        return True
    return _custom_type_for_role(role) is not None


# ── custom user types (System Settings -> User Types) ─────────────────────────
def _custom_type_for_role(role):
    """The active user_types row whose key matches this role, or None. Unlike
    sales/operation/super, a custom type's key is already unambiguous, so it
    passes through read_scope() unmodified — this looks it up by that raw,
    lowercased value directly."""
    role = (role or '').strip().lower()
    if not role:
        return None
    try:
        rows = (supabase.table('user_types').select('*')
                .eq('key', role).eq('is_active', True).limit(1).execute()).data or []
        return rows[0] if rows else None
    except Exception as e:
        print(f"[scope] custom type lookup failed: {e}")
        return None


def _shipment_ids_for_custom_type(type_row, email):
    """Visibility for one custom user type: match its admin-configured
    field_table.field_column, using the same 'single email' vs 'jsonb array
    of emails' shape distinction identification rules already use."""
    table_name = (type_row or {}).get('field_table')
    column_name = (type_row or {}).get('field_column')
    email = (email or '').strip().lower()
    if not table_name or not column_name or not email:
        return set()
    try:
        from services.user_type_rules import _column_shape
        shape = _column_shape(table_name, column_name)
    except Exception:
        shape = 'email'
    id_col = 'id' if table_name == 'shipments' else 'shipment_id'
    try:
        q = supabase.table(table_name).select(id_col)
        q = q.contains(column_name, json.dumps([email])) if shape == 'jsonb_email_array' else q.ilike(column_name, email)
        rows = (q.execute()).data or []
    except Exception as e:
        print(f"[scope] custom type '{(type_row or {}).get('key')}' lookup failed: {e}")
        return set()
    return {r[id_col] for r in rows if r.get(id_col)}


def _shipment_ids_via_custom_types(email):
    """Union across every active custom type's field mapping — used by
    shipment_ids_for_owner so covering a custom-type colleague shows their
    real assigned work too, not just the built-in sources."""
    email = (email or '').strip().lower()
    if not email:
        return set()
    ids = set()
    try:
        types = (supabase.table('user_types').select('*').eq('is_active', True).execute()).data or []
    except Exception as e:
        print(f"[scope] custom types lookup failed: {e}")
        return ids
    for t in types:
        ids |= _shipment_ids_for_custom_type(t, email)
    return ids


def department_mode(department):
    """Classify a free-text department into a freight mode, or None when it
    names neither. profiles.department is free text ('General', 'Sea Ops',
    'Air Freight', ...), so this is a contains-match rather than an exact one —
    used to decide who counts as 'the same department' for scoping/cover."""
    d = (department or '').strip().upper()
    if 'AIR' in d:
        return 'AIR'
    if 'SEA' in d:
        return 'SEA'
    return None


# ── Cover access — see a colleague's work while covering for them ─────────────
def _user_department(email):
    try:
        rows = (supabase.table('profiles').select('department')
                .ilike('email', (email or '').strip().lower()).limit(1).execute()).data or []
        return (rows[0].get('department') if rows else '') or ''
    except Exception:
        return ''


def _shipment_ids_via_assigned_emails(email):
    """Shipments where this email appears in the generic assigned_emails
    jsonb list — an admin-flagged 'field registry' column (System Settings ->
    Milestone settings -> Field meanings -> Usage: User management, Value
    shape: List of emails), independent of which specific role/column
    matched them. Additive: never narrows anything, only widens visibility."""
    email = (email or '').strip().lower()
    if not email:
        return set()
    try:
        rows = (supabase.table('shipments').select('id')
                .contains('assigned_emails', json.dumps([email])).execute()).data or []
        return {r['id'] for r in rows}
    except Exception as e:
        print(f"[scope] assigned_emails lookup failed: {e}")
        return set()


def shipment_ids_for_owner(owner_email):
    """Every shipment that counts as this person's work: milestones assigned to
    them (operation), shipments they own as sales, or shipments they created."""
    owner_email = (owner_email or '').strip().lower()
    ids = set()
    if not owner_email:
        return ids
    try:
        rows = (supabase.table('shipment_milestones').select('shipment_id')
                .ilike('assigned_email', owner_email).execute()).data or []
        ids |= {r['shipment_id'] for r in rows if r.get('shipment_id')}
    except Exception as e:
        print(f"[scope] owner milestones lookup failed: {e}")
    try:
        rows = (supabase.table('shipments').select('id')
                .ilike('sales_user_email', owner_email).execute()).data or []
        ids |= {r['id'] for r in rows}
    except Exception as e:
        print(f"[scope] owner sales lookup failed: {e}")
    ids |= _shipment_ids_via_assigned_emails(owner_email)
    ids |= _shipment_ids_via_custom_types(owner_email)
    return ids


def _authorize_owners(role, email, department, requested):
    """Filter the requested owners to those this viewer is actually allowed to see:
    self always; admin → anyone; super → same department; operation/sales → only
    colleagues they hold an active cover grant for."""
    email = (email or '').strip().lower()
    dept = (department or '').strip().lower()
    granted = set()
    if role in ('operation', 'sales'):
        try:
            from services.cover_access import active_owner_emails
            granted = active_owner_emails(email)
        except Exception as e:
            print(f"[scope] cover grants lookup failed: {e}")
    out = set()
    for oe in requested:
        oe = oe.strip().lower()
        if not oe:
            continue
        if oe == email:
            out.add(oe)
        elif role == 'admin':
            out.add(oe)
        elif role == 'super':
            if _user_department(oe).strip().lower() == dept:
                out.add(oe)
        elif role in ('operation', 'sales'):
            if oe in granted:
                out.add(oe)
    return out


def cover_allowed_shipment_ids(role, email, department, owners_param):
    """Selection-driven scope for the whose-work feature. When the viewer has NOT
    selected anyone (no owners_param), behaves exactly like allowed_shipment_ids —
    so pages look identical to today. When they HAVE selected owners, returns the
    union of those (authorized) owners' work; 'self' means the viewer's own work.
    Returns a set of shipment ids, or None for 'no restriction'."""
    requested = {e.strip().lower() for e in (owners_param or '').split(',') if e.strip()}
    if not requested:
        return allowed_shipment_ids(role, email, department)
    selected = _authorize_owners(role, email, department, requested)
    if not selected:
        return allowed_shipment_ids(role, email, department)
    allowed = set()
    for oe in selected:
        allowed |= shipment_ids_for_owner(oe)
    return allowed


def allowed_shipment_ids(role, email, department):
    """
    The set of shipment_ids this viewer may see, or None for 'no restriction'
    (admin / unknown role). A scoped role with no matching rows returns an empty
    set, which callers treat as "show nothing".
    """
    if not is_scoped(role):
        return None

    try:
        if role == 'operation' and email:
            # Operation users are matched on the milestone's assigned email,
            # plus anything they're listed on directly via assigned_emails.
            rows = (supabase.table('shipment_milestones')
                    .select('shipment_id')
                    .ilike('assigned_email', email)
                    .execute()).data or []
            ids = {r['shipment_id'] for r in rows if r.get('shipment_id')}
            ids |= _shipment_ids_via_assigned_emails(email)
            return ids

        if role == 'sales' and email:
            rows = (supabase.table('shipments')
                    .select('id').ilike('sales_user_email', email).execute()).data or []
            ids = {r['id'] for r in rows}
            ids |= _shipment_ids_via_assigned_emails(email)
            return ids

        if role == 'super':
            # A super user is scoped to a freight mode (AIR / SEA). But the
            # profile.department field is free text (e.g. "General"), so only
            # filter when it actually names a mode; otherwise the super sees
            # everything rather than an empty feed.
            mode = department_mode(department)
            if not mode:
                return None  # department isn't a freight mode → no restriction
            # Contains-match so 'AIR' / 'Air' / 'Air Freight' all match — an exact
            # ilike would return nothing when transport_mode is stored with a
            # suffix, leaving the super with an empty alert feed.
            rows = (supabase.table('shipments')
                    .select('id').ilike('transport_mode', f'%{mode}%').execute()).data or []
            return {r['id'] for r in rows}

        # Any other scoped role is a custom type (System Settings -> User
        # Types) — visibility follows its admin-configured field mapping.
        ct = _custom_type_for_role(role)
        if ct and email:
            return _shipment_ids_for_custom_type(ct, email)
    except Exception as e:
        print(f"[scope] allowed_shipment_ids failed ({role}): {e}")
        return set()

    return set()  # scoped but identity missing → nothing