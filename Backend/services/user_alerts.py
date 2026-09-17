"""
user_alerts.py — "A new user account was created" admin alert.

Fires once, right after routes/users.py's create_user() succeeds. Separate
from the Security Notifications bell (that one reads audit_trail live —
see routes/notifications.py); this module only sends the EMAIL half, using
the same single-recipient-setting convention as field_registry.py /
field_watch.py (sync_settings.new_user_alert_email, falling back to the
general admin_emails list, gated by new_user_alert_on).
"""

import re

from services.supabase_client import supabase


def _new_user_alert_emails():
    """Recipient(s) for the new-user-created email: the setting configured in
    System Settings -> New user alerts, else the general admin_emails list.
    Respects new_user_alert_on (defaults to on if the settings row/columns
    are missing, so this doesn't silently do nothing before the migration
    that added these columns has been run and a value picked)."""
    try:
        row = (supabase.table('sync_settings')
               .select('admin_emails, new_user_alert_email, new_user_alert_on')
               .limit(1).execute()).data
        if not row:
            return []
        row = row[0]
        if row.get('new_user_alert_on') is False:
            return []
        target = row.get('new_user_alert_email') or row.get('admin_emails') or ''
        return [e.strip() for e in re.split(r'[,;\s]+', target) if e.strip()]
    except Exception as e:
        print(f"[user_alerts] could not load recipient: {e}")
        return []


def notify_new_user_created(email, full_name=None, role=None, department=None, created_by_email=None):
    """Emails the configured admin(s) that a new user account was created.
    Best-effort — never raises, so a misconfigured/unreachable mail step can
    never fail the account-creation request itself."""
    try:
        recipients = _new_user_alert_emails()
        if not recipients:
            return {'sent': 0, 'reason': 'no recipient / alerts off'}

        subject = f"[SAS] New user account created — {email}"
        lines = [
            "A new user account was just created in SAS.",
            "",
            f"Name: {full_name or '(not set)'}",
            f"Email: {email}",
            f"Role: {role or '(not set)'}",
            f"Department: {department or '(not set)'}",
        ]
        if created_by_email:
            lines.append(f"Created by: {created_by_email}")
        lines += ["", "Review it under Admin -> Users if this wasn't expected."]
        body = "\n".join(lines)

        from services.email_service import send_email
        sent, errors = 0, []
        for to in recipients:
            try:
                send_email(to, subject, body)
                sent += 1
            except Exception as e:
                errors.append({'to': to, 'error': str(e)})
        return {'sent': sent, 'recipients': recipients, 'errors': errors}
    except Exception as e:
        print(f"[user_alerts] notify_new_user_created failed (non-fatal): {e}")
        return {'sent': 0, 'reason': str(e)}
