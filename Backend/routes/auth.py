import requests
from flask import Blueprint, request, jsonify
from services.supabase_service import get_supabase
from services.security_settings_service import get_login_security_settings
from utils.auth_helper import require_auth, get_current_user
from datetime import datetime, timedelta, timezone
import os

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
reset_redirect = f"{FRONTEND_URL.rstrip('/')}/reset-password"

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
    is_probation_attempt = False
    now = datetime.now(timezone.utc)

    # 1. SAFELY CHECK IF USER IS ALREADY LOCKED / BLOCKED
    try:
        profile_response = supabase.table('profiles').select(
            'id, role, department, is_locked, is_blocked, failed_attempts, locked_until, permanently_locked'
        ).eq('email', email).execute()
        if profile_response.data:
            profile_data = profile_response.data[0]
    except Exception as e:
        print(f"Warning: Could not fetch profile status: {e}")

    # REJECT IF ADMINISTRATIVELY BLOCKED
    if profile_data and profile_data.get('is_blocked'):
        return jsonify({'error': 'Your access has been suspended by an administrator.'}), 403

    # REJECT IF PERMANENTLY LOCKED (failed the probation attempt after a prior temporary lockout)
    if profile_data and profile_data.get('permanently_locked'):
        return jsonify({'error': 'Account permanently locked due to repeated failed login attempts. Contact an admin to unlock it.'}), 403

    # Reject or allow-as-probation if temporarily locked from failed attempts
    if profile_data and profile_data.get('is_locked'):
        locked_until = None
        locked_until_raw = profile_data.get('locked_until')
        if locked_until_raw:
            try:
                locked_until = datetime.fromisoformat(locked_until_raw.replace('Z', '+00:00'))
            except Exception:
                locked_until = None

        if locked_until and now < locked_until:
            return jsonify({'error': f'Account locked until {locked_until.isoformat()}. Please try again later.'}), 403
        elif locked_until and now >= locked_until:
            # Lockout period has expired — this login attempt is a one-shot probation:
            # success clears the lock, failure locks the account permanently.
            is_probation_attempt = True
        else:
            # is_locked with no expiry recorded — treat as still locked (safe default).
            return jsonify({'error': 'Account is locked. Please contact an admin to unlock.'}), 403

    try:
        # 2. AUTHENTICATE USER
        response = supabase.auth.sign_in_with_password({
            'email': email,
            'password': password
        })
        user_id = str(response.user.id)

        # 3. SAFELY RESET FAILED ATTEMPTS / LOCK STATE ON SUCCESS
        if profile_data and (
            profile_data.get('failed_attempts', 0) > 0
            or profile_data.get('is_locked')
            or profile_data.get('permanently_locked')
        ):
            try:
                supabase.table('profiles').update({
                    'failed_attempts': 0,
                    'is_locked': False,
                    'locked_until': None,
                    'permanently_locked': False,
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
                'role': actual_role,
                'department': profile_data.get('department') if profile_data else None
            }
        }), 200

    except Exception as e:
        # 4. SAFELY HANDLE THE FAILED ATTEMPT
        if profile_data:
            if is_probation_attempt:
                # Failed the one-shot probation attempt after a temporary lockout expired
                # -> lock permanently, requires an admin/superuser to unlock.
                try:
                    supabase.table('profiles').update({
                        'permanently_locked': True,
                        'is_locked': True,
                        'locked_until': None,
                    }).eq('email', email).execute()
                except Exception:
                    pass

                return jsonify({'error': 'Account permanently locked due to a failed login after the temporary lockout period. Contact an admin to unlock it.'}), 403

            current_attempts = profile_data.get('failed_attempts', 0) + 1
            login_security = get_login_security_settings()
            max_attempts = login_security['max_failed_attempts']
            lockout_minutes = login_security['lockout_duration_minutes']
            is_locked = current_attempts >= max_attempts

            update_payload = {'failed_attempts': current_attempts, 'is_locked': is_locked}
            if is_locked:
                update_payload['locked_until'] = (now + timedelta(minutes=lockout_minutes)).isoformat()

            try:
                supabase.table('profiles').update(update_payload).eq('email', email).execute()
            except Exception:
                pass

            if is_locked:
                return jsonify({'error': f'Account locked for {lockout_minutes} minutes due to {max_attempts} consecutive failed login attempts.'}), 403

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
        
        # 1. ADD 'phoneNumber' to the select query to fetch the column
        profile_response = supabase.table('profiles').select(
            'id, full_name, email, role, department, phoneNumber, created_at'
        ).eq('id', user_id).execute()
        
        if not profile_response.data:
            return jsonify({'error': 'Profile not found'}), 404

        user_data = profile_response.data[0]
        
        return jsonify({
            'user': {
                'id': user_data.get('id'),
                'fullName': user_data.get('full_name') or 'No Name Set',
                'email': user_data.get('email') or '',
                'phoneNumber': user_data.get('phoneNumber') or 'Not Set',
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

@bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    supabase = get_supabase()
    supabase.auth.reset_password_email(
        email=email,
        redirect_to=reset_redirect,
    )

    return jsonify({'message': 'Password reset email sent'}), 200
