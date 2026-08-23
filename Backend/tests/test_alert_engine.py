"""
test_alert_engine.py — unit tests for the alert engine's evaluation logic.

Pure functions only: no database, no email, no environment. Run from Backend/:

    python -m pytest tests/test_alert_engine.py -q
    # or, without pytest installed:
    python tests/test_alert_engine.py

Covers the Evaluation Contract section by section:
  §1 the five check types
  §2 multi-logic (`extra_logics` + `logic_combine`) and the `custom` type
  §3 due-date basis, including `after_previous_milestone`
  §4 fire conditions, recurrence, stop conditions, recipients
"""

import os
import sys
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.alert_engine import (                                  # noqa: E402
    TZ, compare, condition_passes, evaluate_check, evaluate_milestone,
    is_empty, parse_date, previous_milestone, resolve_due_date,
    resolve_recipients, rule_base_datetime, rule_occurrences, stop_reason,
)


# ── fixtures ─────────────────────────────────────────────────────────────────
def shipment(**milestone_values):
    """A shipment whose `milestones` jsonb holds one group, keyed 'ms_key'."""
    return {
        'id': 'ship-1',
        'job_number': 'S00012345',
        'consignee_name': 'Acme Ltd',
        'consignee_email': 'ops@acme.example',
        'created_by_email': 'handler@dgl.example',
        'sales_user_email': 'sales@dgl.example',
        'created_at': '2026-08-01',
        'milestones': {'ms_key': dict(milestone_values)},
    }


def at(*args):
    return datetime(*args, tzinfo=TZ)


# ═════════════════════════════════════════════════════════════════════════════
# §1 — the five check types
# ═════════════════════════════════════════════════════════════════════════════
def test_date_check_unsatisfied_while_empty():
    cfg = {'type': 'date', 'primary_field': 'cargo_pickup_date'}
    assert evaluate_check(cfg, shipment(cargo_pickup_date=None), 'ms_key') is False
    assert evaluate_check(cfg, shipment(cargo_pickup_date='   '), 'ms_key') is False
    assert evaluate_check(cfg, shipment(cargo_pickup_date='2026-08-10'), 'ms_key') is True


def test_missing_check_is_the_same_shape_as_date():
    cfg = {'type': 'missing', 'primary_field': 'consignee_email'}
    assert evaluate_check(cfg, shipment(consignee_email=''), 'ms_key') is False
    assert evaluate_check(cfg, shipment(consignee_email='a@b.com'), 'ms_key') is True


def test_document_check_reads_tracking_field_not_primary_field():
    cfg = {'type': 'document', 'document_name': 'Bill of Lading',
           'tracking_field': 'job_docs_last_edit_time',
           'primary_field': 'ignored_by_the_contract'}
    assert evaluate_check(cfg, shipment(job_docs_last_edit_time=None), 'ms_key') is False
    assert evaluate_check(
        cfg, shipment(job_docs_last_edit_time='2026-08-12T09:00:00Z'), 'ms_key') is True


def test_status_check_is_a_comparison():
    # Contract §1: unsatisfied while the status match is TRUE.
    cfg = {'type': 'status', 'field_a': 'pickup_date_status',
           'operator': 'equals', 'fixed_value': 'Delayed'}
    assert evaluate_check(cfg, shipment(pickup_date_status='Delayed'), 'ms_key') is False
    assert evaluate_check(cfg, shipment(pickup_date_status='Completed'), 'ms_key') is True

    negated = dict(cfg, operator='not_equals', fixed_value='Completed')
    assert evaluate_check(negated, shipment(pickup_date_status='Delayed'), 'ms_key') is False
    assert evaluate_check(negated, shipment(pickup_date_status='Completed'), 'ms_key') is True


def test_comparison_check_against_another_field_and_a_fixed_value():
    against_field = {'type': 'comparison', 'field_a': 'actual_pickup',
                     'operator': 'more_than_x_days_after', 'field_b': 'planned_pickup',
                     'threshold_value': 3}
    late = shipment(planned_pickup='2026-08-01', actual_pickup='2026-08-06')
    on_time = shipment(planned_pickup='2026-08-01', actual_pickup='2026-08-02')
    assert evaluate_check(against_field, late, 'ms_key') is False      # 5 > 3 ⇒ alert
    assert evaluate_check(against_field, on_time, 'ms_key') is True

    against_value = {'type': 'comparison', 'field_a': 'delay_days',
                     'operator': 'greater_than', 'fixed_value': '3'}
    assert evaluate_check(against_value, shipment(delay_days=5), 'ms_key') is False
    assert evaluate_check(against_value, shipment(delay_days=1), 'ms_key') is True


