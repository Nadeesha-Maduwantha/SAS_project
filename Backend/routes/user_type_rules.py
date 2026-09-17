"""
user_type_rules.py — REST endpoints for the User Type Rules registry
(admin-configurable "how do we know someone's role") and the
suggested-accounts review queue it feeds. See services/user_type_rules.py.
"""

from flask import Blueprint, request, jsonify

from services import user_type_rules as svc
from utils.auth_helper import require_auth, get_current_user
from utils.audit_logger import log_audit_action

user_type_rules_bp = Blueprint('user_type_rules', __name__, url_prefix='/api/user-type-rules')


def _is_admin(role):
    return 'admin' in (role or '').strip().lower()


def _reply(result):
    payload, status = result
    return jsonify(payload), status


# ── what a rule is allowed to point at (drives the UI's dropdowns) ────────────
@user_type_rules_bp.route('/allowed-tables', methods=['GET'])
@require_auth
def allowed_tables():
    try:
        return jsonify({'data': svc.list_allowed_tables()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── rules CRUD (admin only) ────────────────────────────────────────────────────
@user_type_rules_bp.route('', methods=['GET'])
@require_auth
def get_rules():
    try:
        return jsonify({'data': svc.list_rules()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@user_type_rules_bp.route('', methods=['POST'])
@require_auth
def create_rule():
    try:
        requester_id, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403
        d = request.get_json(silent=True) or {}
        return _reply(svc.create_rule(
            d.get('role'), d.get('table_name'), d.get('column_name'),
            description=d.get('description'), priority=d.get('priority', 0),
            updated_by=requester_id,
        ))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@user_type_rules_bp.route('/<rule_id>', methods=['PUT'])
@require_auth
def update_rule(rule_id):
    try:
        requester_id, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403
        d = request.get_json(silent=True) or {}
        return _reply(svc.update_rule(rule_id, d, updated_by=requester_id))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@user_type_rules_bp.route('/<rule_id>', methods=['DELETE'])
@require_auth
def delete_rule(rule_id):
    try:
        _, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403
        return _reply(svc.delete_rule(rule_id))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── live "did you mean Sales User?" check for the Create User form ────────────
@user_type_rules_bp.route('/detect', methods=['GET'])
@require_auth
def detect():
    try:
        email = request.args.get('email', '')
        return jsonify({'data': svc.detect_roles_for_email(email)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── suggested-accounts queue (people found in shipment data, no profile yet) ──
@user_type_rules_bp.route('/suggestions', methods=['GET'])
@require_auth
def suggestions():
    try:
        status = request.args.get('status', 'pending')
        return jsonify({'data': svc.list_suggested_accounts(status=status or None)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@user_type_rules_bp.route('/suggestions/<suggestion_id>/dismiss', methods=['POST'])
@require_auth
def dismiss_suggestion(suggestion_id):
    try:
        requester_id, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403
        return _reply(svc.dismiss_suggested_account(suggestion_id, dismissed_by=requester_id))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── manual "run the scan now" (mirrors the milestone field-registry's test-run pattern) ──
@user_type_rules_bp.route('/scan', methods=['POST'])
@require_auth
def scan_now():
    try:
        _, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403
        return jsonify({'data': svc.scan_for_unmatched_people()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── role conflicts — existing accounts whose role no longer matches the data,
#    only ever populated when System Settings -> User Type Rules -> conflict
#    policy is 'replace' (see services/user_type_rules.py _conflict_policy) ──
@user_type_rules_bp.route('/conflicts', methods=['GET'])
@require_auth
def conflicts():
    try:
        status = request.args.get('status', 'pending')
        return jsonify({'data': svc.list_conflicts(status=status or None)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@user_type_rules_bp.route('/conflicts/<conflict_id>/dismiss', methods=['POST'])
@require_auth
def dismiss_conflict(conflict_id):
    try:
        requester_id, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403
        return _reply(svc.dismiss_conflict(conflict_id, resolved_by=requester_id))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@user_type_rules_bp.route('/conflicts/<conflict_id>/replace', methods=['POST'])
@require_auth
def replace_conflict(conflict_id):
    try:
        requester_id, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403
        payload, status = svc.resolve_conflict_replace(conflict_id, resolved_by=requester_id)
        if status == 200 and requester_id:
            data = payload.get('data', {})
            # action_type_id=2 -> UPDATE, entity_type_id=2 -> User Profile
            # (matches public.action_types / public.entity_types)
            log_audit_action(
                user_id=requester_id,
                action_type_id=2,
                entity_type_id=2,
                entity_id=data.get('profile_id'),
                new_value={'role': data.get('detected_role')},
                description=f"Replaced role for {data.get('email')} "
                            f"({data.get('existing_role')} -> {data.get('detected_role')}) via User Type Rules",
            )
        return jsonify(payload), status
    except Exception as e:
        return jsonify({'error': str(e)}), 500
