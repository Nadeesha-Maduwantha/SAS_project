from flask import Blueprint, request, jsonify
from services.supabase_service import get_supabase
from utils.audit_logger import log_audit_action

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
        return jsonify({
            'message': 'User created successfully',
            'user_id': user_id,
            'email': email
        }), 201

    except Exception as e:
        print("=== ERROR ===")
        traceback.print_exc()
        error_message = type(e).__name__
        return jsonify({'error': error_message}), 400

@bp.route('/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        supabase = get_supabase()
        
        # ... your code to actually delete the user ...
        # e.g., response = supabase.table('users').delete().eq('id', user_id).execute()
        
        # 2. LOG THE ACTION
        # Assuming you know who is doing the deleting (e.g., the currently logged-in Admin's ID)
        admin_id = "uuid-of-the-logged-in-admin" # You'd get this from your auth middleware/token
        
        # Action types and entity types should match the IDs in your database setup!
        ACTION_DELETE = 3       # Example: 3 = Delete
        ENTITY_USER = 1         # Example: 1 = User module
        
        log_audit_action(
            user_id=admin_id,
            action_type_id=ACTION_DELETE,
            entity_type_id=ENTITY_USER,
            entity_id=user_id,
            old_value=None,
            new_value=None,
            description=f"Deleted user account with ID: {user_id}"
        )
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500