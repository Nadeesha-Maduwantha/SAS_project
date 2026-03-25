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

class MockAuth:
    def sign_up(self, data):
        print(f"Mock signup called with: {data}")
        return MockAuthResponse(data['email'])

    def sign_in_with_password(self, data):
        print(f"Mock sign_in_with_password called with: {data}")
        email = data.get('email', 'mockuser@example.com')
        return MockAuthResponse(email)

    def sign_out(self):
        print("Mock sign_out called")
        return {"success": True}

class MockSupabase:
    def __init__(self):
        self.auth = MockAuth()
    def table(self, name):
        return MockTable()

def get_supabase():
    return MockSupabase()
