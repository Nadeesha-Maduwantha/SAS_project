# sync/sync_log.py
#
# Handles writing sync results to the sync_logs table in Supabase.
# Every time a sync runs — success or failure — a row is written here.
# This gives you a complete history of every sync run.
#
# When we add notifications later, we read from this table to decide
# whether to send an alert (e.g. error_count > 0, or sync hasn't
# run in X hours).

import time
from datetime import datetime, timezone
from services.supabase_client import supabase


def start_sync_log(sync_type: str) -> dict:
    """
    Called at the START of a sync run.
    Creates a log entry with status 'running' and returns it.
    
    sync_type — a string identifying what kind of sync this is.
                e.g. "milestone_sync", "cargowise_sync"
    
    Returns the created log row including its id, which you need
    to call finish_sync_log() later.
    """
    try:
        response = (
            supabase.table('sync_logs')
            .insert({
                'sync_type':  sync_type,
                'status':     'running',
                'started_at': datetime.now(timezone.utc).isoformat(),
            })
            .execute()
        )
        return response.data[0] if response.data else {}
    except Exception as e:
        # If logging itself fails, print to console but don't crash the sync
        print(f"[sync_log] Failed to create start log: {e}")
        return {}


def finish_sync_log(
    log_id:      str,
    status:      str,
    total:       int,
    updated:     int,
    created:     int,
    errors:      list,
    started_at:  float,
) -> None:
    """
    Called at the END of a sync run.
    Updates the log entry with final results and timing.

    log_id     — the id returned from start_sync_log()
    status     — 'success' if no errors, 'partial' if some errors,
                 'failed' if the whole sync crashed
    total      — total shipments processed
    updated    — how many had their milestones updated
    created    — how many got milestones for the first time
    errors     — list of error dicts from the sync
    started_at — time.time() value from when the sync started
                 used to calculate duration_ms
    """
    if not log_id:
        return

    finished_at  = datetime.now(timezone.utc).isoformat()
    duration_ms  = int((time.time() - started_at) * 1000)

    # Decide final status:
    # success  → no errors at all
    # partial  → some succeeded, some failed
    # failed   → everything failed or the sync itself crashed
    if errors and total > 0:
        final_status = 'partial' if (updated + created) > 0 else 'failed'
    elif errors:
        final_status = 'failed'
    else:
        final_status = status  # use whatever was passed in

    try:
        (
            supabase.table('sync_logs')
            .update({
                'status':      final_status,
                'total':       total,
                'updated':     updated,
                'created':     created,
                'errors':      errors,          # stored as JSONB in Supabase
                'error_count': len(errors),
                'finished_at': finished_at,
                'duration_ms': duration_ms,
            })
            .eq('id', log_id)
            .execute()
        )
    except Exception as e:
        print(f"[sync_log] Failed to update finish log: {e}")


def get_recent_logs(limit: int = 20) -> list:
    """
    Returns the most recent sync log entries.
    Used by the Flask route GET /api/sync/logs so the admin
    dashboard can show sync history.
    """
    try:
        response = (
            supabase.table('sync_logs')
            .select('*')
            .order('started_at', desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []
    except Exception as e:
        print(f"[sync_log] Failed to fetch logs: {e}")
        return []


def get_last_sync(sync_type: str) -> dict:
    """
    Returns the most recent completed sync of a given type.
    Useful for checking 'when did we last sync milestones?'
    """
    try:
        response = (
            supabase.table('sync_logs')
            .select('*')
            .eq('sync_type', sync_type)
            .in_('status', ['success', 'partial'])
            .order('finished_at', desc=True)
            .limit(1)
            .single()
            .execute()
        )
        return response.data or {}
    except Exception:
        return {}
    
#added to temp_dev