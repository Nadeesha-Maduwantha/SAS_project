from flask import Blueprint, request, jsonify
from datetime import datetime
from services.supabase_service import get_supabase
from utils.auth_helper import require_auth, get_current_user
from utils.audit_logger import log_audit_action

security_settings_bp = Blueprint('security_settings', __name__, url_prefix='/api/security-settings')

BOOL_FIELDS = (
    'require_uppercase', 'require_lowercase', 'require_numbers',
    'require_special_chars', 'prevent_reuse',
)


def _row_to_camel(row: dict) -> dict:
    return {
        'minLength': row.get('min_length'),
        'expiryDays': row.get('expiry_days'),
        'requireUppercase': row.get('require_uppercase'),
        'requireLowercase': row.get('require_lowercase'),
        'requireNumbers': row.get('require_numbers'),
        'requireSpecialChars': row.get('require_special_chars'),
        'preventReuse': row.get('prevent_reuse'),
    }


def _general_row_to_camel(row: dict) -> dict:
    return {
        'twoFactorAuth': {
            'requireForAdmins': row.get('two_factor_require_admins'),
        },
        'sessionManagement': {
            'timeoutMinutes': row.get('session_timeout_minutes'),
            'maxConcurrentSessions': row.get('session_max_concurrent'),
            'autoLogoutOnInactivity': row.get('session_auto_logout'),
            'requireReauthForSensitive': row.get('session_require_reauth'),
            'rememberDevice': row.get('session_remember_device'),
        },
        'loginSecurity': {
            'maxFailedAttempts': row.get('login_max_failed_attempts'),
            'lockoutDurationMinutes': row.get('login_lockout_duration_minutes'),
            'enableIPRestrictions': row.get('login_enable_ip_restrictions'),
            'sendSuspiciousAlerts': row.get('login_send_suspicious_alerts'),
            'allowUnrecognizedDevices': row.get('login_allow_unrecognized_devices'),
        },
        'notifications': {
            'notifyFailedAttempts': row.get('notify_failed_attempts'),
            'notifyPasswordChanges': row.get('notify_password_changes'),
            'notifyPermissionChanges': row.get('notify_permission_changes'),
            'notifyNewDeviceLogin': row.get('notify_new_device_login'),
            'dailySummaryEmail': row.get('notify_daily_summary'),
        },
    }


