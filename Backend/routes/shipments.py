from flask import Blueprint, request, jsonify
from services.supabase_client import supabase

shipments_bp = Blueprint('shipments', __name__)

# ─── Specific routes FIRST ───

@shipments_bp.route('/api/shipments', methods=['GET'])
def get_all_shipments():
    try:
        response = (
            supabase.table('shipments')
            .select('*')
            .order('created_at', desc=True)
            .execute()
        )
        return jsonify({"data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/delayed', methods=['GET'])
def get_delayed_shipments():
    try:
        response = (
            supabase.table('shipments')
            .select('*')
            .eq('pickup_date_status', 'Delayed')
            .order('created_at', desc=True)
            .execute()
        )
        data = [s for s in (response.data or [])
                if 'delivered' not in (s.get('llm_identified_type') or '').lower()]
        return jsonify({"data": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/archived', methods=['GET'])
def get_archived_shipments():
    try:
        response = (
            supabase.table('shipments')
            .select('*')
            .order('created_at', desc=True)
            .execute()
        )
        data = [s for s in (response.data or [])
                if 'delivered' in (s.get('llm_identified_type') or '').lower()]
        return jsonify({"data": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/stats', methods=['GET'])
def get_shipment_stats():
    try:
        response = (
            supabase.table('shipments')
            .select('*')
            .execute()
        )
        shipments = response.data or []

        stats = {
            'total': len(shipments),
            'pending': sum(1 for s in shipments
                          if s.get('llm_identified_type') in ['Booking Approval', 'Shipment Approval']),
            'delivered': sum(1 for s in shipments
                            if 'delivered' in (s.get('llm_identified_type') or '').lower()),
            'delayed': sum(1 for s in shipments
                          if s.get('pickup_date_status') == 'Delayed' and
                          'delivered' not in (s.get('llm_identified_type') or '').lower()),
        }
        return jsonify({"data": stats}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/stats/delayed', methods=['GET'])
def get_delayed_stats():
    try:
        from datetime import datetime, timezone
        response = (
            supabase.table('shipments')
            .select('*')
            .eq('pickup_date_status', 'Delayed')
            .execute()
        )
        shipments = [s for s in (response.data or [])
                    if 'delivered' not in (s.get('llm_identified_type') or '').lower()]

        # Calculate average delay days
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
                except:
                    pass

        avg_delay_days = round(sum(delay_days_list) / len(delay_days_list)) if delay_days_list else 0

        stats = {
            'total_delayed': len(shipments),
            'high_priority': sum(1 for s in shipments
                                if any(word in (s.get('llm_note') or '').lower()
                                      for word in ['urgent', 'critical', 'immediate', 'asap', 'priority'])),
            'customs_issues': sum(1 for s in shipments
                                 if 'customs' in (s.get('llm_identified_type') or '').lower() or
                                 'customs' in (s.get('st_note_text') or '').lower()),
            'avg_delay_days': avg_delay_days,
        }
        return jsonify({"data": stats}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/stats/department/<mode>', methods=['GET'])
def get_department_stats(mode):
    try:
        response = (
            supabase.table('shipments')
            .select('*')
            .eq('transport_mode', mode.upper())
            .execute()
        )
        shipments = response.data or []

        stats = {
            'on_time': sum(1 for s in shipments
                          if s.get('pickup_date_status') == 'Future' and
                          'delivered' not in (s.get('llm_identified_type') or '').lower()),
            'delayed': sum(1 for s in shipments
                          if s.get('pickup_date_status') == 'Delayed' and
                          'delivered' not in (s.get('llm_identified_type') or '').lower()),
            'at_risk': sum(1 for s in shipments
                          if any(word in (s.get('llm_note') or '').lower()
                                for word in ['risk', 'delay', 'issue', 'problem', 'urgent'])),
            'delivered_today': sum(1 for s in shipments
                                  if 'delivered' in (s.get('llm_identified_type') or '').lower()),
        }
        return jsonify({"data": stats}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/department/<mode>', methods=['GET'])
def get_shipments_by_department(mode):
    try:
        response = (
            supabase.table('shipments')
            .select('*')
            .eq('transport_mode', mode.upper())
            .order('created_at', desc=True)
            .execute()
        )
        data = [s for s in (response.data or [])
                if 'delivered' not in (s.get('llm_identified_type') or '').lower()]
        return jsonify({"data": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@shipments_bp.route('/api/shipments/current-milestones', methods=['GET'])
def get_current_milestones():
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
            .order('sequence_order')
            .execute()
        )

        milestone_map = {}
        for m in (milestones_response.data or []):
            sid = m['shipment_id']
            if sid not in milestone_map:
                milestone_map[sid] = m

        result = []
        for s in shipments_response.data:
            current = milestone_map.get(s['id'])
            result.append({
                "shipment": s,
                "current_milestone": current
            })

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


# ─── Dynamic routes LAST ───

@shipments_bp.route('/api/shipments/<shipment_id>/assign-template/<template_id>', methods=['POST'])
def assign_template(shipment_id, template_id):
    try:
        template_milestones = (
            supabase.table('template_milestones')
            .select('*')
            .eq('template_id', template_id)
            .order('sequence_order')
            .execute()
        )

        rows = []
        for m in template_milestones.data:
            rows.append({
                'shipment_id':       shipment_id,
                'template_id':       template_id,
                'name':              m['name'],
                'sequence_order':    m['sequence_order'],
                'status':            'pending',
                'automated':         m.get('automated', False),
                'days_from_booking': m.get('sequence_order', 0),
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