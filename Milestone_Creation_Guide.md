# SAS — Milestone & Template Creation Guide

A practical, field-by-field walkthrough for building milestones and assembling them into templates. Follow it top to bottom the first time; after that, use the worked examples at the end as recipes.

---

## 1. The big picture

The flow is always the same:

1. **Build a milestone** — a single thing to watch on a shipment (a date, a missing field, a comparison, a document) and the alert rules for it.
2. **Put milestones into a template** — an ordered sequence for a shipment type (e.g. "Air Export").
3. **Assign the template to shipments** — this freezes a copy of each milestone (its config + alert rules) onto every matching shipment.
4. **The alert engine** later reads those frozen rules and sends the reminder emails, stopping automatically when the condition clears.

> Note: the runtime alert engine isn't built yet. Everything you configure is saved correctly and staged; emails start firing once that engine is added.

You can build a milestone in two places:
- In the **Milestone Library** (`Milestones → Milestone Library`) — reusable across many templates.
- Inline while building a template (**Build New Milestone**) — kept to that template only, unless you tick **"Also save to library."**

Both use the same 4-step builder below.

---

## 2. The 4-step milestone builder

### Step 1 — Basic Info

| Field | What it means | Tip |
|---|---|---|
| **Milestone Name** | The label shown everywhere (e.g. "Cargo Ready"). | Name it after the event, not the field. |
| **Milestone Type** | What kind of check this is — see the four types below. This decides what Step 2 asks for. | Pick this first; it changes the rest of the form. |
| **Priority (Critical)** | Toggle. Critical milestones show in red and are meant for escalation. | Use for live cargo / time-sensitive shipments. |
| **Description** | Optional note explaining what it tracks and why. | Helps teammates reusing it from the library. |

**The four milestone types:**

- **Date Check** — watches a date field; alerts before / on / after it. Use for Cargo Ready, Pickup, Departure, Arrival, Delivery.
- **Missing Info** — alerts while a required field is still empty; stops when it's filled. Use for consignee email, contact, carrier.
- **Field Comparison** — alerts when a value meets a condition against another field or a fixed value. Use for delay detection or date mismatches.
- **Document Check** — alerts when a document hasn't been updated in CargoWise, tracked via a "last edited" timestamp. Use for Bill of Lading, Export Declaration.

### Step 2 — Field Linking

This connects the milestone to real shipment data. What you see depends on the type. Fields that aren't valid for the current type appear **greyed out** so you can still see them.

**Date Check / Missing Info:**

| Field | What it means |
|---|---|
| **Primary Field** | The field this milestone watches (e.g. `Cargo Pickup Date`). For Missing Info, it's the field that must not stay empty. |
| **Expected Date Source** (Date only) | How the due date is worked out: **Use this field's own value** · **Calculate from another field** (+/- N days) · **N days after shipment creation** · **Set manually when assigning**. |

**Field Comparison** — you build a sentence: `[Field A] [operator] [Field B or fixed value]`.

| Field | What it means |
|---|---|
| **Field A** | The field being tested (e.g. `Pickup Status`, `Delay Days`). |
| **Operator** | Only operators valid for Field A's type are selectable (dates get "is more than X days before", numbers get "greater than", text gets "equals/contains", etc.). |
| **Field B / Fixed value** | Compare to another field of the same type, or type a fixed value (e.g. `Delayed`, `3`). |
| **Threshold** | The number, when the operator needs one (e.g. "more than **3** days"). |

**Document Check:**

| Field | What it means |
|---|---|
| **Document Name** | The document's name, shown in the alert email (e.g. "Bill of Lading"). |
| **Tracking Field** | The timestamp field that changes when the document is updated — usually a "last edited" field like `Documents Last Edited`. Date fields only. |

### Step 3 — Alert Rules

A milestone can have several rules; each fires independently. For every rule:

**When to fire**
- **Before / On date / After** the milestone's due date, **N days** offset, at a **time** (e.g. 09:00).

**Fire condition** — the alert only sends if this is true at fire time:
- **Always** — send no matter what.
- **If not recorded** — send only if the primary date is still empty. *This is what makes date reminders switch off once the date arrives.*
- **If condition** — send only if the comparison rule is still true (comparison milestones).
- **If missing** — send only if the required field is still empty (missing-info milestones).

