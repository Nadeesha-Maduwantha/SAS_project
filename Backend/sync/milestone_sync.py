import time
from services.supabase_client import supabase
from sync.database_sync_log import start_sync_log, finish_sync_log

DEFAULT_TEMPLATE_ID = "7a39137e-295c-4654-8823-077263091b8b"
SYNC_TYPE = "database_sync"

print(">>> LOADING NEW milestone_sync.py v3")
import time
from services.supabase_client import supabase


def _derive_milestone_data(shipment: dict) -> dict:
    cargo_ready   = shipment.get('cargo_ready_date')
    cargo_pickup  = shipment.get('cargo_pickup_date')
    pickup_status = (shipment.get('pickup_date_status') or '').strip()
    llm_date      = shipment.get('llm_cargo_pickup_date')
    notes         = shipment.get('llm_note') or shipment.get('st_note_text') or None

    is_delayed = any(
        word in pickup_status.lower()
        for word in ['delayed', 'overdue', 'late']
    )

    result = {}

    # Milestone 0: Cargo ready
    result[0] = {
        'due_date':       cargo_ready,
        'completed_date': cargo_ready if cargo_ready else None,
        'status':         'completed' if cargo_ready else 'pending',
        'is_critical':    False,
        'notes':          None,
    }

    # Milestone 1: Cargo pickup
    if cargo_pickup:
        result[1] = {
            'due_date':       llm_date or cargo_pickup,
            'completed_date': cargo_pickup,
            'status':         'completed',
            'is_critical':    False,
            'notes':          notes,
        }
    elif is_delayed:
        result[1] = {
            'due_date':       llm_date,
            'completed_date': None,
            'status':         'overdue',
            'is_critical':    True,
            'notes':          notes,
        }
    else:
        result[1] = {
            'due_date':       llm_date,
            'completed_date': None,
            'status':         'pending',
            'is_critical':    False,
            'notes':          notes,
        }

    # Milestones 2, 3, 4
    for seq in [2, 3, 4]:
        result[seq] = {
            'due_date':       None,
            'completed_date': None,
            'status':         'pending',
            'is_critical':    False,
            'notes':          None,
        }

    return result


def _insert_one(row: dict):
    """Insert a single row — avoids PGRST102 batch key mismatch error."""
    supabase.table('shipment_milestones').insert(row).execute()


def _update_one(milestone_id: str, payload: dict):
    """Update a single milestone row by its UUID."""
    supabase.table('shipment_milestones').update(payload).eq('id', milestone_id).execute()


