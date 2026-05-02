import requests
from flask import Blueprint, request, jsonify
from services.supabase_service import get_supabase
from utils.auth_helper import require_auth, get_current_user
from datetime import datetime

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# --- HELPER FUNCTIONS FOR DEVICE AND LOCATION ---
def get_location_from_ip(ip):
    if not ip or ip in ['127.0.0.1', '::1', 'localhost', 'Unknown']:
        return "Localhost"
    try:
        req = requests.get(f'http://ip-api.com/json/{ip}?fields=city,country', timeout=3)
        data = req.json()
        if data.get('status') == 'success':
            return f"{data.get('city')}, {data.get('country')}"
    except Exception:
        pass
    return "Unknown"

def get_device_info(user_agent):
    if not user_agent:
        return "Unknown"
    browser = user_agent.browser or "Unknown Browser"
    platform = user_agent.platform or "Unknown OS"
    return f"{browser} on {platform}".title()


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

        return jsonify({
            'message': 'User created successfully',
            'user': {
                'id': str(response.user.id),
                'email': str(response.user.email)
            }
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 400


@bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    supabase = get_supabase()

    profile_data = None
    
    # 1. SAFELY CHECK IF USER IS ALREADY LOCKED / BLOCKED
    try:
        profile_response = supabase.table('profiles').select('id, role, is_locked, is_blocked, failed_attempts').eq('email', email).execute()
        if profile_response.data:
            profile_data = profile_response.data[0]
    except Exception as e:
        print(f"Warning: Could not fetch profile status: {e}")

    # REJECT IF ADMINISTRATIVELY BLOCKED
    if profile_data and profile_data.get('is_blocked'):
        return jsonify({'error': 'Your access has been suspended by an administrator.'}), 403

    # Reject if locked from failed attempts
    if profile_data and profile_data.get('is_locked'):
        return jsonify({'error': 'Account is locked due to 5 failed login attempts. Please contact an admin to unlock.'}), 403

    try:
        # 2. AUTHENTICATE USER
        response = supabase.auth.sign_in_with_password({
            'email': email,
            'password': password
        })
        user_id = str(response.user.id)

        # 3. SAFELY RESET FAILED ATTEMPTS ON SUCCESS
        if profile_data and profile_data.get('failed_attempts', 0) > 0:
            try:
                supabase.table('profiles').update({
                    'failed_attempts': 0, 
                    'is_locked': False
                }).eq('id', user_id).execute()
            except Exception:
                pass

        # LOG SUCCESSFUL ACCESS
        try:
            supabase.table('access_logs').insert({
                'action': 'Login',
                'ip_address': request.remote_addr or 'Unknown',
                'location': get_location_from_ip(request.remote_addr),
                'device': get_device_info(request.user_agent),
                'status': 'Success',
                'email_attempted': email,
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat()
            }).execute()
        except Exception as log_err:
            print(f"Failed to record access log: {log_err}")
            
        # Get the actual role from the profile data we fetched earlier, default to 'user' if not found
        actual_role = profile_data.get('role', 'user') if profile_data else 'user'

        return jsonify({
            'message': 'Login successful',
            'access_token': response.session.access_token,
            'user': {
                'id': user_id,
                'email': str(response.user.email),
                'role': actual_role
            }
        }), 200

    except Exception as e:
        # 4. SAFELY INCREMENT FAILED ATTEMPTS ON ERROR
        if profile_data:
            current_attempts = profile_data.get('failed_attempts', 0) + 1
            is_locked = current_attempts >= 5
            
            try:
                supabase.table('profiles').update({
                    'failed_attempts': current_attempts,
                    'is_locked': is_locked
                }).eq('email', email).execute()
            except Exception:
                pass

            if is_locked:
                return jsonify({'error': 'Account locked due to 5 consecutive failed login attempts.'}), 403

        # LOG FAILED ACCESS
        try:
            supabase.table('access_logs').insert({
                'action': 'Failed Login Attempt',
                'ip_address': request.remote_addr or 'Unknown',
                'location': get_location_from_ip(request.remote_addr),
                'device': get_device_info(request.user_agent),
                'status': 'Failed',
                'email_attempted': email,
                'timestamp': datetime.utcnow().isoformat()
            }).execute()
        except Exception as log_err:
            pass

        return jsonify({'error': 'Invalid credentials'}), 401

@bp.route('/logout', methods=['POST'])
def logout():
    try:
        supabase = get_supabase()
        supabase.auth.sign_out()
        return jsonify({'message': 'Logout successful'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    try:
        user_id, _ = get_current_user()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
            
        supabase = get_supabase()
        
        profile_response = supabase.table('profiles').select(
            'id, full_name, email, role, department, created_at'
        ).eq('id', user_id).execute()
        
        if not profile_response.data:
            return jsonify({'error': 'Profile not found'}), 404

        user_data = profile_response.data[0]
        
        return jsonify({
            'user': {
                'id': user_data.get('id'),
                'fullName': user_data.get('full_name') or 'No Name Set',
                'email': user_data.get('email') or '',
                'phoneNumber': '+94 00 000-0000',
                'department': user_data.get('department') or 'General',
                'role': user_data.get('role') or 'user',
                'status': 'Active', 
                'isVerified': True,
                'lastLogin': 'Today',
                'memberSince': user_data.get('created_at')[:10] if user_data.get('created_at') else 'Recently',
                'profileImage': None
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500