from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing Supabase URL or Key in environment variables.")

    return create_client(SUPABASE_URL, SUPABASE_KEY)


def get_shipment_milestones(shipment_id):
    supabase = get_supabase()  

    response = (
        supabase.table('shipment_milestones')
        .select('*')
        .eq('shipment_id', shipment_id)
        .order('sequence_order')
        .execute()
    )

    return response.data if response.data else []
