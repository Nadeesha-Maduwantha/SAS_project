import hashlib
from services.supabase_service import get_supabase


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def count_active_sessions(user_id: str) -> int:
    """Best-effort count of this user's currently tracked sessions. Fails
    open (0) on any DB error, so an outage never blocks a legitimate login."""
    try:
        supabase = get_supabase()
        rows = (
            supabase.table('active_sessions')
            .select('id')
            .eq('user_id', user_id)
            .execute()
        ).data or []
        return len(rows)
    except Exception:
        return 0


def register_session(user_id: str, token: str, ip_address=None, device=None) -> None:
    """Records a newly issued session so it counts toward Security Settings ->
    Session Management -> 'Max concurrent sessions'. Best-effort — a logging
    failure here must never break the login it's for."""
    try:
        supabase = get_supabase()
        supabase.table('active_sessions').insert({
            'user_id': user_id,
            'token_hash': _hash_token(token),
            'ip_address': ip_address,
            'device': device,
        }).execute()
    except Exception as err:
        print(f"Failed to register active session: {err}")


def remove_session(token: str) -> None:
    """Removes one session's tracking row (on logout), freeing its slot.
    Best-effort — logout should still succeed even if this fails."""
    try:
        supabase = get_supabase()
        supabase.table('active_sessions').delete().eq('token_hash', _hash_token(token)).execute()
    except Exception as err:
        print(f"Failed to remove active session: {err}")
