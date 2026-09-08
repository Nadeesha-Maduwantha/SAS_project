"""
status_recompute.py — stand-in for the alert engine's status pass.

Reads every assigned shipment_milestone, evaluates its frozen snapshot check(s)
against the shipment's live data, and sets:
  • status = 'completed'  when the milestone's combined check is satisfied
  • status = 'overdue'    when it's still outstanding and its due date has passed
  • status = 'pending'    otherwise
It also fills due dates for 'after_previous_milestone' milestones from the prior
milestone's completion, so a chained timeline (and old historical data) resolves.

This does NOT send emails — it only computes status so the dashboard / alert feed
reflect reality until the full alert engine is built. Evaluation follows
SAS_Alert_Engine_Onboarding_Spec.pdf and reuses resolve_field_value().
"""

from datetime import datetime, timezone, timedelta

from services.supabase_client import supabase
from services.field_registry import resolve_field_value


# ── small helpers ─────────────────────────────────────────────────────────────
def _s(v):
    return '' if v is None else str(v).strip().lower()


def _is_empty(v):
    return v is None or _s(v) in ('', 'null', 'none', 'n/a')


def _num(v):
    try:
        return float(str(v).strip())
    except (TypeError, ValueError):
        return None


def _int(v):
    n = _num(v)
    return int(n) if n is not None else 0


def _parse_dt(v):
    if v in (None, ''):
        return None
    s = str(v).strip()
    for fmt in ('%m/%d/%Y %I:%M:%S %p', '%m/%d/%Y', '%m/%d/%Y %H:%M'):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    try:
        d = datetime.fromisoformat(s.replace('Z', '+00:00'))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


# ── comparison + block evaluation ─────────────────────────────────────────────
def _compare(a, op, b, thr):
    """True when the comparison HOLDS (the alert-worthy / outstanding state)."""
    if op == 'equals':      return _s(a) == _s(b)
    if op == 'not_equals':  return _s(a) != _s(b)
    if op == 'contains':    return _s(b) != '' and _s(b) in _s(a)
    if op == 'missing':     return _is_empty(a)

    if op in ('greater_than', 'less_than', 'equal_to', 'not_equal_to'):
        na = _num(a)
        nb = _num(thr if thr not in (None, '') else b)
        if na is None or nb is None:
            return False
        return {'greater_than': na > nb, 'less_than': na < nb,
                'equal_to': na == nb, 'not_equal_to': na != nb}[op]

    da, db = _parse_dt(a), _parse_dt(b)
    if op in ('same_as', 'not_same_as'):
        if not da or not db:
            return False
        same = da.date() == db.date()
        return same if op == 'same_as' else (not same)
    if op in ('more_than_x_days_before', 'more_than_x_days_after'):
        if not da or not db:
            return False
        x = _int(thr)
        if op == 'more_than_x_days_before':
            return (db.date() - da.date()).days > x
        return (da.date() - db.date()).days > x
    return False


def _block_outstanding(block, shipment, mkey):
    """True when this single check is still OUTSTANDING (not done)."""
    t = block.get('type')

    def val(field):
        return resolve_field_value(shipment, mkey, field) if field else None

    if t in ('date', 'missing'):
        return _is_empty(val(block.get('primary_field')))
    if t == 'document':
        return _is_empty(val(block.get('tracking_field')))
    if t in ('status', 'comparison'):
        a = val(block.get('field_a'))
        op = block.get('operator') or 'equals'
        if op == 'missing':
            return _is_empty(a)
        b = val(block.get('field_b')) if block.get('field_b') else block.get('fixed_value')
        return _compare(a, op, b, block.get('threshold_value'))
    return False


def _milestone_satisfied(cfg, shipment):
    mkey = cfg.get('milestone_key')
    blocks = []
    if cfg.get('milestone_type') != 'custom':
        blocks.append({
            'type':            cfg.get('milestone_type'),
            'primary_field':   cfg.get('primary_field'),
            'field_a':         cfg.get('field_a'),
            'operator':        cfg.get('operator'),
            'field_b':         cfg.get('field_b'),
            'fixed_value':     cfg.get('fixed_value'),
            'tracking_field':  cfg.get('tracking_field'),
            'threshold_value': cfg.get('threshold_value'),
        })
    blocks += (cfg.get('extra_logics') or [])
    if not blocks:
        return True
    satisfied = [not _block_outstanding(b, shipment, mkey) for b in blocks]
    combine = (cfg.get('logic_combine') or 'and').lower()
    return all(satisfied) if combine == 'and' else any(satisfied)


def _completed_date(cfg, shipment):
    """Best real completion date: the underlying field's date if we have one."""
    mkey = cfg.get('milestone_key')
    if cfg.get('milestone_type') == 'date':
        d = _parse_dt(resolve_field_value(shipment, mkey, cfg.get('primary_field')))
        if d:
            return d
    if cfg.get('milestone_type') == 'document':
        d = _parse_dt(resolve_field_value(shipment, mkey, cfg.get('tracking_field')))
        if d:
            return d
    return datetime.now(timezone.utc)


