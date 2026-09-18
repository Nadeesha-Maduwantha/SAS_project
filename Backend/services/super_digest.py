"""
super_digest.py — daily digest emails for super users.

Mirrors services/sales_digest.py / services/operations_digest.py, standalone
from the milestone alert engine. Sends each super user, once a day, up to two
summary emails built straight off `shipment_milestones.due_date` for every
open milestone in their own department:

  • Overdue Alerts     — due_date is in the past, not completed
  • Upcoming Reminders — due_date is within REMINDER_WINDOW_DAYS days, not completed

Ownership here is by department: a super user's `profiles.department`
matched against the shipment's `transport_mode` — the same pairing the
Super_user Alert Dashboard filters on (`GET /api/alerts?department=...`), so
the emailed list matches what a super user sees on-screen. This is a
department-wide grouping, unlike sales_digest's per-shipment
`sales_user_email` or operations_digest's per-milestone `assigned_email` —
several super users in the same department receive the same digest.

A super user with nothing in a bucket gets no email for that bucket. A super
user with no department set is skipped entirely (nothing to match against).
"""

from __future__ import annotations

import time
from datetime import date

import httpx

from services.alert_engine import parse_date, now_local
from services.email_service import send_email

REMINDER_WINDOW_DAYS = 3
QUERY_ATTEMPTS = 3   # a dropped connection / SSL blip to Supabase gets two retries


def _supabase():
    from services.supabase_client import supabase
    return supabase


def _execute_with_retry(build_query, attempts: int = QUERY_ATTEMPTS):
    """Call `build_query()` (a callable returning a fresh postgrest query builder)
    and `.execute()` it, retrying on transient network drops (e.g. WinError 10054 /
    SSL bad-record-mac). A pooled connection that just broke would break again on an
    immediate retry, so each retry also resets the shared client — `build_query` must
    defer `supabase.table(...)` until it's called so the reset takes effect."""
    for attempt in range(1, attempts + 1):
        try:
            return build_query().execute()
        except (httpx.TransportError, OSError) as e:
            if attempt == attempts:
                raise
            print(f"[super_digest] transient error on attempt {attempt}/{attempts}: {e}")
            _supabase().reset()
            time.sleep(1)


def _load_super_users() -> list[dict]:
    """Every super user with an email and a department to match shipments against."""
    supabase = _supabase()
    rows = _execute_with_retry(lambda: (
        supabase.table('profiles')
        .select('id, email, department')
        .eq('role', 'superuser')
    )).data or []

    out = []
    for r in rows:
        email = (r.get('email') or '').strip().lower()
        department = (r.get('department') or '').strip().upper()
        if not email or not department:
            continue
        out.append({'email': email, 'department': department})
    return out


def _load_open_milestones() -> list[dict]:
    """Every not-yet-completed, due-dated milestone, with its shipment's transport_mode."""
    supabase = _supabase()
    rows = _execute_with_retry(lambda: (
        supabase.table('shipment_milestones')
        .select('id, shipment_id, name, is_critical, due_date, completed_date')
        .is_('completed_date', 'null')
        .not_.is_('due_date', 'null')
    )).data or []

    shipment_ids = list({r['shipment_id'] for r in rows if r.get('shipment_id')})
    shipments = {}
    for i in range(0, len(shipment_ids), 200):
        chunk = shipment_ids[i:i + 200]
        data = _execute_with_retry(lambda chunk=chunk: (
            supabase.table('shipments')
            .select('id, job_number, consignee_name, transport_mode')
            .in_('id', chunk)
        )).data or []
        shipments.update({s['id']: s for s in data})

    out = []
    for r in rows:
        due = parse_date(r.get('due_date'))
        if not due:
            continue
        shipment = shipments.get(r.get('shipment_id')) or {}
        department = (shipment.get('transport_mode') or '').strip().upper()
        if not department:
            continue
        out.append({
            'department':     department,
            'job_number':     shipment.get('job_number') or str(r.get('shipment_id'))[:8],
            'consignee_name': shipment.get('consignee_name') or '—',
            'milestone':      r.get('name') or '—',
            'is_critical':    bool(r.get('is_critical')),
            'due_date':       due,
        })
    return out


def _bucket(items: list[dict], today: date) -> tuple[list[dict], list[dict]]:
    """Split into (overdue, due-soon) using the same due_date column both read from."""
    overdue, reminders = [], []
    for item in items:
        delta = (item['due_date'] - today).days
        if delta < 0:
            item['overdue_days'] = -delta
            overdue.append(item)
        elif delta <= REMINDER_WINDOW_DAYS:
            item['days_until_due'] = delta
            reminders.append(item)
    return overdue, reminders


