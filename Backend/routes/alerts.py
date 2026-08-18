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
from flask import Blueprint, jsonify, request
from services.supabase_client import supabase
from datetime import datetime, timezone

alerts_bp = Blueprint('alerts', __name__)

ALLOWED_STATUS = {'Get Action', 'Action Taken', 'Resolved'}


# ── Recompute milestone statuses (stand-in for the alert engine's status pass) ──
# Evaluates every assigned milestone's frozen check against live shipment data and
# sets completed / overdue / pending. Does NOT send emails. Safe to run repeatedly.
@alerts_bp.route('/api/alerts/recompute', methods=['GET', 'POST'])
def recompute_statuses():
    try:
        from services.status_recompute import recompute_milestone_status
        counts = recompute_milestone_status()
        return jsonify({'message': 'Recomputed', 'counts': counts}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500




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

@alerts_bp.route('/api/alerts/active', methods=['GET'])
def get_active_alerts():
    try:
        # Step 1: Get all INCOMPLETE late milestones — overdue (deadline passed,
        # dark red) and delayed (out of sequence, lighter red). Completed
        # milestones are never late, so they never appear on the dashboard.
        milestones_res = (
            supabase.table('shipment_milestones')
            .select(
                'id, shipment_id, name, status, is_critical, '
                'due_date, completed_date, assigned_to, assigned_email, '
                'alert_sent, notes'
            )
            .in_('status', ['overdue', 'delayed'])
            .order('due_date')
            .execute()
        )
 
        milestones = milestones_res.data or []
        if not milestones:
            return jsonify({'data': []}), 200
 
        # Step 2: Get unique shipment IDs
        shipment_ids = list({m['shipment_id'] for m in milestones})
 
        # Step 3: Fetch shipment info for those IDs
        shipments_res = (
            supabase.table('shipments')
            .select('id, job_number, consignee_name, consignee_email, transport_mode')
            .in_('id', shipment_ids)
            .execute()
        )
 
        shipment_map = {
            s['id']: s for s in (shipments_res.data or [])
        }
 
        # Step 4: Calculate overdue_days and group by shipment
        today = datetime.now(timezone.utc)
        groups = {}
 
        for m in milestones:
            sid = m['shipment_id']
 
            # Calculate overdue days from due_date
            overdue_days = 0
            if m.get('due_date'):
                try:
                    due = datetime.fromisoformat(
                        m['due_date'].replace('Z', '+00:00')
                    )
                    if due.tzinfo is None:
                        due = due.replace(tzinfo=timezone.utc)
                    diff = (today - due).days
                    overdue_days = max(0, diff)
                except Exception:
                    overdue_days = 0
 
            alert = {
                'milestone_id':   m['id'],
                'name':           m['name'],
                'due_date':       m.get('due_date'),
                'overdue_days':   overdue_days,
                'is_critical':    m.get('is_critical', False),
                'status':         m.get('status'),
                'assigned_to':    m.get('assigned_to'),
                'assigned_email': m.get('assigned_email'),
                'alert_sent':     m.get('alert_sent', False),
                'notes':          m.get('notes'),
            }
 
            if sid not in groups:
                ship = shipment_map.get(sid, {})
                groups[sid] = {
                    'shipment_id':    sid,
                    'job_number':     ship.get('job_number', sid[:8]),
                    'consignee_name': ship.get('consignee_name', '—'),
                    'consignee_email':ship.get('consignee_email', ''),
                    'transport_mode': ship.get('transport_mode', '—'),
                    'alerts':         [],
                }
 
            groups[sid]['alerts'].append(alert)
 
        # Step 5: Build summary flags per group
        result = []
        for sid, group in groups.items():
            alerts      = group['alerts']
            max_overdue = max(a['overdue_days'] for a in alerts)
            has_critical = any(a['is_critical'] for a in alerts)

            group['alert_count']      = len(alerts)
            group['overdue_days_max'] = max_overdue
            group['has_critical']     = has_critical
            # dark-red vs lighter-red: a group is "overdue" if any milestone in it
            # is overdue; otherwise it's purely "delayed" (out of sequence).
            group['has_overdue']      = any(a['status'] == 'overdue' for a in alerts)
            group['has_delayed']      = any(a['status'] == 'delayed' for a in alerts)

            result.append(group)

        # Sort: overdue + critical + multi-alert groups first, then by overdue days.
        result.sort(key=lambda g: (
            -(g['has_overdue'] or g['has_critical'] or g['alert_count'] > 1),
            -g['overdue_days_max'],
        ))
 
        return jsonify({'data': result, 'total': len(result)}), 200
 
    except Exception as e:
        return jsonify({'error': str(e)}), 500
