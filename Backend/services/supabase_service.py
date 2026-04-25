import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def get_supabase() -> Client:
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("Missing Supabase URL or Key in environment variables.")
    
    print(f"Connecting to Supabase: {url}")
    return create_client(url, key)

supabase = get_supabase()

def get_all_shipments():
    response = supabase.table('shipments').select('*').execute()
    return response.data

def get_shipment_milestones(shipment_id):
    response = supabase.table('shipment_milestones') \
        .select('*') \
        .eq('shipment_id', shipment_id) \
        .order('sequence_order') \
        .execute()
    return response.data if response.data else []

def upsert_shipment(shipment_data):
    response = supabase.table('shipments').upsert(
        shipment_data,
        on_conflict='cargowise_id'
    ).execute()
    return response.data

def save_sync_log(status, inserted, updated, errors, total_processed, duration_seconds):
    response = supabase.table('sync_logs').insert({
        'status': status,
        'records_added': inserted,
        'records_updated': updated,
        'error_count': errors,
        'total_processed': total_processed,
        'duration_seconds': duration_seconds
    }).execute()
    return response.data[0] if response.data else None

def get_sync_logs():
    response = supabase.table('sync_logs').select('*').order('synced_at', desc=True).limit(20).execute()
    return response.data

def save_sync_error(sync_id, job_number, field_name, error_reason, severity='warning'):
    response = supabase.table('sync_errors').insert({
        'sync_id': sync_id,
        'job_number': job_number,
        'field_name': field_name,
        'error_reason': error_reason,
        'severity': severity
    }).execute()
    return response.data

def get_sync_errors(sync_id=None):
    query = supabase.table('sync_errors').select('*').order('created_at', desc=True)
    if sync_id:
        query = query.eq('sync_id', sync_id)
    response = query.limit(50).execute()
    data = response.data
    if isinstance(data, dict):
        return [data]
    return data if data else []