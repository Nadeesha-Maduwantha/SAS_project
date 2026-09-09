import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("supabase_url")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("supabase_key")

# Service-role key: required for privileged operations that the anon key
# can't perform — auth.admin.* calls, and table writes that must bypass RLS
# (e.g. deleting a profile row regardless of row-level policies).
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("supabase_service_role_key")