def test_unmakeable_comparison_never_alerts():
    cfg = {'type': 'comparison', 'field_a': 'delay_days',
           'operator': 'greater_than', 'fixed_value': 'not-a-number'}
    assert evaluate_check(cfg, shipment(delay_days=5), 'ms_key') is True


def test_operators():
    assert compare('Delayed', 'equals', 'delayed') is True
    assert compare('Delayed', 'not_equals', 'Completed') is True
    assert compare('Partly Delayed', 'contains', 'Delay') is True
    assert compare(None, 'missing', None) is True
    assert compare('2026-08-01', 'same_as', '2026-08-01') is True
    assert compare('2026-08-01', 'not_same_as', '2026-08-02') is True
    assert compare('2026-08-01', 'more_than_x_days_before', '2026-08-10', 5) is True
    assert compare('2026-08-01', 'more_than_x_days_before', '2026-08-03', 5) is False
    assert compare(10, 'less_than', 20) is True
    assert compare(10, 'equal_to', 10) is True
    assert compare('anything', 'no_such_operator', 'x') is False


def test_is_empty():
    for value in (None, '', '   ', 'null', 'None', [], {}):
        assert is_empty(value) is True
    for value in ('0', 0, False, 'x', ['a']):
        assert is_empty(value) is False


# ═════════════════════════════════════════════════════════════════════════════
# §2 — multi-logic milestones
# ═════════════════════════════════════════════════════════════════════════════
# "Cargo pickup date updated" AND "pickup status is not stuck on Delayed".
# Note the polarity of the status block: contract §1 and the builder ("Alert
# while it is …") both define a status check as UNSATISFIED while the match
# HOLDS — so `equals Delayed` means "keep alerting while it says Delayed".
AND_MILESTONE = {
    'milestone_key': 'ms_key',
    'milestone_type': 'date',
    'primary_field': 'cargo_pickup_date',
    'logic_combine': 'and',
    'extra_logics': [{'type': 'status', 'field_a': 'pickup_date_status',
                      'operator': 'equals', 'fixed_value': 'Delayed'}],
}


def test_and_needs_every_check_satisfied():
    # Both checks pass ⇒ nothing to chase.
    done = shipment(cargo_pickup_date='2026-08-10', pickup_date_status='Completed')
    assert evaluate_milestone(AND_MILESTONE, done)['satisfied'] is True

    # Date recorded, but the status still says Delayed ⇒ that block is
    # unsatisfied ⇒ under AND the whole milestone is still outstanding.
    stuck = shipment(cargo_pickup_date='2026-08-10', pickup_date_status='Delayed')
    assert evaluate_milestone(AND_MILESTONE, stuck)['satisfied'] is False

    # Date missing ⇒ primary unsatisfied ⇒ outstanding regardless of the status.
    neither = shipment(cargo_pickup_date=None, pickup_date_status='Completed')
    assert evaluate_milestone(AND_MILESTONE, neither)['satisfied'] is False


def test_or_needs_only_one_check_satisfied():
    or_milestone = dict(AND_MILESTONE, logic_combine='or')

    # Date recorded is enough on its own, even with the status still Delayed.
    only_date = shipment(cargo_pickup_date='2026-08-10', pickup_date_status='Delayed')
    assert evaluate_milestone(or_milestone, only_date)['satisfied'] is True

    # Neither check passes ⇒ outstanding.
    nothing = shipment(cargo_pickup_date=None, pickup_date_status='Delayed')
    assert evaluate_milestone(or_milestone, nothing)['satisfied'] is False


def test_custom_type_has_no_primary_check():
    custom = {
        'milestone_key': 'ms_key',
        'milestone_type': 'custom',
        'primary_field': 'should_be_ignored',
        'logic_combine': 'and',
        'extra_logics': [
            {'type': 'date', 'primary_field': 'gate_in_date'},
            {'type': 'missing', 'primary_field': 'carrier_booking_ref'},
        ],
    }
    state = evaluate_milestone(custom, shipment(gate_in_date='2026-08-09',
                                                carrier_booking_ref='BK-1'))
    assert state['satisfied'] is True
    assert state['primary'] is None            # no primary check at all
    assert len(state['blocks']) == 2           # every block treated uniformly

    partial = evaluate_milestone(custom, shipment(gate_in_date='2026-08-09',
                                                  carrier_booking_ref=None))
    assert partial['satisfied'] is False


