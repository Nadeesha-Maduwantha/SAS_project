"""
user_type_rules.py — admin-configurable "how do we know someone's role"
registry, mirroring the milestone field-registry pattern (field_definitions /
milestone_field_map) but for role identification instead of milestone fields.

The four role VALUES stay fixed ('admin' | 'superuser' | 'operationuser' |
'salesuser' — same spelling profiles.role already uses everywhere else). What's
dynamic is which table.column identifies each one: an admin manages that
through the rules CRUD below instead of it being hardcoded in Python (it WAS
hardcoded, in services/scope.py's allowed_shipment_ids()).

Two ways this gets used:
  • detect_roles_for_email() — live "did you mean Sales User?" suggestion on
    the Create User form, checked while an admin is filling it in.
  • scan_for_unmatched_people() — a scheduled job (see app.py) that looks for
    emails already present in shipment data with no matching profile yet, and
    queues them in suggested_user_accounts for an admin to review. It queues
    rather than silently creating accounts because CargoWise sync has no
    password to hand a brand-new login.

Conflict handling — what about an email that DOES already have a profile, but
whose current role doesn't match what the rules now detect? Governed by the
admin-configurable "conflict policy" (System Settings -> User Type Rules;
stored on sync_settings.user_type_conflict_policy, see _conflict_policy()):
  • 'skip'    (default) — never touch or even surface it. The same silent
    behavior this had before the setting existed.
  • 'replace' — queue it in user_type_conflicts for review. Still requires an
    explicit "Replace role" click per person from an admin — nothing
    overwrites profiles.role automatically in the background.

Safety note: table_name/column_name come from the admin-editable rules table,
but a rule can only ever be POINTED at a table in ALLOWED_ROLE_TABLES below,
and a column that's either statically vetted (STATIC_ALLOWED_COLUMNS) or
explicitly flagged usage='user_management' in field_definitions — the same
"field meanings" registry the Milestone Builder's FieldSelector already uses
(see list_allowed_tables / _validate_table_column). Never arbitrary admin
free text hitting an unvetted table.

Column shapes: most identifying columns hold one email (value_shape='email',
matched with ilike). A column can also hold a jsonb array of emails
(value_shape='jsonb_email_array', matched with containment) — e.g.
shipments.assigned_emails, for a shipment tied to more than one person.
Matching a jsonb_email_array column still only ever SUGGESTS/queues a role
via the same suggested_user_accounts / user_type_conflicts flow above —
never auto-creates or auto-replaces anyone.
"""

import json
from datetime import datetime, timezone

from services.supabase_client import supabase, run_with_retry

# ── the only tables a rule may ever reference — the hard security boundary.
#    "dynamic" columns (below) can only ever come from ONE of these tables,
#    never an admin-typed arbitrary table name.
ALLOWED_ROLE_TABLES = ('shipments', 'shipment_milestones')

# ── statically-vetted identifying columns — always available even if the
#    field_definitions rows seeded by the migration are ever deleted.
STATIC_ALLOWED_COLUMNS = {
    'shipments': ['sales_user_email', 'created_by_email', 'updated_by_email'],
    'shipment_milestones': ['assigned_email'],
}

VALID_ROLES = ('admin', 'superuser', 'operationuser', 'salesuser')

# value_shape for a column not found in field_definitions (i.e. every column
# in STATIC_ALLOWED_COLUMNS before the shared field registry existed) — they
# were always assumed to hold exactly one email.
DEFAULT_VALUE_SHAPE = 'email'
VALUE_SHAPES = ('text', 'email', 'jsonb_email_array')


def _now():
    return datetime.now(timezone.utc).isoformat()


def _user_management_fields():
    """table_name -> [api_field, ...] for every field_definitions row an admin
    has flagged usage='user_management' (see migrations/
    user_management_field_registry.sql) — the shared field registry, reused
    here instead of a second, disconnected allowlist. Restricted to
    ALLOWED_ROLE_TABLES regardless of what's stored, so a stray row can never
    open up a table identification rules haven't been vetted against."""
    out = {}
    try:
        rows = run_with_retry(lambda: supabase.table('field_definitions')
                              .select('table_name, api_field')
                              .eq('usage', 'user_management').execute()).data or []
    except Exception as e:
        print(f"[user_type_rules] field registry lookup failed: {e}")
        return out
    for r in rows:
        t, c = r.get('table_name'), r.get('api_field')
        if t in ALLOWED_ROLE_TABLES and c:
            out.setdefault(t, []).append(c)
    return out


