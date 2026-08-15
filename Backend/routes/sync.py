from flask import Blueprint, jsonify
from services.cargowise_service import fetch_shipments_from_api, build_milestones, load_field_map
from services.supabase_service import upsert_shipment, save_sync_log, get_sync_logs, save_sync_error, get_sync_errors
import time

sync_bp = Blueprint('sync', __name__)

@sync_bp.route('/api/sync', methods=['GET', 'POST'])
def run_sync():
    try:
        start_time = time.time()
        raw_data = fetch_shipments_from_api()

        if not raw_data:
            return jsonify({'error': 'No data from API'}), 500

        seen = set()
        inserted = 0
        updated = 0
        errors = 0
        error_list = []
        field_map = load_field_map()

        for item in raw_data:
            job_number = item.get('job_number')
            if not job_number or job_number in seen:
                continue
            seen.add(job_number)

            if not item.get('transport_mode'):
                error_list.append({
                    'job_number': job_number,
                    'field_name': 'transport_mode',
                    'error_reason': 'Value is null',
                    'severity': 'warning'
                })

            if not item.get('cargo_pickup_date') and not item.get('llm_cargo_pickup_date'):
                error_list.append({
                    'job_number': job_number,
                    'field_name': 'cargo_pickup_date',
                    'error_reason': 'Value is null',
                    'severity': 'warning'
                })

            try:
                shipment = {
                    'cargowise_id': job_number,
                    'job_number': job_number,
                    'current_stage': item.get('st_description'),
                    'consignee_name': item.get('consignee'),
                    'transport_mode': item.get('transport_mode'),
                    'llm_identified_type': item.get('llm_identified_type'),
                    'llm_cargo_pickup_date': item.get('llm_cargo_pickup_date'),
                    'llm_note': item.get('llm_note'),
                    'created_by_name': item.get('oh_full_name'),
                    'st_note_text': item.get('st_note_text'),
                    'st_description': item.get('st_description'),
                    'gc_code': item.get('gc_code'),
                    'gb_code': item.get('gb_code'),
                    'branch': item.get('branch'),
                    'house_bill_number': item.get('house_bill_number'),
                    'milestones': build_milestones(item, field_map),
                    'raw_json': item,
                    'js_pk': item.get('js_pk'),
                    'note_number': item.get('note_number'),
                    'running_date_time': item.get('running_date_time'),
                    'job_last_edit_time': item.get('job_shipment_last_edit_time'),
                    'gen_custom_last_edit_time': item.get('gen_custom_last_edit_time'),
                    'job_docs_last_edit_time': item.get('job_docs_last_edit_time'),
                    'note_last_edit_time': item.get('note_last_edit_time'),
                }
                upsert_shipment(shipment)
                updated += 1
            except Exception as e:
                print(f'Error upserting {job_number}: {e}')
                errors += 1

        duration = round(time.time() - start_time, 2)
        status = 'success' if errors == 0 and len(error_list) == 0 else 'partial'

        log = save_sync_log(
            status=status,
            inserted=inserted,
            updated=updated,
            errors=len(error_list),
            total_processed=len(seen),
            duration_seconds=duration
        )

        print(f'Log saved: {log}')
        print(f'Error list count: {len(error_list)}')

        if log and error_list:
            sync_id = log.get('id')
            print(f'Saving {len(error_list)} errors for sync_id: {sync_id}')
            for err in error_list:
                save_sync_error(
                    sync_id=sync_id,
                    job_number=err['job_number'],
                    field_name=err['field_name'],
                    error_reason=err['error_reason'],
                    severity=err['severity']
                )

        # Field-name mismatch check right after fresh data lands (Ronaka's
        # detector — idempotent, dedup-safe). Never allowed to fail the sync.
        try:
            from services.field_registry import detect_and_notify
            detect_and_notify()
        except Exception as e:
            print(f'field mismatch detection failed (non-fatal): {e}')

        return jsonify({
            'success': True,
            'inserted': inserted,
            'updated': updated,
            'errors': len(error_list),
            'total_processed': len(seen),
            'duration_seconds': duration,
            'status': status
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sync_bp.route('/api/sync/logs', methods=['GET'])
def get_logs():
    try:
        logs = get_sync_logs()
        return jsonify({'data': logs})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sync_bp.route('/api/sync/errors', methods=['GET'])
def get_errors():
    try:
        errors = get_sync_errors()
        return jsonify({'data': errors})
    except Exception as e:
        return jsonify({'error': str(e)}), 500



# ── Custom sync schedules ──────────────────────────────────────────────
# Admins can register several custom times; each becomes its own scheduler
# job (id 'custom_sync_<uuid>') alongside the fixed 0/6/12/18 cron.

def _parse_hhmm(value):
    """Validate 'HH:MM' and return (hour, minute) as ints, or None."""
    try:
        parts = str(value).split(':')
        hour, minute = int(parts[0]), int(parts[1])
    except (ValueError, IndexError, AttributeError):
        return None
    if 0 <= hour <= 23 and 0 <= minute <= 59:
        return hour, minute
    return None


@sync_bp.route('/api/sync/schedules', methods=['GET'])
def list_schedules():
    try:
        from services.supabase_service import get_sync_schedules
        return jsonify({'data': get_sync_schedules()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sync_bp.route('/api/sync/schedules', methods=['POST'])
def add_schedule():
    try:
        from flask import request, current_app
        from services.supabase_service import add_sync_schedule, get_sync_schedules
        from apscheduler.triggers.cron import CronTrigger

        schedule_time = (request.get_json() or {}).get('schedule_time')
        parsed = _parse_hhmm(schedule_time)
        if not parsed:
            return jsonify({'error': 'schedule_time must be in HH:MM 24-hour format'}), 400
        hour, minute = parsed
        normalized = f'{hour:02d}:{minute:02d}'

        # Reject duplicates up front so the user gets a clear message
        if any(s['schedule_time'][:5] == normalized for s in get_sync_schedules()):
            return jsonify({'error': f'{normalized} is already scheduled'}), 409

        row = add_sync_schedule(normalized)
        if not row:
            return jsonify({'error': 'Could not save schedule'}), 500

        scheduler = current_app.config.get('SCHEDULER')
        run_sync_job = current_app.config.get('RUN_SYNC_JOB')
        if scheduler and run_sync_job:
            scheduler.add_job(
                run_sync_job,
                CronTrigger(hour=hour, minute=minute, timezone='Asia/Colombo'),
                id=f"custom_sync_{row['id']}",
                replace_existing=True
            )

        return jsonify({
            'success': True,
            'data': row,
            'message': f'Sync scheduled at {normalized} Sri Lanka time'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sync_bp.route('/api/sync/schedules/<schedule_id>', methods=['DELETE'])
def remove_schedule(schedule_id):
    try:
        from flask import current_app
        from services.supabase_service import delete_sync_schedule

        delete_sync_schedule(schedule_id)

        scheduler = current_app.config.get('SCHEDULER')
        if scheduler:
            job = scheduler.get_job(f'custom_sync_{schedule_id}')
            if job:
                job.remove()

        return jsonify({'success': True, 'message': 'Schedule removed'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500