# ── "expected data field delayed / possibly renamed" detection ───────────────
def _expected_field(cfg):
    """The field whose absence keeps this milestone outstanding."""
    t = cfg.get('milestone_type')
    if t in ('date', 'missing'):     return cfg.get('primary_field')
    if t == 'document':              return cfg.get('tracking_field')
    if t in ('status', 'comparison'):return cfg.get('field_a')
    if t == 'custom':
        for b in (cfg.get('extra_logics') or []):
            f = b.get('primary_field') or b.get('tracking_field') or b.get('field_a')
            if f:
                return f
    return cfg.get('primary_field') or cfg.get('field_a') or cfg.get('tracking_field')


def _unclaimed_for(shipment, field_map):
    """Fields this shipment's raw_json carries that no column/registry claims."""
    raw = shipment.get('raw_json')
    if not isinstance(raw, dict):
        return set()
    try:
        from services.cargowise_service import find_unknown_fields
        return find_unknown_fields(raw, field_map)
    except Exception:
        return set()


def _resolve_due(cfg, shipment, prev_completed_dt):
    """Live deadline from the milestone's OWN firing logic (its due-basis),
    evaluated against the shipment's current data. No stored due_date needed.
    Returns a datetime, or None when the basis can't yet be resolved
    ('manual', or a source field/previous-completion that isn't there yet)."""
    src = cfg.get('expected_date_source')
    off = _int(cfg.get('expected_date_offset'))
    mkey = cfg.get('milestone_key')
    if src == 'another_field':
        base = _parse_dt(resolve_field_value(shipment, mkey, cfg.get('expected_date_field')))
    elif src == 'days_after_creation':
        base = _parse_dt(shipment.get('created_at'))
    elif src == 'after_previous_milestone':
        base = prev_completed_dt
    else:                                   # 'manual' / unknown → rely on stored due_date
        return None
    return (base + timedelta(days=off)) if base else None


# ── main pass ─────────────────────────────────────────────────────────────────
def recompute_milestone_status():
    ms_rows = (
        supabase.table('shipment_milestones')
        .select('id, shipment_id, sequence_order, status, due_date, completed_date, '
                'milestone_type, milestone_snapshot')
        .execute()
    ).data or []

    ship_ids = list({r['shipment_id'] for r in ms_rows if r.get('shipment_id')})
    shipments = {}
    for i in range(0, len(ship_ids), 100):
        rs = (supabase.table('shipments').select('*')
              .in_('id', ship_ids[i:i + 100]).execute()).data or []
        for s in rs:
            shipments[s['id']] = s

    now = datetime.now(timezone.utc)

    # Pass 1: satisfied? + a real completed_date.
    info = {}
    for r in ms_rows:
        cfg = r.get('milestone_snapshot') or {}
        sh = shipments.get(r.get('shipment_id')) or {}
        sat = _milestone_satisfied(cfg, sh)
        cd = r.get('completed_date')
        if sat and not cd:
            cd = _completed_date(cfg, sh).isoformat()
        info[r['id']] = {'sat': sat, 'cd': cd, 'cfg': cfg, 'row': r, 'due': None}

    # Pass 2: per shipment — resolve live deadlines from each milestone's own
    # firing logic, and flag out-of-sequence (a LATER milestone already arrived).
    by_ship = {}
    for r in ms_rows:
        by_ship.setdefault(r['shipment_id'], []).append(r)
    for rows in by_ship.values():
        rows.sort(key=lambda x: (x.get('sequence_order') or 0))
        # forward: live due date; 'after_previous' chains off the immediately
        # preceding milestone's real completion (None if it isn't done yet).
        prev_cd = None
        for r in rows:
            d = info[r['id']]
            if not r.get('due_date'):
                live = _resolve_due(d['cfg'], shipments.get(r['shipment_id']) or {}, prev_cd)
                if live:
                    d['due'] = live.isoformat()
            prev_cd = _parse_dt(d['cd']) if d['cd'] else None
        # backward: is any later milestone in this shipment already satisfied?
        acc = False
        for r in reversed(rows):
            info[r['id']]['later_sat'] = acc
            if info[r['id']]['sat']:
                acc = True

    # Pass 3: decide final status and write changes.
    #   completed → satisfied
    #   overdue   → outstanding AND its resolved deadline has passed  (measured late)
    #   delayed   → outstanding, no passed deadline, but a later milestone already
    #               arrived out of sequence                            (inferred late)
    #   pending   → outstanding with no evidence it's late yet
    counts = {'completed': 0, 'overdue': 0, 'delayed': 0, 'pending': 0}
    for rid, d in info.items():
        r = d['row']
        due = d['due'] or r.get('due_date')
        patch = {}

        if d['sat']:
            new_status = 'completed'
            if not r.get('completed_date') and d['cd']:
                patch['completed_date'] = d['cd']
        else:
            dd = _parse_dt(due)
            if dd and dd < now:
                new_status = 'overdue'
            elif d.get('later_sat'):
                new_status = 'delayed'
            else:
                new_status = 'pending'

        if d['due'] and not r.get('due_date'):
            patch['due_date'] = d['due']
        if new_status != r.get('status'):
            patch['status'] = new_status

        counts[new_status] += 1
        if patch:
            try:
                supabase.table('shipment_milestones').update(patch).eq('id', rid).execute()
            except Exception as e:
                print(f"[status_recompute] update failed for {rid}: {e}")

    print(f"[status_recompute] {counts}")
    return counts
