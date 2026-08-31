# Use the shared LAZY client so importing this module never opens a connection
# (and never crashes at import time if env vars aren't loaded yet). It connects
# on first actual use instead.
from services.supabase_client import supabase


def get_supabase():
    """Back-compat for callers that expect a get_supabase() factory.
    Returns the shared lazy client."""
    return supabase


def get_all_shipments():
    response = supabase.table('shipments').select('*').execute()
    return response.data

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

def get_sync_settings():
    response = supabase.table('sync_settings').select('*').limit(1).execute()
    return response.data[0] if response.data else None

def save_sync_settings(schedule_hours, schedule_minute):
    response = supabase.table('sync_settings').update({
        'schedule_hours': schedule_hours,
        'schedule_minute': schedule_minute,
        'updated_at': 'now()'
    }).neq('id', '00000000-0000-0000-0000-000000000000').execute()
    return response.data


# Marker used in sync_errors.job_number for unknown-field reports, so they can
# be told apart from per-shipment validation warnings. Ronaka's milestone
# mismatch detector uses '[field-map]' for the same purpose.
NEW_FIELD_MARKER = '[new-field]'

# ── Fields deliberately marked as "not a milestone" ────────────────────
# An administrator who has reviewed a reported field and decided it is not a
# milestone records that decision here, so the notice stops showing it. The
# decision is recorded rather than the report deleted, so it can be listed and
# reversed later — a field hidden with no way to find it again is effectively
# lost.

def get_ignored_api_fields():
    response = (
        supabase.table('ignored_api_fields')
        .select('*')
        .order('ignored_at', desc=True)
        .execute()
    )
    return response.data or []

def add_ignored_api_field(api_field, ignored_by=None, note=None):
    response = supabase.table('ignored_api_fields').upsert(
        {'api_field': api_field, 'ignored_by': ignored_by, 'note': note},
        on_conflict='api_field'
    ).execute()
    return (response.data or [None])[0]

def remove_ignored_api_field(api_field):
    response = (
        supabase.table('ignored_api_fields')
        .delete()
        .eq('api_field', api_field)
        .execute()
    )
    return response.data


def get_new_field_reports():
    """Unknown-field reports only. Queried separately from get_sync_errors()
    because that function returns the latest 50 rows of all kinds, in which
    per-shipment validation warnings would crowd these out."""
    response = (
        supabase.table('sync_errors')
        .select('*')
        .like('job_number', f'{NEW_FIELD_MARKER}%')
        .order('created_at', desc=True)
        .limit(50)
        .execute()
    )
    return response.data or []


def get_flagged_new_fields():
    """Field names already reported as unknown, so each is reported once
    rather than on every synchronisation run."""
    response = (
        supabase.table('sync_errors')
        .select('field_name')
        .like('job_number', f'{NEW_FIELD_MARKER}%')
        .execute()
    )
    return {r['field_name'] for r in (response.data or []) if r.get('field_name')}


def save_alert_settings(alert_on_failure, alert_on_validation, min_errors_threshold):
    """Update the alert preferences on the single sync_settings row."""
    response = supabase.table('sync_settings').update({
        'alert_on_failure':     alert_on_failure,
        'alert_on_validation':  alert_on_validation,
        'min_errors_threshold': min_errors_threshold,
        'updated_at': 'now()'
    }).neq('id', '00000000-0000-0000-0000-000000000000').execute()
    return response.data


# ── Custom sync schedules ──────────────────────────────────────────────
# One row per custom time, so admins can add several. Previously a single
# custom time was squeezed into sync_settings.schedule_hours, which also
# holds the fixed multi-hour cron string ('0,6,12,18') — one column with
# two meanings, and saving a second time silently replaced the first.

def get_sync_schedules():
    response = (
        supabase.table('sync_schedules')
        .select('*')
        .eq('is_active', True)
        .order('schedule_time')
        .execute()
    )
    return response.data or []

def add_sync_schedule(schedule_time):
    """schedule_time is 'HH:MM' (24h). Returns the new row, or None if the
    time already exists (unique constraint)."""
    response = supabase.table('sync_schedules').insert({
        'schedule_time': schedule_time,
    }).execute()
    return response.data[0] if response.data else None

def delete_sync_schedule(schedule_id):
    response = (
        supabase.table('sync_schedules')
        .delete()
        .eq('id', schedule_id)
        .execute()
    )
    return response.data
