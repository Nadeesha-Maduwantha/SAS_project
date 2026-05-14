from flask import Blueprint, request, jsonify
from services.supabase_client import supabase

shipments_bp = Blueprint('shipments', __name__)


# Shared Helper Functions

def is_delayed(shipment: dict) -> bool:
    """
    Single source of truth for delayed shipment logic.
    A shipment is delayed when:
      - pickup_date_status is 'Delayed', AND
      - it has not already been delivered
    """
    return (
        shipment.get('pickup_date_status') == 'Delayed' and
        'delivered' not in (shipment.get('llm_identified_type') or '').lower()
    )


def is_delivered(shipment: dict) -> bool:
    """Single source of truth for delivered/archived status."""
    return 'delivered' in (shipment.get('llm_identified_type') or '').lower()


# Specific routes FIRST 

@shipments_bp.route('/api/shipments', methods=['GET'])
def get_all_shipments():
    """
    Returns all shipments. Supports optional query params:
      ?created_by_staff_code=<code>  — filter by the operation user who created it
      ?sales_user_staff_code=<code>  — filter by the sales user assigned to it
    """
    try:
        query = supabase.table('shipments').select('*').order('created_at', desc=True)

        created_by = request.args.get('created_by_staff_code')
        if created_by:
            query = query.eq('created_by_staff_code', created_by)

        sales_code = request.args.get('sales_user_staff_code')
        if sales_code:
            query = query.eq('sales_user_staff_code', sales_code)

        response = query.execute()
        return jsonify({"data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/delayed', methods=['GET'])
def get_delayed_shipments():
    """
    Returns shipments where pickup_date_status is Delayed and not yet delivered.
    FIXED: uses is_delayed() helper instead of inline duplicate logic.
    """
    try:
        response = (
            supabase.table('shipments')
            .select('*')
            .eq('pickup_date_status', 'Delayed')
            .order('created_at', desc=True)
            .execute()
        )
        data = [s for s in (response.data or []) if is_delayed(s)]
        return jsonify({"data": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/archived', methods=['GET'])
def get_archived_shipments():
    """
    Returns all delivered shipments (treated as archived).
    uses is_delivered() helper instead of inline duplicate logic.
    """
    try:
        response = (
            supabase.table('shipments')
            .select('*')
            .order('created_at', desc=True)
            .execute()
        )
        data = [s for s in (response.data or []) if is_delivered(s)]
        return jsonify({"data": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/archived/department/<mode>', methods=['GET'])
def get_archived_shipments_by_department(mode):
    """
    the frontend doesn't have to fetch all archived
    shipments and filter by department in JavaScript.
    """
    try:
        response = (
            supabase.table('shipments')
            .select('*')
            .eq('transport_mode', mode.upper())
            .order('created_at', desc=True)
            .execute()
        )
        data = [s for s in (response.data or []) if is_delivered(s)]
        return jsonify({"data": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/stats', methods=['GET'])
def get_shipment_stats():
    """
    select only the columns needed for counting instead of select('*').
    Fetching all columns of all rows just to count them wastes bandwidth.
    """
    try:
        response = (
            supabase.table('shipments')
            .select('id, pickup_date_status, llm_identified_type')
            .execute()
        )
        shipments = response.data or []

        stats = {
            'total': len(shipments),
            'pending': sum(
                1 for s in shipments
                if s.get('llm_identified_type') in ('Booking Approval', 'Shipment Approval')
            ),
            'delivered': sum(1 for s in shipments if is_delivered(s)),
            'delayed':   sum(1 for s in shipments if is_delayed(s)),
        }
        return jsonify({"data": stats}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/stats/delayed', methods=['GET'])
def get_delayed_stats():
    """
    uses is_delayed() helper. Also selects only required columns.
    """
    try:
        from datetime import datetime, timezone

        response = (
            supabase.table('shipments')
            .select('pickup_date_status, llm_identified_type, llm_note, st_note_text, llm_cargo_pickup_date')
            .eq('pickup_date_status', 'Delayed')
            .execute()
        )
        shipments = [s for s in (response.data or []) if is_delayed(s)]

        today = datetime.now(timezone.utc)
        delay_days_list = []
        for s in shipments:
            pickup_date = s.get('llm_cargo_pickup_date')
            if pickup_date:
                try:
                    pickup_dt = datetime.fromisoformat(pickup_date.replace('Z', '+00:00'))
                    if pickup_dt.tzinfo is None:
                        pickup_dt = pickup_dt.replace(tzinfo=timezone.utc)
                    diff = (today - pickup_dt).days
                    if diff > 0:
                        delay_days_list.append(diff)
                except Exception:
                    pass

        avg_delay_days = (
            round(sum(delay_days_list) / len(delay_days_list))
            if delay_days_list else 0
        )

        priority_keywords = {'urgent', 'critical', 'immediate', 'asap', 'priority'}

        stats = {
            'total_delayed': len(shipments),
            'high_priority': sum(
                1 for s in shipments
                if any(w in (s.get('llm_note') or '').lower() for w in priority_keywords)
            ),
            'customs_issues': sum(
                1 for s in shipments
                if 'customs' in (s.get('llm_identified_type') or '').lower() or
                   'customs' in (s.get('st_note_text') or '').lower()
            ),
            'avg_delay_days': avg_delay_days,
        }
        return jsonify({"data": stats}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/stats/department/<mode>', methods=['GET'])
def get_department_stats(mode):
    """
    uses is_delayed() / is_delivered() helpers. Selects only required columns.
    """
    try:
        response = (
            supabase.table('shipments')
            .select('pickup_date_status, llm_identified_type, llm_note')
            .eq('transport_mode', mode.upper())
            .execute()
        )
        shipments = response.data or []

        risk_keywords = {'risk', 'delay', 'issue', 'problem', 'urgent'}

        stats = {
            'on_time': sum(
                1 for s in shipments
                if s.get('pickup_date_status') == 'Future' and not is_delivered(s)
            ),
            'delayed': sum(1 for s in shipments if is_delayed(s)),
            'at_risk': sum(
                1 for s in shipments
                if any(w in (s.get('llm_note') or '').lower() for w in risk_keywords)
            ),
            'delivered_today': sum(1 for s in shipments if is_delivered(s)),
        }
        return jsonify({"data": stats}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/department/<mode>', methods=['GET'])
def get_shipments_by_department(mode):
    """
    delivered filter applied at DB level using ilike instead of
    fetching all rows and filtering in Python.
    """
    try:
        response = (
            supabase.table('shipments')
            .select('*')
            .eq('transport_mode', mode.upper())
            .not_.ilike('llm_identified_type', '%delivered%')
            .order('created_at', desc=True)
            .execute()
        )
        return jsonify({"data": response.data or []}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/current-milestones', methods=['GET'])
def get_current_milestones():
    """
    Returns each shipment paired with its current (first non-completed) milestone.
    FIXED: milestone query now explicitly orders by shipment_id, sequence_order
    so milestone_map always picks the lowest-sequence pending milestone per shipment,
    not whichever happened to come back first from the DB.
    """
    try:
        shipments_response = (
            supabase.table('shipments')
            .select(
                'id, job_number, house_bill_number, transport_mode, branch,'
                'consignee_name, consignee_email,'
                'origin_city, origin_country_code,'
                'destination_city, destination_country_code,'
                'current_stage, carrier, is_priority,'
                'created_by_name, sales_user_name'
            )
            .order('created_at', desc=True)
            .execute()
        )

        if not shipments_response.data:
            return jsonify({"data": []}), 200

        milestones_response = (
            supabase.table('shipment_milestones')
            .select('*')
            .neq('status', 'completed')
            .order('shipment_id')          # FIXED: explicit ordering
            .order('sequence_order')
            .execute()
        )

        # Build map: shipment_id → first pending milestone (lowest sequence_order)
        milestone_map: dict = {}
        for m in (milestones_response.data or []):
            sid = m['shipment_id']
            if sid not in milestone_map:
                milestone_map[sid] = m

        result = [
            {"shipment": s, "current_milestone": milestone_map.get(s['id'])}
            for s in shipments_response.data
        ]
        return jsonify({"data": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/job/<job_number>', methods=['GET'])
def get_shipment_by_job(job_number):
    try:
        response = (
            supabase.table('shipments')
            .select('*')
            .eq('job_number', job_number)
            .single()
            .execute()
        )
        if not response.data:
            return jsonify({"error": "Shipment not found"}), 404
        return jsonify({"data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Dynamic routes LAST

@shipments_bp.route('/api/shipments/<shipment_id>/assign-template/<template_id>', methods=['POST'])
def assign_template(shipment_id, template_id):
    """
    FIXED: days_from_booking was incorrectly set to sequence_order.
    Milestone 1 was getting 1 day, milestone 2 getting 2 days, etc. regardless
    of what the template actually specified. Now reads days_from_booking from
    the template milestone row with a safe fallback of 0.
    """
    try:
        template_milestones = (
            supabase.table('template_milestones')
            .select('*')
            .eq('template_id', template_id)
            .order('sequence_order')
            .execute()
        )

        rows = []
        for m in (template_milestones.data or []):
            rows.append({
                'shipment_id':       shipment_id,
                'template_id':       template_id,
                'name':              m['name'],
                'sequence_order':    m['sequence_order'],
                'status':            'pending',
                'automated':         m.get('automated', False),
                'days_from_booking': m.get('days_from_booking', 0),  # FIXED
            })

        supabase.table('shipment_milestones').insert(rows).execute()
        return jsonify({"message": "Template assigned successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/<shipment_id>', methods=['GET'])
def get_shipment(shipment_id):
    try:
        shipment_response = (
            supabase.table('shipments')
            .select('*')
            .eq('id', shipment_id)
            .single()
            .execute()
        )
        if not shipment_response.data:
            return jsonify({"error": "Shipment not found"}), 404

        milestones_response = (
            supabase.table('shipment_milestones')
            .select('*')
            .eq('shipment_id', shipment_id)
            .order('sequence_order')
            .execute()
        )

        return jsonify({
            "data": {
                "shipment": shipment_response.data,
                "milestones": milestones_response.data or []
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500