def list_allowed_tables():
    """What the rules-editor UI is allowed to build dropdowns from: the
    statically-vetted columns, plus whatever an admin has additionally
    flagged usage='user_management' in Field meanings."""
    merged = {t: set(cols) for t, cols in STATIC_ALLOWED_COLUMNS.items()}
    for t, cols in _user_management_fields().items():
        merged.setdefault(t, set()).update(cols)
    return {t: sorted(cols) for t, cols in merged.items()}


def _validate_table_column(table_name, column_name):
    if table_name not in ALLOWED_ROLE_TABLES:
        return f"'{table_name}' isn't a recognized table for identification rules."
    cols = list_allowed_tables().get(table_name) or []
    if column_name not in cols:
        return f"'{column_name}' isn't a recognized identifying column on '{table_name}'. Flag it usage='user_management' in Field meanings first."
    return None


def _column_shape(table_name, column_name):
    """'email' (single value, matched with ilike) or 'jsonb_email_array' (a
    jsonb list of emails, matched with containment) — set per-field in Field
    meanings. Anything not registered there (the original hardcoded columns)
    defaults to 'email', preserving the original behavior."""
    try:
        rows = run_with_retry(lambda: supabase.table('field_definitions')
                              .select('value_shape').eq('table_name', table_name)
                              .eq('api_field', column_name).limit(1).execute()).data or []
        if rows and rows[0].get('value_shape') in VALUE_SHAPES:
            return rows[0]['value_shape']
    except Exception as e:
        print(f"[user_type_rules] shape lookup failed for {table_name}.{column_name}: {e}")
    return DEFAULT_VALUE_SHAPE


CONFLICT_POLICIES = ('skip', 'replace')
DEFAULT_CONFLICT_POLICY = 'skip'   # preserves the original (silent, hands-off) behavior


def _conflict_policy():
    """How to handle an email that already has a profile whose role doesn't
    match what the rules detect. Same single-row sync_settings pattern as the
    other admin policy toggles (e.g. cover_department_policy)."""
    try:
        rows = run_with_retry(lambda: supabase.table('sync_settings')
                              .select('user_type_conflict_policy').limit(1).execute()).data or []
        policy = (rows[0].get('user_type_conflict_policy') if rows else None) or DEFAULT_CONFLICT_POLICY
    except Exception as e:
        print(f"[user_type_rules] conflict policy lookup failed, defaulting to {DEFAULT_CONFLICT_POLICY}: {e}")
        policy = DEFAULT_CONFLICT_POLICY
    return policy if policy in CONFLICT_POLICIES else DEFAULT_CONFLICT_POLICY


# ── rules CRUD ──────────────────────────────────────────────────────────────
def list_rules(include_inactive=True):
    q = supabase.table('user_type_rules').select('*')
    if not include_inactive:
        q = q.eq('is_active', True)
    rows = run_with_retry(lambda: q.order('role').order('priority').execute()).data or []
    return rows


def create_rule(role, table_name, column_name, description=None, priority=0, updated_by=None):
    role = (role or '').strip().lower()
    if role not in VALID_ROLES:
        return {'error': f"role must be one of {', '.join(VALID_ROLES)}"}, 400
    err = _validate_table_column(table_name, column_name)
    if err:
        return {'error': err}, 400

    row = {
        'role': role, 'table_name': table_name, 'column_name': column_name,
        'description': description, 'priority': int(priority or 0),
        'is_active': True, 'updated_by': updated_by, 'updated_at': _now(),
    }
    try:
        created = run_with_retry(lambda: supabase.table('user_type_rules').insert(row).execute()).data[0]
        return {'data': created}, 201
    except Exception as e:
        msg = str(e)
        if 'duplicate' in msg.lower() or 'unique' in msg.lower():
            return {'error': 'That role already has a rule for this exact table + column.'}, 409
        return {'error': msg}, 500


