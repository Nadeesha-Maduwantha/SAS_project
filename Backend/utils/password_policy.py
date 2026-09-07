import string
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from services.supabase_service import get_supabase
from services.security_settings_service import get_password_policy

PASSWORD_HISTORY_LIMIT = 5


def validate_password_complexity(password: str) -> str | None:
    """Returns an error message if `password` violates the configured
    Password Policy (Security Settings), else None."""
    policy = get_password_policy()

    if len(password) < policy['min_length']:
        return f"Password must be at least {policy['min_length']} characters long."
    if policy['require_uppercase'] and not any(c.isupper() for c in password):
        return "Password must include an uppercase letter."
    if policy['require_lowercase'] and not any(c.islower() for c in password):
        return "Password must include a lowercase letter."
    if policy['require_numbers'] and not any(c.isdigit() for c in password):
        return "Password must include a number."
    if policy['require_special_chars'] and not any(c in string.punctuation for c in password):
        return "Password must include a special character."
    return None


def is_password_reused(user_id: str, password: str) -> bool:
    """True if `password` matches one of this user's last
    PASSWORD_HISTORY_LIMIT stored password hashes. Only checked when
    'Prevent password reuse' is on; False (and no lookup) otherwise."""
    if not get_password_policy()['prevent_reuse']:
        return False
    try:
        supabase = get_supabase()
        rows = (
            supabase.table('password_history')
            .select('password_hash')
            .eq('user_id', user_id)
            .order('created_at', desc=True)
            .limit(PASSWORD_HISTORY_LIMIT)
            .execute()
        ).data or []
        return any(check_password_hash(r['password_hash'], password) for r in rows)
    except Exception:
        return False


def record_password_history(user_id: str, password: str) -> None:
    """Stores this password's hash (for future reuse checks) and stamps
    profiles.password_changed_at (for expiry tracking). Best-effort — a
    logging failure here should never break the password change itself."""
    try:
        supabase = get_supabase()
        supabase.table('password_history').insert({
            'user_id': user_id,
            'password_hash': generate_password_hash(password),
        }).execute()
        supabase.table('profiles').update({
            'password_changed_at': datetime.utcnow().isoformat(),
        }).eq('id', user_id).execute()
    except Exception as err:
        print(f"Failed to record password history: {err}")


def is_password_expired(password_changed_at) -> bool:
    """True if the account's password is older than the configured expiry
    window. An expiry_days of 0 (or a missing timestamp) means 'never
    expires', so this never blocks accounts predating this feature."""
    policy = get_password_policy()
    if not policy['expiry_days'] or not password_changed_at:
        return False
    try:
        changed = datetime.fromisoformat(str(password_changed_at).replace('Z', '+00:00'))
        if changed.tzinfo:
            changed = changed.replace(tzinfo=None)
        return datetime.utcnow() - changed > timedelta(days=policy['expiry_days'])
    except Exception:
        return False
