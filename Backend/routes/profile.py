from flask import Blueprint, jsonify, request
from utils.auth_helper import require_auth, get_current_user
from services.supabase_service import get_supabase

bp = Blueprint('profile', __name__, url_prefix='/api/profile')

# 1. Remove 'OPTIONS' from methods. Keep strict_slashes=False to fix the 308 redirect.
@bp.route('', methods=['GET', 'PUT'], strict_slashes=False)
@bp.route('/', methods=['GET', 'PUT'], strict_slashes=False)
@require_auth
def manage_profile():
    # 2. Remove the if request.method == 'OPTIONS': block since Flask-CORS handles it automatically
        
    if request.method == 'GET':
        # Your GET profile logic
        return jsonify({"message": "GET route hit"}), 200

    if request.method == 'PUT':
        user_id, _ = get_current_user()
        data = request.json
        supabase = get_supabase()
        
        update_data = {}
        if 'full_name' in data:
            update_data['full_name'] = data['full_name']
        if 'phone_number' in data:
            # Change the key here to exactly match your Supabase column: 'phoneNumber'
            update_data['phoneNumber'] = data['phone_number']
            
        try:
            supabase.table('profiles').update(update_data).eq('id', user_id).execute()
            return jsonify({"message": "Profile updated successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400