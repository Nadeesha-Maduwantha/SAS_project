# Milestone Engine — Evaluation Contract

For the alert-engine owner. This describes how the builder now stores milestone
checks so the engine can evaluate them. The builder/library/assignment side is
done; the evaluation logic below is the engine's to implement.

Each assigned milestone lives in `shipment_milestones` with two frozen snapshots:
`milestone_snapshot` (the config below) and `alert_rules_snapshot` (the rules).

---

## 1. The five check types

A milestone's **primary check** is `milestone_type` + its fields:

| type | fields | "unsatisfied" (should alert) when |
|------|--------|-----------------------------------|
| `date` | `primary_field` | `primary_field` is null/empty (not updated yet) |
| `missing` | `primary_field` | `primary_field` is null/empty |
| `status` | `field_a`, `operator` (`equals`/`not_equals`), `fixed_value` | the status match is **true** and still holds — treat exactly like `comparison` |
| `comparison` | `field_a`, `operator`, `field_b` OR `fixed_value` | the comparison is true |
| `document` | `tracking_field`, `document_name` | `tracking_field` is null/empty (document not uploaded) |

Notes:
- **`status` = `comparison`.** It's stored as `field_a operator fixed_value`; no
  separate logic needed. `operator` is `equals` or `not_equals`.
- **`document` checks `tracking_field`, not `primary_field`.** `document_name` is
  a label for the email only.
- All field values resolve from `shipments.milestones` via `milestone_key`
  (`resolve_field_value` in `field_registry.py`).

---

## 2. Multi-logic milestones (new)

A milestone can now bundle **extra checks**:

- `extra_logics`: JSON array of blocks. Each block = `{ type, ...fields }` using
  the same field names as above (e.g. `{ "type": "status", "field_a": "pickup_date_status", "operator": "equals", "fixed_value": "Completed" }`).
- `logic_combine`: `"and"` or `"or"`.

**Combined result** = primary check combined with every `extra_logics` block via
`logic_combine`:
- `and` → milestone is satisfied only when the primary check **and** all extra
  blocks are satisfied.
- `or` → satisfied when **any** of them is satisfied.

For fire conditions that gate on the milestone still being unsatisfied
(`if_not_recorded` / `if_comparison_true` / `if_missing`), evaluate the **combined**
result, not just the primary check. `always` ignores checks entirely.

Blocks do **not** carry their own due date or alert rules — due date and rules
are milestone-level.

### `custom` milestone type

`milestone_type = 'custom'` has **no primary check** — its logic is *entirely*
in `extra_logics` (at least one block, required by the builder). Evaluate it as
the combination of the `extra_logics` blocks via `logic_combine`. Treat every
block uniformly; there is no special primary field.

For the other five types, `extra_logics` is optional and adds to the primary
check as described above.

---

## 3. Due date basis (all types)

`expected_date_source` sets the deadline the rules time against:

| value | due date |
|-------|----------|
| `self` | `primary_field`'s own value (date type only) |
| `another_field` | `expected_date_field` + `expected_date_offset` days |
| `days_after_creation` | shipment `created_at` + `expected_date_offset` days |
| `after_previous_milestone` | **previous milestone's `completed_date` + `expected_date_offset`** — resolve at runtime |
| `manual` | set at assignment |

`_compute_due_date` computes all of these at assignment **except**
`after_previous_milestone`, which it leaves null. The engine must set it when the
prior milestone (by `sequence_order` on the same shipment) completes:
`due_date = previous.completed_date + expected_date_offset`.

---

## 4. Migrations to run first

- `Backend/migrations/milestone_multi_logic.sql` — adds `extra_logics` (jsonb)
  and `logic_combine` (text) to `milestone_library`.
