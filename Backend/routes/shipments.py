from flask import Blueprint, request, jsonify
from services.supabase_client import supabase
from utils.audit_logger import log_audit_action
from utils.auth_helper import get_current_user

shipments_bp = Blueprint('shipments', __name__)


# Shared Helper Functions

def get_milestone_value(shipment: dict, milestone: str, key: str):
    """
    Safely read one value out of the shipments.milestones jsonb, e.g.
    get_milestone_value(s, 'cargo_pickup', 'pickup_date_status') -> 'Delayed' / None.
    Sub-keys are the real API field names (matches milestone builder configs).
    Any missing level (no milestones, unknown milestone name, no key)
    returns None instead of raising.
    """
    return ((shipment.get('milestones') or {}).get(milestone) or {}).get(key)


def pickup_status(shipment: dict) -> str:
    """
    Normalized cargo_pickup status, lowercased and trimmed.
    The synced data carries mixed casing for the same state ('Delayed' vs
    'delayed'), so every comparison must go through here rather than
    matching the raw value.
    """
    return (get_milestone_value(shipment, 'cargo_pickup', 'pickup_date_status') or '').strip().lower()


def is_delayed(shipment: dict) -> bool:
    """
    Single source of truth for delayed shipment logic.
    A shipment is delayed when:
      - the cargo_pickup milestone status is 'Delayed', AND
      - it has not already been delivered
    """
    return pickup_status(shipment) == 'delayed' and not is_delivered(shipment)


def is_on_time(shipment: dict) -> bool:
    """
    Single source of truth for on-time shipment logic.
    A shipment is on time when the cargo_pickup milestone reports 'On Time'
    and it has not already been delivered.
    """
    return pickup_status(shipment) == 'on time' and not is_delivered(shipment)


def is_delivered(shipment: dict) -> bool:
    """Single source of truth for delivered/archived status."""
    return 'delivered' in (shipment.get('llm_identified_type') or '').lower()


# Specific routes FIRST 

@shipments_bp.route('/api/shipments', methods=['GET'])
def get_all_shipments():
    try:
        query = supabase.table('shipments').select('*').order('created_at', desc=True)

        created_by = request.args.get('created_by_staff_code')
        if created_by:
            query = query.eq('created_by_staff_code', created_by)

        sales_code = request.args.get('sales_user_staff_code')
        if sales_code:
            query = query.eq('sales_user_staff_code', sales_code)

        sales_email = request.args.get('sales_user_email')
        if sales_email:
            query = query.ilike('sales_user_email', sales_email)

        assigned_email = request.args.get('assigned_email')
        if assigned_email:
            ms_response = (
                supabase.table('shipment_milestones')
                .select('shipment_id')
                .ilike('assigned_email', assigned_email)
                .execute()
            )
            shipment_ids = list({m['shipment_id'] for m in (ms_response.data or [])})
            if not shipment_ids:
                return jsonify({"data": []}), 200
            query = query.in_('id', shipment_ids)

        response = query.execute()
        return jsonify({"data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/delayed', methods=['GET'])
def get_delayed_shipments():
    """
    Returns shipments whose cargo_pickup milestone is Delayed and not yet delivered.
    FIXED: uses is_delayed() helper instead of inline duplicate logic.
    """
    try:
        response = (
            supabase.table('shipments')
            .select('*')
            .ilike('milestones->cargo_pickup->>pickup_date_status', 'delayed')
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
            .select('id, milestones, llm_identified_type')
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
            .select('milestones, llm_identified_type, llm_note, st_note_text, llm_cargo_pickup_date')
            .ilike('milestones->cargo_pickup->>pickup_date_status', 'delayed')
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
            .select('milestones, llm_identified_type, llm_note')
            .eq('transport_mode', mode.upper())
            .execute()
        )
        shipments = response.data or []

        risk_keywords = {'risk', 'delay', 'issue', 'problem', 'urgent'}

        stats = {
            'on_time': sum(1 for s in shipments if is_on_time(s)),
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


@shipments_bp.route('/api/shipments/stats/branch', methods=['GET'])
def get_branch_stats():
    """
    Delay breakdown per branch, sorted worst-first by delay rate.

    Returns one row per branch:
      branch  — branch code, or 'Unknown' when the shipment has none
      total   — shipments belonging to that branch
      delayed — of those, how many are currently delayed
      rate    — delayed / total as a percentage, rounded

    Branches with no delays are still returned so the caller can show
    the full picture rather than only the bad ones.
    """
    try:
        response = (
            supabase.table('shipments')
            .select('branch, milestones, llm_identified_type')
            .execute()
        )
        shipments = response.data or []

        totals: dict[str, int] = {}
        delayed: dict[str, int] = {}

        for s in shipments:
            branch = (s.get('branch') or '').strip() or 'Unknown'
            totals[branch] = totals.get(branch, 0) + 1
            if is_delayed(s):
                delayed[branch] = delayed.get(branch, 0) + 1

        rows = []
        for branch, total in totals.items():
            late = delayed.get(branch, 0)
            rows.append({
                'branch':  branch,
                'total':   total,
                'delayed': late,
                'rate':    round(late / total * 100) if total else 0,
            })

        # Worst delay rate first; ties broken by the bigger branch.
        rows.sort(key=lambda r: (-r['rate'], -r['total']))

        return jsonify({"data": rows}), 200
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


@shipments_bp.route('/api/shipments/all-milestones', methods=['GET'])
def get_all_milestones():
    """
    Every shipment with its FULL milestone list (not just the current one),
    plus who it's allocated to. Feeds the Current Milestones grouped views
    (By Client / By Member) and the Completed/Overdue/Delayed tabs.

    Shape: { data: [ { shipment: {...}, milestones: [ {..., field_alert} ] } ] }
    Milestone.status is one of completed | overdue | delayed | pending.
    """
    try:
        shipments_res = (
            supabase.table('shipments')
            .select(
                'id, job_number, house_bill_number, transport_mode, branch,'
                'consignee_name, consignee_email,'
                'origin_city, origin_country_code,'
                'destination_city, destination_country_code,'
                'current_stage, carrier, is_priority,'
                'created_by_name, created_by_email, sales_user_name'
            )
            .order('created_at', desc=True)
            .execute()
        )
        shipments = shipments_res.data or []
        if not shipments:
            return jsonify({"data": []}), 200

        ms_res = (
            supabase.table('shipment_milestones')
            .select(
                'id, shipment_id, name, sequence_order, status, is_critical, '
                'due_date, completed_date, assigned_to, assigned_email, field_alert'
            )
            .order('shipment_id')
            .order('sequence_order')
            .execute()
        )

        ms_by_ship: dict = {}
        for m in (ms_res.data or []):
            ms_by_ship.setdefault(m['shipment_id'], []).append(m)

        result = [
            {"shipment": s, "milestones": ms_by_ship.get(s['id'], [])}
            for s in shipments
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

        requester_id, _ = get_current_user()
        if requester_id:
            # action_type_id=2 -> UPDATE, entity_type_id=1 -> Shipment
            # (matches public.action_types / public.entity_types)
            log_audit_action(
                user_id=requester_id,
                action_type_id=2,
                entity_type_id=1,
                entity_id=shipment_id,
                description=f"Assigned template {template_id} to shipment {shipment_id}",
            )

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