**Recurrence**
- **Once** · **Daily** · **Weekly** · **Custom** (every N days).

**Stop repeating when** (for anything other than Once):
- **After N times** — stop after N sends.
- **On date** — stop on a calendar date.
- **Condition met** — pick a **Watch field** and how it should end: **Has a value** / **Is empty** / **Equals value** / **Changes**. Use this to auto-stop when the data updates.
- **Never (manual)** — only stops when cancelled by a person.

**Who receives this alert**
- **Operations** → the operations handler on the shipment (`created_by_email`).
- **Sales** → the sales rep (`sales_user_email`).
- **Consignee** → the client (`consignee_email`).
- **Custom** → an email you type in.

> The Operations/Sales/Consignee addresses come from the shipment record. If those email columns aren't populated by your CargoWise sync yet, only **Custom** will have somewhere to send until that data is filled in.

### Step 4 — Preview & Save

Review the plain-English summary. Then choose:
- **Save to template only** — stays local to this template (inline build).
- **Also save to library** — saved to the library *and* added to the template (tick the box in the Build New dialog).
- **Save to library** — from the library page, it just goes to the library, ready to reuse.

---

## 3. Building a template

1. Go to **Milestones → Templates List → New Template**.
2. Give it a **name** and **shipment type**, optional description.
3. Add milestones, in order:
   - **Pick from Library** — choose an existing milestone (comes with its rules).
   - **Build New Milestone** — the full 4-step builder inline; tick "Also save to library" if you want to reuse it.
4. Reorder with the up/down arrows; remove with the ✕.
5. **Save Template.**
6. **Assign to Shipments** — All / by type (Air Import, Air Export, Sea Import, Sea Export) / custom selection. On assignment, each milestone (and its rules) is snapshotted onto the shipments, so later edits to the library don't disturb shipments already in flight.

To turn a template-only milestone into a reusable one later: open the template and click **Add to Library** on that milestone.

---

## 4. Worked examples (recipes)

**A. "Cargo Ready" reminder that stops once it's recorded**
- Type: **Date Check** · Primary field: **Cargo Ready Date** · Due date: N days after creation (or manual).
- Rule: **Before** 1 day at 09:00 · **If not recorded** · **Daily** · Stop when **Condition met → Cargo Ready Date → Has a value** · **Operations**.
- Result: nags daily until the date is filled, then stops on its own.

**B. "Pickup delayed" escalation**
- Type: **Field Comparison** · Field A: **Pickup Status** · Operator: **equals** · Fixed value: **Delayed**.
- Rule: **On date** at 08:00 · **If condition** · **Daily** · Stop when **Pickup Status → Changes** · **Operations** (add a second rule to **Sales** after 2 days).

**C. "Consignee email missing" data-quality check**
- Type: **Missing Info** · Primary field: **Consignee Email**.
- Rule: **After** 0 days at 10:00 · **If missing** · **Daily** · Stop when **Consignee Email → Has a value** · **Operations**.

**D. "Bill of Lading not uploaded"**
- Type: **Document Check** · Document Name: **Bill of Lading** · Tracking field: **Documents Last Edited**.
- Rule: **Before** 2 days at 09:00 · **If not recorded** · **Daily** · Stop when **Documents Last Edited → Changes** · **Operations**.

**A starter "Air Export" template** (5 milestones, in order):
1. Cargo Ready (Date Check) — recipe A
2. Cargo Pickup (Date Check, on `Cargo Pickup Date`) — like A, plus a "pickup delayed" comparison (recipe B)
3. Departure (Date Check) — before/after reminders
4. Arrival (Date Check, on `Estimated Arrival`)
5. Delivery / Customer Handover (Date Check, on `Delivery Date`)

---

## 5. Quick rules of thumb

- **"Remind until it's done"** → Fire condition **If not recorded** (dates) or **If missing** (fields), Recurrence **Daily**, Stop **Condition met → Has a value**.
- **"Alert only while a problem is true"** → **Field Comparison** + Fire condition **If condition**, Stop **Changes**.
- **Critical shipments** → turn on **Critical** and add a second rule that escalates to **Sales** after a day or two.
- **Reuse** anything you'll need again → save it to the **Library** so future templates can just pick it.
