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
        
        # Get IP and User-Agent safely
        ip_address = None
        user_agent = None
        try:
            if request:
                ip_address = request.remote_addr
                user_agent = request.headers.get('User-Agent')
        except RuntimeError:
            pass # Outside request context

        # Prepare the record
        record = {
            'user_id': user_id,
            'action_type_id': action_type_id,
            'entity_type_id': entity_type_id,
            'description': description,
            'ip_address': ip_address,
            'user_agent': user_agent
        }

        # Add optional items cleanly
        if entity_id:
            record['entity_id'] = str(entity_id)
        if old_value:
            record['old_value'] = old_value if isinstance(old_value, str) else json.dumps(old_value)
        if new_value:
            record['new_value'] = new_value if isinstance(new_value, str) else json.dumps(new_value)
            
        print(f"Attempting to write audit log: {record}") # <-- Good for debugging
        
        # Execute Insert
        response = supabase.table('audit_trail').insert(record).execute()
        
        print("Audit log successfully written.")
        return True

    except Exception as e:
        print(f"FAILED to write audit log. Error: {str(e)}")
        # We don't want audit logging failures to crash the main request
        return False