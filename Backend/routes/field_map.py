"""
field_map.py — admin routes for the milestone field registry.

Companion to services/field_registry.py and Isiri's migration package.
Lets an admin:
  • list the current field registry
  • pre-define a mapping (Door 1) — including a *future* field that the API
    does not return yet; it stays harmless until the field appears
  • deactivate a mapping
  • run the field-naming mismatch check and email the designated admin(s)
"""

from flask import Blueprint, request, jsonify
from services.supabase_client import supabase
from utils.auth_helper import require_auth, get_current_user
from services.field_registry import detect_field_mismatches, notify_admins, find_field_mismatches

field_map_bp = Blueprint('field_map', __name__)


def _is_admin(role: str) -> bool:
    return 'admin' in (role or '').lower()


# ── GET /api/field-map ────────────────────────────────────────────────────────
@field_map_bp.route('/api/field-map', methods=['GET'])
@require_auth
def list_field_map():
    try:
        active_only = request.args.get('active', 'true').lower() == 'true'
        q = supabase.table('milestone_field_map').select('*').order('milestone_key')
        if active_only:
            q = q.eq('is_active', True)
        return jsonify({'data': q.execute().data or []}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── POST /api/field-map ───────────────────────────────────────────────────────
# Door 1 — admin pre-defines a mapping. api_field can be a field the CargoWise
# API does not return yet; it will simply be collected once it starts appearing.
@field_map_bp.route('/api/field-map', methods=['POST'])
@require_auth
def add_field_map():
    try:
        _, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json() or {}
        milestone_key = (data.get('milestone_key') or '').strip()
        api_field     = (data.get('api_field') or '').strip()
        if not milestone_key or not api_field:
            return jsonify({'error': 'milestone_key and api_field are required'}), 400

        resp = supabase.table('milestone_field_map').upsert(
            {
                'milestone_key': milestone_key,
                'api_field':     api_field,
                'source':        data.get('source', 'predefined'),
                'is_active':     True,
            },
            on_conflict='milestone_key,api_field',
        ).execute()
        return jsonify({'message': 'Mapping saved', 'data': (resp.data or [None])[0]}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── PATCH /api/field-map/<id>/deactivate ──────────────────────────────────────
@field_map_bp.route('/api/field-map/<row_id>/deactivate', methods=['PATCH'])
@require_auth
def deactivate_field_map(row_id):
    try:
        _, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403
        supabase.table('milestone_field_map').update({'is_active': False}).eq('id', row_id).execute()
        return jsonify({'message': 'Mapping deactivated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── GET /api/field-map/mismatches ─────────────────────────────────────────────
# Read-only: current field-naming mismatches for the admin page (no email/log).
@field_map_bp.route('/api/field-map/mismatches', methods=['GET'])
@require_auth
def list_mismatches():
    try:
        return jsonify({'data': find_field_mismatches()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── POST /api/field-map/detect ────────────────────────────────────────────────
# Runs the mismatch detector: registered fields that the API doesn't provide but
# a similarly-named field exists. Logs each to sync_errors and emails admins.
@field_map_bp.route('/api/field-map/detect', methods=['POST'])
@require_auth
def detect_mismatches():
    try:
        _, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403

        mismatches = detect_field_mismatches()
        notified = notify_admins(mismatches)
        return jsonify({
            'mismatches': mismatches,
            'count':      len(mismatches),
            'notified':   notified,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
