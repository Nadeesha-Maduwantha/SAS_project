"""
user_types.py — REST endpoints for admin-defined custom user types.
See services/user_types.py.
"""

from flask import Blueprint, request, jsonify

from services import user_types as svc
from utils.auth_helper import require_auth, get_current_user
from utils.audit_logger import log_audit_action

user_types_bp = Blueprint('user_types', __name__, url_prefix='/api/user-types')


def _is_admin(role):
    return 'admin' in (role or '').strip().lower()


def _reply(result):
    payload, status = result
    return jsonify(payload), status


# ── list — any authed user (Create User pages need this to build the Role
#    dropdown); non-admins only ever see active types ───────────────────────
@user_types_bp.route('', methods=['GET'])
@require_auth
def list_types():
    try:
        _, role = get_current_user()
        include_inactive = _is_admin(role) and request.args.get('include_inactive') == '1'
        return jsonify({'data': svc.list_types(include_inactive=include_inactive)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── create (admin only) ───────────────────────────────────────────────────
@user_types_bp.route('', methods=['POST'])
@require_auth
def create_type():
    try:
        user_id, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403
        d = request.get_json() or {}
        result = svc.create_type(
            label=d.get('label'), field_table=d.get('field_table'), field_column=d.get('field_column'),
            description=d.get('description'), can_request_cover=d.get('can_request_cover', True),
            receive_alerts=d.get('receive_alerts', False),
            can_email_clients=d.get('can_email_clients', True), created_by=user_id,
        )
        payload, status = result
        if status == 201 and user_id:
            log_audit_action(
                user_id=user_id, action_type_id=1, entity_type_id=5,
                entity_id=payload.get('data', {}).get('id'),
                new_value=payload.get('data'),
                description=f"Created user type '{payload.get('data', {}).get('label')}'",
            )
        return jsonify(payload), status
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── update (admin only) — edit mapping/toggles, or set is_active ──────────
@user_types_bp.route('/<type_id>', methods=['PUT'])
@require_auth
def update_type(type_id):
    try:
        user_id, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403
        d = request.get_json() or {}
        result = svc.update_type(type_id, d, updated_by=user_id)
        payload, status = result
        if status == 200 and user_id:
            log_audit_action(
                user_id=user_id, action_type_id=2, entity_type_id=5,
                entity_id=type_id, new_value=d,
                description=f"Updated user type {type_id}",
            )
        return jsonify(payload), status
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── deactivate (admin only) — soft delete, never hard ─────────────────────
@user_types_bp.route('/<type_id>', methods=['DELETE'])
@require_auth
def deactivate_type(type_id):
    try:
        user_id, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403
        result = svc.deactivate_type(type_id)
        payload, status = result
        if status == 200 and user_id:
            log_audit_action(
                user_id=user_id, action_type_id=2, entity_type_id=5,
                entity_id=type_id, new_value={'is_active': False},
                description=f"Deactivated user type {type_id}",
            )
        return jsonify(payload), status
    except Exception as e:
        return jsonify({'error': str(e)}), 500
