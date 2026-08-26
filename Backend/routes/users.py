from flask import Blueprint, request, jsonify
from datetime import datetime
import traceback
from services.supabase_service import get_supabase
from utils.access_logger import log_access_event
from utils.audit_logger import log_audit_action
from utils.auth_helper import get_current_user

print("=== USERS.PY MODULE LOADED ===")  # ← TOP OF FILE outside function

bp = Blueprint('users', __name__, url_prefix='/api/users')

@bp.route('/create', methods=['POST'])
def create_user():
    try:
        data = request.json

        if not data:
            return jsonify({'error': 'Request body is empty'}), 400

        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400

        # A Super User may only create Sales/Operation accounts — Admin and
        # Super User accounts stay Admin-only. Requesters with no identifiable
        # role (e.g. no/invalid token) aren't super users, so they aren't
        # restricted by this check specifically.
        requester_id, requester_role = get_current_user()
        if (requester_role or '').lower() == 'superuser':
            allowed_roles = {'salesuser', 'operationuser'}
            if (data.get('role') or '').lower() not in allowed_roles:
                return jsonify({'error': 'Super Users can only create Sales User or Operation User accounts'}), 403

        supabase = get_supabase()

        print("=== STEP 1: Creating auth user ===")
        auth_response = supabase.auth.sign_up({
            'email': data.get('email'),
            'password': data.get('password')
        })

        if not auth_response or not auth_response.user:
            return jsonify({'error': 'Failed to create user in Auth.'}), 400

        user_id = str(auth_response.user.id)
        email = str(auth_response.user.email)
        print(f"Auth user created: {user_id} / {email}")

        print("=== STEP 2: Building profile data ===")
        user_data = {
            'id': user_id,
            'email': email,
            'full_name': data.get('fullName') or '',
            'age': int(data.get('age')) if data.get('age') else 0,
            'ethnicity': data.get('ethnicity') or '',
            'role': data.get('role') or '',
            'department': data.get('department') or '',
            'address': data.get('address') or '',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        print(f"Profile data: {user_data}")

        print("=== STEP 3: Inserting into profiles table ===")
        try:
            result = supabase.table('profiles').insert(user_data).execute()
            print(f"Insert result: {result}")
            print(f"Insert data: {result.data}")
        except Exception as table_err:
            print(f"Table Insert Failed: {str(table_err)}")
            traceback.print_exc()
            return jsonify({'error': f'Profile Insert failed: {str(table_err)}'}), 400

        print("=== STEP 4: Success ===")
        log_access_event('Create', status='Success', email_attempted=email, user_id=user_id)

        if requester_id:
            # action_type_id=1 -> CREATE, entity_type_id=2 -> User Profile
            # (matches public.action_types / public.entity_types)
            log_audit_action(
                user_id=requester_id,
                action_type_id=1,
                entity_type_id=2,
                entity_id=user_id,
                new_value=user_data,
                description=f"Created user {email}",
            )

        return jsonify({
            'message': 'User created successfully',
            'user_id': user_id,
            'email': email
        }), 201

    except Exception as e:
        print("=== ERROR ===")
        traceback.print_exc()
        
        # Pull out the exact message if Supabase provided one
        error_message = str(e)
        
        # Provide a cleaner error message if it's the duplicate user error
        if "User already registered" in error_message or "already exists" in error_message:
            error_message = "An account with this email already exists."
            
        return jsonify({'error': error_message}), 400

# Note: DELETE /<user_id> is handled by routes/user_edit.py (the real
# implementation — deletes from Supabase Auth + profiles, logs correctly).
# A dead-stub duplicate of this route used to live here, shadowing it.
