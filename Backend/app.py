import os
import json
from flask import Flask
from flask_cors import CORS
from flask.json.provider import DefaultJSONProvider
from dotenv import load_dotenv

# Blueprint imports
from routes.auth import bp as auth_bp
from routes.users import bp as users_bp
from routes.user_edit import bp as user_edit_bp
from routes.audit_trail import bp as audit_trail_bp
from routes.access_logs import access_logs_bp

print("=== APP.PY LOADED - FRESH START ===")

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

# Blueprint registrations
app.register_blueprint(auth_bp, name='auth_routes')
app.register_blueprint(users_bp, name='user_creation_routes')
app.register_blueprint(user_edit_bp, name='user_edit_routes')
app.register_blueprint(audit_trail_bp, name='audit_trail_routes') 
app.register_blueprint(access_logs_bp, url_prefix='/api/access-logs')

@app.route('/health', methods=['GET'])
def health_check():
    return {'status': 'Backend is running'}, 200

if __name__ == '__main__':
    app.run(debug=True, port=5000, use_reloader=False)