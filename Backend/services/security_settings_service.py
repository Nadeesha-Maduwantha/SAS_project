from services.supabase_client import supabase

DEFAULT_MAX_FAILED_ATTEMPTS = 5
DEFAULT_LOCKOUT_DURATION_MINUTES = 30


def get_login_security_settings() -> dict:
    """Returns {'max_failed_attempts': int, 'lockout_duration_minutes': int}.

    Falls back to safe defaults if the settings row is missing so login
    lockout enforcement never breaks because a settings row wasn't seeded.
    """
    try:
        resp = (
            supabase.table('security_settings_general')
            .select('login_max_failed_attempts, login_lockout_duration_minutes')
            .eq('id', 1)
            .execute()
        )
        row = resp.data[0] if resp.data else {}
    except Exception:
        row = {}

    return {
        'max_failed_attempts': row.get('login_max_failed_attempts') or DEFAULT_MAX_FAILED_ATTEMPTS,
        'lockout_duration_minutes': row.get('login_lockout_duration_minutes') or DEFAULT_LOCKOUT_DURATION_MINUTES,
    }


def is_two_factor_required_for_admins() -> bool:
    """True when Security Settings -> Two-Factor Auth -> 'Required for admin
    users' is on. Defaults to False if the settings row is missing, so an
    unseeded settings row never blocks admin logins outright."""
    try:
        resp = (
            supabase.table('security_settings_general')
            .select('two_factor_require_admins')
            .eq('id', 1)
            .execute()
        )
        row = resp.data[0] if resp.data else {}
    except Exception:
        row = {}

    return bool(row.get('two_factor_require_admins'))


def is_new_device_login_notification_enabled() -> bool:
    """True when Security Settings -> Security Notifications -> 'Notify on
    new device login' is on."""
    try:
        resp = (
            supabase.table('security_settings_general')
            .select('notify_new_device_login')
            .eq('id', 1)
            .execute()
        )
        row = resp.data[0] if resp.data else {}
    except Exception:
        row = {}

    return bool(row.get('notify_new_device_login'))


def get_notification_preferences() -> dict:
    """Returns the four Security Notifications toggles as booleans, all
    defaulting to False if the settings row is missing."""
    try:
        resp = (
            supabase.table('security_settings_general')
            .select(
                'notify_failed_attempts, notify_password_changes, '
                'notify_permission_changes, notify_new_device_login'
            )
            .eq('id', 1)
            .execute()
        )
        row = resp.data[0] if resp.data else {}
    except Exception:
        row = {}

    return {
        'failed_attempts': bool(row.get('notify_failed_attempts')),
        'password_changes': bool(row.get('notify_password_changes')),
        'permission_changes': bool(row.get('notify_permission_changes')),
        'new_device_login': bool(row.get('notify_new_device_login')),
    }


def get_login_restriction_settings() -> dict:
    """Returns the three Login Security toggles from Security Settings:
    'Enable IP-based access restrictions', 'Send email alerts for suspicious
    login attempts', 'Allow login from unrecognized devices'.

    'allow_unrecognized_devices' defaults to True (no restriction) when unset,
    matching today's behavior before this setting existed. The other two
    default to False (off), same convention as every other toggle here."""
    try:
        resp = (
            supabase.table('security_settings_general')
            .select(
                'login_enable_ip_restrictions, login_send_suspicious_alerts, '
                'login_allow_unrecognized_devices'
            )
            .eq('id', 1)
            .execute()
        )
        row = resp.data[0] if resp.data else {}
    except Exception:
        row = {}

    allow_unrecognized = row.get('login_allow_unrecognized_devices')
    return {
        'enable_ip_restrictions': bool(row.get('login_enable_ip_restrictions')),
        'send_suspicious_alerts': bool(row.get('login_send_suspicious_alerts')),
        'allow_unrecognized_devices': True if allow_unrecognized is None else bool(allow_unrecognized),
    }