def test_custom_with_or_and_a_milestone_with_no_logic():
    custom_or = {
        'milestone_key': 'ms_key', 'milestone_type': 'custom', 'logic_combine': 'or',
        'extra_logics': [{'type': 'date', 'primary_field': 'a'},
                         {'type': 'date', 'primary_field': 'b'}],
    }
    assert evaluate_milestone(custom_or, shipment(a='2026-08-01', b=None))['satisfied'] is True
    assert evaluate_milestone(custom_or, shipment(a=None, b=None))['satisfied'] is False

    empty = {'milestone_key': 'ms_key', 'milestone_type': 'custom', 'extra_logics': []}
    assert evaluate_milestone(empty, shipment())['satisfied'] is True    # never alerts


def test_extra_logics_is_optional_for_the_five_normal_types():
    plain = {'milestone_key': 'ms_key', 'milestone_type': 'date',
             'primary_field': 'cargo_pickup_date'}
    assert evaluate_milestone(plain, shipment(cargo_pickup_date=None))['satisfied'] is False
    assert evaluate_milestone(plain, shipment(cargo_pickup_date='2026-08-01'))['satisfied'] is True


# ═════════════════════════════════════════════════════════════════════════════
# §3 — due date basis
# ═════════════════════════════════════════════════════════════════════════════
def test_stored_due_date_wins():
    row = {'due_date': '2026-08-20', 'milestone_snapshot': {'expected_date_source': 'self'}}
    due, resolved = resolve_due_date(row, shipment(), None)
    assert due == date(2026, 8, 20) and resolved is False


def test_after_previous_milestone_is_resolved_at_runtime():
    row = {'id': 'm2', 'sequence_order': 2, 'due_date': None,
           'milestone_snapshot': {'milestone_key': 'ms_key',
                                  'expected_date_source': 'after_previous_milestone',
                                  'expected_date_offset': 14}}

    # Previous milestone not complete yet ⇒ still no deadline.
    due, resolved = resolve_due_date(row, shipment(), {'completed_date': None})
    assert due is None and resolved is False

    # Completed ⇒ previous.completed_date + offset, flagged for persisting.
    due, resolved = resolve_due_date(row, shipment(), {'completed_date': '2026-08-01'})
    assert due == date(2026, 8, 15) and resolved is True


def test_previous_milestone_picks_the_nearest_lower_sequence():
    rows = [{'id': 'a', 'sequence_order': 0}, {'id': 'b', 'sequence_order': 1},
            {'id': 'c', 'sequence_order': 3}]
    assert previous_milestone(rows, {'id': 'c', 'sequence_order': 3})['id'] == 'b'
    assert previous_milestone(rows, {'id': 'a', 'sequence_order': 0}) is None


def test_self_another_field_and_days_after_creation():
    self_row = {'due_date': None, 'milestone_snapshot': {
        'milestone_key': 'ms_key', 'expected_date_source': 'self',
        'primary_field': 'cargo_ready_date'}}
    assert resolve_due_date(self_row, shipment(cargo_ready_date='2026-08-11'),
                            None)[0] == date(2026, 8, 11)

    other_row = {'due_date': None, 'milestone_snapshot': {
        'milestone_key': 'ms_key', 'expected_date_source': 'another_field',
        'expected_date_field': 'cargo_ready_date', 'expected_date_offset': 3}}
    assert resolve_due_date(other_row, shipment(cargo_ready_date='2026-08-11'),
                            None)[0] == date(2026, 8, 14)

    creation_row = {'due_date': None, 'milestone_snapshot': {
        'expected_date_source': 'days_after_creation', 'expected_date_offset': 5}}
    assert resolve_due_date(creation_row, shipment(), None)[0] == date(2026, 8, 6)

    manual_row = {'due_date': None, 'milestone_snapshot': {'expected_date_source': 'manual'}}
    assert resolve_due_date(manual_row, shipment(), None) == (None, False)


