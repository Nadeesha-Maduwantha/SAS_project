from flask import Blueprint, jsonify, request
from services.supabase_client import supabase
from datetime import datetime, timezone

dashboard_bp = Blueprint('dashboard', __name__)


def _format_log_time(value):
    if not value:
        return datetime.now().strftime('%H:%M:%S')
    try:
        normalized = str(value).replace('Z', '+00:00')
        return datetime.fromisoformat(normalized).astimezone(timezone.utc).strftime('%H:%M:%S')
    except Exception:
        return datetime.now().strftime('%H:%M:%S')


# ADMIN METRICS
@dashboard_bp.route('/api/dashboard/admin/metrics', methods=['GET'])
def admin_metrics():
    try:
        # total users
        users = supabase.table('profiles').select('id, role').execute()

        # emails
        emails = supabase.table('email_logs').select('id').execute()

        # Milestones drive both the success rate and the alert counts.
        #
        # An alert IS an overdue milestone — the standalone `alerts` table is
        # not written to by any part of the system, so counting it reported
        # zero while the alert feed was showing hundreds of outstanding items.
        milestones = (
            supabase.table('shipment_milestones')
            .select('status, is_critical, alerts_cancelled, shipment_id')
            .execute()
        )
        rows = milestones.data or []

        total = len(rows)
        completed = len([m for m in rows if m['status'] == 'completed'])
        success_rate = (completed / total * 100) if total > 0 else 0

        # Cancelling an alert leaves the milestone overdue, so filter those out.
        active = [
            m for m in rows
            if m['status'] == 'overdue' and not m.get('alerts_cancelled')
        ]

        user_roles = {}
        for user in users.data or []:
            role = user.get('role') or 'unknown'
            user_roles[role] = user_roles.get(role, 0) + 1

        return jsonify({
            "data": {
                "total_users": len(users.data),
                "user_roles": user_roles,
                "active_alerts": len(active),
                "critical_alerts": sum(1 for m in active if m.get('is_critical')),
                "alert_shipments": len({m['shipment_id'] for m in active}),
                "total_emails": len(emails.data),
                "success_rate": round(success_rate, 2)
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ADMIN TECHNICAL LOGS
@dashboard_bp.route('/api/dashboard/admin/technical-logs', methods=['GET'])
def admin_technical_logs():
    try:
        logs = (
            supabase.table('sync_logs')
            .select('id, synced_at, status, records_updated, error_count, total_processed, duration_seconds')
            .order('synced_at', desc=True)
            .limit(10)
            .execute()
        ).data or []

        errors = (
            supabase.table('sync_errors')
            .select('job_number, field_name, error_reason, severity, created_at')
            .order('created_at', desc=True)
            .limit(5)
            .execute()
        ).data or []

        total_runs = len(logs)
        successful_runs = len([row for row in logs if row.get('status') == 'success'])
        total_processed = sum(int(row.get('total_processed') or 0) for row in logs)
        total_errors = sum(int(row.get('error_count') or 0) for row in logs)
        total_duration = sum(float(row.get('duration_seconds') or 0) for row in logs)

        eta_success = round((successful_runs / total_runs) * 100, 1) if total_runs else 0
        api_error_rate = round((total_errors / total_processed) * 100, 2) if total_processed else 0
        avg_latency_ms = round((total_duration / total_runs) * 1000) if total_runs else 0

        lines = []
        for row in logs[:3]:
            time_label = _format_log_time(row.get('synced_at'))
            status = (row.get('status') or 'unknown').upper()
            updated = row.get('records_updated') or 0
            error_count = row.get('error_count') or 0
            lines.append(f'[{time_label}] {status}: sync updated {updated} records ({error_count} errors)')

        for err in errors[:2]:
            time_label = _format_log_time(err.get('created_at'))
            severity = (err.get('severity') or 'warn').upper()
            job = err.get('job_number') or 'unknown job'
            field = err.get('field_name') or 'unknown field'
            reason = err.get('error_reason') or 'validation issue'
            lines.append(f'[{time_label}] {severity}: {job} {field} - {reason}')

        if not lines:
            lines = ['[--:--:--] INFO: no sync logs recorded yet']

        return jsonify({
            "data": {
                "lines": lines[:5],
                "eta_success": eta_success,
                "api_error_rate": api_error_rate,
                "avg_latency_ms": avg_latency_ms,
                "smtp_relay": "Active" if errors else "Idle"
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
