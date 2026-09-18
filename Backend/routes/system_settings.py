"""
system_settings.py — admin System Settings.

For now: Milestone settings -> "Milestone name mismatch" -> choose which admin
account receives the field-naming mismatch alert email. Stored on
sync_settings.mismatch_alert_email (read by field_registry.notify_admins).
"""

from flask import Blueprint, request, jsonify
from services.supabase_client import supabase
from utils.auth_helper import require_auth, get_current_user
from utils.audit_logger import log_audit_action

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
        requester_id, role = get_current_user()
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

        # action_type_id=2 -> UPDATE, entity_type_id=5 -> System
        # (matches public.action_types / public.entity_types)
        log_audit_action(
            user_id=requester_id,
            action_type_id=2,
            entity_type_id=5,
            entity_id='mismatch_alert_email',
            new_value=payload,
            description='Updated milestone field-mismatch alert setting',
        )

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
        elif target == 'new_user':
            from services.user_alerts import _new_user_alert_emails
            recipients = _new_user_alert_emails()
            subject = '[SAS] Test — New user account alert email'
            body = ("This is a test of the new-user-account alert email.\n"
                    "If you received this, SMTP and the new-user alert recipient are configured correctly.")
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
        requester_id, role = get_current_user()
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

        # action_type_id=2 -> UPDATE, entity_type_id=5 -> System
        # (matches public.action_types / public.entity_types)
        log_audit_action(
            user_id=requester_id,
            action_type_id=2,
            entity_type_id=5,
            entity_id='field_watch_alert_email',
            new_value=payload,
            description='Updated field-watch alert setting',
        )

        return jsonify({'message': 'Saved', 'field_watch_alert_email': email}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── New user alerts (separate module: someone gets an admin-alert email
#    whenever a new user account is created, mirrors Field Watch's pattern) ──
@system_settings_bp.route('/api/system-settings/new-user-alert', methods=['GET'])
@require_auth
def get_new_user_alert_setting():
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
            'new_user_alert_email': (row or {}).get('new_user_alert_email'),
            'new_user_alert_on':    (row or {}).get('new_user_alert_on', True),
            'admins':               admins,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@system_settings_bp.route('/api/system-settings/new-user-alert', methods=['PUT'])
@require_auth
def set_new_user_alert_setting():
    try:
        requester_id, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403

        data  = request.get_json() or {}
        email = (data.get('admin_email') or '').strip() or None

        payload = {'new_user_alert_email': email}
        if 'alert_on' in data:
            payload['new_user_alert_on'] = bool(data['alert_on'])

        row = _settings_row()
        if row:
            supabase.table('sync_settings').update(payload).eq('id', row['id']).execute()
        else:
            supabase.table('sync_settings').insert(payload).execute()

        # action_type_id=2 -> UPDATE, entity_type_id=5 -> System
        # (matches public.action_types / public.entity_types)
        log_audit_action(
            user_id=requester_id,
            action_type_id=2,
            entity_type_id=5,
            entity_id='new_user_alert_email',
            new_value=payload,
            description='Updated new-user alert setting',
        )

        return jsonify({'message': 'Saved', 'new_user_alert_email': email}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Cover Access department policy (applies to Sales + Operation both) ────────
COVER_POLICY_OPTIONS = [
    {'value': 'strict', 'label': 'Only same department can cover',
     'description': 'Department always has to match on both sides. A colleague with no department on file can never cover, or be covered by, anyone through this rule.'},
    {'value': 'unassigned_only', 'label': 'No department → only other no-department colleagues',
     'description': 'Two colleagues who BOTH have no department on file can cover each other (same role). A no-department user still cannot reach into, or be reached from, Sea or Air.'},
    {'value': 'any_department', 'label': 'No department → any same-role colleague',
     'description': 'A user with no department on file can cover, or be covered by, any colleague in the same role → Sea or Air, either direction (the original behavior).'},
]

@system_settings_bp.route('/api/system-settings/cover-department-policy', methods=['GET'])
@require_auth
def get_cover_department_policy():
    try:
        from services.cover_access import COVER_DEPARTMENT_POLICIES, DEFAULT_COVER_DEPARTMENT_POLICY
        row = _settings_row()
        policy = (row or {}).get('cover_department_policy') or DEFAULT_COVER_DEPARTMENT_POLICY
        if policy not in COVER_DEPARTMENT_POLICIES:
            policy = DEFAULT_COVER_DEPARTMENT_POLICY
        return jsonify({
            'cover_department_policy': policy,
            'options': COVER_POLICY_OPTIONS,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@system_settings_bp.route('/api/system-settings/cover-department-policy', methods=['PUT'])
@require_auth
def set_cover_department_policy():
    try:
        requester_id, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403

        from services.cover_access import COVER_DEPARTMENT_POLICIES
        data   = request.get_json() or {}
        policy = (data.get('cover_department_policy') or '').strip()
        if policy not in COVER_DEPARTMENT_POLICIES:
            return jsonify({'error': f"cover_department_policy must be one of {', '.join(COVER_DEPARTMENT_POLICIES)}"}), 400

        payload = {'cover_department_policy': policy}
        row = _settings_row()
        if row:
            supabase.table('sync_settings').update(payload).eq('id', row['id']).execute()
        else:
            supabase.table('sync_settings').insert(payload).execute()

        # action_type_id=2 -> UPDATE, entity_type_id=5 -> System
        # (matches public.action_types / public.entity_types)
        log_audit_action(
            user_id=requester_id,
            action_type_id=2,
            entity_type_id=5,
            entity_id='cover_department_policy',
            new_value=payload,
            description='Updated Cover Access department policy',
        )

        return jsonify({'message': 'Saved', 'cover_department_policy': policy}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── User Type Rules conflict policy (skip vs. replace existing profiles) ──────
CONFLICT_POLICY_OPTIONS = [
    {'value': 'skip', 'label': 'Skip already-assigned users',
     'description': "If someone already has a profile with a role, the scheduled scan leaves them alone even when the identification rules point to a different role. Only brand-new people (no profile yet) are queued as suggestions."},
    {'value': 'replace', 'label': 'Flag role mismatches for review',
     'description': "If an existing profile's role no longer matches what the identification rules detect, it's queued as a role conflict for an admin to review and, if correct, replace."},
]

@system_settings_bp.route('/api/system-settings/user-type-conflict-policy', methods=['GET'])
@require_auth
def get_user_type_conflict_policy():
    try:
        from services.user_type_rules import CONFLICT_POLICIES, DEFAULT_CONFLICT_POLICY
        row = _settings_row()
        policy = (row or {}).get('user_type_conflict_policy') or DEFAULT_CONFLICT_POLICY
        if policy not in CONFLICT_POLICIES:
            policy = DEFAULT_CONFLICT_POLICY
        return jsonify({
            'user_type_conflict_policy': policy,
            'options': CONFLICT_POLICY_OPTIONS,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@system_settings_bp.route('/api/system-settings/user-type-conflict-policy', methods=['PUT'])
@require_auth
def set_user_type_conflict_policy():
    try:
        requester_id, role = get_current_user()
        if not _is_admin(role):
            return jsonify({'error': 'Admin access required'}), 403

        from services.user_type_rules import CONFLICT_POLICIES
        data   = request.get_json() or {}
        policy = (data.get('user_type_conflict_policy') or '').strip()
        if policy not in CONFLICT_POLICIES:
            return jsonify({'error': f"user_type_conflict_policy must be one of {', '.join(CONFLICT_POLICIES)}"}), 400

        payload = {'user_type_conflict_policy': policy}
        row = _settings_row()
        if row:
            supabase.table('sync_settings').update(payload).eq('id', row['id']).execute()
        else:
            supabase.table('sync_settings').insert(payload).execute()

        # action_type_id=2 -> UPDATE, entity_type_id=5 -> System
        log_audit_action(
            user_id=requester_id,
            action_type_id=2,
            entity_type_id=5,
            entity_id='user_type_conflict_policy',
            new_value=payload,
            description='Updated User Type Rules conflict policy',
        )

        return jsonify({'message': 'Saved', 'user_type_conflict_policy': policy}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
