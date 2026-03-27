# nadeesha 
#  This file defines the user-related routes for the Flask application. 
from flask import Blueprint, request, jsonify
from services.supabase_service import get_supabase
from datetime import datetime

bp = Blueprint('users', __name__, url_prefix='/api/users')

def serialize_error(e):
    try:
        return str(e)
    except Exception:
        return type(e).__name__

@bp.route('/create', methods=['POST'])
def create_user():
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'Request body is empty'}), 400

        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400

        supabase = get_supabase()

        auth_response = supabase.auth.sign_up({
            'email': data.get('email'),
            'password': data.get('password')
        })

        if not auth_response or not auth_response.user:
            return jsonify({'error': 'Failed to create user.'}), 400

        identities = auth_response.user.identities
        if identities is not None and len(identities) == 0:
            return jsonify({'error': 'Email is already registered.'}), 400

        user_id = str(auth_response.user.id)
        email = str(auth_response.user.email)
        now = datetime.now().isoformat()

        user_data = {
            'id': user_id,
            'email': email,
            'full_name': str(data.get('fullName', '')),
            'age': int(data.get('age')) if data.get('age') else None,
            'ethnicity': str(data.get('ethnicity', '')),
            'role': str(data.get('role', '')),
            'department': str(data.get('department', '')),
            'address': str(data.get('address', '')),
            'created_at': now,
            'updated_at': now
        }

        supabase.table('profiles').insert(user_data).execute()

        return jsonify({
            'message': 'User created successfully',
            'user_id': user_id,
            'email': email
        }), 201

    except Exception as e:
        print("=== ERROR ===")
        import traceback
        traceback.print_exc()
        # ✅ Fix: safely extract error message without serializing Supabase objects
        try:
            error_message = e.args[0] if e.args else type(e).__name__
            if not isinstance(error_message, str):
                error_message = type(e).__name__
        except Exception:
            error_message = 'An error occurred'
        return jsonify({'error': error_message}), 400