def test_parse_date_handles_cargowise_shapes():
    assert parse_date('2026-08-11T09:30:00Z') == date(2026, 8, 11)
    assert parse_date('08/11/2026 09:30:00 AM') == date(2026, 8, 11)
    assert parse_date('') is None and parse_date('garbage') is None


# ═════════════════════════════════════════════════════════════════════════════
# §4 — fire conditions, recurrence, stop conditions, recipients
# ═════════════════════════════════════════════════════════════════════════════
def test_fire_conditions_gate_on_the_combined_result():
    outstanding = {'satisfied': False}
    cleared     = {'satisfied': True}

    assert condition_passes({'condition': 'always'}, cleared) is True
    for condition in ('if_not_recorded', 'if_comparison_true', 'if_missing'):
        assert condition_passes({'condition': condition}, outstanding) is True
        assert condition_passes({'condition': condition}, cleared) is False


def test_multi_logic_drives_the_fire_condition():
    # The primary date IS recorded, but the extra status check still fails, so an
    # `if_not_recorded` rule must still fire — that's the §2 combined-result rule.
    # Judged on the primary check alone this rule would wrongly go quiet.
    ship = shipment(cargo_pickup_date='2026-08-10', pickup_date_status='Delayed')
    state = evaluate_milestone(AND_MILESTONE, ship)
    assert state['primary'] is True            # primary check alone is satisfied
    assert state['satisfied'] is False         # combined result is not
    assert condition_passes({'condition': 'if_not_recorded'}, state) is True


def test_timing_offsets():
    due = date(2026, 8, 20)
    before = rule_base_datetime({'timing': 'before', 'days_offset': 2,
                                 'fire_time': '09:00'}, due)
    on     = rule_base_datetime({'timing': 'on_date', 'fire_time': '08:30'}, due)
    after  = rule_base_datetime({'timing': 'after', 'days_offset': 1,
                                 'fire_time': '17:00'}, due)
    assert before == at(2026, 8, 18, 9, 0)
    assert on     == at(2026, 8, 20, 8, 30)
    assert after  == at(2026, 8, 21, 17, 0)
    assert rule_base_datetime({'timing': 'on_date'}, None) is None


def test_once_fires_a_single_occurrence_and_not_early():
    rule = {'timing': 'on_date', 'fire_time': '09:00', 'recurrence_type': 'once'}
    due  = date(2026, 8, 20)
    assert rule_occurrences(rule, due, at(2026, 8, 19, 23, 0)) == []
    assert len(rule_occurrences(rule, due, at(2026, 8, 25, 12, 0))) == 1


def test_daily_weekly_and_custom_intervals():
    due = date(2026, 8, 20)
    now = at(2026, 8, 25, 12, 0)

    daily = rule_occurrences({'timing': 'on_date', 'fire_time': '09:00',
                              'recurrence_type': 'daily'}, due, now)
    assert [i for i, _ in daily] == [0, 1, 2, 3, 4, 5]

    weekly = rule_occurrences({'timing': 'on_date', 'fire_time': '09:00',
                               'recurrence_type': 'weekly'}, due,
                              at(2026, 9, 10, 12, 0))
    assert len(weekly) == 4

    custom = rule_occurrences({'timing': 'on_date', 'fire_time': '09:00',
                               'recurrence_type': 'custom_interval',
                               'recurrence_interval': 3}, due, now)
    assert [dt.date() for _, dt in custom] == [date(2026, 8, 20), date(2026, 8, 23)]


def test_recurrence_end_after_n_times_and_on_date():
    due, now = date(2026, 8, 20), at(2026, 9, 30, 12, 0)
    capped = rule_occurrences({'timing': 'on_date', 'fire_time': '09:00',
                               'recurrence_type': 'daily',
                               'recurrence_end_type': 'after_n_times',
                               'recurrence_end_n': 3}, due, now)
    assert len(capped) == 3

    dated = rule_occurrences({'timing': 'on_date', 'fire_time': '09:00',
                              'recurrence_type': 'daily',
                              'recurrence_end_type': 'on_date',
                              'recurrence_end_date': '2026-08-23'}, due, now)
    assert [dt.date() for _, dt in dated][-1] == date(2026, 8, 23)


