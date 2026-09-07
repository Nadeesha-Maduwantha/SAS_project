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


# ── transient-connection retry ────────────────────────────────────────────────
# Supabase runs over a keep-alive HTTPS connection. When that socket has been
# idle and the server (or a proxy) drops it, the next request reuses the dead
# socket and Windows raises "[WinError 10054] An existing connection was forcibly
# closed by the remote host" (other platforms: connection reset / broken pipe /
# RemoteProtocolError). It's transient: dropping the cached client and retrying
# on a fresh connection succeeds. Wrap read/execute calls in this.
_TRANSIENT_MARKERS = (
    '10054', 'forcibly closed', 'connection reset', 'connection aborted',
    'broken pipe', 'server disconnected', 'remoteprotocolerror',
    'connection closed', 'peer closed', 'econnreset',
)


def _is_transient(exc):
    msg = str(exc).lower()
    return any(m in msg for m in _TRANSIENT_MARKERS)


def run_with_retry(fn, attempts=3):
    """Run a Supabase call, resetting the client and retrying on a transient
    dropped-connection error. `fn` should perform the query and return its result
    (e.g. `lambda: supabase.table('x').select('*').execute()`)."""
    last = None
    for attempt in range(attempts):
        try:
            return fn()
        except Exception as e:
            last = e
            if attempt < attempts - 1 and _is_transient(e):
                supabase.reset()   # drop the dead connection; next call reconnects
                continue
            raise
    raise last