def update_rule(rule_id, patch, updated_by=None):
    patch = dict(patch or {})
    if 'role' in patch:
        patch['role'] = (patch['role'] or '').strip().lower()
        if patch['role'] not in VALID_ROLES:
            return {'error': f"role must be one of {', '.join(VALID_ROLES)}"}, 400
    if 'table_name' in patch or 'column_name' in patch:
        existing_rows = run_with_retry(lambda: supabase.table('user_type_rules')
                                       .select('table_name, column_name').eq('id', rule_id).limit(1).execute()).data or []
        if not existing_rows:
            return {'error': 'Rule not found'}, 404
        table_name = patch.get('table_name', existing_rows[0]['table_name'])
        column_name = patch.get('column_name', existing_rows[0]['column_name'])
        err = _validate_table_column(table_name, column_name)
        if err:
            return {'error': err}, 400
    patch['updated_at'] = _now()
    patch['updated_by'] = updated_by
    updated = run_with_retry(lambda: supabase.table('user_type_rules')
                             .update(patch).eq('id', rule_id).execute()).data
    if not updated:
        return {'error': 'Rule not found'}, 404
    return {'data': updated[0]}, 200


def delete_rule(rule_id):
    run_with_retry(lambda: supabase.table('user_type_rules').delete().eq('id', rule_id).execute())
    return {'ok': True}, 200


# ── detection ───────────────────────────────────────────────────────────────
def detect_roles_for_email(email):
    """All roles this email matches at least one active rule for, best-ranked
    first (fewest priority number = stronger signal). Each candidate lists
    every rule that matched, so the caller can show *why* (e.g. "via
    shipments.sales_user_email")."""
    email = (email or '').strip().lower()
    if not email:
        return []

    rules = [r for r in list_rules(include_inactive=False)]
    by_role = {}
    for r in rules:
        table_name, column_name = r['table_name'], r['column_name']
        if _validate_table_column(table_name, column_name):
            continue  # a rule pointing outside the allowlist is skipped, not trusted
        shape = _column_shape(table_name, column_name)
        try:
            if shape == 'jsonb_email_array':
                # containment: does the jsonb array include this email?
                hit = run_with_retry(lambda t=table_name, c=column_name: supabase.table(t)
                                     .select('id').contains(c, json.dumps([email])).limit(1).execute()).data
            else:
                hit = run_with_retry(lambda t=table_name, c=column_name: supabase.table(t)
                                     .select('id').ilike(c, email).limit(1).execute()).data
        except Exception as e:
            print(f"[user_type_rules] detect check failed for {table_name}.{column_name}: {e}")
            continue
        if not hit:
            continue
        entry = by_role.setdefault(r['role'], {'role': r['role'], 'priority': r['priority'], 'matched_via': []})
        entry['matched_via'].append({'table_name': table_name, 'column_name': column_name})
        entry['priority'] = min(entry['priority'], r['priority'])

    return sorted(by_role.values(), key=lambda c: c['priority'])


# ── shared: distinct emails from every active rule's table.column ─────────────
def _all_candidate_emails():
    rules = [r for r in list_rules(include_inactive=False)]
    candidate_emails = set()
    for r in rules:
        table_name, column_name = r['table_name'], r['column_name']
        if _validate_table_column(table_name, column_name):
            continue
        shape = _column_shape(table_name, column_name)
        try:
            rows = run_with_retry(lambda t=table_name, c=column_name: supabase.table(t)
                                  .select(column_name).execute()).data or []
        except Exception as e:
            print(f"[user_type_rules] scan read failed for {table_name}.{column_name}: {e}")
            continue
        if shape == 'jsonb_email_array':
            for row in rows:
                for v in (row.get(column_name) or []):
                    v = (v or '').strip().lower() if isinstance(v, str) else ''
                    if v:
                        candidate_emails.add(v)
        else:
            for row in rows:
                v = (row.get(column_name) or '').strip().lower()
                if v:
                    candidate_emails.add(v)
    return candidate_emails


