import requests
from flask import Blueprint, request, jsonify
from services.supabase_service import get_supabase
from services.security_settings_service import (
    get_login_security_settings,
    is_two_factor_required_for_admins,
    is_new_device_login_notification_enabled,
    get_login_restriction_settings,
)
from utils.auth_helper import require_auth, get_current_user
from utils.access_logger import log_access_event, is_new_device, is_new_ip
from utils.password_policy import is_password_expired
from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import os

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
reset_redirect = f"{FRONTEND_URL.rstrip('/')}/reset-password"

OTP_CODE_LENGTH = 6
OTP_EXPIRY_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_LOCKOUT_MINUTES = 15


def _generate_otp_code() -> str:
    return f"{secrets.randbelow(10 ** OTP_CODE_LENGTH):0{OTP_CODE_LENGTH}d}"


def _send_suspicious_login_alert(email, reason):
    """Security Settings -> 'Send email alerts for suspicious login attempts'.
    Best-effort — never allowed to break the lockout response it's called from."""
    try:
        from services.email_service import send_email
        send_email(
            email,
            'Suspicious login activity on your SAS account',
            f'{reason} If this wasn\'t you, your account is temporarily protected, '
            f'but consider changing your password and contacting an administrator.',
        )
    except Exception as e:
        print(f"Failed to send suspicious-login alert: {e}")

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


