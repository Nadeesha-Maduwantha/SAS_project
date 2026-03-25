# services/supabase_service.py (MOCK VERSION FOR TESTING)

class MockUser:
    def __init__(self, email):
        self.id = '12345678-1234-1234-1234-123456789012'
        self.email = email
        self.identities = [{'id': '1'}]  # Non-empty = new user

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

class MockSupabase:
    def __init__(self):
        self.auth = MockAuth()
    def table(self, name):
        return MockTable()

class MockAuth:
    def sign_up(self, data):
        print(f"Mock signup called with: {data}")
        return MockAuthResponse(data['email'])

def get_supabase():
    return MockSupabase()
# services/supabase_service.py (SQLite VERSION)
import sqlite3

def get_db():
    conn = sqlite3.connect('test.db')
    conn.row_factory = sqlite3.Row
    # Create table if not exists
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
