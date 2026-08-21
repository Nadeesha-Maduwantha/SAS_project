"""
alert_engine.py — SAS runtime alert engine.

Implements `Milestone_Engine_Evaluation_Contract.md`. This is the piece that was
staged but never built: the builder/library/template/assignment side already
freezes `milestone_snapshot` + `alert_rules_snapshot` onto every row in
`shipment_milestones`; this module reads those frozen snapshots, decides whether
a milestone is still unsatisfied, works out which alert rules are due, and sends
the reminder emails — stopping automatically when the condition clears.

Nothing in the existing modules is changed. This module only *reads*
`shipments` / `shipment_milestones`, and only *writes*:
  • `alert_fire_log`                    — one row per (milestone, rule, occurrence)
  • `shipment_milestones.due_date`      — only for `after_previous_milestone`,
                                          which assignment deliberately leaves null
  • `shipment_milestones.alert_sent` / `alert_sent_at` — existing columns the
                                          alert feed already renders

Everything else about the milestone row is left exactly as the sync wrote it.

── What the contract asks for, and where it lives here ──────────────────────────
  §1 five check types              → `evaluate_check`
  §2 multi-logic (`extra_logics`)  → `evaluate_milestone`  (+ `custom` type)
  §3 due-date basis                → `resolve_due_date`
  §4 fire conditions               → `condition_passes`
      recurrence / stop conditions → `rule_occurrences`, `stop_reason`
      recipients                   → `resolve_recipients`
"""

from __future__ import annotations

import os
import re
from datetime import date, datetime, timedelta, time as dtime, timezone

try:                                    # py3.9+
    from zoneinfo import ZoneInfo
    TZ = ZoneInfo(os.getenv('SAS_TIMEZONE', 'Asia/Colombo'))
except Exception:                       # pragma: no cover — fall back to UTC
    TZ = timezone.utc


# ─────────────────────────────────────────────────────────────────────────────
# Vocabulary — mirrors the builder exactly (Step2_FieldLinking / Step3_AlertRules)
# ─────────────────────────────────────────────────────────────────────────────
CHECK_TYPES   = ('date', 'missing', 'status', 'comparison', 'document', 'custom')

# Operators the builder can emit, grouped by the field type they belong to.
DATE_OPS      = ('missing', 'more_than_x_days_before', 'more_than_x_days_after',
                 'same_as', 'not_same_as')
NUMBER_OPS    = ('greater_than', 'less_than', 'equal_to', 'not_equal_to')
TEXT_OPS      = ('equals', 'not_equals', 'contains', 'missing')

TIMINGS       = ('before', 'on_date', 'after')
CONDITIONS    = ('always', 'if_not_recorded', 'if_comparison_true', 'if_missing')
RECURRENCES   = ('once', 'daily', 'weekly', 'custom_interval')
END_TYPES     = ('after_n_times', 'on_date', 'when_condition_met', 'never')
STOP_TYPES    = ('is_not_null', 'is_null', 'equals', 'changed')
RECIPIENTS    = ('operations', 'sales', 'consignee', 'custom')

# Shipment columns each recipient_type resolves to, in preference order.
RECIPIENT_COLUMNS = {
    'operations': ('created_by_email', 'operations_email', 'assigned_email'),
    'sales':      ('sales_user_email', 'sales_email'),
    'consignee':  ('consignee_email',),
}

# Safety rails so a misconfigured rule can never spin or spam.
MAX_OCCURRENCES = 400


# ═════════════════════════════════════════════════════════════════════════════
# Small helpers — pure, no database
# ═════════════════════════════════════════════════════════════════════════════
def is_empty(value) -> bool:
    """A field counts as 'not updated yet' when it is null or blank."""
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == '' or value.strip().lower() in ('null', 'none')
    if isinstance(value, (list, dict)):
        return len(value) == 0
    return False


