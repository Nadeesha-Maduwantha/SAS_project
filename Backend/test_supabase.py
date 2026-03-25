import os
from services.supabase_service import get_supabase

client = get_supabase()


def main() -> None:
    email = os.environ.get("SUPABASE_TEST_EMAIL")
    password = os.environ.get("SUPABASE_TEST_PASSWORD")

    if not email or not password:
        print(
            "Supabase sign_up test skipped: "
            "set SUPABASE_TEST_EMAIL and SUPABASE_TEST_PASSWORD environment variables."
        )
        return

    try:
        resp = client.auth.sign_up(
            {
                "email": email,
                "password": password,
            }
        )
        print("Success:", resp)
    except Exception as e:
        print("Supabase error:", e)


if __name__ == "__main__":
    main()
