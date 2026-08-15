from flask import Blueprint, request, jsonify
from services.supabase_client import supabase

alerts_bp = Blueprint('alerts', __name__)


@alerts_bp.route('/api/alerts', methods=['GET'])
def get_alerts():
    email = (request.args.get('email') or '').strip().lower()
    if not email:
        return jsonify({"error": "email is required"}), 400

    try:
        profile_resp = (
            supabase.table('profiles').select('id, role, department')
            .ilike('email', email)
            .execute()
        )
        if not profile_resp.data:
            return jsonify({"error": "No profile found for this email"}), 404
        profile = profile_resp.data[0]
        role = (profile.get('role') or '').lower()

        if role == 'admin':
            # Admins see every alert, matched or not.
            resp = supabase.table('alerts').select('*').order('created_at', desc=True).execute()
        elif role == 'superuser':
            # Super users see every alert for shipments in their own department,
            # regardless of who (if anyone) it's assigned to.
            resp = (
                supabase.table('alerts')
                .select('*, shipments!inner(transport_mode)')
                .eq('shipments.transport_mode', profile.get('department'))
                .order('created_at', desc=True)
                .execute()
            )
        else:
            # Sales / operation users see only alerts assigned directly to them.
            resp = (
                supabase.table('alerts').select('*')
                .eq('assigned_profile_id', profile['id'])
                .order('created_at', desc=True)
                .execute()
            )

        return jsonify({"data": resp.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
