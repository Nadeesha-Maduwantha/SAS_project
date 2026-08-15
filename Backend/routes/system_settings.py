"""
system_settings.py — admin System Settings.

For now: Milestone settings -> "Milestone name mismatch" -> choose which admin
account receives the field-naming mismatch alert email. Stored on
sync_settings.mismatch_alert_email (read by field_registry.notify_admins).
"""

from flask import Blueprint, request, jsonify
from services.supabase_client import supabase
from utils.auth_helper import require_auth, get_current_user

system_settings_bp = Blueprint('system_settings', __name__)


def _is_admin(role: str) -> bool:
    return 'admin' in (role or '').lower()


def _settings_row():
    rows = (supabase.table('sync_settings').select('*').limit(1).execute()).data or []
    return rows[0] if rows else None


# ── GET current milestone-mismatch setting + selectable admins ────────────────
@system_settings_bp.route('/api/system-settings/milestone-mismatch', methods=['GET'])
@require_auth
def get_mismatch_setting():
    try:
        row = _settings_row()
        admins = (
            supabase.table('profiles')
            .select('id, full_name, email, role')
            .ilike('role', '%admin%')
            .order('full_name')
            .execute()
        ).data or []
        return jsonify({
            'mismatch_alert_email': (row or {}).get('mismatch_alert_email'),
            'alert_on_validation':  (row or {}).get('alert_on_validation', True),
            'admins':               admins,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── PUT set the alerting admin ────────────────────────────────────────────────
@system_settings_bp.route('/api/system-settings/milestone-mismatch', methods=['PUT'])
@require_auth
def set_mismatch_setting():
    try:
        _, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403

        data  = request.get_json() or {}
        email = (data.get('admin_email') or '').strip() or None

        payload = {'mismatch_alert_email': email}
        if 'alert_on_validation' in data:
            payload['alert_on_validation'] = bool(data['alert_on_validation'])

        row = _settings_row()
        if row:
            supabase.table('sync_settings').update(payload).eq('id', row['id']).execute()
        else:
            supabase.table('sync_settings').insert(payload).execute()

        return jsonify({'message': 'Saved', 'mismatch_alert_email': email}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
