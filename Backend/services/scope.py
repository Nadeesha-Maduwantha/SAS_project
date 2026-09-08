"""
scope.py — role-based data scoping.

Given the viewer's role + identity, decides which shipments they may see:
  • sales      → shipments where sales_user_email == their email
  • operation  → shipments that have a milestone assigned to them
                 (shipment_milestones.assigned_email == their email)
  • super      → shipments whose transport_mode == their department (SEA / AIR)
  • admin / unknown → everything

Identity currently comes from the client (mock auth). When real auth is wired,
the same params can be read from the verified session instead — the rules below
do not change.
"""

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
    return role in ('sales', 'operation', 'super')


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
            # Operation users are matched on the milestone's assigned email.
            rows = (supabase.table('shipment_milestones')
                    .select('shipment_id')
                    .ilike('assigned_email', email)
                    .execute()).data or []
            return {r['shipment_id'] for r in rows if r.get('shipment_id')}

        if role == 'sales' and email:
            rows = (supabase.table('shipments')
                    .select('id').ilike('sales_user_email', email).execute()).data or []
            return {r['id'] for r in rows}

        if role == 'super' and department:
            rows = (supabase.table('shipments')
                    .select('id').ilike('transport_mode', department).execute()).data or []
            return {r['id'] for r in rows}
    except Exception as e:
        print(f"[scope] allowed_shipment_ids failed ({role}): {e}")
        return set()

    return set()  # scoped but identity missing → nothing
