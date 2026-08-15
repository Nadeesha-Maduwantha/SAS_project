from flask import Blueprint, request, jsonify
from services.supabase_client import supabase

milestones_bp = Blueprint('milestones', __name__)


@milestones_bp.route('/api/milestones', methods=['GET'])
def get_milestones():
    """
    Returns all shipment milestones joined with their shipment info.
    Supports optional query params:
      ?status=overdue|pending|completed|current
      ?is_critical=true|false
      ?shipment_id=<id>
    """
    try:
        query = (
            supabase.table('shipment_milestones')
            .select(
                'id, sequence_order, name, status, is_critical, automated,'
                'due_date, completed_date, notes, assigned_to, assigned_email,'
                'location_label, days_from_booking, shipment_id,'
                'shipments(job_number, consignee_name, transport_mode,'
                'origin_city, destination_city)'
            )
            .order('due_date', desc=False)
        )

        # Optional filters
        status = request.args.get('status')
        if status:
            query = query.eq('status', status)

        is_critical = request.args.get('is_critical')
        if is_critical == 'true':
            query = query.eq('is_critical', True)
        elif is_critical == 'false':
            query = query.eq('is_critical', False)

        shipment_id = request.args.get('shipment_id')
        if shipment_id:
            query = query.eq('shipment_id', shipment_id)

        response = query.execute()
        data = response.data or []

        # Flatten the joined shipment data for easier frontend consumption
        for row in data:
            shipment = row.pop('shipments', None) or {}
            row['job_number']      = shipment.get('job_number')
            row['consignee_name']  = shipment.get('consignee_name')
            row['transport_mode']  = shipment.get('transport_mode')
            row['origin_city']     = shipment.get('origin_city')
            row['destination_city']= shipment.get('destination_city')

        return jsonify({"data": data, "total": len(data)}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@milestones_bp.route('/api/milestones/stats', methods=['GET'])
def get_milestone_stats():
    """
    Returns counts for dashboard stat cards.
    """
    try:
        response = (
            supabase.table('shipment_milestones')
            .select('id, status, is_critical')
            .execute()
        )
        rows = response.data or []

        stats = {
            'total':     len(rows),
            'completed': sum(1 for r in rows if r.get('status') == 'completed'),
            'pending':   sum(1 for r in rows if r.get('status') == 'pending'),
            'overdue':   sum(1 for r in rows if r.get('status') == 'overdue'),
            'current':   sum(1 for r in rows if r.get('status') == 'current'),
            'critical':  sum(1 for r in rows if r.get('is_critical')),
        }
        return jsonify({"data": stats}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@milestones_bp.route('/api/milestones/<milestone_id>', methods=['GET'])
def get_milestone(milestone_id):
    """
    Returns a single milestone by ID, joined with its shipment.
    """
    try:
        response = (
            supabase.table('shipment_milestones')
            .select(
                '*, shipments(job_number, consignee_name, transport_mode,'
                'origin_city, destination_city, consignee_email,'
                'created_by_name, created_by_email)'
            )
            .eq('id', milestone_id)
            .single()
            .execute()
        )
        if not response.data:
            return jsonify({"error": "Milestone not found"}), 404

        row = response.data
        shipment = row.pop('shipments', None) or {}
        row['job_number']       = shipment.get('job_number')
        row['consignee_name']   = shipment.get('consignee_name')
        row['transport_mode']   = shipment.get('transport_mode')
        row['origin_city']      = shipment.get('origin_city')
        row['destination_city'] = shipment.get('destination_city')
        row['consignee_email']  = shipment.get('consignee_email')
        row['created_by_name']  = shipment.get('created_by_name')
        row['created_by_email'] = shipment.get('created_by_email')

        return jsonify({"data": row}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@milestones_bp.route('/api/milestones/<milestone_id>', methods=['PATCH'])
def update_milestone(milestone_id):
    """
    Updates a milestone status, notes, or assigned_to.
    """
    try:
        body = request.get_json() or {}
        allowed = {'status', 'notes', 'assigned_to', 'assigned_email',
                   'completed_date', 'is_critical'}
        update_data = {k: v for k, v in body.items() if k in allowed}

        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        response = (
            supabase.table('shipment_milestones')
            .update(update_data)
            .eq('id', milestone_id)
            .execute()
        )
        return jsonify({"data": response.data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500