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