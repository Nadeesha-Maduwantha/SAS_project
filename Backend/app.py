import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configure CORS with an explicit allowlist from environment
_frontend_origins = os.getenv("FRONTEND_ORIGINS", "http://localhost:3000")
_cors_origins = [origin.strip() for origin in _frontend_origins.split(",") if origin.strip()]

CORS(
    app,
    resources={r"/*": {"origins": _cors_origins}},
    supports_credentials=True,
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')

# Import and register routes
from routes.auth import bp as auth_bp
from routes.users import bp as users_bp

app.register_blueprint(auth_bp, name='auth')
app.register_blueprint(users_bp, name='users_api')

@app.route('/health', methods=['GET'])
def health_check():
    return {'status': 'Backend is running'}, 200

if __name__ == '__main__':
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug, port=5000)