def _group_by_department(items: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for item in items:
        grouped.setdefault(item['department'], []).append(item)
    return grouped


def _row_html(item: dict, label: str) -> str:
    critical = ' <strong style="color:#DC2626">[CRITICAL]</strong>' if item['is_critical'] else ''
    return (
        '<tr>'
        f'<td style="padding:6px 10px;border-bottom:1px solid #eee">{item["job_number"]}</td>'
        f'<td style="padding:6px 10px;border-bottom:1px solid #eee">{item["consignee_name"]}</td>'
        f'<td style="padding:6px 10px;border-bottom:1px solid #eee">{item["milestone"]}{critical}</td>'
        f'<td style="padding:6px 10px;border-bottom:1px solid #eee">{label}</td>'
        '</tr>'
    )


def _build_email(kind: str, department: str, items: list[dict]) -> dict:
    """kind: 'overdue' | 'reminder'. Returns {subject, html, text}."""
    if kind == 'overdue':
        items = sorted(items, key=lambda i: (not i['is_critical'], -i['overdue_days']))
        subject = f"[SAS] {len(items)} overdue alert(s) in {department} need your attention"
        heading, color = f'Overdue Alerts — {department}', '#DC2626'
        labels = [f"{i['overdue_days']} day(s) overdue" for i in items]
    else:
        items = sorted(items, key=lambda i: (not i['is_critical'], i['days_until_due']))
        subject = f"[SAS] {len(items)} milestone(s) in {department} due within {REMINDER_WINDOW_DAYS} days"
        heading, color = f'Upcoming Reminders — {department}', '#D97706'
        labels = ['Due today' if i['days_until_due'] == 0 else f"Due in {i['days_until_due']} day(s)"
                  for i in items]

    rows_html = ''.join(_row_html(i, label) for i, label in zip(items, labels))
    text_lines = [f"{i['job_number']} — {i['consignee_name']} — {i['milestone']} — {label}"
                  for i, label in zip(items, labels)]

    html = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111">'
        f'<p style="margin:0 0 12px"><strong style="color:{color}">{heading}</strong> '
        f'— {len(items)} shipment milestone(s)</p>'
        '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;width:100%">'
        '<tr style="background:#f9fafb">'
        '<th style="text-align:left;padding:6px 10px">Shipment</th>'
        '<th style="text-align:left;padding:6px 10px">Consignee</th>'
        '<th style="text-align:left;padding:6px 10px">Milestone</th>'
        '<th style="text-align:left;padding:6px 10px">Status</th>'
        '</tr>'
        f'{rows_html}'
        '</table>'
        '<p style="margin:12px 0 0;color:#555">This is your daily SAS alert digest.</p>'
        '</div>'
    )
    text = f"{heading} — {len(items)} shipment milestone(s)\n\n" + '\n'.join(text_lines)
    return {'subject': subject, 'html': html, 'text': text}


def _log_send(super_email: str, department: str, kind: str, item_count: int, subject: str,
              status: str, error: str | None = None) -> None:
    """One row in super_digest_log — feeds the admin 'sent emails' view."""
    try:
        _supabase().table('super_digest_log').insert({
            'super_email': super_email,
            'department':  department,
            'kind':        kind,
            'item_count':  item_count,
            'subject':     subject,
            'status':      status,
            'error':       error,
        }).execute()
    except Exception as e:
        print(f"[super_digest] could not write super_digest_log: {e}")


def run_super_digest(dry_run: bool = False) -> dict:
    """
    One daily pass: every super user with overdue milestones in their department
    gets an Overdue Alerts email; every super user with milestones due within
    REMINDER_WINDOW_DAYS days in their department gets a separate Upcoming
    Reminders email. A super user with nothing in a bucket gets no email for
    that bucket. Several super users sharing a department each get their own
    copy of that department's digest.
    """
    today = now_local().date()
    items = _load_open_milestones()
    overdue_items, reminder_items = _bucket(items, today)
    super_users = _load_super_users()

    result = {'date': today.isoformat(), 'dry_run': dry_run,
               'overdue_emails': 0, 'reminder_emails': 0, 'errors': []}

    overdue_by_dept = _group_by_department(overdue_items)
    reminder_by_dept = _group_by_department(reminder_items)

    for kind, by_dept in (('overdue', overdue_by_dept), ('reminder', reminder_by_dept)):
        for user in super_users:
            dept_items = by_dept.get(user['department'])
            if not dept_items:
                continue
            message = _build_email(kind, user['department'], dept_items)
            if dry_run:
                result[f'{kind}_emails'] += 1
                continue
            try:
                send_email([user['email']], message['subject'], message['text'], html=message['html'])
                result[f'{kind}_emails'] += 1
                _log_send(user['email'], user['department'], kind, len(dept_items), message['subject'], 'sent')
            except Exception as e:
                result['errors'].append({'super_email': user['email'], 'department': user['department'],
                                         'kind': kind, 'error': str(e)})
                _log_send(user['email'], user['department'], kind, len(dept_items), message['subject'],
                          'failed', str(e))

    return result
