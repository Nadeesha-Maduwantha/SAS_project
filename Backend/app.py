import os
from flask import Flask
from flask_cors import CORS
from flask.json.provider import DefaultJSONProvider
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

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
from routes.dashboard import dashboard_bp


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
app.register_blueprint(users_bp,         name='user_creation_routes')
app.register_blueprint(user_edit_bp,     name='user_edit_routes')
app.register_blueprint(audit_trail_bp,   name='audit_trail_routes')
app.register_blueprint(access_logs_bp,   url_prefix='/api/access-logs')
app.register_blueprint(templates_bp)
app.register_blueprint(milestones_bp)
app.register_blueprint(shipments_bp)
app.register_blueprint(dashboard_bp)


@app.route('/health', methods=['GET'])
def health_check():
    return {'status': 'Backend is running'}, 200


@app.route('/')
def health():
    return {'status': 'Flask is running'}, 200


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5001, use_reloader=False)
