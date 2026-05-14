from flask import Blueprint, request, jsonify
from services.supabase_service import get_supabase
from datetime import datetime
import traceback
import json

bp = Blueprint('audit_trail', __name__, url_prefix='/api/audit-trail')

@bp.route('/', methods=['GET'])
def get_audit_logs():
    try:
        supabase = get_supabase()
        
        # 1. Fetch raw logs
        query = supabase.table('audit_trail').select('*')
        response = query.order('created_at', desc=True).limit(500).execute()
        
        if hasattr(response, 'error') and response.error:
            return jsonify({'error': str(response.error)}), 400

        logs = response.data
        
        # 2. Extract unique user IDs from the logs to look up their names
        user_ids = list(set([log.get('user_id') for log in logs if log.get('user_id')]))
        
        # Create a dictionary to hold user_id -> name mapping
        user_profiles = {}
        if user_ids:
            profiles_response = supabase.table('profiles').select('id, full_name, role').in_('id', user_ids).execute()
            if not getattr(profiles_response, 'error', None):
                for profile in profiles_response.data:
                    user_profiles[profile['id']] = {
                        'name': profile.get('full_name') or 'Unknown Admin',
                        'role': profile.get('role') or 'Admin'
                    }

        # Lookups for your action and entity IDs
        action_map = {1: "Create", 2: "Update", 3: "Delete"}
        entity_map = {1: "User Management", 2: "Shipment Records", 3: "Security Settings"}

        formatted_events = []
        for log in logs:
            raw_user_id = log.get('user_id')
            user_info = user_profiles.get(raw_user_id, {'name': 'System', 'role': 'Automated'})
            
            # Date Formatting
            raw_date = log.get('created_at')
            formatted_date = raw_date
            if raw_date:
                try:
                    clean_date = raw_date.split('.')[0].replace("+00:00", "") 
                    if "+" in clean_date: clean_date = clean_date.split('+')[0]
                    dt_obj = datetime.fromisoformat(clean_date)
                    time_str = dt_obj.strftime('%I.%M%p').lower().replace('pm', 'p.m').replace('am', 'a.m')
                    if time_str.startswith('0'): time_str = time_str[1:]
                    formatted_date = f"{dt_obj.year}-{dt_obj.month}-{dt_obj.day} {time_str}"
                except Exception:
                    pass

            # ID lookups
            action_id = log.get('action_type_id')
            entity_id = log.get('entity_type_id')
            action_str = action_map.get(action_id, f"Action {action_id}")
            entity_str = entity_map.get(entity_id, f"Module {entity_id}")

            # -------------------------------------------------------------
            # FORMULATE THE DETAILS (What changed)
            # -------------------------------------------------------------
            details_text = log.get('description') or ""
            new_val = log.get('new_value')
            
            if new_val:
                try:
                    # If it's a string storing JSON, parse it
                    if isinstance(new_val, str):
                        new_val = json.loads(new_val)
                    
                    if isinstance(new_val, dict):
                        changes = []
                        # Look through the dictionary and explain the change
                        if 'full_name' in new_val:
                            changes.append(f"Name changed to '{new_val['full_name']}'")
                        if 'role' in new_val:
                            changes.append(f"Role updated to '{new_val['role']}'")
                        
                        if changes:
                            details_text = ", ".join(changes)
                except Exception:
                    pass # Keep the default description if parsing fails

            formatted_events.append({
                'id': str(log.get('audit_id')),
                'timestamp': formatted_date,
                'user': user_info,
                'module': entity_str,
                'action': action_str,
                'details': details_text,
                'severity': 'Info' if action_id != 3 else 'Critical'
            })

        return jsonify({'data': formatted_events}), 200

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500


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