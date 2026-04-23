# Backend/routes/access_logs.py

from flask import Blueprint, jsonify, request
from services.supabase_service import get_supabase

# Create a Flask Blueprint for access logs
access_logs_bp = Blueprint('access_logs', __name__)

@access_logs_bp.route('', methods=['GET'], strict_slashes=False)
@access_logs_bp.route('/', methods=['GET'], strict_slashes=False)
def get_access_logs():
    """
    Fetch access logs from the database.
    Supports optional limit to prevent fetching massive amounts of data at once.
    """
    try:
        # Get the Supabase client instance
        supabase = get_supabase()
        
        # Get optional limit from query parameters (default to 100 for safety)
        limit = request.args.get('limit', 100, type=int)

        # Query the access_logs table and join with the profiles table
        # We select profiles(full_name, email, role) to match the frontend 'user' object structure
        response = (
            supabase.table('access_logs')
            .select('''
                id,
                timestamp,
                action,
                ip_address,
                location,
                device,
                status,
                email_attempted,
                profiles (
                    full_name,
                    email,
                    role
                )
            ''')
            .order('timestamp', desc=True)
            .limit(limit)
            .execute()
        )

        logs_data = response.data
        formatted_logs = []

        # Format the data to match the frontend TypeScript interface exactly
        for log in logs_data:
            # Handle cases where the user might not be in the database (failed login with unknown email)
            user_info = log.get('profiles') or {}
            
            formatted_logs.append({
                "id": log.get("id"),
                "timestamp": log.get("timestamp"),
                "action": log.get("action"),
                "ipAddress": log.get("ip_address"),
                "location": log.get("location"),
                "device": log.get("device"),
                "status": log.get("status"),
                "user": {
                    # Fallback to email_attempted if it's an unknown user
                    "name": user_info.get("full_name", "Unknown User"),
                    "email": user_info.get("email", log.get("email_attempted", "Unknown")),
                    "role": user_info.get("role", "Unknown")
                }
            })

        return jsonify({
            "success": True,
            "data": formatted_logs
        }), 200

    except Exception as e:
        # Catch and return any errors
        print(f"Error fetching access logs: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to fetch access logs",
            "details": str(e)
        }), 500