# DEBUG ENDPOINT - Remove this after testing
@bp.route('/debug', methods=['GET', 'POST'])
def debug():
    """Debug endpoint to check token and headers"""
    print("[DEBUG ENDPOINT] Called")
    auth_header = request.headers.get('Authorization')
    print(f"[DEBUG] Authorization header: {bool(auth_header)}")
    
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        print(f"[DEBUG] Token length: {len(token)}")
        try:
            decoded = jwt.decode(token, options={"verify_signature": False})
            print(f"[DEBUG] Token decoded successfully")
            print(f"[DEBUG] Token claims: {list(decoded.keys())}")
            print(f"[DEBUG] User ID (sub): {decoded.get('sub')}")
            return jsonify({
                'status': 'ok',
                'token_valid': True,
                'token_keys': list(decoded.keys()),
                'user_id': decoded.get('sub')
            }), 200
        except Exception as e:
            print(f"[DEBUG] Token decode failed: {str(e)}")
            return jsonify({
                'status': 'error',
                'error': str(e)
            }), 400
    
    return jsonify({'status': 'no_token'}), 400


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
    login_restrictions = get_login_restriction_settings()

    # 1. SAFELY CHECK IF USER IS ALREADY LOCKED / BLOCKED
    try:
        profile_response = supabase.table('profiles').select(
            'id, role, department, is_locked, is_blocked, failed_attempts, locked_until, '
            'permanently_locked, password_changed_at'
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

        # Get the actual role from the profile data we fetched earlier, default to 'user' if not found
        actual_role = profile_data.get('role', 'user') if profile_data else 'user'
        device = get_device_info(request.user_agent)
        ip_address = request.remote_addr or 'Unknown'

        # 3b. TWO-FACTOR GATE — three independent reasons can trigger it:
        #   - admin account + 'Required for admin users' toggle
        #   - 'Enable IP-based access restrictions' + this IP differs from
        #     the account's last successful login
        #   - 'Allow login from unrecognized devices' is OFF + this device
        #     has never completed a successful login for this account
        # Credentials were correct, so this is a 200 with no access_token yet,
        # not an error. The real token was already issued by Supabase Auth
        # above; we hold it in the profile row until the code is verified.
        require_2fa = (
            ((actual_role or '').lower() == 'admin' and is_two_factor_required_for_admins())
            or (login_restrictions['enable_ip_restrictions'] and is_new_ip(user_id, ip_address))
            or (not login_restrictions['allow_unrecognized_devices'] and is_new_device(user_id, device))
        )

        if require_2fa:
            code = _generate_otp_code()
            now_utc = datetime.now(timezone.utc)
            try:
                supabase.table('profiles').update({
                    'otp_code_hash': hashlib.sha256(code.encode()).hexdigest(),
                    'otp_expires_at': (now_utc + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat(),
                    'otp_attempts': 0,
                    'otp_locked_until': None,
                    'otp_pending_access_token': response.session.access_token,
                    'otp_pending_refresh_token': response.session.refresh_token,
                }).eq('id', user_id).execute()
            except Exception as e:
                print(f"Failed to store OTP challenge: {e}")
                return jsonify({'error': 'Unable to start verification. Please try again.'}), 500

            try:
                from services.email_service import send_email
                send_email(
                    email,
                    'Your SAS verification code',
                    f'Your SAS Systems verification code is {code}. It expires in '
                    f'{OTP_EXPIRY_MINUTES} minutes. If you did not request this, contact an administrator.',
                )
            except Exception as email_err:
                print(f"Failed to send 2FA email: {email_err}")
                return jsonify({'error': 'Could not send verification code. Please try again shortly.'}), 500

            log_access_event('2FA Code Sent', status='Success', email_attempted=email, user_id=user_id)
            return jsonify({'message': 'Verification code required', 'twoFactorRequired': True, 'email': email}), 200

        # LOG SUCCESSFUL ACCESS
        # Checked BEFORE inserting this login's own access_logs row below —
        # otherwise that row would already be there to match against itself.
        new_device = is_new_device_login_notification_enabled() and is_new_device(user_id, device)
        try:
            supabase.table('access_logs').insert({
                'action': 'Login',
                'ip_address': ip_address,
                'location': get_location_from_ip(request.remote_addr),
                'device': device,
                'status': 'Success',
                'email_attempted': email,
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat()
            }).execute()
        except Exception as log_err:
            print(f"Failed to record access log: {log_err}")

        if new_device:
            log_access_event('New Device Login', status='Success', email_attempted=email, user_id=user_id)

        user_payload = {
            'id': user_id,
            'email': str(response.user.email),
            'role': actual_role,
            'department': profile_data.get('department') if profile_data else None
        }

        if is_password_expired(profile_data.get('password_changed_at') if profile_data else None):
            return jsonify({
                'message': 'Password expired',
                'passwordExpired': True,
                'access_token': response.session.access_token,
                'user': user_payload,
            }), 200

        return jsonify({
            'message': 'Login successful',
            'access_token': response.session.access_token,
            'user': user_payload,
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

                if login_restrictions['send_suspicious_alerts']:
                    _send_suspicious_login_alert(
                        email,
                        'Repeated failed login attempts on your account have permanently locked it.'
                    )

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
                if login_restrictions['send_suspicious_alerts']:
                    _send_suspicious_login_alert(
                        email,
                        f'{max_attempts} consecutive failed login attempts on your account have triggered a temporary lockout.'
                    )
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


@bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json or {}
    email = data.get('email')
    code = str(data.get('code') or '').strip()

    if not email or not code:
        return jsonify({'error': 'Email and code are required'}), 400

    supabase = get_supabase()
    now = datetime.now(timezone.utc)

    try:
        resp = supabase.table('profiles').select(
            'id, role, department, otp_code_hash, otp_expires_at, otp_attempts, '
            'otp_locked_until, otp_pending_access_token, otp_pending_refresh_token, password_changed_at'
        ).eq('email', email).execute()
        profile_data = resp.data[0] if resp.data else None
    except Exception:
        return jsonify({'error': 'Unable to verify code'}), 500

    if not profile_data or not profile_data.get('otp_code_hash'):
        return jsonify({'error': 'No verification code is pending for this account. Please log in again.'}), 400

    user_id = profile_data['id']

    # Locked out from too many wrong codes?
    locked_until = None
    if profile_data.get('otp_locked_until'):
        try:
            locked_until = datetime.fromisoformat(profile_data['otp_locked_until'].replace('Z', '+00:00'))
        except Exception:
            locked_until = None
    if locked_until and now < locked_until:
        return jsonify({'error': f'Too many incorrect codes. Try again after {locked_until.isoformat()}.'}), 403

    # Expired?
    expired = True
    if profile_data.get('otp_expires_at'):
        try:
            expired = now >= datetime.fromisoformat(profile_data['otp_expires_at'].replace('Z', '+00:00'))
        except Exception:
            expired = True
    if expired:
        try:
            supabase.table('profiles').update({
                'otp_code_hash': None,
                'otp_expires_at': None,
                'otp_attempts': 0,
                'otp_pending_access_token': None,
                'otp_pending_refresh_token': None,
            }).eq('id', user_id).execute()
        except Exception:
            pass
        return jsonify({'error': 'Verification code expired. Please log in again.'}), 400

    if hashlib.sha256(code.encode()).hexdigest() != profile_data.get('otp_code_hash'):
        attempts = (profile_data.get('otp_attempts') or 0) + 1
        update_payload = {'otp_attempts': attempts}
        locked_now = attempts >= OTP_MAX_ATTEMPTS
        if locked_now:
            update_payload.update({
                'otp_locked_until': (now + timedelta(minutes=OTP_LOCKOUT_MINUTES)).isoformat(),
                'otp_code_hash': None,
                'otp_pending_access_token': None,
                'otp_pending_refresh_token': None,
            })
        try:
            supabase.table('profiles').update(update_payload).eq('id', user_id).execute()
        except Exception:
            pass

        log_access_event('Failed 2FA Verification', status='Failed', email_attempted=email, user_id=user_id)

        if locked_now:
            return jsonify({'error': f'Too many incorrect codes. Locked for {OTP_LOCKOUT_MINUTES} minutes.'}), 403
        return jsonify({'error': 'Incorrect verification code.'}), 401

    access_token = profile_data.get('otp_pending_access_token')
    if not access_token:
        return jsonify({'error': 'Session expired. Please log in again.'}), 400

    try:
        supabase.table('profiles').update({
            'otp_code_hash': None,
            'otp_expires_at': None,
            'otp_attempts': 0,
            'otp_locked_until': None,
            'otp_pending_access_token': None,
            'otp_pending_refresh_token': None,
        }).eq('id', user_id).execute()
    except Exception:
        pass

    # Checked BEFORE log_access_event('Login', ...) inserts this login's own
    # access_logs row below — otherwise that row would match against itself.
    device = get_device_info(request.user_agent)
    new_device = is_new_device_login_notification_enabled() and is_new_device(user_id, device)

    log_access_event('Login', status='Success', email_attempted=email, user_id=user_id)

    if new_device:
        log_access_event('New Device Login', status='Success', email_attempted=email, user_id=user_id)

    user_payload = {
        'id': user_id,
        'email': email,
        'role': profile_data.get('role', 'user'),
        'department': profile_data.get('department'),
    }

    if is_password_expired(profile_data.get('password_changed_at')):
        return jsonify({
            'message': 'Password expired',
            'passwordExpired': True,
            'access_token': access_token,
            'user': user_payload,
        }), 200

    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': user_payload,
    }), 200


@bp.route('/logout', methods=['POST'])
def logout():
    try:
        supabase = get_supabase()

        # Identify the caller (if a valid token is present) so the logout
        # can be recorded in access_logs, same as Login.
        user_id, _ = get_current_user()
        if user_id:
            email = None
            try:
                profile = supabase.table('profiles').select('email').eq('id', user_id).execute()
                if profile.data:
                    email = profile.data[0].get('email')
            except Exception:
                pass
            log_access_event('Logout', status='Success', email_attempted=email, user_id=user_id)

        supabase.auth.sign_out()
        return jsonify({'message': 'Logout successful'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    print("[ME ENDPOINT] /me endpoint called")
    try:
        user_id, user_role = get_current_user()
        print(f"[ME ENDPOINT] Got user_id: {user_id}, user_role: {user_role}")
        
        if not user_id:
            print("[ME ENDPOINT] User ID is None, returning 401")
            return jsonify({'error': 'Unauthorized'}), 401
            
        supabase = get_supabase()
        
        # 1. ADD 'phoneNumber' to the select query to fetch the column
        profile_response = supabase.table('profiles').select(
            'id, full_name, email, role, department, phoneNumber, created_at, avatar_url'
        ).eq('id', user_id).execute()
        
        print(f"[ME ENDPOINT] Profile query returned: {bool(profile_response.data)}")
        
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
                'avatarUrl': user_data.get('avatar_url')
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
        email,
        {'redirect_to': reset_redirect},
    )

    return jsonify({'message': 'Password reset email sent'}), 200
