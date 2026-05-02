# Backend/utils/audit_logger.py
from services.supabase_service import get_supabase
from flask import request
import traceback
import json

def log_audit_action(user_id, action_type_id, entity_type_id, entity_id=None, old_value=None, new_value=None, description=None):
    """
    Helper function to insert a record into the audit_trail table.
    Call this from your route handlers whenever an important action occurs.
    """
    try:
        supabase = get_supabase()
        
        # Get IP and User-Agent if available from the current Flask request context
        ip_address = None
        user_agent = None
        try:
            if request:
                ip_address = request.remote_addr
                user_agent = request.headers.get('User-Agent')
        except RuntimeError:
            # We might be outside a request context (e.g., background job)
            pass

        record = {
            'user_id': user_id,
            'action_type_id': action_type_id,
            'entity_type_id': entity_type_id,
            'entity_id': str(entity_id) if entity_id else None,
            'old_value': json.dumps(old_value) if old_value else None,
            'new_value': json.dumps(new_value) if new_value else None,
            'description': description,
            'ip_address': ip_address,
            'user_agent': user_agent
        }
        
        response = supabase.table('audit_trail').insert(record).execute()
        
        if hasattr(response, 'error') and response.error:
            print(f"Failed to write audit log: {response.error}")
            return False
            
        return True

    except Exception as e:
        print("Exception in log_audit_action:")
        print(traceback.format_exc())
        return False