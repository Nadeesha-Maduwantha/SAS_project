"""
operations_digest.py — daily digest emails for operation users.

Mirrors services/sales_digest.py, standalone from the milestone alert engine.
Sends each operation user, once a day, up to two summary emails built straight
off `shipment_milestones.due_date` for every open milestone assigned to them:

  • Overdue Alerts     — due_date is in the past, not completed
  • Upcoming Reminders — due_date is within REMINDER_WINDOW_DAYS days, not completed

Ownership here is `shipment_milestones.assigned_email` — the same column the
operation_user Alert Dashboard filters on (`GET /api/alerts?assigned_email=...`),
so the emailed list matches what an operations user sees on-screen. This is a
milestone-level field (who is responsible for that specific milestone), unlike
sales_digest's shipment-level `sales_user_email`.

An operation user with nothing in a bucket gets no email for that bucket.
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
            print(f"[operations_digest] transient error on attempt {attempt}/{attempts}: {e}")
            _supabase().reset()
            time.sleep(1)


def _load_open_milestones() -> list[dict]:
    """Every not-yet-completed, due-dated milestone assigned to an operation user."""
    supabase = _supabase()
    rows = _execute_with_retry(lambda: (
        supabase.table('shipment_milestones')
        .select('id, shipment_id, name, is_critical, due_date, completed_date, assigned_email')
        .is_('completed_date', 'null')
        .not_.is_('due_date', 'null')
    )).data or []

    shipment_ids = list({r['shipment_id'] for r in rows if r.get('shipment_id')})
    shipments = {}
    for i in range(0, len(shipment_ids), 200):
        chunk = shipment_ids[i:i + 200]
        data = _execute_with_retry(lambda chunk=chunk: (
            supabase.table('shipments')
            .select('id, job_number, consignee_name')
            .in_('id', chunk)
        )).data or []
        shipments.update({s['id']: s for s in data})

    out = []
    for r in rows:
        due = parse_date(r.get('due_date'))
        if not due:
            continue
        email = (r.get('assigned_email') or '').strip().lower()
        if not email:
            continue
        shipment = shipments.get(r.get('shipment_id')) or {}
        out.append({
            'operations_email': email,
            'job_number':        shipment.get('job_number') or str(r.get('shipment_id'))[:8],
            'consignee_name':    shipment.get('consignee_name') or '—',
            'milestone':         r.get('name') or '—',
            'is_critical':       bool(r.get('is_critical')),
            'due_date':          due,
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


def _group_by_operations(items: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for item in items:
        grouped.setdefault(item['operations_email'], []).append(item)
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


def _build_email(kind: str, items: list[dict]) -> dict:
    """kind: 'overdue' | 'reminder'. Returns {subject, html, text}."""
    if kind == 'overdue':
        items = sorted(items, key=lambda i: (not i['is_critical'], -i['overdue_days']))
        subject = f"[SAS] {len(items)} overdue alert(s) need your attention"
        heading, color = 'Overdue Alerts', '#DC2626'
        labels = [f"{i['overdue_days']} day(s) overdue" for i in items]
    else:
        items = sorted(items, key=lambda i: (not i['is_critical'], i['days_until_due']))
        subject = f"[SAS] {len(items)} milestone(s) due within {REMINDER_WINDOW_DAYS} days"
        heading, color = 'Upcoming Reminders', '#D97706'
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


def _log_send(operations_email: str, kind: str, item_count: int, subject: str,
              status: str, error: str | None = None) -> None:
    """One row in operations_digest_log — feeds the admin 'sent emails' view."""
    try:
        _supabase().table('operations_digest_log').insert({
            'operations_email': operations_email,
            'kind':             kind,
            'item_count':       item_count,
            'subject':          subject,
            'status':           status,
            'error':            error,
        }).execute()
    except Exception as e:
        print(f"[operations_digest] could not write operations_digest_log: {e}")


def run_operations_digest(dry_run: bool = False) -> dict:
    """
    One daily pass: every operation user with overdue milestones assigned to them
    gets an Overdue Alerts email; every operation user with milestones due within
    REMINDER_WINDOW_DAYS days gets a separate Upcoming Reminders email. An
    operation user with nothing in a bucket gets no email for that bucket.
    """
    today = now_local().date()
    items = _load_open_milestones()
    overdue_items, reminder_items = _bucket(items, today)

    result = {'date': today.isoformat(), 'dry_run': dry_run,
               'overdue_emails': 0, 'reminder_emails': 0, 'errors': []}

    for kind, bucket in (('overdue', overdue_items), ('reminder', reminder_items)):
        for operations_email, ops_items in _group_by_operations(bucket).items():
            message = _build_email(kind, ops_items)
            if dry_run:
                result[f'{kind}_emails'] += 1
                continue
            try:
                send_email([operations_email], message['subject'], message['text'], html=message['html'])
                result[f'{kind}_emails'] += 1
                _log_send(operations_email, kind, len(ops_items), message['subject'], 'sent')
            except Exception as e:
                result['errors'].append({'operations_email': operations_email, 'kind': kind, 'error': str(e)})
                _log_send(operations_email, kind, len(ops_items), message['subject'], 'failed', str(e))

    return result
