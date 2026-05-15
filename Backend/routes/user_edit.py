from flask import Blueprint, request, jsonify
from services.supabase_service import get_supabase
from datetime import datetime
import traceback
from utils.audit_logger import log_audit_action
from utils.auth_helper import get_current_user  # Used to get the user who is doing the edit

bp = Blueprint('user_edit', __name__, url_prefix='/api/users')

@bp.route('/search', methods=['GET'])
def search_user():
    try:
        email = request.args.get('email')
        if not email:
            return jsonify({'error': 'Email parameter is required'}), 400

        supabase = get_supabase()
        
        # Search the profiles table by email
        result = supabase.table('profiles').select('*').eq('email', email).execute()
        
        if not result.data:
            return jsonify({'error': 'User not found'}), 404

        profile = result.data[0]
        
        # --- NEW LOGIC: DETERMINE USER ACTION STATE FROM DB ---
        # If is_blocked is True, the checkbox should reflect 'block', else 'unblock'
        is_blocked = profile.get('is_blocked', False)
        user_action_state = 'block' if is_blocked else 'unblock'
        
        user_data = {
            'id': profile.get('id'),
            'fullName': profile.get('full_name', ''),
            'email': profile.get('email', ''),
            'department': profile.get('department', ''),
            'role': profile.get('role', 'Custom Configuration'),
            'userAction': user_action_state, # <--- Updated to match DB state
            'unlockAccount': False
        }

        return jsonify({'message': 'User found', 'user': user_data}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        data = request.json
        supabase = get_supabase()
        
        # Get the ID of the person making the change
        requester_id, requester_role = get_current_user()

        # Build update payload dynamically based on what was sent
        update_data = {}
        if 'fullName' in data: 
            update_data['full_name'] = data['fullName']
        if 'department' in data: 
            update_data['department'] = data['department']
        if 'role' in data: 
            update_data['role'] = data['role']
            
        # --- NEW LOGIC: HANDLE BLOCK / UNBLOCK ACCOUNT ---
        if 'userAction' in data:
            if data['userAction'] == 'block':
                update_data['is_blocked'] = True
            elif data['userAction'] == 'unblock':
                update_data['is_blocked'] = False
                
        # Handle 'unlockAccount' (from failed logins) Action if checked
        if data.get('unlockAccount'):
            update_data['is_locked'] = False
            update_data['failed_attempts'] = 0

        if update_data:
            update_data['updated_at'] = datetime.now().isoformat()
            supabase.table('profiles').update(update_data).eq('id', user_id).execute()
            
            # --- ADD THIS: LOG TO AUDIT TRAIL ---
            if requester_id:
                # Assuming 2 is the ID for "Update" action in your action_types table
                # Assuming 1 is the ID for "User Management" entity in your entity_types table
                log_audit_action(
                    user_id=requester_id, 
                    action_type_id=2, 
                    entity_type_id=1, 
                    entity_id=user_id,
                    new_value=update_data, 
                    description=f"Updated user profile for ID: {user_id}"
                )

        return jsonify({'message': 'User updated successfully'}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete a user with role-based authorization"""
    try:
        if not user_id or len(user_id.strip()) == 0:
            return jsonify({'error': 'Invalid user ID'}), 400
        
        supabase = get_supabase()
        
        # Get current user info from token
        requester_id, requester_role = get_current_user()
        
        if not requester_id:
            return jsonify({
                'error': 'Unauthorized',
                'details': 'Invalid or missing authentication token'
            }), 401
        
        print(f"Delete request: requester={requester_id} (role={requester_role}), target={user_id}")
        
        # Check if requester is Admin
        if requester_role not in ['Admin', 'admin']:
            return jsonify({
                'error': 'Forbidden',
                'details': f'Users with role "{requester_role}" cannot delete other users'
            }), 403
        
        # Check if target user exists
        target_user = supabase.table('profiles').select('role, email').eq('id', user_id).execute()
        
        if not target_user.data:
            return jsonify({
                'error': 'Not Found',
                'details': 'User does not exist'
            }), 404
        
        target_role = target_user.data[0]['role']
        target_email = target_user.data[0]['email']
        
        print(f"Target user found: {target_email} (role={target_role})")
        
        # Delete from auth
        try:
            supabase.auth.admin.delete_user(user_id)
            print(f"Auth user deleted: {user_id}")
        except Exception as auth_err:
            print(f"Warning - Could not delete from auth: {str(auth_err)}")
        
        # Delete from profiles table
        supabase.table('profiles').delete().eq('id', user_id).execute()
        print(f"Profile deleted: {user_id}")
        
        # Log to audit trail
        try:
            # Assuming 3 is "Delete" and 1 is "User Management"
            log_audit_action(
                user_id=requester_id,
                action_type_id=3,
                entity_type_id=1,
                entity_id=user_id,
                description=f"Deleted user {target_email} ({target_role})"
            )
        except Exception as audit_err:
            print(f"Warning - Could not log to audit trail: {str(audit_err)}")
        
        return jsonify({
            'message': 'User deleted successfully',
            'deleted_user': {
                'id': user_id,
                'email': target_email,
                'role': target_role
            }
        }), 200

    except Exception as e:
        print(f"Delete user error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'error': 'Internal Server Error',
            'details': str(e)
        }), 500