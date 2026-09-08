from flask import Blueprint, jsonify
from services.cargowise_service import (
    fetch_shipments_from_api, build_milestones, load_field_map,
    find_unknown_fields, notify_sync_outcome,
)
from services.supabase_service import upsert_shipment, save_sync_log, get_sync_logs, save_sync_error, get_sync_errors
from utils.auth_helper import require_auth, get_current_user
from datetime import datetime, timezone
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
        unknown_fields = set()   # Door 3 — API fields nobody has claimed

        for item in raw_data:
            job_number = item.get('job_number')
            if not job_number or job_number in seen:
                continue
            seen.add(job_number)

            # Collected across all records, since a new field may appear on
            # only some of them.
            unknown_fields |= find_unknown_fields(item, field_map)

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
                    # Postgres does not touch updated_at on its own, and the
                    # upsert does not either — so the sync sets it explicitly.
                    'updated_at': datetime.now(timezone.utc).isoformat(),
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

        # Notify administrators of the outcome, according to the preferences on
        # the Alert Settings panel. Never allowed to fail the sync.
        notify_sync_outcome(status, updated, error_list, duration)

        # Door 3 — report API fields that are neither mapped to a column nor
        # registered against a milestone, so an administrator can decide what
        # they are. Reported once per field; the data itself is already safe
        # in raw_json. Never allowed to fail the sync.
        new_fields = []
        try:
            from services.supabase_service import get_flagged_new_fields, NEW_FIELD_MARKER
            new_fields = sorted(unknown_fields - get_flagged_new_fields())
            if new_fields and log:
                for field in new_fields:
                    save_sync_error(
                        sync_id=log.get('id'),
                        job_number=f'{NEW_FIELD_MARKER} {field}',
                        field_name=field,
                        error_reason=(
                            f"New field '{field}' is present in the CargoWise feed but is not "
                            f"mapped to a column or registered to a milestone. Its values are "
                            f"stored in raw_json. Register it in the Field Registry if it is a milestone."
                        ),
                        severity='info',
                    )
                print(f'New API fields detected: {", ".join(new_fields)}')
        except Exception as e:
            print(f'unknown field detection failed (non-fatal): {e}')

        # Field-name mismatch check right after fresh data lands (Ronaka's
        # detector — the opposite direction: registered but absent from the
        # feed). Idempotent and dedup-safe; never allowed to fail the sync.
        try:
            from services.field_registry import detect_and_notify
            detect_and_notify()
        except Exception as e:
            print(f'field mismatch detection failed (non-fatal): {e}')

        return jsonify({
            'success': True,
            'new_fields_detected': new_fields,
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



@sync_bp.route('/api/sync/new-fields', methods=['GET'])
def get_new_fields():
    """Fields reported as unknown that are STILL unknown.

    The report rows in sync_errors are historical: once a field has been
    reported the row remains. Re-checking each reported field against the
    current configuration means the notice clears itself as soon as an
    administrator registers or maps the field, instead of persisting after
    the work is done."""
    try:
        from services.cargowise_service import load_field_map, MAPPED_API_FIELDS
        from services.supabase_service import get_new_field_reports, get_ignored_api_fields

        field_map = load_field_map()
        claimed = MAPPED_API_FIELDS | {
            f['api_field'] for fields in field_map.values() for f in fields
        }
        # Reviewed and deliberately set aside — a decision, not a claim
        ignored = {r['api_field'] for r in get_ignored_api_fields()}

        # Keep only those still unclaimed and not set aside, one row per field
        seen, still_unknown = set(), []
        for e in get_new_field_reports():
            name = e.get('field_name')
            if name and name not in claimed and name not in ignored and name not in seen:
                seen.add(name)
                still_unknown.append(e)

        return jsonify({'data': still_unknown}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sync_bp.route('/api/sync/ignored-fields', methods=['GET'])
def list_ignored_fields():
    """Fields an administrator has marked as not being milestones. Listed so a
    decision taken once remains visible and can be reversed."""
    try:
        from services.supabase_service import get_ignored_api_fields
        return jsonify({'data': get_ignored_api_fields()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sync_bp.route('/api/sync/ignored-fields/<api_field>', methods=['POST'])
@require_auth
def ignore_field(api_field):
    """Mark a reported field as not a milestone, removing it from the notice."""
    try:
        from flask import request
        from services.supabase_service import add_ignored_api_field

        user_id, role = get_current_user()
        if 'admin' not in (role or '').lower():
            return jsonify({'error': 'Admin access required'}), 403

        # silent=True: the request carries a JSON content type but no body,
        # which get_json() would otherwise reject with a 400.
        note = ((request.get_json(silent=True) or {}).get('note') or '').strip() or None
        add_ignored_api_field(api_field, ignored_by=user_id, note=note)
        return jsonify({'success': True, 'message': f"'{api_field}' marked as not a milestone"}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sync_bp.route('/api/sync/ignored-fields/<api_field>', methods=['DELETE'])
@require_auth
def unignore_field(api_field):
    """Reverse the decision, so the field appears in the notice again."""
    try:
        from services.supabase_service import remove_ignored_api_field

        _, role = get_current_user()
        if 'admin' not in (role or '').lower():
            return jsonify({'error': 'Admin access required'}), 403

        remove_ignored_api_field(api_field)
        return jsonify({'success': True, 'message': f"'{api_field}' restored to the notice"}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Alert settings ─────────────────────────────────────────────────────
# Stored on the single sync_settings row:
#   alert_on_failure     — notify admins when a sync run fails
#   alert_on_validation  — notify admins about data validation issues
#   min_errors_threshold — minimum validation issues before notifying
# NOTE: alert_on_validation is also written by routes/system_settings.py
# (milestone mismatch settings). Both pages act on the same row.

@sync_bp.route('/api/sync/settings', methods=['GET'])
def get_alert_settings():
    try:
        from services.supabase_service import get_sync_settings
        row = get_sync_settings() or {}
        return jsonify({'data': {
            'alert_on_failure':     row.get('alert_on_failure', True),
            'alert_on_validation':  row.get('alert_on_validation', True),
            'min_errors_threshold': row.get('min_errors_threshold', 1),
            'admin_emails':         row.get('admin_emails'),
        }}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sync_bp.route('/api/sync/settings', methods=['PUT'])
@require_auth
def save_alert_settings():
    try:
        from flask import request
        from services.supabase_service import save_alert_settings as persist

        _, role = get_current_user()
        if 'admin' not in (role or '').lower():
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json(silent=True) or {}

        # Validate before writing: a threshold below 1 would mean "alert even
        # when there are no errors", which is never intended.
        try:
            threshold = int(data.get('min_errors_threshold', 1))
        except (TypeError, ValueError):
            return jsonify({'error': 'min_errors_threshold must be a whole number'}), 400
        if threshold < 1:
            return jsonify({'error': 'min_errors_threshold must be at least 1'}), 400

        persist(
            alert_on_failure=bool(data.get('alert_on_failure', True)),
            alert_on_validation=bool(data.get('alert_on_validation', True)),
            min_errors_threshold=threshold,
        )
        return jsonify({'success': True, 'message': 'Alert settings saved'}), 200

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

        schedule_time = (request.get_json(silent=True) or {}).get('schedule_time')
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