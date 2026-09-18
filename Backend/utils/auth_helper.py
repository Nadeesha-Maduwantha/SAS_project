from flask import request, jsonify
from services.supabase_service import get_supabase
from functools import wraps
import traceback


def _fetch_user_role(user_id):
    """Best-effort role lookup. If Supabase drops the connection, fall back to the
    token's role claim so the request can still be authorized instead of failing
    with a transient transport error.
    """
    for attempt in range(2):
        try:
            supabase = get_supabase()
            profiles = supabase.table('profiles').select('role').eq('id', user_id).execute()
            if profiles and getattr(profiles, 'data', None):
                return profiles.data[0].get('role')
            return None
        except Exception as exc:
            if attempt == 0:
                print(f"[AUTH] Profile lookup failed, retrying once: {exc}")
                continue
            print(f"[AUTH] Profile lookup failed after retry: {exc}")
            raise


def get_current_user():
    """Extract current user from JWT token in Authorization header"""
    print("\n" + "="*80)
    print("[AUTH] get_current_user() called")
    print("="*80)

    try:
        auth_header = request.headers.get('Authorization')
        print(f"[AUTH STEP 1] Authorization header present: {bool(auth_header)}")
        if auth_header:
            print(f"[AUTH STEP 1] Auth header value: {auth_header[:50]}...")

        if not auth_header or not auth_header.startswith('Bearer '):
            print("[AUTH STEP 1] FAILED: Missing or invalid Authorization header")
            return None, None

        token = auth_header.split(' ')[1]
        print(f"[AUTH STEP 2] Token extracted, length: {len(token)}")

        try:
            # Verify the token against Supabase's Auth server rather than
            # trusting its (unverified) claims locally.
            print(f"[AUTH STEP 3] Verifying token with Supabase...")
            supabase = get_supabase()
            user_response = supabase.auth.get_user(token)
            user = user_response.user if user_response else None

            if not user or not user.id:
                print("[AUTH STEP 3] FAILED: Token rejected by Supabase")
                return None, None

            user_id = str(user.id)
            print(f"[AUTH STEP 3] SUCCESS: Token verified for user_id: {user_id}")

            print(f"[AUTH STEP 4] Querying profiles table for user_id: {user_id}")

            # Fetch user role from profiles table
            profiles = supabase.table('profiles').select('role').eq('id', user_id).execute()
            print(f"[AUTH STEP 4] Query returned data: {bool(profiles.data)}")
            if profiles.data:
                print(f"[AUTH STEP 4] Profile data: {profiles.data}")

            if not profiles.data:
                print(f"[AUTH STEP 4] FAILED: User {user_id} not found in profiles table")
                return None, None

            user_role = profiles.data[0]['role']
            print(f"[AUTH SUCCESS] User {user_id} authenticated with role {user_role}")
            print("="*80 + "\n")
            return user_id, user_role

        except Exception as e:
            print(f"[AUTH EXCEPTION] Token validation failed: {str(e)}")
            traceback.print_exc()
            return None, None

    except Exception as e:
        print(f"[AUTH EXCEPTION] Outer exception: {str(e)}")
        traceback.print_exc()
        return None, None
    finally:
        print("="*80 + "\n")



def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id, user_role = get_current_user()
        if not user_id:
            return jsonify({'error': 'Unauthorized - Invalid or missing token'}), 401
        return f(*args, **kwargs)
    return decorated_function