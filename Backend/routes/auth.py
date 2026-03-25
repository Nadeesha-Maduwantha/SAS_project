from flask import Blueprint, request, jsonify
from services.supabase_service import get_supabase

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        supabase = get_supabase()
        response = supabase.auth.sign_up({
            'email': email,
            'password': password
        })
        
        return jsonify({'message': 'User created successfully', 'user': response.user.__dict__}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        supabase = get_supabase()
        response = supabase.auth.sign_in_with_password({
            'email': email,
            'password': password
        })
        
        return jsonify({
            'message': 'Login successful',
            'access_token': response.session.access_token,
            'user': response.user.__dict__
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 401

@bp.route('/logout', methods=['POST'])
def logout():
    try:
        supabase = get_supabase()
        supabase.auth.sign_out()
        return jsonify({'message': 'Logout successful'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

bp = Blueprint('users', __name__, url_prefix='/api/users')

@bp.route('/create', methods=['POST'])
def create_user():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        supabase = get_supabase()
        response = supabase.auth.sign_up({
            'email': email,
            'password': password
        })
        
        return jsonify({'message': 'User created successfully', 'user': response.user.__dict__}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400