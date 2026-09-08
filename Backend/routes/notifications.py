from flask import Blueprint, jsonify
from services.supabase_service import get_supabase
from services.security_settings_service import get_notification_preferences
from utils.auth_helper import require_auth
import json

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

FEED_LIMIT_PER_CATEGORY = 10
FEED_LIMIT_TOTAL = 20


@notifications_bp.route('', methods=['GET'])
@notifications_bp.route('/', methods=['GET'])
@require_auth
def get_notifications():
    """Recent security notifications for the top-bar bell — system-wide,
    same scope as Access Logs / Audit Trail. Each of the four categories is
    only included when its matching Security Settings toggle is on."""
    try:
        supabase = get_supabase()
        prefs = get_notification_preferences()
        items = []

        if prefs['failed_attempts']:
            rows = (
                supabase.table('access_logs')
                .select('id, timestamp, email_attempted')
                .eq('action', 'Failed Login Attempt')
                .order('timestamp', desc=True)
                .limit(FEED_LIMIT_PER_CATEGORY)
                .execute()
            ).data or []
            for r in rows:
                items.append({
                    'id': f"failed_login_{r.get('id')}",
                    'type': 'failed_login',
                    'message': f"Failed login attempt for {r.get('email_attempted') or 'unknown user'}",
                    'timestamp': r.get('timestamp'),
                })

        if prefs['password_changes']:
            rows = (
                supabase.table('access_logs')
                .select('id, timestamp, email_attempted')
                .eq('action', 'Password Changed')
                .order('timestamp', desc=True)
                .limit(FEED_LIMIT_PER_CATEGORY)
                .execute()
            ).data or []
            for r in rows:
                items.append({
                    'id': f"password_changed_{r.get('id')}",
                    'type': 'password_changed',
                    'message': f"Password changed for {r.get('email_attempted') or 'unknown user'}",
                    'timestamp': r.get('timestamp'),
                })

        if prefs['new_device_login']:
            rows = (
                supabase.table('access_logs')
                .select('id, timestamp, email_attempted, device')
                .eq('action', 'New Device Login')
                .order('timestamp', desc=True)
                .limit(FEED_LIMIT_PER_CATEGORY)
                .execute()
            ).data or []
            for r in rows:
                device = r.get('device') or 'an unrecognized device'
                items.append({
                    'id': f"new_device_{r.get('id')}",
                    'type': 'new_device_login',
                    'message': f"New device login for {r.get('email_attempted') or 'unknown user'} ({device})",
                    'timestamp': r.get('timestamp'),
                })

        if prefs['permission_changes']:
            rows = (
                supabase.table('audit_trail')
                .select('audit_id, created_at, new_value, description')
                .eq('action_type_id', 2)   # Update
                .eq('entity_type_id', 2)   # User Profile
                .order('created_at', desc=True)
                .limit(FEED_LIMIT_PER_CATEGORY)
                .execute()
            ).data or []
            for r in rows:
                new_val = r.get('new_value')
                if isinstance(new_val, str):
                    try:
                        new_val = json.loads(new_val)
                    except Exception:
                        new_val = None
                if not isinstance(new_val, dict):
                    continue

                changes = []
                if 'role' in new_val:
                    changes.append(f"role changed to '{new_val['role']}'")
                if 'department' in new_val:
                    changes.append(f"department changed to '{new_val['department']}'")
                if not changes:
                    continue  # an Update on this entity that wasn't a permission change

                items.append({
                    'id': f"permission_changed_{r.get('audit_id')}",
                    'type': 'permission_changed',
                    'message': (r.get('description') or 'User permissions updated') + ' — ' + ', '.join(changes),
                    'timestamp': r.get('created_at'),
                })

        items.sort(key=lambda x: x['timestamp'] or '', reverse=True)
        return jsonify({'data': items[:FEED_LIMIT_TOTAL]}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
