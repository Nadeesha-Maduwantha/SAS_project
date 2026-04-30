from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Missing Supabase configuration. Add SUPABASE_URL and SUPABASE_KEY "
        "to Backend/.env, or use the existing lowercase supabase_url and "
        "supabase_key names."
    )

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
