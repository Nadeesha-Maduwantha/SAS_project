import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

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
    app.run(debug=True, port=5000)