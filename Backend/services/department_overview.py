"""
department_overview.py — aggregates the admin Department Overview page from real
data (profiles + shipments + shipment_milestones).

A "department" here is a role group:
  Operations -> users whose role contains 'operation'; their shipments are the
                ones they created (created_by_email).
  Sales      -> users whose role contains 'sales'; their shipments are the ones
                where sales_user_email is theirs.

Per shipment we derive: status (on_track / at_risk / overdue), the current
milestone, priority, eta, route (origin->dest country codes), mode and assignee.
The frontend turns the country codes into map coordinates.
"""

from datetime import datetime, timezone, date

from services.supabase_client import supabase


def _today():
    return datetime.now(timezone.utc).date()


def _parse_date(v):
    if not v:
        return None
    try:
        return datetime.fromisoformat(str(v).replace('Z', '+00:00')).date()
    except Exception:
        try:
            return datetime.strptime(str(v)[:10], '%Y-%m-%d').date()
        except Exception:
            return None


def _role_matches(role, dept):
    r = (role or '').lower()
    return ('operation' in r) if dept == 'Operations' else ('sales' in r)


def build_department_overview(dept):
    dept = 'Sales' if (dept or '').lower().startswith('sales') else 'Operations'

    # ── team (from profiles) ─────────────────────────────────────────────────
    profiles = (supabase.table('profiles')
                .select('id, full_name, email, role').execute()).data or []
    team_profiles = [p for p in profiles if _role_matches(p.get('role'), dept)]
    team_emails = {(p.get('email') or '').lower() for p in team_profiles if p.get('email')}

    # department head = a super user of this side, else first team member
    head = next((p for p in profiles if 'super' in (p.get('role') or '').lower()), None) \
        or (team_profiles[0] if team_profiles else None)

    # ── shipments for this department ────────────────────────────────────────
    ships = (supabase.table('shipments').select('*')
             .order('created_at', desc=True).limit(300).execute()).data or []

    email_col = 'created_by_email' if dept == 'Operations' else 'sales_user_email'
    name_col  = 'created_by_name'  if dept == 'Operations' else 'sales_user_name'

    def in_dept(s):
        e = (s.get(email_col) or '').lower()
        return (e in team_emails) if team_emails else bool(e)

    dept_ships = [s for s in ships if in_dept(s)]

    # ── milestones for those shipments ───────────────────────────────────────
    ids = [s['id'] for s in dept_ships]
    ms_by_ship = {}
    for i in range(0, len(ids), 100):
        rows = (supabase.table('shipment_milestones')
                .select('shipment_id, name, sequence_order, status, completed_date, due_date, assigned_email')
                .in_('shipment_id', ids[i:i + 100]).order('sequence_order').execute()).data or []
        for m in rows:
            ms_by_ship.setdefault(m['shipment_id'], []).append(m)

    today = _today()

    def ship_status(mils):
        st = {m.get('status') for m in mils}
        if 'overdue' in st:            return 'overdue'
        if 'delayed' in st:            return 'at_risk'
        return 'on_track'

    def current_milestone(mils, s):
        nxt = next((m for m in sorted(mils, key=lambda x: x.get('sequence_order') or 0)
                    if m.get('status') != 'completed'), None)
        return (nxt or {}).get('name') or s.get('llm_identified_type') or s.get('current_stage') or '—'

    def priority(s, status):
        if s.get('is_priority'):       return 'critical'
        if status == 'overdue':        return 'critical'
        if status == 'at_risk':        return 'high'
        return 'normal'

    def eta(s):
        return (s.get('estimated_arrival') or s.get('llm_cargo_pickup_date')
                or s.get('delivery_date') or None)

    shipments_out = []
    overdue_alerts = pending_alerts = completed_today = 0
    per_member = {e: {'shipments': 0, 'alerts': 0} for e in team_emails}

    for s in dept_ships:
        mils = ms_by_ship.get(s['id'], [])
        status = ship_status(mils)
        o_cc = s.get('origin_country_code') or 'LK'
        d_cc = s.get('destination_country_code') or '—'
        shipments_out.append({
            'id':        s.get('job_number') or s['id'][:8],
            'client':    s.get('consignee_name') or '—',
            'route':     f"{o_cc} -> {d_cc}",
            'origin_cc': o_cc,
            'dest_cc':   d_cc,
            'type':      (s.get('transport_mode') or '').title() or '—',
            'status':    status,
            'milestone': current_milestone(mils, s),
            'priority':  priority(s, status),
            'eta':       (str(eta(s))[:10] if eta(s) else '—'),
            'assignee':  s.get(name_col) or '—',
            'label':     s.get('consignee_name') or (s.get('job_number') or '—'),
        })
        # counts
        for m in mils:
            if m.get('status') == 'overdue':
                overdue_alerts += 1
            elif m.get('status') in ('delayed', 'pending'):
                pending_alerts += 1
            if m.get('status') == 'completed' and _parse_date(m.get('completed_date')) == today:
                completed_today += 1
            ae = (m.get('assigned_email') or '').lower()
            if ae in per_member and m.get('status') in ('overdue', 'delayed'):
                per_member[ae]['alerts'] += 1
        ae = (s.get(email_col) or '').lower()
        if ae in per_member:
            per_member[ae]['shipments'] += 1

    def is_active(s):
        t = (s.get('llm_identified_type') or '').lower()
        return 'deliver' not in t

    stats = {
        'totalShipments':  len(dept_ships),
        'activeShipments': sum(1 for s in dept_ships if is_active(s)),
        'completedToday':  completed_today,
        'overdueAlerts':   overdue_alerts,
        'pendingAlerts':   pending_alerts,
        'resolvedToday':   completed_today,
        'teamMembers':     len(team_profiles),
    }

    team_out = []
    for p in team_profiles:
        e = (p.get('email') or '').lower()
        c = per_member.get(e, {'shipments': 0, 'alerts': 0})
        team_out.append({
            'name':      p.get('full_name') or (p.get('email') or 'User'),
            'role':      (p.get('role') or '').replace('_', ' ').title() or 'Officer',
            'shipments': c['shipments'],
            'alerts':    c['alerts'],
            'status':    'busy' if c['alerts'] >= 3 else 'active',
        })
    team_out.sort(key=lambda t: (-t['shipments'], t['name']))

    return {
        'department': dept,
        'head':       (head or {}).get('full_name'),
        'headEmail':  (head or {}).get('email'),
        'stats':      stats,
        'team':       team_out,
        'shipments':  shipments_out[:25],
    }