def run_milestone_sync() -> dict:
    started_at = time.time()
    log        = start_sync_log(SYNC_TYPE)
    log_id     = log.get('id')

    updated_count = 0
    created_count = 0
    errors        = []

    try:
        print("[milestone_sync] Starting sync...")

        # Fetch all shipments
        shipments_resp = (
            supabase.table('shipments')
            .select(
                'id, job_number,'
                'cargo_ready_date, cargo_pickup_date,'
                'pickup_date_status, llm_cargo_pickup_date,'
                'llm_note, st_note_text'
            )
            .execute()
        )
        all_shipments = shipments_resp.data or []

        if not all_shipments:
            finish_sync_log(log_id, 'success', 0, 0, 0, [], started_at)
            return {
                'status': 'success', 'message': 'No shipments found',
                'total': 0, 'updated': 0, 'created': 0, 'errors': [],
                'duration_ms': int((time.time() - started_at) * 1000),
            }

        total = len(all_shipments)
        print(f"[milestone_sync] Found {total} shipments")

        # Fetch existing milestone rows
        existing_resp = (
            supabase.table('shipment_milestones')
            .select('id, shipment_id, sequence_order')
            .execute()
        )
        existing_rows = existing_resp.data or []

        # Build map: existing_map[shipment_id][sequence_order] = milestone_uuid
        existing_map = {}
        for row in existing_rows:
            sid = row['shipment_id']
            seq = row['sequence_order']
            if sid not in existing_map:
                existing_map[sid] = {}
            existing_map[sid][seq] = row['id']

        # Fetch template milestone names
        template_resp = (
            supabase.table('template_milestones')
            .select('name, sequence_order')
            .eq('template_id', DEFAULT_TEMPLATE_ID)
            .order('sequence_order')
            .execute()
        )
        template_milestones = template_resp.data or []

        if not template_milestones:
            error_msg = f"Template {DEFAULT_TEMPLATE_ID} has no milestones"
            finish_sync_log(log_id, 'failed', total, 0, 0, [{'error': error_msg}], started_at)
            return {'status': 'failed', 'error': error_msg, 'total': total,
                    'updated': 0, 'created': 0, 'errors': [{'error': error_msg}]}

        template_name_map = {t['sequence_order']: t['name'] for t in template_milestones}

        # Process each shipment
        for shipment in all_shipments:
            sid = shipment['id']
            job = shipment.get('job_number', sid)

            try:
                milestone_data = _derive_milestone_data(shipment)

                if sid in existing_map:
                    # UPDATE existing rows one by one
                    for seq, data in milestone_data.items():
                        milestone_id = existing_map[sid].get(seq)

                        if milestone_id:
                           _update_one(milestone_id, {
                            'status':           data['status'],
                            'is_critical':      data['is_critical'],
                            'due_date':         data.get('due_date'),
                            'completed_date':   data.get('completed_date'),
                            'notes':            data.get('notes'),
                            'automated':        False,
                            'assigned_to':      None,
                            'assigned_email':   None,
                            'alert_sent':       False,
                            'location_label':   None,
                            'location_lat':     None,
                            'location_lng':     None,
                            'days_from_booking': seq,
                        })
                           
                        else:
                            # Missing sequence — insert single row
                            name = template_name_map.get(seq, f"Milestone {seq + 1}")
                            _insert_one({
                                'shipment_id':      sid,
                                'template_id':      DEFAULT_TEMPLATE_ID,
                                'name':             name,
                                'sequence_order':   seq,
                                'status':           data['status'],
                                'is_critical':      data['is_critical'],
                                'due_date':         data.get('due_date'),
                                'completed_date':   data.get('completed_date'),
                                'notes':            data.get('notes'),
                                # columns that exist in table but we don't use yet
                                'automated':        False,
                                'assigned_to':      None,
                                'assigned_email':   None,
                                'alert_sent':       False,
                                'alert_sent_at':    None,
                                'location_label':   None,
                                'location_lat':     None,
                                'location_lng':     None,
                                'days_from_booking': seq,
                            })

                    updated_count += 1

                else:
                    # INSERT all 5 rows one at a time — avoids PGRST102
                    for seq, data in milestone_data.items():
                        name = template_name_map.get(seq, f"Milestone {seq + 1}")
                        _insert_one({
                            'shipment_id':      sid,
                            'template_id':      DEFAULT_TEMPLATE_ID,
                            'name':             name,
                            'sequence_order':   seq,
                            'status':           data['status'],
                            'is_critical':      data['is_critical'],
                            'due_date':         data.get('due_date'),
                            'completed_date':   data.get('completed_date'),
                            'notes':            data.get('notes'),
                            # columns that exist in table but we don't use yet
                            'automated':        False,
                            'assigned_to':      None,
                            'assigned_email':   None,
                            'alert_sent':       False,
                            'alert_sent_at':    None,
                            'location_label':   None,
                            'location_lat':     None,
                            'location_lng':     None,
                            'days_from_booking': seq,
                        })

                    created_count += 1

            except Exception as shipment_error:
                errors.append({
                    'shipment_id': sid,
                    'job_number':  job,
                    'error':       str(shipment_error),
                })
                print(f"[milestone_sync] ERROR on {job}: {shipment_error}")

        status = (
            'success' if not errors
            else 'partial' if (updated_count + created_count) > 0
            else 'failed'
        )

        print(f"[milestone_sync] Done — updated: {updated_count}, created: {created_count}, errors: {len(errors)}")
        finish_sync_log(log_id, status, total, updated_count, created_count, errors, started_at)

        return {
            'status':      status,
            'total':       total,
            'updated':     updated_count,
            'created':     created_count,
            'errors':      errors,
            'duration_ms': int((time.time() - started_at) * 1000),
        }

    except Exception as e:
        error_msg = str(e)
        print(f"[milestone_sync] FATAL ERROR: {error_msg}")
        finish_sync_log(log_id, 'failed', 0, updated_count, created_count,
                        [{'error': error_msg, 'fatal': True}], started_at)
        return {
            'status':  'failed',
            'error':   error_msg,
            'total':   0,
            'updated': updated_count,
            'created': created_count,
            'errors':  [{'error': error_msg, 'fatal': True}],
        }
