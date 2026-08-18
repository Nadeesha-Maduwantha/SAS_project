import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask.json.provider import DefaultJSONProvider
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

# Auth routes
from routes.auth import bp as auth_bp
from routes.users import bp as users_bp
from routes.user_edit import bp as user_edit_bp
from routes.audit_trail import bp as audit_trail_bp
from routes.access_logs import access_logs_bp
from routes.profile import bp as profile_bp # <-- Add this import
from routes.change_password import bp as change_password_bp # <-- Add this import
from routes.custom_tables import custom_tables_bp


# Shipment routes
from routes.templates import templates_bp
from routes.milestones import milestones_bp
from routes.shipments import shipments_bp
from routes.sync import sync_bp
from routes.alerts import alerts_bp
from routes.milestone_library import milestone_library_bp
from routes.field_map import field_map_bp
from routes.system_settings import system_settings_bp
from routes.field_definitions import field_definitions_bp
from routes.dashboard import dashboard_bp
from routes.notes import notes_bp

load_dotenv()

def run_sync_job():
    try:
        from services.cargowise_service import fetch_shipments_from_api, build_milestones, load_field_map
        from services.supabase_service import upsert_shipment, save_sync_log, save_sync_error
        import time

        print('Running scheduled sync...')
        start_time = time.time()
        raw_data = fetch_shipments_from_api()

        if not raw_data:
            print('No data from API')
            return

        seen = set()
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
            inserted=0,
            updated=updated,
            errors=len(error_list),
            total_processed=len(seen),
            duration_seconds=duration
        )

        print(f'Log saved: {log}')

        if log and error_list:
            sync_id = log.get('id')
            for err in error_list:
                save_sync_error(
                    sync_id=sync_id,
                    job_number=err['job_number'],
                    field_name=err['field_name'],
                    error_reason=err['error_reason'],
                    severity=err['severity']
                )
            print(f'Saved {len(error_list)} errors')

        # Field-name mismatch check right after fresh data lands (Ronaka's
        # detector — idempotent, dedup-safe). Never allowed to fail the sync.
        try:
            from services.field_registry import detect_and_notify
            detect_and_notify()
        except Exception as e:
            print(f'field mismatch detection failed (non-fatal): {e}')

        print(f'Sync done — updated: {updated}, errors: {len(error_list)}')

    except Exception as e:
        print(f'SCHEDULER ERROR: {e}')
        import traceback
        traceback.print_exc()
class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        try:
            return super().default(obj)
        except TypeError:
            return str(obj)


app = Flask(__name__)
app.json_provider_class = CustomJSONProvider
app.json = CustomJSONProvider(app)

CORS(app)

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')

# Register blueprints
app.register_blueprint(auth_bp,          name='auth_routes')
app.register_blueprint(profile_bp,       name='profile_routes') 
app.register_blueprint(users_bp,         name='user_creation_routes')
app.register_blueprint(user_edit_bp,     name='user_edit_routes')
app.register_blueprint(audit_trail_bp, name='audit_trail_routes')
app.register_blueprint(access_logs_bp, url_prefix='/api/access-logs')
app.register_blueprint(templates_bp)
app.register_blueprint(milestones_bp)
app.register_blueprint(shipments_bp)
app.register_blueprint(change_password_bp, name='change_password_routes') 

app.register_blueprint(custom_tables_bp)

app.register_blueprint(sync_bp)

app.register_blueprint(alerts_bp)

app.register_blueprint(notes_bp)

app.register_blueprint(milestone_library_bp)

app.register_blueprint(field_map_bp)

app.register_blueprint(system_settings_bp)

app.register_blueprint(field_definitions_bp)

app.register_blueprint(dashboard_bp)

def health_check():
    return {'status': 'Backend is running'}, 200


@app.route('/')
def health():
    return {"status": "Flask is running"}, 200

# Start scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(
    run_sync_job,
    CronTrigger(hour='0,6,12,18', minute=0, timezone='Asia/Colombo'),
    id='fixed_sync'
)

# Load all custom schedules from the database — one job per row, so several
# custom times can coexist alongside the fixed cron above.
try:
    from services.supabase_service import get_sync_schedules
    for row in get_sync_schedules():
        hh, mm = str(row['schedule_time']).split(':')[:2]
        scheduler.add_job(
            run_sync_job,
            CronTrigger(hour=int(hh), minute=int(mm), timezone='Asia/Colombo'),
            id=f"custom_sync_{row['id']}",
            replace_existing=True
        )
        print(f"Custom sync loaded: {hh}:{mm}")
except Exception as e:
    print(f'Could not load custom schedules: {e}')

scheduler.start()
print('Scheduler started — fixed sync at 6AM, 12PM, 6PM, 12AM Sri Lanka time')


# Automatic milestone field-naming mismatch detection. Runs hourly; emails the
# designated admin (sync_settings.mismatch_alert_email) only about NEW mismatches.
def run_field_mismatch_check():
    try:
        from services.field_registry import detect_and_notify
        result = detect_and_notify()
        print(f"[field_mismatch] current={len(result.get('current', []))} "
              f"new={len(result.get('new', []))} notified={result.get('notified')}")
    except Exception as e:
        print(f"[field_mismatch] ERROR: {e}")

scheduler.add_job(
    run_field_mismatch_check,
    CronTrigger(minute=15, timezone='Asia/Colombo'),
    id='field_mismatch_detect',
    replace_existing=True,
)
app.config['SCHEDULER'] = scheduler
app.config['RUN_SYNC_JOB'] = run_sync_job


@app.route('/debug/routes')
def list_routes():
    return jsonify([str(r) for r in app.url_map.iter_rules()])


def find_available_port(start_port: int, max_attempts: int = 20) -> int:
    import socket

    configured_port = int(os.getenv('PORT', str(start_port)))
    ports_to_try = [configured_port] + list(range(configured_port + 1, configured_port + max_attempts + 1))

    for port in ports_to_try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue

    raise RuntimeError(f'No free port found starting from {configured_port} within {max_attempts} attempts.')


if __name__ == '__main__':
    port = find_available_port(5001)
    print(f'Starting Flask app on port {port}')
    app.run(debug=True, host='0.0.0.0', port=port, use_reloader=False)
