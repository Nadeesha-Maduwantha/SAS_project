from services.supabase_service import get_supabase

client = get_supabase()
try:
    resp = client.auth.sign_up({
        "email": "yourrealaddress@gmail.com",
        "password": "Pass123!Test"
    })
    print("Success:", resp)
except Exception as e:
    print("Supabase error:", e)