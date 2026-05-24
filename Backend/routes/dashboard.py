from flask import Blueprint, jsonify, request
from services.supabase_client import supabase

dashboard_bp = Blueprint('dashboard', __name__)


# ADMIN METRICS
@dashboard_bp.route('/api/dashboard/admin/metrics', methods=['GET'])
def admin_metrics():
    try:
        # total users
        users = supabase.table('profiles').select('id').execute()

        # active alerts
        alerts = supabase.table('alerts').select('id').eq('status', 'active').execute()

        # emails
        emails = supabase.table('email_logs').select('id').execute()

        # success rate (simple logic)
        milestones = supabase.table('shipment_milestones').select('status').execute()

        total = len(milestones.data or [])
        completed = len([m for m in milestones.data if m['status'] == 'completed'])

        success_rate = (completed / total * 100) if total > 0 else 0

        return jsonify({
            "data": {
                "total_users": len(users.data),
                "active_alerts": len(alerts.data),
                "total_emails": len(emails.data),
                "success_rate": round(success_rate, 2)
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

# ADMIN SHIPMENTS FEED
@dashboard_bp.route('/api/dashboard/admin/shipment-feed', methods=['GET'])
def admin_shipment_feed():
    try:
        query = (
            supabase.table('shipments')
            .select(
                'id, cargowise_id, branch, gb_code, gc_code, '
                'llm_identified_type, '
                'transport_mode, pickup_date_status, created_at, job_last_edit_time'
            )
            .order('job_last_edit_time', desc=True)
        )

        #  Optional filter (for your "Filter" button)
        status = request.args.get('status')
        if status:
            query = query.eq('pickup_date_status', status)

        response = query.limit(5).execute()

        result = []

        for s in response.data:
            result.append({
                "id": s["id"],
                "cargo_id": s.get("cargowise_id"),
                "branch": s.get("branch"),
                #  lane logic
                "lane": f'{s.get("gb_code", "")} → {s.get("gc_code", "")}',
                #  stage from AI
                "stage": s.get("llm_identified_type"),
                "transport_mode": s.get("transport_mode"),
                "pickup_status": s.get("pickup_date_status")
            })

        return jsonify({"data": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

# SUPER USER METRICS
@dashboard_bp.route('/api/dashboard/super/metrics', methods=['GET'])
def super_metrics():
    try:
        # Department Shipments (Sea only)
        dept_shipments = (
            supabase.table('shipments')
            .select('id')
            .eq('transport_mode', 'SEA')
            .execute()
        )

        # Team Members (superuser role)
        team_members = (
            supabase.table('profiles')
            .select('id')
            .eq('role', 'superuser')
            .execute()
        )

        # Critical Milestones
        critical = (
            supabase.table('shipment_milestones')
            .select('id')
            .eq('is_critical', True)
            .execute()
        )

        # Overdue Shipments
        overdue = (
            supabase.table('shipment_milestones')
            .select('id')
            .eq('status', 'overdue')
            .execute()
        )

        return jsonify({
            "data": {
                "department_shipments": len(dept_shipments.data or []),
                "team_members": len(team_members.data or []),
                "critical_milestones": len(critical.data or []),
                "overdue_shipments": len(overdue.data or [])
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# super user recent activity 
@dashboard_bp.route('/api/dashboard/super/recent-activity', methods=['GET'])
def super_recent_activity():
    try:
        #  Get latest milestones (no filter)
        milestones = (
            supabase.table('shipment_milestones')
            .select('id, name, status, due_date, shipment_id')
            .order('due_date', desc=True)
            .limit(5)
            .execute()
            .data
        )

        result = []

        for m in milestones:
            # Get shipment manually
            shipment_res = (
                supabase.table('shipments')
                .select('cargowise_id, consignee_name')
                .eq('id', m['shipment_id'])
                .single()
                .execute()
            )

            shipment = shipment_res.data if shipment_res.data else {}

            result.append({
                "shipment": shipment.get("cargowise_id"),
                "client": shipment.get("consignee_name"),
                "milestone": m.get("name"),
                "status": m.get("status"),
                "due_date": m.get("due_date")
            })

        return jsonify({"data": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# super user critical alerts 
@dashboard_bp.route('/api/dashboard/super/critical-alerts', methods=['GET'])
def super_critical_alerts():
    try:
        alerts = (
            supabase.table('shipment_milestones')
            .select('id, notes, shipment_id')
            .eq('is_critical', True)
            .limit(3)
            .execute()
        )

        result = []

        for m in alerts.data or []:
            shipment_res = (
                supabase.table('shipments')
                .select('cargowise_id')
                .eq('id', m['shipment_id'])
                .single()
                .execute()
            )

            shipment = shipment_res.data if shipment_res.data else {}

            result.append({
                "shipment": shipment.get("cargowise_id"),
                "note": m.get("notes"),
            })

        return jsonify({"data": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    # OPERATION SHIPMENTS FEED
@dashboard_bp.route('/api/dashboard/operation/shipment', methods=['GET'])
def operation_shipment():
    try:
        query = (
            supabase.table('shipments')
            .select(
                'id, cargowise_id, branch, gb_code, gc_code, '
                'llm_identified_type, '
                'transport_mode, pickup_date_status, created_at, job_last_edit_time'
            )
            .order('job_last_edit_time', desc=True)
        )

        #  Optional filter (for your "Filter" button)
        status = request.args.get('status')
        if status:
            query = query.eq('pickup_date_status', status)

        response = query.limit(5).execute()

        result = []

        for s in response.data:
            result.append({
                "cargo_id": s.get("cargowise_id"),
                #  lane logic
                "lane": f'{s.get("gb_code", "")} → {s.get("gc_code", "")}',
                #  stage from AI
                "stage": s.get("llm_identified_type"),
                "transport_mode": s.get("transport_mode"),
                "pickup_status": s.get("pickup_date_status")
            })

        return jsonify({"data": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
     # SALES SHIPMENTS FEED
@dashboard_bp.route('/api/dashboard/sales/shipment', methods=['GET'])
def sales_shipment():
    try:
        query = (
            supabase.table('shipments')
            .select(
                'id, cargowise_id, branch, gb_code, gc_code, '
                'llm_identified_type, '
                'transport_mode, pickup_date_status, created_at, job_last_edit_time'
            )
            .order('job_last_edit_time', desc=True)
        )

        #  Optional filter (for your "Filter" button)
        status = request.args.get('status')
        if status:
            query = query.eq('pickup_date_status', status)

        response = query.limit(5).execute()

        result = []

        for s in response.data:
            result.append({
                "cargo_id": s.get("cargowise_id"),
                #  lane logic
                "lane": f'{s.get("gb_code", "")} → {s.get("gc_code", "")}',
                #  stage from AI
                "stage": s.get("llm_identified_type"),
                "transport_mode": s.get("transport_mode"),
                "pickup_status": s.get("pickup_date_status")
            })

        return jsonify({"data": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500