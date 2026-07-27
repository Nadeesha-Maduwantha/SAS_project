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
                    'pickup_date_status': item.get('pickup_date_status'),
                    'created_by_name': item.get('oh_full_name'),
                    'st_note_text': item.get('st_note_text'),
                    'st_description': item.get('st_description'),
                    'gc_code': item.get('gc_code'),
                    'gb_code': item.get('gb_code'),
                    'branch': item.get('branch'),
                    'house_bill_number': item.get('house_bill_number'),
                    'cargo_ready_date': item.get('cargo_ready_date'),
                    'cargo_pickup_date': item.get('cargo_pickup_date'),
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



@sync_bp.route('/api/sync/schedule', methods=['GET'])
def get_schedule():
    try:
        from services.supabase_service import get_sync_settings
        settings = get_sync_settings()
        return jsonify({'data': settings}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sync_bp.route('/api/sync/schedule', methods=['POST'])
def save_schedule():
    try:
        from flask import request, current_app
        from services.supabase_service import save_sync_settings
        from apscheduler.triggers.cron import CronTrigger

        data = request.get_json()
        schedule_time = data.get('schedule_time')

        if not schedule_time:
            return jsonify({'error': 'schedule_time is required'}), 400

        hour, minute = schedule_time.split(':')

        save_sync_settings(
            schedule_hours=hour,
            schedule_minute=int(minute)
        )

        # Get scheduler from app config instead of importing from app
        scheduler = current_app.config.get('SCHEDULER')
        run_sync_job = current_app.config.get('RUN_SYNC_JOB')

        if scheduler and run_sync_job:
            scheduler.add_job(
                run_sync_job,
                CronTrigger(hour=hour, minute=int(minute), timezone='Asia/Colombo'),
                id='custom_sync',
                replace_existing=True
            )

        return jsonify({
            'success': True,
            'message': f'Schedule saved — sync will run at {schedule_time} Sri Lanka time'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500