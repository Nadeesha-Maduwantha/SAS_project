"""cover_access.py — REST endpoints for the cover-for-absent-colleague feature."""

import traceback

from flask import Blueprint, request, jsonify

from services import cover_access as svc

cover_bp = Blueprint('cover_access', __name__)


def _err(e):
    """Log the full traceback (so 500s are diagnosable) and return the message."""
    traceback.print_exc()
    return jsonify({'error': str(e)}), 500


def _is_admin(role):
    return 'admin' in (role or '').strip().lower()


def _reply(result):
    """svc functions return (payload_dict, status)."""
    payload, status = result
    return jsonify(payload), status


# ── colleagues you can request cover from ─────────────────────────────────────
@cover_bp.route('/api/cover/colleagues', methods=['GET'])
def colleagues():
    try:
        email = request.args.get('email', '')
        dept  = request.args.get('department', '')
        role  = request.args.get('role', '')
        return jsonify({'data': svc.list_colleagues(email, dept, role)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── create a request ──────────────────────────────────────────────────────────
@cover_bp.route('/api/cover/requests', methods=['POST'])
def create():
    try:
        d = request.get_json(silent=True) or {}
        return _reply(svc.create_request(
            d.get('requester_email'), d.get('requester_name'),
            d.get('owner_email'), d.get('owner_name'),
            d.get('department'), d.get('reason')))
    except Exception as e:
        return _err(e)


# ── lists ─────────────────────────────────────────────────────────────────────
@cover_bp.route('/api/cover/requests/incoming', methods=['GET'])
def incoming():
    try:
        email = svc._norm(request.args.get('email'))
        rows = svc.run_with_retry(lambda: svc.supabase.table('cover_requests')
               .select('id, requester_email, requester_name, owner_email, department, reason, '
                       'status, duration_hours, approved_at, activated_at, expires_at, created_at')
               .eq('owner_email', email).order('created_at', desc=True).execute()).data or []
        return jsonify({'data': rows}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@cover_bp.route('/api/cover/requests/outgoing', methods=['GET'])
def outgoing():
    try:
        email = svc._norm(request.args.get('email'))
        rows = svc.run_with_retry(lambda: svc.supabase.table('cover_requests')
               .select('id, requester_email, owner_email, owner_name, department, reason, '
                       'status, duration_hours, approved_at, activated_at, expires_at, created_at')
               .eq('requester_email', email).order('created_at', desc=True).execute()).data or []
        return jsonify({'data': rows}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── approve / reject / verify / revoke ────────────────────────────────────────
@cover_bp.route('/api/cover/requests/<request_id>/approve', methods=['POST'])
def approve(request_id):
    try:
        d = request.get_json(silent=True) or {}
        return _reply(svc.approve_request(request_id, d.get('approver_email'),
                                          d.get('duration_hours'), is_admin=_is_admin(d.get('role'))))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@cover_bp.route('/api/cover/requests/<request_id>/reject', methods=['POST'])
def reject(request_id):
    try:
        d = request.get_json(silent=True) or {}
        return _reply(svc.reject_request(request_id, d.get('approver_email'), is_admin=_is_admin(d.get('role'))))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@cover_bp.route('/api/cover/requests/<request_id>/verify', methods=['POST'])
def verify(request_id):
    try:
        d = request.get_json(silent=True) or {}
        return _reply(svc.verify_code(request_id, d.get('requester_email'), d.get('code')))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@cover_bp.route('/api/cover/requests/<request_id>/revoke', methods=['POST'])
def revoke(request_id):
    try:
        d = request.get_json(silent=True) or {}
        return _reply(svc.revoke_request(request_id, d.get('email'), is_admin=_is_admin(d.get('role'))))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── admin/super direct grant (no approval) ────────────────────────────────────
@cover_bp.route('/api/cover/direct', methods=['POST'])
def direct():
    try:
        d = request.get_json(silent=True) or {}
        return _reply(svc.create_direct_grant(d.get('actor_email'), d.get('role'),
                                              d.get('department'), d.get('owner_email')))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@cover_bp.route('/api/cover/direct/<request_id>', methods=['DELETE'])
def direct_remove(request_id):
    try:
        return _reply(svc.remove_direct_grant(request_id, request.args.get('email')))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── extension (red-window re-request) ─────────────────────────────────────────
@cover_bp.route('/api/cover/requests/<request_id>/extend', methods=['POST'])
def extend(request_id):
    try:
        d = request.get_json(silent=True) or {}
        return _reply(svc.request_extension(request_id, d.get('requester_email'), d.get('proposed_hours')))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── state feed for the top-bar selector (color + options) ─────────────────────
@cover_bp.route('/api/cover/state', methods=['GET'])
def state():
    try:
        return jsonify({'data': svc.state_for(request.args.get('email'),
                                              request.args.get('role'),
                                              request.args.get('department'))}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── active grants for a viewer (drives the whose-work filter) ─────────────────
@cover_bp.route('/api/cover/active', methods=['GET'])
def active():
    try:
        return jsonify({'data': svc.active_grants_for(request.args.get('email'))}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── log an action taken on borrowed work ──────────────────────────────────────
@cover_bp.route('/api/cover/log', methods=['POST'])
def log():
    try:
        d = request.get_json(silent=True) or {}
        svc.log_activity(d.get('actor_email'), d.get('owner_email'), d.get('action'),
                         d.get('shipment_id'), d.get('milestone_id'), d.get('detail'))
        return jsonify({'ok': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
