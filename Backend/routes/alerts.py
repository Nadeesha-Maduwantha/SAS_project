from flask import Blueprint, jsonify, request
from services.supabase_client import supabase

alerts_bp = Blueprint('alerts', __name__)

ALLOWED_STATUS = {'Get Action', 'Action Taken', 'Resolved'}


@alerts_bp.route('/api/alerts', methods=['GET'])
def get_alerts():
    try:
        response = (
            supabase.table('shipment_milestones')
            .select('shipment_id, assigned_to, assigned_email, is_critical, name, notes, due_date, completed_date, status, alert_sent, created_at')
            .order('created_at', desc=True)
            .execute()
        )
        return jsonify({'data': response.data or []}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@alerts_bp.route('/api/alerts/<shipment_id>/status', methods=['PATCH'])
def update_alert_status(shipment_id):
    try:
        payload = request.get_json(silent=True) or {}
        new_status = payload.get('status')

        if new_status not in ALLOWED_STATUS:
            return jsonify({'error': 'Invalid status value.'}), 400

        update_response = (
            supabase.table('shipment_milestones')
            .update({'status': new_status})
            .eq('shipment_id', shipment_id)
            .execute()
        )

        return jsonify({'message': 'Alert status updated.', 'data': update_response.data or []}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
