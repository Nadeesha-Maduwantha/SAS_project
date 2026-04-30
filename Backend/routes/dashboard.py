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

        # 🔍 Optional filter (for your "Filter" button)
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

                #  description from AI
                # "description": s.get("llm_note") or "",

                "transport_mode": s.get("transport_mode"),
                "pickup_status": s.get("pickup_date_status")
            })

        return jsonify({"data": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# # OPERATION SUMMARY
# @dashboard_bp.route('/api/dashboard/operation/summary', methods=['GET'])
# def operation_summary():
#     try:
#         shipments = supabase.table('shipments').select('current_stage').execute()

#         data = {
#             "processing": 0,
#             "in_transit": 0,
#             "arrived": 0,
#             "delayed": 0
#         }

#         for s in shipments.data:
#             stage = s['current_stage']

#             if stage == 'Processing':
#                 data["processing"] += 1
#             elif stage == 'In Transit':
#                 data["in_transit"] += 1
#             elif stage == 'Arrived':
#                 data["arrived"] += 1
#             elif stage == 'Delayed':
#                 data["delayed"] += 1

#         return jsonify({"data": data}), 200

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