# ── admin alert: "this email showed up in a user-management field and has
#    no account yet — go create one" — reuses the same recipient setting as
#    the "new user account created" alert (services/user_alerts.py), since
#    it's the same admin who'd act on either one. Best-effort: a mail
#    failure here must never make the scan job itself fail. ──────────────────
def _notify_new_suggestions(newly_queued):
    if not newly_queued:
        return {'sent': 0}
    try:
        from services.user_alerts import _new_user_alert_emails
        recipients = _new_user_alert_emails()
    except Exception as e:
        print(f"[user_type_rules] could not load recipient: {e}")
        return {'sent': 0}
    if not recipients:
        return {'sent': 0, 'reason': 'no recipient / alerts off'}

    n = len(newly_queued)
    lines = [
        f"SAS found {n} new email address{'es' if n != 1 else ''} in shipment data with no matching user account:",
        "",
    ]
    for item in newly_queued:
        role_hint = f" — looks like a {item['detected_role']}" if item.get('detected_role') else " — role unclear"
        lines.append(f"• {item['email']}{role_hint}")
    lines += [
        "",
        "Review and create accounts for them under System Settings -> User Type Rules -> Suggested accounts.",
    ]
    body = "\n".join(lines)
    subject = f"[SAS] {n} new user{'s' if n != 1 else ''} to create"

    from services.email_service import send_email
    sent, errors = 0, []
    for to in recipients:
        try:
            send_email(to, subject, body)
            sent += 1
        except Exception as e:
            errors.append({'to': to, 'error': str(e)})
    return {'sent': sent, 'recipients': recipients, 'errors': errors}


# ── scheduled scan: new people, and — if the conflict policy allows it —
#    existing people whose profile role no longer matches the data ────────────
def scan_for_unmatched_people():
    """For every active rule's table.column, collect distinct emails.
      • Ones with NO profile yet → queued in suggested_user_accounts (always,
        regardless of conflict policy — that setting is only about EXISTING
        accounts, see below).
      • Ones that DO have a profile whose role doesn't match what's detected →
        queued in user_type_conflicts, but ONLY when the conflict policy is
        'replace'. Under 'skip' (the default) these are left alone entirely,
        exactly as before this policy existed.
    Read-only against shipments/shipment_milestones — never creates a login
    account and never changes profiles.role on its own."""
    candidate_emails = _all_candidate_emails()
    if not candidate_emails:
        return {'scanned': 0, 'queued': 0, 'conflicts_queued': 0}

    existing_profiles = run_with_retry(lambda: supabase.table('profiles')
                                       .select('id, email, role').execute()).data or []
    profile_by_email = {(p.get('email') or '').strip().lower(): p for p in existing_profiles}
    known = set(profile_by_email.keys())
    unmatched = candidate_emails - known
    matched = candidate_emails & known

    # ── new people ──
    queued = 0
    newly_queued = []
    if unmatched:
        already = run_with_retry(lambda: supabase.table('suggested_user_accounts')
                                 .select('email, status').execute()).data or []
        already_by_email = {(a.get('email') or '').strip().lower(): a.get('status') for a in already}

        for email in unmatched:
            candidates = detect_roles_for_email(email)
            detected_role = candidates[0]['role'] if candidates else None
            status = already_by_email.get(email)
            if status == 'pending':
                run_with_retry(lambda e=email, c=candidates, dr=detected_role: supabase.table('suggested_user_accounts')
                               .update({'last_seen_at': _now(), 'candidates': c, 'detected_role': dr})
                               .eq('email', e).execute())
            elif status is None:
                run_with_retry(lambda e=email, c=candidates, dr=detected_role: supabase.table('suggested_user_accounts')
                               .insert({'email': e, 'detected_role': dr, 'candidates': c,
                                        'first_seen_at': _now(), 'last_seen_at': _now(), 'status': 'pending'})
                               .execute())
                queued += 1
                newly_queued.append({'email': email, 'detected_role': detected_role, 'candidates': candidates})
            # status in ('dismissed', 'created') → leave it alone, don't resurrect it

    # ── existing people whose role may have drifted from the data ──
    conflicts_queued = 0
    if matched and _conflict_policy() == 'replace':
        already_conflicts = run_with_retry(lambda: supabase.table('user_type_conflicts')
                                           .select('profile_id, detected_role, status').execute()).data or []
        already_by_pair = {(c.get('profile_id'), c.get('detected_role')): c.get('status') for c in already_conflicts}

        for email in matched:
            profile = profile_by_email[email]
            existing_role = (profile.get('role') or '').strip().lower()
            candidates = detect_roles_for_email(email)
            if not candidates:
                continue
            detected_role = candidates[0]['role']
            if detected_role == existing_role:
                continue  # already correct, nothing to flag

            key = (profile['id'], detected_role)
            status = already_by_pair.get(key)
            if status == 'pending':
                run_with_retry(lambda pid=profile['id'], dr=detected_role, c=candidates, er=existing_role:
                               supabase.table('user_type_conflicts')
                               .update({'last_seen_at': _now(), 'candidates': c, 'existing_role': er})
                               .eq('profile_id', pid).eq('detected_role', dr).execute())
            elif status is None:
                run_with_retry(lambda pid=profile['id'], e=email, er=existing_role, dr=detected_role, c=candidates:
                               supabase.table('user_type_conflicts').insert({
                                   'profile_id': pid, 'email': e, 'existing_role': er, 'detected_role': dr,
                                   'candidates': c, 'first_seen_at': _now(), 'last_seen_at': _now(),
                                   'status': 'pending',
                               }).execute())
                conflicts_queued += 1
            # status in ('dismissed', 'replaced') → leave it alone, don't resurrect it

    notified = {'sent': 0}
    if newly_queued:
        try:
            notified = _notify_new_suggestions(newly_queued)
        except Exception as e:
            print(f"[user_type_rules] admin notify failed (non-fatal): {e}")
            notified = {'sent': 0, 'reason': str(e)}

    return {
        'scanned': len(candidate_emails), 'queued': queued,
        'conflicts_queued': conflicts_queued, 'notified': notified,
    }


