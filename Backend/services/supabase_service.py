import os
import sqlite3

# Import real supabase client requirements
try:
    from supabase import create_client, Client
except ImportError:
    pass # Handle this as you see fit or ensure it's in requirements.txt

# --- MOCK CLASSES REMAIN THE SAME ---
class MockUser:
    def __init__(self, email):
        self.id = '12345678-1234-1234-1234-123456789012'
        self.email = email
        self.identities = [{'id': '1'}]

class MockAuthResponse:
    def __init__(self, email):
        self.user = MockUser(email)

class MockTable:
    def insert(self, data):
        print(f"Mock insert: {data}")
        return self
    def execute(self):
        print("Mock execute called")
        return {'data': 'ok'}

class MockAuth:
    def sign_up(self, data):
        print(f"Mock signup called with: {data}")
        return MockAuthResponse(data['email'])

class MockSupabase:
    def __init__(self):
        self.auth = MockAuth()
    def table(self, name):
        return MockTable()

# --- REAL CLIENT INITIALIZATION LOGIC ---

def get_supabase():
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
    
    use_mock: str = os.environ.get("USE_MOCK_SUPABASE", "false").lower()
    
    # If the environment variable USE_MOCK_SUPABASE explicitly says "true",
    # or if we are missing actual credentials, fall back to the mock for safety.
    if use_mock == "true" or not url or not key:
        print("WARNING: Returning MOCK Supabase client")
        return MockSupabase()
    
    # Otherwise, return the REAL Supabase client
    return create_client(url, key)

# --- SQLITE VERSION CONTINUES BELOW ---
def get_db():
    conn = sqlite3.connect('test.db')
    conn.row_factory = sqlite3.Row
    conn.execute('''
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            email TEXT,
            full_name TEXT,
            age INTEGER,
            ethnicity TEXT,
            role TEXT,
            department TEXT,
            address TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    ''')
    conn.commit()
    return conn
