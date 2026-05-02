import os
from flask import Flask
from flask_cors import CORS
from flask.json.provider import DefaultJSONProvider
from dotenv import load_dotenv

# Auth routes
from routes.auth import bp as auth_bp
from routes.users import bp as users_bp
from routes.user_edit import bp as user_edit_bp
from routes.audit_trail import bp as audit_trail_bp
from routes.access_logs import access_logs_bp
from routes.profile import bp as profile_bp # <-- Add this import

# Shipment routes
from routes.templates import templates_bp
from routes.milestones import milestones_bp
from routes.shipments import shipments_bp

# Sync routes
from routes.database_sync_routes import sync_bp        # ← fix 1: correct filename
from sync.database_sync import start_scheduler         # ← fix 2: correct import path

load_dotenv()


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
app.register_blueprint(profile_bp,       name='profile_routes') # <-- Add this line
app.register_blueprint(audit_trail_bp, name='audit_trail_routes')
app.register_blueprint(access_logs_bp, url_prefix='/api/access-logs')
app.register_blueprint(templates_bp)
app.register_blueprint(milestones_bp)
app.register_blueprint(shipments_bp)
app.register_blueprint(sync_bp)        # ← fix 3: moved here, after app is created

def health_check():
    return {'status': 'Backend is running'}, 200


@app.route('/')
def health():
    return {'status': 'Flask is running'}, 200

if __name__ == '__main__':
    app.run(debug=True, port=5000, use_reloader=False)


if __name__ == '__main__':
    app.run(debug=True, port=5000, use_reloader=False)