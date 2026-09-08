from services.supabase_client import supabase

SHIPMENT_EMAIL_FIELDS = ('created_by_email', 'updated_by_email', 'sales_user_email')


def resolve_relevant_profiles(shipment: dict) -> list[dict]:
    """Profiles whose email matches created_by/updated_by/sales_user email on this shipment."""
    emails = {(shipment.get(f) or '').strip().lower() for f in SHIPMENT_EMAIL_FIELDS}
    emails.discard('')
    if not emails:
        return []

    resp = supabase.table('profiles').select('id, email, role, full_name').execute()
    return [p for p in (resp.data or []) if (p.get('email') or '').strip().lower() in emails]


def get_admin_profiles() -> list[dict]:
    resp = supabase.table('profiles').select('id, email, role').eq('role', 'admin').execute()
    return resp.data or []
