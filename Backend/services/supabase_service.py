import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

def get_supabase() -> Client:
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("Missing Supabase URL or Key in environment variables.")
    
    print(f"Connecting to Supabase: {url}")  # ← debug print
    return create_client(url, key)