@security_settings_bp.route('/password-policy', methods=['GET'])
@require_auth
def get_password_policy():
    try:
        supabase = get_supabase()
        resp = supabase.table('password_policy_settings').select('*').eq('id', 1).execute()
        if not resp.data:
            return jsonify({'error': 'Password policy has not been initialized'}), 404
        return jsonify({'data': _row_to_camel(resp.data[0])}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@security_settings_bp.route('/password-policy', methods=['PUT'])
@require_auth
def update_password_policy():
    try:
        requester_id, requester_role = get_current_user()
        if (requester_role or '').lower() != 'admin':
            return jsonify({'error': 'Only admins can change the password policy'}), 403

        data = request.json or {}

        min_length = data.get('minLength')
        expiry_days = data.get('expiryDays')

        if not isinstance(min_length, int) or not (4 <= min_length <= 64):
            return jsonify({'error': 'minLength must be an integer between 4 and 64'}), 400
        if not isinstance(expiry_days, int) or expiry_days < 0:
            return jsonify({'error': 'expiryDays must be a non-negative integer'}), 400

        update_data = {
            'min_length': min_length,
            'expiry_days': expiry_days,
            'require_uppercase': bool(data.get('requireUppercase')),
            'require_lowercase': bool(data.get('requireLowercase')),
            'require_numbers': bool(data.get('requireNumbers')),
            'require_special_chars': bool(data.get('requireSpecialChars')),
            'prevent_reuse': bool(data.get('preventReuse')),
            'updated_at': datetime.utcnow().isoformat(),
            'updated_by': requester_id,
        }

        supabase = get_supabase()
        resp = (
            supabase.table('password_policy_settings')
            .update(update_data)
            .eq('id', 1)
            .execute()
        )
        if not resp.data:
            return jsonify({'error': 'Password policy row not found — run the setup migration first'}), 404

        log_audit_action(
            user_id=requester_id,
            action_type_id=2,  # UPDATE
            entity_type_id=4,  # Security Settings (public.entity_types)
            entity_id='password_policy_settings',
            new_value=update_data,
            description='Updated system password policy',
        )

        return jsonify({'data': _row_to_camel(resp.data[0])}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@security_settings_bp.route('/general', methods=['GET'])
@require_auth
def get_general_settings():
    try:
        supabase = get_supabase()
        resp = supabase.table('security_settings_general').select('*').eq('id', 1).execute()
        if not resp.data:
            return jsonify({'error': 'Security settings have not been initialized'}), 404
        return jsonify({'data': _general_row_to_camel(resp.data[0])}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@security_settings_bp.route('/general', methods=['PUT'])
@require_auth
def update_general_settings():
    try:
        requester_id, requester_role = get_current_user()
        if (requester_role or '').lower() != 'admin':
            return jsonify({'error': 'Only admins can change security settings'}), 403

        data = request.json or {}
        two_factor = data.get('twoFactorAuth') or {}
        session = data.get('sessionManagement') or {}
        login = data.get('loginSecurity') or {}
        notifications = data.get('notifications') or {}

        timeout_minutes = session.get('timeoutMinutes')
        max_concurrent = session.get('maxConcurrentSessions')
        max_failed_attempts = login.get('maxFailedAttempts')
        lockout_duration = login.get('lockoutDurationMinutes')

        if not isinstance(timeout_minutes, int) or timeout_minutes <= 0:
            return jsonify({'error': 'sessionManagement.timeoutMinutes must be a positive integer'}), 400
        if not isinstance(max_concurrent, int) or max_concurrent < 1:
            return jsonify({'error': 'sessionManagement.maxConcurrentSessions must be at least 1'}), 400
        if not isinstance(max_failed_attempts, int) or max_failed_attempts < 1:
            return jsonify({'error': 'loginSecurity.maxFailedAttempts must be at least 1'}), 400
        if not isinstance(lockout_duration, int) or lockout_duration < 1:
            return jsonify({'error': 'loginSecurity.lockoutDurationMinutes must be at least 1'}), 400

        update_data = {
            'two_factor_require_admins': bool(two_factor.get('requireForAdmins')),
            'session_timeout_minutes': timeout_minutes,
            'session_max_concurrent': max_concurrent,
            'session_auto_logout': bool(session.get('autoLogoutOnInactivity')),
            'session_require_reauth': bool(session.get('requireReauthForSensitive')),
            'session_remember_device': bool(session.get('rememberDevice')),
            'login_max_failed_attempts': max_failed_attempts,
            'login_lockout_duration_minutes': lockout_duration,
            'login_enable_ip_restrictions': bool(login.get('enableIPRestrictions')),
            'login_send_suspicious_alerts': bool(login.get('sendSuspiciousAlerts')),
            'login_allow_unrecognized_devices': bool(login.get('allowUnrecognizedDevices')),
            'notify_failed_attempts': bool(notifications.get('notifyFailedAttempts')),
            'notify_password_changes': bool(notifications.get('notifyPasswordChanges')),
            'notify_permission_changes': bool(notifications.get('notifyPermissionChanges')),
            'notify_new_device_login': bool(notifications.get('notifyNewDeviceLogin')),
            'notify_daily_summary': bool(notifications.get('dailySummaryEmail')),
            'updated_at': datetime.utcnow().isoformat(),
            'updated_by': requester_id,
        }

        supabase = get_supabase()
        resp = (
            supabase.table('security_settings_general')
            .update(update_data)
            .eq('id', 1)
            .execute()
        )
        if not resp.data:
            return jsonify({'error': 'Security settings row not found — run the setup migration first'}), 404

        log_audit_action(
            user_id=requester_id,
            action_type_id=2,  # UPDATE
            entity_type_id=4,  # Security Settings (public.entity_types)
            entity_id='security_settings_general',
            new_value=update_data,
            description='Updated system security settings',
        )

        return jsonify({'data': _general_row_to_camel(resp.data[0])}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500