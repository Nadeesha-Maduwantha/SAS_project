from flask import Blueprint, jsonify, request
from utils.auth_helper import require_auth, get_current_user
from services.supabase_service import get_supabase
from datetime import datetime

# Import the helpers from auth_helper or define them if they aren't globally accessible.
# Since we need them for access logs, we can import them from the auth route (or move them to utils)
from routes.auth import get_location_from_ip, get_device_info

bp = Blueprint('change_password', __name__, url_prefix='/api/change-password')

@bp.route('', methods=['PUT'], strict_slashes=False)
@bp.route('/', methods=['PUT'], strict_slashes=False)
@require_auth
def change_password():
    try:
        user_id, _ = get_current_user()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
            
        data = request.json
        new_password = data.get('new_password')
        
        if not new_password:
            return jsonify({'error': 'New password is required'}), 400

        # Get the actual token from the request header
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(' ')[1]

        supabase = get_supabase()

        # Step 1: Temporarily establish the user's session in the backend using their JWT
        # A dummy refresh token is used because we only care about the access token validity
        supabase.auth.set_session(token, "dummy-refresh-token")

        # Step 2: Now that a valid session is set, update the user's password securely
        response = supabase.auth.update_user({
            "password": new_password
        })
        
        # Step 3: Clear the backend session so it doesn't leak into other API calls
        supabase.auth.sign_out()

        # Log the password change action
        try:
            profile_response = supabase.table('profiles').select('email').eq('id', user_id).execute()
            user_email = profile_response.data[0]['email'] if profile_response.data else 'Unknown'
            
            supabase.table('access_logs').insert({
                'action': 'Password Changed',
                'ip_address': request.remote_addr or 'Unknown',
                'location': get_location_from_ip(request.remote_addr),
                'device': get_device_info(request.user_agent),
                'status': 'Success',
                'email_attempted': user_email,
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat()
            }).execute()
        except Exception as log_err:
            pass

        return jsonify({'message': 'Password updated successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 400