from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY


def get_supabase_client():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "Missing Supabase configuration. Add SUPABASE_URL and SUPABASE_KEY "
            "to Backend/.env, or use the existing lowercase supabase_url and "
            "supabase_key names."
        )

    return create_client(SUPABASE_URL, SUPABASE_KEY)


class LazySupabaseClient:
    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = get_supabase_client()
        return self._client

    def reset(self):
        """Drop the cached client so the next call opens a fresh connection pool.
        Callers use this after a transport-level error (dropped/corrupted keep-alive
        connection) instead of retrying on the same broken connection."""
        self._client = None

    def __getattr__(self, name):
        return getattr(self._get_client(), name)


supabase = LazySupabaseClient()
