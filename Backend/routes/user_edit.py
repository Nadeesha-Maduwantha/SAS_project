from flask import Blueprint, request, jsonify
from services.supabase_service import get_supabase
from datetime import datetime
import traceback

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
        
        # Map DB columns back to Frontend format
        user_data = {
            'id': profile.get('id'),
            'fullName': profile.get('full_name', ''),
            'email': profile.get('email', ''),
            'department': profile.get('department', ''),
            'role': profile.get('role', 'Custom Configuration'),
            'userAction': '', 
            'resetPassword': False,
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

        # Build update payload dynamically based on what was sent
        update_data = {}
        if 'fullName' in data: 
            update_data['full_name'] = data['fullName']
        if 'department' in data: 
            update_data['department'] = data['department']
        if 'role' in data: 
            update_data['role'] = data['role']
        
        if update_data:
            update_data['updated_at'] = datetime.now().isoformat()
            supabase.table('profiles').update(update_data).eq('id', user_id).execute()

        # Handle 'resetPassword' Action if checked
        if data.get('resetPassword') and data.get('email'):
            supabase.auth.reset_password_for_email(data.get('email'))

        return jsonify({'message': 'User updated successfully'}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        supabase = get_supabase()
        supabase.table('profiles').delete().eq('id', user_id).execute()
        return jsonify({'message': 'User profile deleted successfully'}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500