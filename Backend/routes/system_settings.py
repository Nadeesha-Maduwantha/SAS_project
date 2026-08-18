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


# ── Field Watch recipient (separate module, its own admin) ────────────────────
@system_settings_bp.route('/api/system-settings/field-watch', methods=['GET'])
@require_auth
def get_field_watch_setting():
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
            'field_watch_alert_email': (row or {}).get('field_watch_alert_email'),
            'field_watch_alert_on':    (row or {}).get('field_watch_alert_on', True),
            'admins':                  admins,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Send a TEST email to the configured recipient (verify SMTP + address) ─────
@system_settings_bp.route('/api/system-settings/test-email', methods=['POST'])
@require_auth
def send_test_email():
    """Send a sample alert to the configured recipient so the admin can confirm
    SMTP + the address work. Body: { target: 'mismatch' | 'field_watch' }.
    Returns { sent, recipients, errors } or a reason when nothing was sent."""
    try:
        _, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403

        target = ((request.get_json(silent=True) or {}).get('target') or 'mismatch').lower()

        if target == 'field_watch':
            from services.field_watch import _field_watch_emails
            recipients = _field_watch_emails()
            subject = '[SAS] Test — Field Watch alert email'
            body = ("This is a test of the Field Watch (delayed / possibly renamed) alert email.\n"
                    "If you received this, SMTP and the Field Watch recipient are configured correctly.")
        else:
            from services.field_registry import _admin_emails
            recipients = _admin_emails()
            subject = '[SAS] Test — Milestone field mismatch email'
            body = ("This is a test of the milestone field-naming mismatch alert email.\n"
                    "If you received this, SMTP and the mismatch recipient are configured correctly.")

        if not recipients:
            return jsonify({'sent': 0, 'recipients': [],
                            'reason': 'No recipient set for this alert, or the alert is turned off.'}), 200

        from services.email_service import send_email
        sent, errors = 0, []
        for to in recipients:
            try:
                send_email(to, subject, body)
                sent += 1
            except Exception as e:
                errors.append({'to': to, 'error': str(e)})
        return jsonify({'sent': sent, 'recipients': recipients, 'errors': errors}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@system_settings_bp.route('/api/system-settings/field-watch', methods=['PUT'])
@require_auth
def set_field_watch_setting():
    try:
        _, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403

        data  = request.get_json() or {}
        email = (data.get('admin_email') or '').strip() or None

        payload = {'field_watch_alert_email': email}
        if 'alert_on' in data:
            payload['field_watch_alert_on'] = bool(data['alert_on'])

        row = _settings_row()
        if row:
            supabase.table('sync_settings').update(payload).eq('id', row['id']).execute()
        else:
            supabase.table('sync_settings').insert(payload).execute()

        return jsonify({'message': 'Saved', 'field_watch_alert_email': email}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
