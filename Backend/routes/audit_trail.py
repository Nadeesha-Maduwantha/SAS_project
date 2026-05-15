from flask import Blueprint, request, jsonify
from services.supabase_service import get_supabase
from datetime import datetime, timedelta
import traceback

bp = Blueprint('audit_trail', __name__, url_prefix='/api/audit-trail')

@bp.route('/', methods=['GET'])
def get_audit_logs():
    try:
        supabase = get_supabase()
        
        # Start building the query to fetch audit logs and related tables
        query = supabase.table('audit_trail').select(
            'audit_id, created_at, description, old_value, new_value, '
            'users:user_id(name, role), '
            'action_types:action_type_id(action_name), '
            'entity_types:entity_type_id(entity_name)'
        )
        
        # Execute query
        response = query.order('created_at', desc=True).limit(500).execute()
        
        # Check for errors in the Supabase response
        if hasattr(response, 'error') and response.error:
            return jsonify({'error': str(response.error)}), 400

        # Format the data purely for the Next.js frontend AuditTrailEvent type
        formatted_events = []
        for log in response.data:
            # Safely extract related table data
            user_data = log.get('users') or {}
            action_data = log.get('action_types') or {}
            entity_data = log.get('entity_types') or {}

            formatted_events.append({
                'id': str(log.get('audit_id')),
                'timestamp': log.get('created_at'),
                'user': {
                    'name': user_data.get('name', 'System'),
                    'role': user_data.get('role', 'Automated')
                },
                'module': entity_data.get('entity_name', 'System'),
                'action': action_data.get('action_name', 'System Action'),
                'details': log.get('description', ''),
                'severity': 'Info'  # Defaulting severity
            })

        return jsonify({'data': formatted_events}), 200

    except Exception as e:
        print("Error in get_audit_logs:")
        print(traceback.format_exc())
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500


@bp.route('/', methods=['POST'])
def create_audit_log():
    """ Endpoint to manually create a new audit log entry """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Request body is empty'}), 400

        supabase = get_supabase()
        
        # Map the incoming JSON to the database schema
        record = {
            'user_id': data.get('user_id'),
            'action_type_id': data.get('action_type_id'),
            'entity_type_id': data.get('entity_type_id'),
            'entity_id': str(data.get('entity_id')) if data.get('entity_id') else None,
            'old_value': data.get('old_value'),
            'new_value': data.get('new_value'),
            'description': data.get('description'),
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent')
        }
        
        response = supabase.table('audit_trail').insert(record).execute()
        
        if hasattr(response, 'error') and response.error:
            return jsonify({'error': str(response.error)}), 400
            
        return jsonify({'message': 'Audit log created successfully', 'data': response.data}), 201

    except Exception as e:
        print("Error in create_audit_log:")
        print(traceback.format_exc())
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500