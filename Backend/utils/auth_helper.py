from flask import request, jsonify
from services.supabase_service import get_supabase
from functools import wraps
import traceback

def get_current_user():
    """Extract current user from JWT token in Authorization header"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None, None
        
        token = auth_header.split(' ')[1]
        supabase = get_supabase()
        
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return None, None
        
        user_id = str(user_response.user.id)
        
        profiles = supabase.table('profiles').select('role').eq('id', user_id).execute()
        user_role = profiles.data[0]['role'] if profiles.data else 'user'
        
        return user_id, user_role
    
    except Exception as e:
        print(f"Auth error: {str(e)}")
        traceback.print_exc()
        return None, None


def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id, user_role = get_current_user()
        if not user_id:
            return jsonify({'error': 'Unauthorized - Invalid or missing token'}), 401
        return f(*args, **kwargs)
    return decorated_function