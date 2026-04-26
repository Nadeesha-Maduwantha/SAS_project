import os
from flask import Flask
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

# Shipment routes
from routes.templates import templates_bp
from routes.milestones import milestones_bp
from routes.shipments import shipments_bp
from routes.sync import sync_bp

load_dotenv()

def run_sync_job():
    try:
        from services.cargowise_service import fetch_shipments_from_api
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

# Register all blueprints
app.register_blueprint(auth_bp, name='auth_routes')
app.register_blueprint(users_bp, name='user_creation_routes')
app.register_blueprint(user_edit_bp, name='user_edit_routes')
app.register_blueprint(audit_trail_bp, name='audit_trail_routes')
app.register_blueprint(access_logs_bp, url_prefix='/api/access-logs')
app.register_blueprint(templates_bp)
app.register_blueprint(milestones_bp)
app.register_blueprint(shipments_bp)
app.register_blueprint(sync_bp)

@app.route('/health', methods=['GET'])
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

# Load custom schedule from database if exists
try:
    from services.supabase_service import get_sync_settings
    settings = get_sync_settings()
    if settings:
        scheduler.add_job(
            run_sync_job,
            CronTrigger(
                hour=settings['schedule_hours'],
                minute=settings['schedule_minute'],
                timezone='Asia/Colombo'
            ),
            id='custom_sync',
            replace_existing=True
        )
        print(f"Custom sync loaded: {settings['schedule_hours']}:{settings['schedule_minute']}")
except Exception as e:
    print(f'Could not load custom schedule: {e}')

scheduler.start()
print('Scheduler started — fixed sync at 6AM, 12PM, 6PM, 12AM Sri Lanka time')

if __name__ == '__main__':
    app.run(debug=True, port=5000, use_reloader=False)