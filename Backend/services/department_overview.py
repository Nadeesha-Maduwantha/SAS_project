"""
department_overview.py — aggregates the admin Department Overview page from real
data (profiles + shipments + shipment_milestones).

A "department" here is a freight mode, matching how the rest of the app already
models departments (shipments.transport_mode, /api/shipments/department/<mode>,
the AIR/SEA department cards on the admin dashboard, the department filter in
routes/alerts.py):

  AIR -> shipments whose transport_mode is AIR
  SEA -> shipments whose transport_mode is SEA

The team for a department is derived from the department's own shipments —
whoever created one, is the sales owner of one, or is assigned a milestone on
one. profiles.department is free text and unreliable, so it is not used for
membership; transport_mode is the source of truth.

Per shipment we derive: status (on_track / at_risk / overdue), the current
milestone, priority, eta, route (origin->dest country codes), mode and assignee.
The frontend turns the country codes into map coordinates.
"""

from datetime import datetime, timezone

from services.supabase_client import supabase


# Freight modes that count as departments, in the order the UI shows them.
DEPARTMENTS = ('AIR', 'SEA')
DEFAULT_DEPARTMENT = 'AIR'


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


def _email(v):
    return (v or '').strip().lower()


def normalize_department(dept):
    """Accept 'air', 'Air', 'AIR', 'Air Freight' -> 'AIR'. Unknown -> default."""
    d = (dept or '').strip().upper()
    for mode in DEPARTMENTS:
        if mode in d:
            return mode
    return DEFAULT_DEPARTMENT


def build_department_overview(dept):
    mode = normalize_department(dept)

    # ── shipments for this department (by freight mode) ──────────────────────
    # transport_mode is stored uppercase elsewhere in the app, but tolerate
    # rows saved as 'Air'/'air' rather than silently dropping them.
    ships = (supabase.table('shipments').select('*')
             .in_('transport_mode', [mode, mode.title(), mode.lower()])
             .order('created_at', desc=True).limit(300).execute()).data or []

    # ── milestones for those shipments ───────────────────────────────────────
    ids = [s['id'] for s in ships]
    ms_by_ship = {}
    for i in range(0, len(ids), 100):
        rows = (supabase.table('shipment_milestones')
                .select('shipment_id, name, sequence_order, status, completed_date, due_date, assigned_email')
                .in_('shipment_id', ids[i:i + 100]).order('sequence_order').execute()).data or []
        for m in rows:
            ms_by_ship.setdefault(m['shipment_id'], []).append(m)

    # ── team: everyone who appears on this department's shipments ────────────
    dept_emails = set()
    for s in ships:
        for col in ('created_by_email', 'sales_user_email'):
            e = _email(s.get(col))
            if e:
                dept_emails.add(e)
    for mils in ms_by_ship.values():
        for m in mils:
            e = _email(m.get('assigned_email'))
            if e:
                dept_emails.add(e)

    profiles = (supabase.table('profiles')
                .select('id, full_name, email, role, department').execute()).data or []
    profile_by_email = {_email(p.get('email')): p for p in profiles if p.get('email')}
    team_profiles = [profile_by_email[e] for e in sorted(dept_emails) if e in profile_by_email]

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
    per_member = {e: {'shipments': 0, 'alerts': 0} for e in dept_emails}

    for s in ships:
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
            'type':      (s.get('transport_mode') or mode).title(),
            'status':    status,
            'milestone': current_milestone(mils, s),
            'priority':  priority(s, status),
            'eta':       (str(eta(s))[:10] if eta(s) else '—'),
            'assignee':  s.get('sales_user_name') or s.get('created_by_name') or '—',
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
            ae = _email(m.get('assigned_email'))
            if ae in per_member and m.get('status') in ('overdue', 'delayed'):
                per_member[ae]['alerts'] += 1
        # a shipment counts toward its sales owner, else whoever created it
        owner = _email(s.get('sales_user_email')) or _email(s.get('created_by_email'))
        if owner in per_member:
            per_member[owner]['shipments'] += 1

    def is_active(s):
        t = (s.get('llm_identified_type') or '').lower()
        return 'deliver' not in t

    stats = {
        'totalShipments':  len(ships),
        'activeShipments': sum(1 for s in ships if is_active(s)),
        'completedToday':  completed_today,
        'overdueAlerts':   overdue_alerts,
        'pendingAlerts':   pending_alerts,
        'resolvedToday':   completed_today,
        'teamMembers':     len(team_profiles),
    }

    team_out = []
    for p in team_profiles:
        e = _email(p.get('email'))
        c = per_member.get(e, {'shipments': 0, 'alerts': 0})
        team_out.append({
            'name':      p.get('full_name') or (p.get('email') or 'User'),
            'role':      (p.get('role') or '').replace('_', ' ').title() or 'Officer',
            'shipments': c['shipments'],
            'alerts':    c['alerts'],
            'status':    'busy' if c['alerts'] >= 3 else 'active',
        })
    team_out.sort(key=lambda t: (-t['shipments'], t['name']))

    # department head: a super user working this mode, else the busiest member
    head = next((p for p in team_profiles if 'super' in (p.get('role') or '').lower()), None)
    if not head and team_out:
        head = profile_by_email.get(
            next((e for e in dept_emails
                  if e in profile_by_email
                  and (profile_by_email[e].get('full_name') or profile_by_email[e].get('email')) == team_out[0]['name']),
                 None))

    return {
        'department': mode.title(),   # 'Air' / 'Sea'
        'mode':       mode,           # 'AIR' / 'SEA'
        'head':       (head or {}).get('full_name'),
        'headEmail':  (head or {}).get('email'),
        'stats':      stats,
        'team':       team_out,
        'shipments':  shipments_out[:25],
    }
