from flask import Blueprint, jsonify, request
from services.supabase_client import supabase
from datetime import datetime, timedelta, timezone

alerts_bp = Blueprint('alerts', __name__)

ALLOWED_STATUS = {'Get Action', 'Action Taken', 'Resolved'}


def _parse_date(value):
    if not value:
        return None
    try:
        text = str(value).strip()
        if not text:
            return None
        normalized = text.replace('Z', '+00:00')
        return datetime.fromisoformat(normalized).date()
    except Exception:
        return None


def _derive_alert_status(due_date_value, completed_date_value, server_today):
    due_date = _parse_date(due_date_value)
    completed_date = _parse_date(completed_date_value)

    if not due_date:
        return None

    overdue_threshold = due_date + timedelta(days=1)
    is_overdue = completed_date is None and server_today >= overdue_threshold
    if is_overdue:
        return 'Overdue'

    is_resolved = completed_date is not None and completed_date > due_date
    if is_resolved:
        return 'Resolved'

    return None


@alerts_bp.route('/api/alerts', methods=['GET'])
def get_alerts():
    try:
        server_today = datetime.now(timezone.utc).date()
        alerts_scope = (request.args.get('scope') or '').strip().lower()

        response = (
            supabase.table('shipment_milestones')
            .select('shipment_id, assigned_to, assigned_email, is_critical, name, notes, due_date, completed_date, status, alert_sent, created_at')
            .order('created_at', desc=True)
            .execute()
        )

        rows = response.data or []
        enriched_rows = []
        for row in rows:
            derived_status = _derive_alert_status(
                row.get('due_date'),
                row.get('completed_date'),
                server_today
            )

            if alerts_scope == 'sales_user' and derived_status not in {'Overdue', 'Resolved'}:
                continue

            row_with_status = dict(row)
            row_with_status['derived_status'] = derived_status
            enriched_rows.append(row_with_status)

        return jsonify({'data': enriched_rows, 'server_date': server_today.isoformat()}), 200
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
