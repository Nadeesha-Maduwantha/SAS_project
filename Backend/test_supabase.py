import os
from services.supabase_service import get_supabase

# Load environment variables if using python-dotenv
# from dotenv import load_dotenv
# load_dotenv()

client = get_supabase()

test_email = os.getenv("TEST_USER_EMAIL")
test_password = os.getenv("TEST_USER_PASSWORD")

if not test_email or not test_password:
    print("Error: TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables must be set.")
    exit(1)

try:
    resp = client.auth.sign_up({
        "email": test_email,
        "password": test_password
    })
    print("Success:", resp)
except Exception as e:
    print("Supabase error:", e)