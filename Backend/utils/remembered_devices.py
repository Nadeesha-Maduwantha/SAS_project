import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from services.supabase_service import get_supabase

REMEMBER_DEVICE_DAYS = 30


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def register_remembered_device(user_id: str) -> str | None:
    """Issues a new opaque device token valid for REMEMBER_DEVICE_DAYS and
    stores its hash. Returns the raw token for the client to keep, or None if
    it couldn't be recorded — best-effort, never blocks the login it's for."""
    token = secrets.token_urlsafe(32)
    try:
        supabase = get_supabase()
        supabase.table('remembered_devices').insert({
            'user_id': user_id,
            'token_hash': _hash_token(token),
            'expires_at': (datetime.now(timezone.utc) + timedelta(days=REMEMBER_DEVICE_DAYS)).isoformat(),
        }).execute()
        return token
    except Exception as err:
        print(f"Failed to register remembered device: {err}")
        return None


def is_remembered_device(user_id: str, token: str) -> bool:
    """True if `token` is a valid, unexpired remembered-device token for this
    user. Fails closed (False) on any error or missing token — unlike most
    checks in this codebase, a lookup failure here must never silently skip
    2FA."""
    if not token:
        return False
    try:
        supabase = get_supabase()
        rows = (
            supabase.table('remembered_devices')
            .select('expires_at')
            .eq('user_id', user_id)
            .eq('token_hash', _hash_token(token))
            .execute()
        ).data or []
        if not rows:
            return False
        expires_at = datetime.fromisoformat(str(rows[0]['expires_at']).replace('Z', '+00:00'))
        return datetime.now(timezone.utc) < expires_at
    except Exception:
        return False
