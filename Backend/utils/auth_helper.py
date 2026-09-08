from flask import request, jsonify
from services.supabase_service import get_supabase
from functools import wraps
import traceback
import jwt
import os


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
            # Decode JWT token WITHOUT verification
            print(f"[AUTH STEP 3] Attempting to decode JWT...")
            decoded = jwt.decode(
                token,
                options={"verify_signature": False},
                algorithms=["ES256", "HS256"],
            )
            print(f"[AUTH STEP 3] SUCCESS: Token decoded")
            print(f"[AUTH STEP 3] Token keys: {list(decoded.keys())}")
            print(f"[AUTH STEP 3] Token content: {decoded}")

            user_id = decoded.get('sub')
            print(f"[AUTH STEP 4] Extracted user_id (sub): {user_id}")

            if not user_id:
                print("[AUTH STEP 4] FAILED: Token missing 'sub' claim")
                return None, None

            print(f"[AUTH STEP 5] Querying profiles table for user_id: {user_id}")
            user_role = None
            try:
                user_role = _fetch_user_role(user_id)
            except Exception as exc:
                print(f"[AUTH STEP 5] Profile lookup error: {exc}")
                user_role = decoded.get('role') or decoded.get('user_role') or 'authenticated'

            print(f"[AUTH STEP 5] Resolved role: {user_role}")
            if user_role is None:
                print(f"[AUTH STEP 5] FAILED: User {user_id} not found in profiles table")
                return None, None

            print(f"[AUTH SUCCESS] User {user_id} authenticated with role {user_role}")
            print("="*80 + "\n")
            return user_id, user_role

        except jwt.DecodeError as e:
            print(f"[AUTH STEP 3] FAILED: JWT decode error: {str(e)}")
            traceback.print_exc()
            return None, None
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