def parse_date(value):
    """Best-effort date parse of the shapes CargoWise / Supabase return."""
    if value in (None, ''):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    s = str(value).strip()
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00')).date()
    except Exception:
        pass
    for fmt in ('%m/%d/%Y %I:%M:%S %p', '%m/%d/%Y %H:%M:%S', '%m/%d/%Y',
                '%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def parse_number(value):
    if value is None or value == '':
        return None
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def parse_fire_time(value) -> dtime:
    """'09:00' / '09:00:00' → time(9, 0). Falls back to 09:00."""
    s = (str(value or '').strip() or '09:00')
    for fmt in ('%H:%M', '%H:%M:%S', '%I:%M %p'):
        try:
            return datetime.strptime(s, fmt).time()
        except ValueError:
            continue
    return dtime(9, 0)


def now_local() -> datetime:
    return datetime.now(TZ)


def _as_int(value, default=0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def resolve_value(shipment: dict, milestone_key: str, field: str):
    """
    Read one field for a milestone. Delegates to the registry helper the field
    module already exposes (json group → alias → plain column) and falls back to
    an equivalent local lookup when the registry can't be imported (e.g. tests).
    """
    if not field:
        return None
    try:
        from services.field_registry import resolve_field_value
        return resolve_field_value(shipment, milestone_key, field)
    except Exception:
        pass

    group = ((shipment.get('milestones') or {}).get(milestone_key)) or {}
    if field in group:
        return group[field]
    target = _normalize(field)
    for k, v in group.items():
        if _normalize(k) == target:
            return v
    return shipment.get(field)


def _normalize(field: str) -> str:
    """Local mirror of field_registry.normalize — only used in the fallback path."""
    if not field:
        return ''
    s = re.sub(r'[^a-z0-9]+', '', str(field).lower())
    for suffix in ('datetime', 'date', 'time', 'dt'):
        if s.endswith(suffix) and len(s) > len(suffix):
            return s[: -len(suffix)]
    return s


# ═════════════════════════════════════════════════════════════════════════════
# §1 — comparison operators
# ═════════════════════════════════════════════════════════════════════════════
def compare(left, operator: str, right, threshold=None) -> bool:
    """
    Evaluate `left <operator> right`. Returns True when the condition HOLDS.
    Unknown operators and unusable operands return False — an alert never fires
    on a comparison the engine could not actually make.
    """
    op = (operator or '').strip()

    if op == 'missing':
        return is_empty(left)

    # ── date operators ────────────────────────────────────────────────────────
    if op in ('more_than_x_days_before', 'more_than_x_days_after',
              'same_as', 'not_same_as'):
        a, b = parse_date(left), parse_date(right)
        if a is None or b is None:
            return False
        if op == 'same_as':
            return a == b
        if op == 'not_same_as':
            return a != b
        days = _as_int(threshold, 0)
        delta = (b - a).days                      # positive ⇒ a is before b
        if op == 'more_than_x_days_before':
            return delta > days
        return -delta > days                      # more_than_x_days_after

    # ── numeric operators ─────────────────────────────────────────────────────
    if op in NUMBER_OPS:
        a = parse_number(left)
        b = parse_number(right if right not in (None, '') else threshold)
        if a is None or b is None:
            return False
        if op == 'greater_than':
            return a > b
        if op == 'less_than':
            return a < b
        if op == 'equal_to':
            return a == b
        return a != b                             # not_equal_to

    # ── text operators ────────────────────────────────────────────────────────
    a = '' if left is None else str(left).strip()
    b = '' if right is None else str(right).strip()
    if op == 'equals':
        return a.lower() == b.lower()
    if op == 'not_equals':
        return a.lower() != b.lower()
    if op == 'contains':
        return b.lower() in a.lower() if b else False
    return False


# ═════════════════════════════════════════════════════════════════════════════
# §1 — the five check types
# ═════════════════════════════════════════════════════════════════════════════
def evaluate_check(block: dict, shipment: dict, milestone_key: str) -> bool:
    """
    Evaluate ONE check block. Returns True when the check is **satisfied**
    (nothing to chase), False when it is **unsatisfied** (should alert).

    Contract §1:
      date       — unsatisfied while `primary_field` is empty
      missing    — unsatisfied while `primary_field` is empty
      document   — unsatisfied while `tracking_field` is empty
      status     — stored as `field_a operator fixed_value`; identical to
                   comparison — unsatisfied while the match is TRUE
      comparison — unsatisfied while the comparison is TRUE
    """
    btype = (block or {}).get('type') or (block or {}).get('milestone_type')
    btype = (btype or '').strip()

    if btype in ('date', 'missing'):
        return not is_empty(resolve_value(shipment, milestone_key,
                                          block.get('primary_field')))

    if btype == 'document':
        return not is_empty(resolve_value(shipment, milestone_key,
                                          block.get('tracking_field')))

    if btype in ('status', 'comparison'):
        left = resolve_value(shipment, milestone_key, block.get('field_a'))
        if block.get('field_b'):
            right = resolve_value(shipment, milestone_key, block.get('field_b'))
        else:
            right = block.get('fixed_value')
        holds = compare(left, block.get('operator'), right,
                        block.get('threshold_value'))
        return not holds        # the comparison holding IS the problem

    # Unknown/blank block type — treat as satisfied so it can never alert.
    return True


# ═════════════════════════════════════════════════════════════════════════════
# §2 — multi-logic milestones
# ═════════════════════════════════════════════════════════════════════════════
def evaluate_milestone(config: dict, shipment: dict) -> dict:
    """
    Evaluate a milestone's *combined* result: the primary check combined with
    every `extra_logics` block via `logic_combine` ('and' | 'or').

      and → satisfied only when the primary check AND all extra blocks are satisfied
      or  → satisfied when ANY of them is satisfied

    `milestone_type == 'custom'` has no primary check — the milestone IS its
    `extra_logics` blocks, evaluated uniformly.

    Returns {satisfied, primary, blocks, combine, milestone_type}.
    `satisfied=False` means the milestone is still outstanding ⇒ eligible to alert.
    """
    cfg           = config or {}
    mtype         = (cfg.get('milestone_type') or '').strip()
    key           = cfg.get('milestone_key')
    combine       = (cfg.get('logic_combine') or 'and').strip().lower()
    combine       = combine if combine in ('and', 'or') else 'and'
    extra_blocks  = cfg.get('extra_logics') or []
    if not isinstance(extra_blocks, list):
        extra_blocks = []

    results, primary = [], None

    if mtype == 'custom':
        # No primary check — logic lives entirely in extra_logics.
        for block in extra_blocks:
            results.append(evaluate_check(block, shipment, key))
    else:
        primary_block = dict(cfg)
        primary_block['type'] = mtype
        primary = evaluate_check(primary_block, shipment, key)
        results.append(primary)
        for block in extra_blocks:
            results.append(evaluate_check(block, shipment, key))

    if not results:
        # `custom` with no blocks is impossible via the builder, but never alert
        # on a milestone that carries no logic at all.
        satisfied = True
    elif combine == 'or':
        satisfied = any(results)
    else:
        satisfied = all(results)

    return {
        'satisfied':      satisfied,
        'primary':        primary,
        'blocks':         results,
        'combine':        combine,
        'milestone_type': mtype,
    }


# ═════════════════════════════════════════════════════════════════════════════
# §3 — due date basis
# ═════════════════════════════════════════════════════════════════════════════
def resolve_due_date(row: dict, shipment: dict, previous_row: dict | None = None):
    """
    The deadline the alert rules time against.

    `_compute_due_date` (routes/templates.py) already resolved `self`,
    `another_field` and `days_after_creation` at assignment, so a stored
    `due_date` always wins. The one case it deliberately leaves null is
    `after_previous_milestone` — that is resolved here, at runtime, from the
    previous milestone's `completed_date` + `expected_date_offset`.

    Returns (due_date | None, resolved_now: bool). `resolved_now=True` means the
    caller should persist it back onto the row.
    """
    stored = parse_date(row.get('due_date'))
    if stored:
        return stored, False

    cfg    = row.get('milestone_snapshot') or {}
    src    = (cfg.get('expected_date_source') or '').strip()
    offset = _as_int(cfg.get('expected_date_offset'), 0)
    key    = cfg.get('milestone_key')

    if src == 'after_previous_milestone':
        if not previous_row:
            return None, False
        prev_done = parse_date(previous_row.get('completed_date'))
        if not prev_done:
            return None, False                     # previous one isn't done yet
        return prev_done + timedelta(days=offset), True

    if src == 'self':
        return parse_date(resolve_value(shipment, key, cfg.get('primary_field'))), False

    if src == 'another_field':
        d = parse_date(resolve_value(shipment, key, cfg.get('expected_date_field')))
        return (d + timedelta(days=offset)) if d else None, False

    if src == 'days_after_creation':
        d = parse_date(shipment.get('created_at'))
        return (d + timedelta(days=offset)) if d else None, False

    return None, False                             # 'manual' / unknown


def previous_milestone(rows: list, row: dict):
    """The row with the highest sequence_order strictly below this one."""
    seq = _as_int(row.get('sequence_order'), 0)
    earlier = [r for r in rows
               if r.get('id') != row.get('id')
               and _as_int(r.get('sequence_order'), 0) < seq]
    if not earlier:
        return None
    return max(earlier, key=lambda r: _as_int(r.get('sequence_order'), 0))


# ═════════════════════════════════════════════════════════════════════════════
# §4 — fire conditions, recurrence, stop conditions, recipients
# ═════════════════════════════════════════════════════════════════════════════
def condition_passes(rule: dict, state: dict) -> bool:
    """
    Contract §2: `if_not_recorded` / `if_comparison_true` / `if_missing` all gate
    on the milestone still being outstanding — and they gate on the **combined**
    result, not just the primary check. `always` ignores the checks entirely.
    """
    condition = ((rule or {}).get('condition') or 'always').strip()
    if condition == 'always':
        return True
    if condition in ('if_not_recorded', 'if_comparison_true', 'if_missing'):
        return not state.get('satisfied', True)
    return True


def rule_base_datetime(rule: dict, due: date) -> datetime | None:
    """First scheduled moment for a rule: due date shifted by timing + offset."""
    if not due:
        return None
    timing = (rule.get('timing') or 'on_date').strip()
    offset = _as_int(rule.get('days_offset'), 0)
    if timing == 'before':
        day = due - timedelta(days=offset)
    elif timing == 'after':
        day = due + timedelta(days=offset)
    else:
        day = due
    return datetime.combine(day, parse_fire_time(rule.get('fire_time')), tzinfo=TZ)


def recurrence_step(rule: dict) -> int | None:
    """Days between repeats, or None for a one-shot rule."""
    kind = (rule.get('recurrence_type') or 'once').strip()
    if kind == 'daily':
        return 1
    if kind == 'weekly':
        return 7
    if kind == 'custom_interval':
        return max(1, _as_int(rule.get('recurrence_interval'), 1))
    return None                                    # 'once'


def rule_occurrences(rule: dict, due: date, now: datetime) -> list:
    """
    Every scheduled firing moment at or before `now`, as (index, datetime).
    Bounded by the rule's recurrence end (`after_n_times` / `on_date`) and by a
    hard MAX_OCCURRENCES rail so a stale milestone can't generate a runaway list.
    """
    base = rule_base_datetime(rule, due)
    if not base or base > now:
        return []

    step = recurrence_step(rule)
    if step is None:
        return [(0, base)]

    end_type = (rule.get('recurrence_end_type') or 'never').strip()
    limit_n  = _as_int(rule.get('recurrence_end_n'), 0) if end_type == 'after_n_times' else 0
    end_date = parse_date(rule.get('recurrence_end_date')) if end_type == 'on_date' else None

    out, index, moment = [], 0, base
    while moment <= now and index < MAX_OCCURRENCES:
        if limit_n and index >= limit_n:
            break
        if end_date and moment.date() > end_date:
            break
        out.append((index, moment))
        index += 1
        moment = base + timedelta(days=step * index)
    return out


def stop_reason(rule: dict, shipment: dict, milestone_key: str,
                baseline_watch_value=None) -> str | None:
    """
    Has this rule's stop condition been met? Returns a short reason, or None to
    keep going. `changed` compares against the value recorded at the first fire.
    """
    end_type = (rule.get('recurrence_end_type') or 'never').strip()
    if end_type != 'when_condition_met':
        return None

    field = rule.get('stop_condition_field')
    if not field:
        return None

    current = resolve_value(shipment, milestone_key, field)
    kind    = (rule.get('stop_condition_type') or '').strip()

    if kind == 'is_not_null' and not is_empty(current):
        return f"{field} now has a value"
    if kind == 'is_null' and is_empty(current):
        return f"{field} is now empty"
    if kind == 'equals':
        wanted = rule.get('stop_condition_value')
        if compare(current, 'equals', wanted):
            return f"{field} equals '{wanted}'"
    if kind == 'changed':
        if baseline_watch_value is not None and str(current) != str(baseline_watch_value):
            return f"{field} changed"
    return None


def watch_value(rule: dict, shipment: dict, milestone_key: str):
    """Current value of the rule's stop-condition watch field (for `changed`)."""
    field = rule.get('stop_condition_field')
    if not field:
        return None
    value = resolve_value(shipment, milestone_key, field)
    return None if value is None else str(value)


def resolve_recipients(rule: dict, shipment: dict, row: dict) -> list:
    """
    Who this alert goes to. operations → the shipment's operations handler,
    sales → the sales rep, consignee → the client, custom → the typed address.
    Falls back to the milestone's own `assigned_email` when the shipment column
    the recipient type points at isn't populated yet.
    """
    kind = (rule.get('recipient_type') or 'operations').strip()

    if kind == 'custom':
        raw = rule.get('custom_email') or ''
        return [e.strip() for e in re.split(r'[,;\s]+', str(raw)) if e.strip()]

    for column in RECIPIENT_COLUMNS.get(kind, ()):
        value = shipment.get(column)
        if not is_empty(value):
            return [str(value).strip()]

    fallback = row.get('assigned_email')
    return [str(fallback).strip()] if not is_empty(fallback) else []


# ═════════════════════════════════════════════════════════════════════════════
# Email body
# ═════════════════════════════════════════════════════════════════════════════
def describe_milestone(cfg: dict) -> str:
    """One plain-English line describing what this milestone is waiting for."""
    mtype = (cfg.get('milestone_type') or '').strip()
    if mtype == 'document':
        return (f"Document \"{cfg.get('document_name') or 'the required document'}\" "
                f"has not been updated in CargoWise.")
    if mtype in ('date',):
        return f"Date field '{cfg.get('primary_field')}' has not been recorded yet."
    if mtype == 'missing':
        return f"Required field '{cfg.get('primary_field')}' is still empty."
    if mtype in ('status', 'comparison'):
        right = cfg.get('field_b') or cfg.get('fixed_value')
        return (f"Condition still true: {cfg.get('field_a')} "
                f"{cfg.get('operator')} {right}.")
    if mtype == 'custom':
        n = len(cfg.get('extra_logics') or [])
        joiner = (cfg.get('logic_combine') or 'and').upper()
        return f"Custom milestone — {n} check(s) combined with {joiner}."
    return 'Milestone is still outstanding.'


def build_message(row: dict, shipment: dict, rule: dict, due, state: dict) -> dict:
    """Subject + HTML/text body for one alert."""
    cfg      = row.get('milestone_snapshot') or {}
    name     = row.get('name') or cfg.get('name') or 'Milestone'
    job      = shipment.get('job_number') or shipment.get('cargowise_id') or '—'
    critical = bool(row.get('is_critical') or cfg.get('is_critical'))
    prefix   = '[SAS][CRITICAL]' if critical else '[SAS]'
    due_txt  = due.isoformat() if due else 'not set'

    overdue = ''
    if due:
        days = (now_local().date() - due).days
        if days > 0:
            overdue = f"{days} day(s) overdue"
        elif days < 0:
            overdue = f"due in {abs(days)} day(s)"
        else:
            overdue = 'due today'

    subject = f"{prefix} {name} — shipment {job}"
    lines = [
        f"Shipment:  {job}",
        f"Consignee: {shipment.get('consignee_name') or '—'}",
        f"Milestone: {name}",
        f"Due date:  {due_txt}{f' ({overdue})' if overdue else ''}",
        '',
        describe_milestone(cfg),
    ]
    if cfg.get('extra_logics') and (cfg.get('milestone_type') or '') != 'custom':
        lines.append(f"Combined with {len(cfg['extra_logics'])} additional check(s) "
                     f"using {(cfg.get('logic_combine') or 'and').upper()}.")
    lines += ['', 'Please update CargoWise so this alert stops automatically.']

    text = '\n'.join(lines)
    html = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111">'
        f'<p style="margin:0 0 12px"><strong style="color:{"#DC2626" if critical else "#1D4ED8"}">'
        f'{"Critical milestone alert" if critical else "Milestone alert"}</strong></p>'
        '<table cellpadding="4" style="border-collapse:collapse;font-size:14px">'
        f'<tr><td><strong>Shipment</strong></td><td>{job}</td></tr>'
        f'<tr><td><strong>Consignee</strong></td><td>{shipment.get("consignee_name") or "—"}</td></tr>'
        f'<tr><td><strong>Milestone</strong></td><td>{name}</td></tr>'
        f'<tr><td><strong>Due date</strong></td><td>{due_txt}'
        f'{f" ({overdue})" if overdue else ""}</td></tr>'
        '</table>'
        f'<p style="margin:12px 0 0">{describe_milestone(cfg)}</p>'
        '<p style="margin:12px 0 0;color:#555">Please update CargoWise so this alert '
        'stops automatically.</p></div>'
    )
    return {'subject': subject, 'text': text, 'html': html}


# ═════════════════════════════════════════════════════════════════════════════
# Runtime — the scheduled pass
# ═════════════════════════════════════════════════════════════════════════════
def _supabase():
    from services.supabase_client import supabase
    return supabase


def _fire_log(milestone_ids: list) -> dict:
    """{milestone_id: {(rule_index, occurrence): row}} for the given milestones."""
    out = {}
    if not milestone_ids:
        return out
    try:
        rows = (
            _supabase().table('alert_fire_log')
            .select('shipment_milestone_id, rule_index, occurrence, status, watch_value, fired_at')
            .in_('shipment_milestone_id', milestone_ids)
            .execute()
        ).data or []
    except Exception as e:
        print(f"[alert_engine] alert_fire_log unavailable ({e}) — "
              f"run migrations/alert_fire_log.sql")
        return out
    for r in rows:
        out.setdefault(r['shipment_milestone_id'], {})[
            (_as_int(r.get('rule_index')), _as_int(r.get('occurrence')))] = r
    return out


def _baseline_watch_value(logged: dict, rule_index: int):
    """The watch value captured at this rule's first recorded fire."""
    entries = [(occ, row) for (ri, occ), row in (logged or {}).items() if ri == rule_index]
    if not entries:
        return None
    _, first = min(entries, key=lambda x: x[0])
    return first.get('watch_value')


def evaluate_row(row: dict, shipment: dict, siblings: list, now: datetime | None = None) -> dict:
    """
    Everything the engine knows about one milestone right now, without sending
    anything: combined state, resolved due date, and every rule's due occurrences.
    This is what `/api/alert-engine/preview` returns.
    """
    now  = now or now_local()
    cfg  = row.get('milestone_snapshot') or {}
    key  = cfg.get('milestone_key')
    state = evaluate_milestone(cfg, shipment)

    due, resolved_now = resolve_due_date(row, shipment,
                                         previous_milestone(siblings, row))

    rules = row.get('alert_rules_snapshot') or []
    if not isinstance(rules, list):
        rules = []

    planned = []
    for index, rule in enumerate(rules):
        if rule.get('is_active') is False:
            planned.append({'rule_index': index, 'skipped': 'rule inactive'})
            continue

        occurrences = rule_occurrences(rule, due, now)
        entry = {
            'rule_index':   index,
            'timing':       rule.get('timing'),
            'condition':    rule.get('condition'),
            'recurrence':   rule.get('recurrence_type'),
            'recipients':   resolve_recipients(rule, shipment, row),
            'occurrences':  [{'occurrence': i, 'fire_at': dt.isoformat()}
                             for i, dt in occurrences],
        }
        if not occurrences:
            entry['skipped'] = 'not due yet' if due else 'no due date'
        elif not condition_passes(rule, state):
            entry['skipped'] = f"condition '{rule.get('condition')}' not met"
        planned.append(entry)

    return {
        'milestone_id':   row.get('id'),
        'shipment_id':    row.get('shipment_id'),
        'job_number':     shipment.get('job_number'),
        'name':           row.get('name'),
        'milestone_type': state['milestone_type'],
        'combine':        state['combine'],
        'blocks':         state['blocks'],
        'satisfied':      state['satisfied'],
        'due_date':       due.isoformat() if due else None,
        'due_date_resolved_now': resolved_now,
        'rules':          planned,
    }


def run_alert_engine(dry_run: bool = False, shipment_id: str | None = None,
                     milestone_id: str | None = None, catch_up: bool = False) -> dict:
    """
    One full pass. For every assigned milestone: evaluate the combined check,
    resolve the due date, and fire whichever alert rules are due and not already
    sent. Safe to run on a schedule — `alert_fire_log` makes it idempotent.

    dry_run      — evaluate and report, send and write nothing
    shipment_id  — limit to one shipment
    milestone_id — limit to one milestone (useful for testing a single rule)
    catch_up     — send every missed occurrence instead of only the latest one
    """
    started = now_local()
    supabase = _supabase()

    result = {
        'started_at':  started.isoformat(),
        'dry_run':     dry_run,
        'evaluated':   0,
        'outstanding': 0,
        'sent':        0,
        'skipped':     0,
        'due_dates_resolved': 0,
        'stopped':     0,
        'errors':      [],
        'alerts':      [],
    }

    # ── load milestones ──────────────────────────────────────────────────────
    try:
        query = (
            supabase.table('shipment_milestones')
            .select('id, shipment_id, name, sequence_order, status, is_critical, '
                    'due_date, completed_date, assigned_to, assigned_email, '
                    'alert_sent, alert_sent_at, milestone_type, primary_field, '
                    'milestone_snapshot, alert_rules_snapshot')
            .order('shipment_id')
            .order('sequence_order')
        )
        if shipment_id:
            query = query.eq('shipment_id', shipment_id)
        if milestone_id:
            query = query.eq('id', milestone_id)
        rows = query.execute().data or []
    except Exception as e:
        result['errors'].append({'stage': 'load_milestones', 'error': str(e)})
        return result

    # Only rows the builder actually configured carry a snapshot; legacy
    # sync-created rows are left completely alone.
    rows = [r for r in rows if r.get('milestone_snapshot')]
    if not rows:
        result['finished_at'] = now_local().isoformat()
        result['message'] = 'No milestones with a builder snapshot to evaluate.'
        return result

    # ── load their shipments ─────────────────────────────────────────────────
    shipment_ids = list({r['shipment_id'] for r in rows if r.get('shipment_id')})
    shipments = {}
    for i in range(0, len(shipment_ids), 200):
        chunk = shipment_ids[i:i + 200]
        try:
            data = (
                supabase.table('shipments').select('*').in_('id', chunk).execute()
            ).data or []
            shipments.update({s['id']: s for s in data})
        except Exception as e:
            result['errors'].append({'stage': 'load_shipments', 'error': str(e)})

    by_shipment = {}
    for r in rows:
        by_shipment.setdefault(r.get('shipment_id'), []).append(r)

    logged_all = _fire_log([r['id'] for r in rows])
    now = now_local()

    # ── evaluate ─────────────────────────────────────────────────────────────
    for row in rows:
        result['evaluated'] += 1
        shipment = shipments.get(row.get('shipment_id')) or {}
        siblings = by_shipment.get(row.get('shipment_id')) or []
        cfg      = row.get('milestone_snapshot') or {}
        key      = cfg.get('milestone_key')

        try:
            state = evaluate_milestone(cfg, shipment)
            if not state['satisfied']:
                result['outstanding'] += 1

            due, resolved_now = resolve_due_date(
                row, shipment, previous_milestone(siblings, row))

            # Contract §3 — persist an `after_previous_milestone` deadline once
            # the prior milestone completes. This is the only field the engine
            # writes back onto the milestone row itself.
            if resolved_now and due and not dry_run:
                try:
                    supabase.table('shipment_milestones') \
                        .update({'due_date': due.isoformat()}) \
                        .eq('id', row['id']).execute()
                    row['due_date'] = due.isoformat()
                    result['due_dates_resolved'] += 1
                except Exception as e:
                    result['errors'].append({'milestone_id': row['id'],
                                             'stage': 'due_date', 'error': str(e)})
            elif resolved_now and due:
                result['due_dates_resolved'] += 1

            rules  = row.get('alert_rules_snapshot') or []
            logged = logged_all.get(row['id'], {})

            for index, rule in enumerate(rules if isinstance(rules, list) else []):
                if rule.get('is_active') is False:
                    continue

                occurrences = rule_occurrences(rule, due, now)
                pending = [(i, dt) for i, dt in occurrences if (index, i) not in logged]
                if not pending:
                    continue

                # A rule that already stopped never fires again.
                reason = stop_reason(rule, shipment, key,
                                     _baseline_watch_value(logged, index))
                if reason:
                    result['stopped'] += 1
                    if not dry_run:
                        _log_fire(supabase, row, index, pending[-1][0], due,
                                  rule, [], None, 'stopped', reason,
                                  watch_value(rule, shipment, key))
                    continue

                if not condition_passes(rule, state):
                    result['skipped'] += 1
                    if not dry_run:
                        for i, dt in (pending if catch_up else pending[-1:]):
                            _log_fire(supabase, row, index, i, due, rule, [], None,
                                      'skipped',
                                      f"condition '{rule.get('condition')}' not met",
                                      watch_value(rule, shipment, key))
                    continue

                recipients = resolve_recipients(rule, shipment, row)
                message    = build_message(row, shipment, rule, due, state)
                to_fire    = pending if catch_up else pending[-1:]

                for occurrence, fire_at in to_fire:
                    record = {
                        'milestone_id': row['id'],
                        'job_number':   shipment.get('job_number'),
                        'milestone':    row.get('name'),
                        'rule_index':   index,
                        'occurrence':   occurrence,
                        'fire_at':      fire_at.isoformat(),
                        'due_date':     due.isoformat() if due else None,
                        'condition':    rule.get('condition'),
                        'recipient_type': rule.get('recipient_type'),
                        'recipients':   recipients,
                        'subject':      message['subject'],
                    }

                    if not recipients:
                        record['status'] = 'no_recipient'
                        result['skipped'] += 1
                        if not dry_run:
                            _log_fire(supabase, row, index, occurrence, due, rule,
                                      [], message['subject'], 'no_recipient',
                                      'no email address on the shipment for this '
                                      'recipient type',
                                      watch_value(rule, shipment, key))
                        result['alerts'].append(record)
                        continue

                    if dry_run:
                        record['status'] = 'would_send'
                        result['sent'] += 1
                        result['alerts'].append(record)
                        continue

                    status, error = 'sent', None
                    try:
                        from services.email_service import send_email
                        send_email(recipients, message['subject'],
                                   message['text'], html=message['html'])
                    except Exception as e:
                        status, error = 'failed', str(e)
                        result['errors'].append({'milestone_id': row['id'],
                                                 'stage': 'send', 'error': str(e)})

                    _log_fire(supabase, row, index, occurrence, due, rule,
                              recipients, message['subject'], status, error,
                              watch_value(rule, shipment, key))

                    if status == 'sent':
                        result['sent'] += 1
                        try:
                            supabase.table('shipment_milestones').update({
                                'alert_sent':    True,
                                'alert_sent_at': now.isoformat(),
                            }).eq('id', row['id']).execute()
                        except Exception:
                            pass        # non-fatal — the fire log is the record
                    record['status'] = status
                    if error:
                        record['error'] = error
                    result['alerts'].append(record)

        except Exception as e:
            result['errors'].append({'milestone_id': row.get('id'),
                                     'stage': 'evaluate', 'error': str(e)})

    result['finished_at']  = now_local().isoformat()
    result['duration_ms']  = int((now_local() - started).total_seconds() * 1000)
    return result


def _log_fire(supabase, row, rule_index, occurrence, due, rule, recipients,
              subject, status, error, watch):
    """One row in alert_fire_log — this is what makes the engine idempotent."""
    try:
        supabase.table('alert_fire_log').insert({
            'shipment_milestone_id': row['id'],
            'shipment_id':           row.get('shipment_id'),
            'rule_index':            rule_index,
            'occurrence':            occurrence,
            'due_date':              due.isoformat() if due else None,
            'condition':             rule.get('condition'),
            'recipient_type':        rule.get('recipient_type'),
            'recipient_email':       ', '.join(recipients) if recipients else None,
            'subject':               subject,
            'status':                status,
            'error':                 error,
            'watch_value':           watch,
        }).execute()
    except Exception as e:
        print(f"[alert_engine] could not write alert_fire_log: {e}")


def preview_alerts(shipment_id: str | None = None,
                   milestone_id: str | None = None) -> dict:
    """Read-only view of what the engine currently sees. Sends nothing."""
    supabase = _supabase()
    query = (
        supabase.table('shipment_milestones')
        .select('id, shipment_id, name, sequence_order, status, is_critical, '
                'due_date, completed_date, assigned_email, milestone_type, '
                'milestone_snapshot, alert_rules_snapshot')
        .order('shipment_id').order('sequence_order')
    )
    if shipment_id:
        query = query.eq('shipment_id', shipment_id)
    if milestone_id:
        query = query.eq('id', milestone_id)

    rows = [r for r in (query.execute().data or []) if r.get('milestone_snapshot')]
    shipment_ids = list({r['shipment_id'] for r in rows if r.get('shipment_id')})

    shipments = {}
    for i in range(0, len(shipment_ids), 200):
        data = (supabase.table('shipments').select('*')
                .in_('id', shipment_ids[i:i + 200]).execute()).data or []
        shipments.update({s['id']: s for s in data})

    by_shipment = {}
    for r in rows:
        by_shipment.setdefault(r.get('shipment_id'), []).append(r)

    out = [evaluate_row(r, shipments.get(r.get('shipment_id')) or {},
                        by_shipment.get(r.get('shipment_id')) or [])
           for r in rows]
    return {'data': out, 'total': len(out),
            'outstanding': sum(1 for o in out if not o['satisfied'])}
