"""
field_definitions.py — admin-editable meanings for shipment data fields.

Definitions are managed in System Settings -> Milestone settings and surfaced in
the milestone builder (FieldSelector) as the field's hint, so building
milestones/templates is easier.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from services.supabase_client import supabase
from utils.auth_helper import require_auth, get_current_user

field_definitions_bp = Blueprint('field_definitions', __name__)


def _is_admin(role: str) -> bool:
    return 'admin' in (role or '').lower()


# ── GET all definitions (any authed user — the builder reads these) ───────────
@field_definitions_bp.route('/api/field-definitions', methods=['GET'])
@require_auth
def list_field_definitions():
    try:
        rows = (supabase.table('field_definitions').select('*').execute()).data or []
        return jsonify({'data': rows}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── PUT upsert one definition (admin only) ────────────────────────────────────
@field_definitions_bp.route('/api/field-definitions', methods=['PUT'])
@require_auth
def upsert_field_definition():
    try:
        user_id, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json() or {}
        api_field = (data.get('api_field') or '').strip()
        if not api_field:
            return jsonify({'error': 'api_field is required'}), 400

        row = {
            'api_field':  api_field,
            'label':      (data.get('label') or '').strip() or None,
            'definition': (data.get('definition') or '').strip() or None,
            'updated_at': datetime.now(timezone.utc).isoformat(),
            'updated_by': user_id,
        }
        resp = supabase.table('field_definitions').upsert(row, on_conflict='api_field').execute()
        return jsonify({'message': 'Saved', 'data': (resp.data or [None])[0]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── DELETE a definition (admin only) ──────────────────────────────────────────
@field_definitions_bp.route('/api/field-definitions/<api_field>', methods=['DELETE'])
@require_auth
def delete_field_definition(api_field):
    try:
        _, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403
        supabase.table('field_definitions').delete().eq('api_field', api_field).execute()
        return jsonify({'message': 'Deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