def test_stop_conditions():
    ship = shipment(cargo_pickup_date='2026-08-10', pickup_date_status='Completed')

    has_value = {'recurrence_end_type': 'when_condition_met',
                 'stop_condition_field': 'cargo_pickup_date',
                 'stop_condition_type': 'is_not_null'}
    assert stop_reason(has_value, ship, 'ms_key') is not None
    assert stop_reason(has_value, shipment(cargo_pickup_date=None), 'ms_key') is None

    is_empty_rule = dict(has_value, stop_condition_type='is_null')
    assert stop_reason(is_empty_rule, shipment(cargo_pickup_date=None), 'ms_key') is not None

    equals = {'recurrence_end_type': 'when_condition_met',
              'stop_condition_field': 'pickup_date_status',
              'stop_condition_type': 'equals', 'stop_condition_value': 'Completed'}
    assert stop_reason(equals, ship, 'ms_key') is not None

    changed = {'recurrence_end_type': 'when_condition_met',
               'stop_condition_field': 'pickup_date_status',
               'stop_condition_type': 'changed'}
    assert stop_reason(changed, ship, 'ms_key', baseline_watch_value='Delayed') is not None
    assert stop_reason(changed, ship, 'ms_key', baseline_watch_value='Completed') is None

    assert stop_reason({'recurrence_end_type': 'never'}, ship, 'ms_key') is None


def test_recipients():
    ship = shipment()
    row  = {'assigned_email': 'fallback@dgl.example'}
    assert resolve_recipients({'recipient_type': 'operations'}, ship, row) == ['handler@dgl.example']
    assert resolve_recipients({'recipient_type': 'sales'}, ship, row) == ['sales@dgl.example']
    assert resolve_recipients({'recipient_type': 'consignee'}, ship, row) == ['ops@acme.example']
    assert resolve_recipients({'recipient_type': 'custom',
                               'custom_email': 'a@x.com, b@x.com'}, ship, row) \
        == ['a@x.com', 'b@x.com']

    bare = {'id': 'ship-2', 'milestones': {}}
    assert resolve_recipients({'recipient_type': 'operations'}, bare, row) \
        == ['fallback@dgl.example']
    assert resolve_recipients({'recipient_type': 'operations'}, bare, {}) == []


# ═════════════════════════════════════════════════════════════════════════════
# End-to-end shape: recipe A from the creation guide
# ═════════════════════════════════════════════════════════════════════════════
def test_recipe_a_nags_daily_then_stops_once_recorded():
    """Cargo Ready — daily 'if not recorded', stops when the field has a value."""
    cfg = {'milestone_key': 'ms_key', 'milestone_type': 'date',
           'primary_field': 'cargo_ready_date',
           'expected_date_source': 'days_after_creation', 'expected_date_offset': 5}
    rule = {'timing': 'before', 'days_offset': 1, 'fire_time': '09:00',
            'condition': 'if_not_recorded', 'recurrence_type': 'daily',
            'recurrence_end_type': 'when_condition_met',
            'stop_condition_field': 'cargo_ready_date',
            'stop_condition_type': 'is_not_null', 'recipient_type': 'operations'}

    empty = shipment(cargo_ready_date=None)
    due, _ = resolve_due_date({'due_date': None, 'milestone_snapshot': cfg}, empty, None)
    assert due == date(2026, 8, 6)

    now = at(2026, 8, 8, 12, 0)
    assert len(rule_occurrences(rule, due, now)) == 4          # 5,6,7,8 Aug at 09:00
    assert condition_passes(rule, evaluate_milestone(cfg, empty)) is True
    assert stop_reason(rule, empty, 'ms_key') is None

    filled = shipment(cargo_ready_date='2026-08-08')
    assert condition_passes(rule, evaluate_milestone(cfg, filled)) is False
    assert stop_reason(rule, filled, 'ms_key') is not None     # stops on its own


# ── plain runner (no pytest required) ────────────────────────────────────────
if __name__ == '__main__':
    tests = [(name, fn) for name, fn in sorted(globals().items())
             if name.startswith('test_') and callable(fn)]
    failures = []
    for name, fn in tests:
        try:
            fn()
            print(f"  ok    {name}")
        except Exception as exc:
            failures.append((name, exc))
            print(f"  FAIL  {name}: {exc}")
    print(f"\n{len(tests) - len(failures)}/{len(tests)} passed")
    sys.exit(1 if failures else 0)