def list_suggested_accounts(status='pending'):
    q = supabase.table('suggested_user_accounts').select('*')
    if status:
        q = q.eq('status', status)
    return run_with_retry(lambda: q.order('last_seen_at', desc=True).execute()).data or []


def dismiss_suggested_account(suggestion_id, dismissed_by=None):
    updated = run_with_retry(lambda: supabase.table('suggested_user_accounts')
                             .update({'status': 'dismissed', 'dismissed_by': dismissed_by, 'dismissed_at': _now()})
                             .eq('id', suggestion_id).execute()).data
    if not updated:
        return {'error': 'Suggestion not found'}, 404
    return {'data': updated[0]}, 200


def mark_suggested_account_created(suggestion_id, created_user_id):
    updated = run_with_retry(lambda: supabase.table('suggested_user_accounts')
                             .update({'status': 'created', 'created_user_id': created_user_id})
                             .eq('id', suggestion_id).execute()).data
    if not updated:
        return {'error': 'Suggestion not found'}, 404
    return {'data': updated[0]}, 200


# ── role conflicts (existing account, role no longer matches the data) ────────
def list_conflicts(status='pending'):
    q = supabase.table('user_type_conflicts').select('*')
    if status:
        q = q.eq('status', status)
    return run_with_retry(lambda: q.order('last_seen_at', desc=True).execute()).data or []


def dismiss_conflict(conflict_id, resolved_by=None):
    """Keep the account's current role — the conflict was reviewed and rejected."""
    updated = run_with_retry(lambda: supabase.table('user_type_conflicts')
                             .update({'status': 'dismissed', 'resolved_by': resolved_by, 'resolved_at': _now()})
                             .eq('id', conflict_id).execute()).data
    if not updated:
        return {'error': 'Conflict not found'}, 404
    return {'data': updated[0]}, 200


def resolve_conflict_replace(conflict_id, resolved_by=None):
    """Apply the detected role to the existing profile. The only place in this
    module that writes profiles.role — always one explicit admin click per
    person, never automatic, and always audit-logged by the caller (see
    routes/user_type_rules.py, which passes the actor through to
    utils.audit_logger.log_audit_action)."""
    rows = run_with_retry(lambda: supabase.table('user_type_conflicts')
                          .select('*').eq('id', conflict_id).limit(1).execute()).data or []
    if not rows:
        return {'error': 'Conflict not found'}, 404
    conflict = rows[0]
    if conflict.get('status') != 'pending':
        return {'error': f"Conflict is already {conflict.get('status')}"}, 409

    run_with_retry(lambda: supabase.table('profiles')
                   .update({'role': conflict['detected_role'], 'updated_at': _now()})
                   .eq('id', conflict['profile_id']).execute())
    updated = run_with_retry(lambda: supabase.table('user_type_conflicts')
                             .update({'status': 'replaced', 'resolved_by': resolved_by, 'resolved_at': _now()})
                             .eq('id', conflict_id).execute()).data
    return {'data': updated[0] if updated else conflict}, 200
