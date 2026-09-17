"""
cover_access.py — temporary "cover for an absent colleague" access.

An Operation/Sales user can request access to a same-department teammate's work.
The owner (or an Admin, as an override) approves and picks a duration; a one-time
code is emailed to the requester. Once the requester enters the code, they can see
and act on the owner's work for the window. Everything they do is logged, and when
the window ends the owner gets a summary email + in-app report.

This module never raises to callers for email/logging problems — those are
best-effort so they can't break the core request/approve/verify flow.
"""

import secrets
from datetime import datetime, timezone, timedelta

from werkzeug.security import generate_password_hash, check_password_hash

from services.scope import department_mode
from services.supabase_client import supabase, run_with_retry

try:
    from services.email_service import send_email
except Exception:                       # email is optional; never block the flow
    def send_email(*a, **k):            # type: ignore
        print("[cover_access] email_service unavailable — skipping email")


# Requests that are never acted on shouldn't linger forever.
PENDING_TTL_HOURS = 72
DURATION_PRESETS  = (12, 24, 72, 168)   # 12h, 24h, 3 days, 1 week
RED_WINDOW_HOURS  = 3                    # after expiry, re-request is offered for 3h


# ── helpers ───────────────────────────────────────────────────────────────────
def _now():
    return datetime.now(timezone.utc)


def _iso(dt):
    return dt.isoformat() if dt else None


def _norm(email):
    return (email or '').strip().lower()


def _is_unassigned_department(department):
    """True when department is empty/null - the data-quality gap where the
    normal same-department matching can't apply (see list_colleagues below)."""
    d = (department or '').strip().lower()
    return d in ('', 'null', 'none', 'n/a')


# ── admin-configurable: how far the "no department on file" exception reaches ──
# Set on System Settings -> Cover Access department policy. Applies identically
# to Sales and Operation roles (see routes/system_settings.py). Symmetric: it
# doesn't matter which side of the pair (the owner whose work needs covering,
# or the colleague who'd provide the cover) is the one with no department —
# either one being unassigned can trigger the exception.
COVER_DEPARTMENT_POLICIES = ('strict', 'unassigned_only', 'any_department')
DEFAULT_COVER_DEPARTMENT_POLICY = 'any_department'   # preserves original behavior


def _cover_department_policy():
    """Read the configured policy from sync_settings (single-row settings
    table, same pattern as the other System Settings toggles). Falls back to
    the default on any lookup problem so cover access never breaks because a
    setting couldn't be read."""
    try:
        rows = run_with_retry(lambda: supabase.table('sync_settings')
                              .select('cover_department_policy').limit(1).execute()).data or []
        policy = (rows[0].get('cover_department_policy') if rows else None) or DEFAULT_COVER_DEPARTMENT_POLICY
    except Exception as e:
        print(f"[cover_access] policy lookup failed, defaulting to {DEFAULT_COVER_DEPARTMENT_POLICY}: {e}")
        policy = DEFAULT_COVER_DEPARTMENT_POLICY
    return policy if policy in COVER_DEPARTMENT_POLICIES else DEFAULT_COVER_DEPARTMENT_POLICY


def _department_eligible(owner_department, requester_department, policy=None):
    """Department half of cover eligibility — role matching is handled
    separately by callers. owner_department is the department of the person
    whose work might be covered; requester_department is the colleague who
    might cover it. Symmetric: either side having no department on file can
    trigger the exception — a department-less person doesn't belong to Sea or
    Air, so the rule applies whichever role they're playing in the pair.
    Governed by _cover_department_policy():

      strict          - department always has to match on both sides; if
                         either the owner or the requester has no department
                         on file, they're never coverable/covering through
                         this rule.
      unassigned_only - the exception only kicks in when BOTH the owner and
                         the requester have no department on file — a
                         department-less pair can cover each other, but a
                         department-less person still can't reach into (or be
                         reached from) Sea or Air.
      any_department  - if EITHER the owner or the requester has no
                         department on file, department is ignored entirely —
                         they can cover / be covered by any same-role
                         colleague (default/original behavior).
    """
    policy = policy or _cover_department_policy()
    owner_unassigned = _is_unassigned_department(owner_department)
    req_unassigned   = _is_unassigned_department(requester_department)

    if policy == 'strict':
        if owner_unassigned or req_unassigned:
            return False
        return department_mode(owner_department) == department_mode(requester_department)

    if policy == 'unassigned_only':
        if owner_unassigned or req_unassigned:
            return owner_unassigned and req_unassigned
        return department_mode(owner_department) == department_mode(requester_department)

    # 'any_department' (default)
    if owner_unassigned or req_unassigned:
        return True
    return department_mode(owner_department) == department_mode(requester_department)


def _parse(dt):
    if not dt:
        return None
    try:
        d = datetime.fromisoformat(str(dt).replace('Z', '+00:00'))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _touch(request_id, patch):
    patch = {**patch, 'updated_at': _iso(_now())}
    return run_with_retry(lambda: supabase.table('cover_requests')
                          .update(patch).eq('id', request_id).execute())


def _get(request_id):
    rows = run_with_retry(lambda: supabase.table('cover_requests')
                          .select('*').eq('id', request_id).limit(1).execute()).data or []
    return rows[0] if rows else None


# ── colleagues you can request from (same department AND same role) ───────────
def list_colleagues(email, department, role):
    """Colleagues you can request cover from.

    Normal case: same role AND same department (matched by freight mode —
    SEA / AIR, mirrors scope.department_mode, so 'Sea Ops' and 'Sea Freight'
    count as the same department) — an operation user covers another
    operation user, a sales user a sales user. Role always has to match;
    department is the part that can be relaxed (below).

    Exception: if EITHER side of the pair has NO department on file (a
    data-quality gap — see the profiles missing `department`) — the candidate
    p, or the viewer themselves — department is, by default, ignored for that
    pair. So a sales user with no department sees every sales colleague here
    regardless of department, AND a sales user who does have a department
    still sees every department-less sales colleague too. How far this
    exception reaches (both-unassigned only, vs. either side unassigned, vs.
    off) is admin-configurable — System Settings -> Cover Access department
    policy, see _department_eligible — and applies identically to Sales and
    Operation. Role still always has to match — an operation user never sees
    a sales colleague here, department or not. Admin and Super User accounts
    never appear here at all; they take direct access instead
    (create_direct_grant / state_for.can_cover), not the request flow.
    """
    email = _norm(email)
    want_role = _norm_role(role)   # 'operation' / 'sales'
    policy = _cover_department_policy()
    rows = run_with_retry(lambda: supabase.table('profiles')
                          .select('email, full_name, role, department').execute()).data or []
    out = []
    for p in rows:
        pe = _norm(p.get('email'))
        if not pe or pe == email:
            continue

        p_role = _norm_role(p.get('role'))
        if p_role in ('admin', 'super'):
            continue   # never coverable via the request flow
        if want_role and p_role != want_role:
            continue   # role always has to match

        # p is the potential owner (whose work could be covered); email/department
        # is the viewer who'd be doing the covering.
        if not _department_eligible(p.get('department'), department, policy):
            continue

        out.append({'email': pe, 'name': p.get('full_name') or pe, 'role': p.get('role')})

    out.sort(key=lambda x: x['name'].lower())
    return out


# ── user lookup ───────────────────────────────────────────────────────────────
def _user(email):
    email = _norm(email)
    if not email:
        return {}
    rows = run_with_retry(lambda: supabase.table('profiles')
                          .select('email, full_name, role, department')
                          .ilike('email', email).limit(1).execute()).data or []
    return rows[0] if rows else {}


def _all_users(exclude_email=None, department=None):
    exclude_email = _norm(exclude_email)
    rows = run_with_retry(lambda: supabase.table('profiles')
                          .select('email, full_name, role, department').execute()).data or []
    out = []
    for p in rows:
        pe = _norm(p.get('email'))
        if not pe or pe == exclude_email:
            continue
        if department and (p.get('department') or '').strip().lower() != department.strip().lower():
            continue
        out.append({'email': pe, 'name': p.get('full_name') or pe,
                    'role': p.get('role'), 'department': p.get('department')})
    out.sort(key=lambda x: x['name'].lower())
    return out


# ── admin / super: direct grant (no approval) ─────────────────────────────────
def create_direct_grant(actor_email, actor_role, actor_department, owner_email):
    """Admin (anyone) or Super (their department) takes cover directly. No code,
    active immediately, no expiry — the owner is notified, and every action the
    stand-in takes is alerted to the owner (see log_activity)."""
    actor_email = _norm(actor_email)
    owner_email = _norm(owner_email)
    role = _norm_role(actor_role)
    if role not in ('admin', 'super'):
        return {'error': 'Only admin or super users can take direct access'}, 403
    if not owner_email or owner_email == actor_email:
        return {'error': 'Pick a valid colleague'}, 400

    owner = _user(owner_email)
    if not owner:
        return {'error': 'User not found'}, 404
    if role == 'super':
        if (owner.get('department') or '').strip().lower() != (actor_department or '').strip().lower():
            return {'error': 'Super users can only cover their own department'}, 403

    # Reuse an existing active direct grant instead of duplicating.
    existing = run_with_retry(lambda: supabase.table('cover_requests')
                              .select('*').eq('requester_email', actor_email)
                              .eq('owner_email', owner_email).eq('grant_type', 'direct')
                              .eq('status', 'active').limit(1).execute()).data or []
    if existing:
        return {'data': existing[0]}, 200

    now = _now()
    row = {
        'requester_email': actor_email, 'requester_name': _user(actor_email).get('full_name'),
        'owner_email': owner_email, 'owner_name': owner.get('full_name') or owner_email,
        'department': owner.get('department'), 'status': 'active', 'grant_type': 'direct',
        'access_level': 'act', 'approved_by': actor_email, 'approved_at': _iso(now),
        'activated_at': _iso(now), 'expires_at': None,   # no expiry
    }
    created = run_with_retry(lambda: supabase.table('cover_requests').insert(row).execute()).data[0]
    _email_owner_direct(created, role)
    return {'data': created}, 201


def remove_direct_grant(request_id, actor_email):
    req = _get(request_id)
    if not req or req.get('grant_type') != 'direct':
        return {'error': 'Not a direct grant'}, 404
    if _norm(actor_email) != _norm(req['requester_email']):
        return {'error': 'Not yours to remove'}, 403
    _touch(request_id, {'status': 'ended', 'revoked_at': _iso(_now()), 'revoked_by': _norm(actor_email)})
    _finalize_and_report(_get(request_id), reason='removed')
    return {'data': _get(request_id)}, 200


# ── extension (only during the red window) ────────────────────────────────────
def request_extension(request_id, requester_email, proposed_hours):
    req = _get(request_id)
    if not req:
        return {'error': 'Request not found'}, 404
    if _norm(requester_email) != _norm(req['requester_email']):
        return {'error': 'Not your grant'}, 403
    # Only within the red window: an expiring grant that ended <= RED_WINDOW_HOURS ago.
    exp = _parse(req.get('expires_at'))
    if not exp:
        return {'error': 'This grant has no expiry to extend'}, 400
    if _now() < exp:
        return {'error': 'You can only extend after the grant expires (during the red window)'}, 400
    if _now() - exp > timedelta(hours=RED_WINDOW_HOURS):
        return {'error': 'The re-request window has closed'}, 400
    try:
        proposed_hours = int(proposed_hours)
    except (TypeError, ValueError):
        return {'error': 'proposed_hours must be a number'}, 400

    row = {
        'requester_email': req['requester_email'], 'requester_name': req.get('requester_name'),
        'owner_email': req['owner_email'], 'owner_name': req.get('owner_name'),
        'department': req.get('department'), 'reason': f"Extension of earlier cover (+{proposed_hours}h)",
        'status': 'pending', 'grant_type': 'request', 'is_extension': True,
        'proposed_hours': proposed_hours, 'parent_id': req['id'],
    }
    created = run_with_retry(lambda: supabase.table('cover_requests').insert(row).execute()).data[0]
    _email_owner_extension_request(created, proposed_hours)
    return {'data': created}, 201


# ── state feed for the top-bar selector (color + options) ─────────────────────
def _norm_role(role):
    """Roles show up in both spellings across the app — the DB stores
    'operationuser'/'salesuser'/'superuser' (no underscore; see users.py,
    user_edit.py), while the frontend sends 'operation_user'/'sales_user'
    (see useAuth.ts). Strip separators first so both collapse the same way."""
    r = (role or '').strip().lower().replace(' ', '').replace('_', '')
    if r in ('operationuser', 'operation', 'operations', 'ops'):
        return 'operation'
    if r in ('salesuser', 'sales'):
        return 'sales'
    if r in ('superuser', 'super'):
        return 'super'
    return r


def _custom_type_cover_enabled(role):
    """True when `role` (already normalized via _norm_role) is an active
    custom user type (System Settings -> User Types) with Cover Access
    switched on. Shared by state_for() (populates the top-bar selector) and
    create_request() (the actual mutation) — looked up server-side both
    times so a type with Cover Access off can't be bypassed by calling the
    request API directly, even if the UI never offers it."""
    if role in ('admin', 'super', 'operation', 'sales', ''):
        return False
    try:
        rows = run_with_retry(lambda: supabase.table('user_types')
                              .select('key, can_request_cover, is_active').execute()).data or []
        return any(
            _norm_role(t.get('key')) == role and t.get('is_active') and t.get('can_request_cover')
            for t in rows
        )
    except Exception as e:
        print(f"[cover_access] custom-type cover-eligibility lookup failed: {e}")
        return False


def state_for(email, role, department):
    email = _norm(email)
    role  = _norm_role(role)

    # Grants are looked up defensively so the colleague list (can_cover) still
    # loads even if the cover tables aren't migrated yet or the query hiccups.
    try:
        active = active_grants_for(email)
    except Exception as e:
        print(f"[cover_access] state active lookup failed: {e}")
        active = []

    try:
        being_covered = being_covered_for(email)
    except Exception as e:
        print(f"[cover_access] state being_covered lookup failed: {e}")
        being_covered = []

    now = _now()
    red = []
    try:
        ended = run_with_retry(lambda: supabase.table('cover_requests')
                .select('id, owner_email, owner_name, expires_at, grant_type')
                .eq('requester_email', email).eq('status', 'ended').execute()).data or []
        for r in ended:
            exp = _parse(r.get('expires_at'))
            if exp and now >= exp and (now - exp) <= timedelta(hours=RED_WINDOW_HOURS):
                red.append({'request_id': r['id'], 'owner_email': _norm(r['owner_email']),
                            'owner_name': r.get('owner_name') or r['owner_email'],
                            'expires_at': r.get('expires_at')})
    except Exception as e:
        print(f"[cover_access] state red lookup failed: {e}")

    # Who they can cover directly (admin/super only — op/sales must request).
    can_cover = []
    try:
        if role == 'admin':
            can_cover = _all_users(exclude_email=email)
        elif role == 'super':
            can_cover = _all_users(exclude_email=email, department=department)
    except Exception as e:
        print(f"[cover_access] state can_cover lookup failed: {e}")

    # A custom user type (System Settings -> User Types) with can_request_cover
    # on behaves exactly like op/sales below — same-type-only, via the same
    # list_colleagues() (role always has to match, so a custom type's peer
    # group is naturally just other users of that same type).
    custom_cover_enabled = _custom_type_cover_enabled(role)

    # Op/Sales/cover-enabled custom type: approved requests still awaiting
    # their code, + colleagues they can request.
    awaiting_code, can_request = [], []
    if role in ('operation', 'sales') or custom_cover_enabled:
        try:
            rows = run_with_retry(lambda: supabase.table('cover_requests')
                   .select('id, owner_email, owner_name').eq('requester_email', email)
                   .eq('status', 'approved').execute()).data or []
            awaiting_code = [{'request_id': r['id'], 'owner_email': _norm(r['owner_email']),
                              'owner_name': r.get('owner_name') or r['owner_email']} for r in rows]
        except Exception as e:
            print(f"[cover_access] state awaiting lookup failed: {e}")
        try:
            can_request = list_colleagues(email, department, role)
        except Exception as e:
            print(f"[cover_access] state can_request lookup failed: {e}")

    return {'active': active, 'being_covered': being_covered, 'red': red, 'can_cover': can_cover,
            'role': role, 'awaiting_code': awaiting_code, 'can_request': can_request}


# ── create a request ──────────────────────────────────────────────────────────
def create_request(requester_email, requester_name, owner_email, owner_name, department, reason):
    requester_email = _norm(requester_email)
    owner_email     = _norm(owner_email)
    if not requester_email or not owner_email:
        return {'error': 'requester and owner are required'}, 400
    if requester_email == owner_email:
        return {'error': "You can't request cover for your own work"}, 400

    # Eligibility — the same rule list_colleagues() uses to populate the UI,
    # enforced here too (looked up server-side, never trusted from the client)
    # so a direct API call can't bypass it. Role always has to match; the
    # department match is what's relaxed (per the admin policy) when either
    # side has no department on file.
    owner = _user(owner_email)
    if not owner:
        return {'error': 'User not found'}, 404

    owner_role = _norm_role(owner.get('role'))
    if owner_role in ('admin', 'super'):
        return {'error': 'Admin and Super User work cannot be requested for cover'}, 403

    requester = _user(requester_email)
    requester_role = _norm_role(requester.get('role'))

    # Custom user types (System Settings -> User Types) only get Cover Access
    # when an admin has switched it on for that type — enforced here (not just
    # by list_colleagues()/state_for() leaving the UI empty) so a direct API
    # call can't create a request for a type that has it off.
    if requester_role not in ('operation', 'sales') and not _custom_type_cover_enabled(requester_role):
        return {'error': 'Cover Access is not enabled for your account type'}, 403

    if requester_role != owner_role:
        return {'error': 'You can only request cover from a colleague in the same role'}, 403

    if not _department_eligible(owner.get('department'), requester.get('department')):
        return {'error': 'You can only request cover within your own department'}, 403

    # Block duplicate open requests for the same pair.
    existing = run_with_retry(lambda: supabase.table('cover_requests')
                              .select('id, status').eq('requester_email', requester_email)
                              .eq('owner_email', owner_email)
                              .in_('status', ['pending', 'approved', 'active']).execute()).data or []
    if existing:
        return {'error': 'You already have an open request for this colleague'}, 409

    row = {
        'requester_email': requester_email, 'requester_name': requester_name,
        'owner_email': owner_email, 'owner_name': owner_name,
        'department': department, 'reason': reason, 'status': 'pending',
    }
    created = run_with_retry(lambda: supabase.table('cover_requests').insert(row).execute()).data[0]

    _email_owner_new_request(created)
    return {'data': created}, 201


# ── approve (owner or admin override) ─────────────────────────────────────────
def approve_request(request_id, approver_email, duration_hours, is_admin=False):
    req = _get(request_id)
    if not req:
        return {'error': 'Request not found'}, 404
    if req['status'] != 'pending':
        return {'error': f"Request is already {req['status']}"}, 409

    approver_email = _norm(approver_email)
    if not is_admin and approver_email != _norm(req['owner_email']):
        return {'error': 'Only the work owner or an admin can approve'}, 403

    try:
        duration_hours = int(duration_hours)
    except (TypeError, ValueError):
        return {'error': 'duration_hours must be a number'}, 400
    if duration_hours <= 0 or duration_hours > 24 * 30:
        return {'error': 'duration_hours is out of range'}, 400

    # Extension (red-window re-request): the requester already proved identity on
    # the original grant, so the owner's approval re-activates immediately with the
    # chosen hours — no new code. The owner may accept the proposed hours or override.
    if req.get('is_extension'):
        now = _now()
        expires = now + timedelta(hours=duration_hours)
        _touch(request_id, {'status': 'active', 'duration_hours': duration_hours,
                            'approved_by': approver_email, 'approved_at': _iso(now),
                            'activated_at': _iso(now), 'expires_at': _iso(expires),
                            'report_sent_at': None, 'code_hash': None})
        updated = _get(request_id)
        log_activity(req['requester_email'], req['owner_email'], 'extension_granted',
                     detail={'duration_hours': duration_hours})
        _email_requester_extension(updated)
        return {'data': updated}, 200

    code = f"{secrets.randbelow(1_000_000):06d}"     # 6-digit one-time code
    _touch(request_id, {
        'status': 'approved',
        'duration_hours': duration_hours,
        'approved_by': approver_email,
        'approved_at': _iso(_now()),
        'code_hash': generate_password_hash(code),
    })
    updated = _get(request_id)
    _email_requester_code(updated, code)
    return {'data': {k: v for k, v in updated.items() if k != 'code_hash'}}, 200


def reject_request(request_id, approver_email, is_admin=False):
    req = _get(request_id)
    if not req:
        return {'error': 'Request not found'}, 404
    if req['status'] != 'pending':
        return {'error': f"Request is already {req['status']}"}, 409
    if not is_admin and _norm(approver_email) != _norm(req['owner_email']):
        return {'error': 'Only the work owner or an admin can reject'}, 403
    _touch(request_id, {'status': 'rejected', 'approved_by': _norm(approver_email),
                        'approved_at': _iso(_now())})
    return {'data': _get(request_id)}, 200


# ── verify the code → activate the window ─────────────────────────────────────
def verify_code(request_id, requester_email, code):
    req = _get(request_id)
    if not req:
        return {'error': 'Request not found'}, 404
    if req['status'] != 'approved':
        return {'error': f"Request is {req['status']}, not awaiting a code"}, 409
    if _norm(requester_email) != _norm(req['requester_email']):
        return {'error': 'This code is not for you'}, 403
    if not req.get('code_hash') or not check_password_hash(req['code_hash'], str(code or '').strip()):
        return {'error': 'Incorrect code'}, 400

    now = _now()
    expires = now + timedelta(hours=int(req['duration_hours']))
    _touch(request_id, {'status': 'active', 'activated_at': _iso(now),
                        'expires_at': _iso(expires), 'code_hash': None})
    log_activity(req['requester_email'], req['owner_email'], 'access_started',
                 detail={'duration_hours': req['duration_hours']})
    return {'data': _get(request_id)}, 200


def revoke_request(request_id, by_email, is_admin=False):
    req = _get(request_id)
    if not req:
        return {'error': 'Request not found'}, 404
    if req['status'] not in ('active', 'approved'):
        return {'error': f"Request is {req['status']}"}, 409
    by = _norm(by_email)
    if not is_admin and by not in (_norm(req['owner_email']), _norm(req['requester_email'])):
        return {'error': 'Not allowed to revoke this'}, 403
    _touch(request_id, {'status': 'ended', 'revoked_at': _iso(_now()), 'revoked_by': by})
    _finalize_and_report(_get(request_id), reason='revoked')
    return {'data': _get(request_id)}, 200


# ── who can a viewer currently act as? ────────────────────────────────────────
def active_grants_for(viewer_email):
    """Owners this viewer currently has an ACTIVE, unexpired grant for — i.e.
    whose work THIS viewer is covering. See being_covered_for() for the
    other direction (who is covering THIS viewer's own work)."""
    viewer_email = _norm(viewer_email)
    if not viewer_email:
        return []
    rows = run_with_retry(lambda: supabase.table('cover_requests')
                          .select('id, owner_email, owner_name, expires_at, department, grant_type')
                          .eq('requester_email', viewer_email)
                          .eq('status', 'active').execute()).data or []
    now = _now()
    out = []
    for r in rows:
        exp = _parse(r.get('expires_at'))
        # Direct (admin/super) grants have no expiry → always active while status='active'.
        if exp is None or exp > now:
            out.append({'request_id': r['id'], 'owner_email': _norm(r['owner_email']),
                        'owner_name': r.get('owner_name') or r['owner_email'],
                        'expires_at': r.get('expires_at'),
                        'grant_type': r.get('grant_type') or 'request'})
    return out


def being_covered_for(owner_email):
    """The mirror of active_grants_for(): ACTIVE, unexpired grants where this
    viewer is the OWNER — i.e. who is currently covering THEIR work. Lets the
    "ongoing access" state show on both sides of the pair, not just to the
    person doing the covering."""
    owner_email = _norm(owner_email)
    if not owner_email:
        return []
    rows = run_with_retry(lambda: supabase.table('cover_requests')
                          .select('id, requester_email, requester_name, expires_at, department, grant_type')
                          .eq('owner_email', owner_email)
                          .eq('status', 'active').execute()).data or []
    now = _now()
    out = []
    for r in rows:
        exp = _parse(r.get('expires_at'))
        if exp is None or exp > now:
            out.append({'request_id': r['id'], 'requester_email': _norm(r['requester_email']),
                        'requester_name': r.get('requester_name') or r['requester_email'],
                        'expires_at': r.get('expires_at'),
                        'grant_type': r.get('grant_type') or 'request'})
    return out


def active_owner_emails(viewer_email):
    return {g['owner_email'] for g in active_grants_for(viewer_email)}


# ── activity logging ──────────────────────────────────────────────────────────
def log_activity(actor_email, owner_email, action, shipment_id=None, milestone_id=None, detail=None):
    """Best-effort: record something the stand-in did on the owner's work."""
    try:
        grant = run_with_retry(lambda: supabase.table('cover_requests')
                               .select('id, grant_type, owner_name, requester_name')
                               .eq('requester_email', _norm(actor_email))
                               .eq('owner_email', _norm(owner_email))
                               .eq('status', 'active').limit(1).execute()).data or []
        if not grant:
            return
        g = grant[0]
        run_with_retry(lambda: supabase.table('cover_activity_log').insert({
            'request_id': g['id'], 'actor_email': _norm(actor_email),
            'owner_email': _norm(owner_email), 'action': action,
            'shipment_id': shipment_id, 'milestone_id': milestone_id, 'detail': detail,
        }).execute())
        # Admin/super direct grants: the owner is alerted on every real action
        # they take (not passive events), per the agreed behavior.
        if g.get('grant_type') == 'direct' and action not in ('view', 'access_started', 'extension_granted'):
            _email_owner_direct_action(owner_email, actor_email, g.get('requester_name'), action, shipment_id)
    except Exception as e:
        print(f"[cover_access] log_activity failed: {e}")


# ── scheduled: end expired grants and report to owners ────────────────────────
def run_cover_expiry():
    now = _now()
    ended = expired_pending = 0

    # 1) Active grants past their window → end + report.
    active = run_with_retry(lambda: supabase.table('cover_requests')
                            .select('*').eq('status', 'active').execute()).data or []
    for req in active:
        exp = _parse(req.get('expires_at'))
        if exp and exp <= now and not req.get('report_sent_at'):
            _touch(req['id'], {'status': 'ended'})
            _finalize_and_report(_get(req['id']), reason='expired')
            ended += 1

    # 2) Stale pending/approved requests nobody acted on.
    stale_before = now - timedelta(hours=PENDING_TTL_HOURS)
    stale = run_with_retry(lambda: supabase.table('cover_requests')
                           .select('id, created_at, status')
                           .in_('status', ['pending', 'approved']).execute()).data or []
    for req in stale:
        created = _parse(req.get('created_at'))
        if created and created <= stale_before:
            _touch(req['id'], {'status': 'expired'})
            expired_pending += 1

    print(f"[cover_access] expiry: ended={ended} expired_pending={expired_pending}")
    return {'ended': ended, 'expired_pending': expired_pending}


def _finalize_and_report(req, reason='expired'):
    """Compile the activity log and email the owner a summary (once)."""
    if not req or req.get('report_sent_at'):
        return
    try:
        logs = run_with_retry(lambda: supabase.table('cover_activity_log')
                              .select('action, shipment_id, milestone_id, detail, created_at')
                              .eq('request_id', req['id']).order('created_at').execute()).data or []
        _email_owner_report(req, logs, reason)
        _touch(req['id'], {'report_sent_at': _iso(_now())})
    except Exception as e:
        print(f"[cover_access] finalize/report failed: {e}")


# ── emails ────────────────────────────────────────────────────────────────────
def _email_owner_new_request(req):
    try:
        who = req.get('requester_name') or req['requester_email']
        send_email(
            to=req['owner_email'],
            subject=f"[SAS] {who} is requesting cover access to your work",
            text=(f"{who} has requested temporary access to cover your work while you're away.\n"
                  f"Reason: {req.get('reason') or '(none given)'}\n\n"
                  f"Open SAS → Cover Requests to approve (and choose how long) or decline. "
                  f"On approval, a one-time code is sent to {req['requester_email']}."),
        )
    except Exception as e:
        print(f"[cover_access] owner-request email failed: {e}")


def _email_requester_code(req, code):
    try:
        send_email(
            to=req['requester_email'],
            subject="[SAS] Your cover-access code",
            text=(f"Your request to cover {req.get('owner_name') or req['owner_email']}'s work was approved for "
                  f"{req.get('duration_hours')} hours.\n\n"
                  f"Enter this code in SAS → Cover Requests to start: {code}\n\n"
                  f"The window begins when you enter the code and lasts {req.get('duration_hours')} hours."),
        )
    except Exception as e:
        print(f"[cover_access] requester-code email failed: {e}")


def _email_owner_report(req, logs, reason):
    who = req.get('requester_name') or req['requester_email']
    lines = []
    for l in logs:
        ts = (l.get('created_at') or '')[:16].replace('T', ' ')
        lines.append(f"  • {ts}  {l.get('action')}"
                     + (f"  shipment={l.get('shipment_id')}" if l.get('shipment_id') else ''))
    body = (f"Cover access by {who} on your work has ended ({reason}).\n\n"
            f"Activity ({len(logs)} entries):\n" + ('\n'.join(lines) if lines else '  (no actions recorded)'))
    try:
        send_email(to=req['owner_email'], subject=f"[SAS] Cover access ended — what {who} did", text=body)
    except Exception as e:
        print(f"[cover_access] owner-report email failed: {e}")


def _email_owner_direct(req, role):
    try:
        who = req.get('requester_name') or req['requester_email']
        send_email(
            to=req['owner_email'],
            subject=f"[SAS] {who} ({role}) now has access to your work",
            text=(f"{who}, a {role} user, has taken cover access to your work. You'll be alerted for "
                  f"each action they take, and can end this from SAS → Cover Requests at any time."),
        )
    except Exception as e:
        print(f"[cover_access] owner-direct email failed: {e}")


def _email_owner_direct_action(owner_email, actor_email, actor_name, action, shipment_id):
    try:
        who = actor_name or actor_email
        send_email(
            to=owner_email,
            subject=f"[SAS] {who} acted on your work",
            text=(f"{who} just performed '{action}' on your work"
                  + (f" (shipment {shipment_id})" if shipment_id else "") + "."),
        )
    except Exception as e:
        print(f"[cover_access] owner-action email failed: {e}")


def _email_requester_extension(req):
    try:
        send_email(
            to=req['requester_email'],
            subject="[SAS] Your cover extension was approved",
            text=(f"Your extension to cover {req.get('owner_name') or req['owner_email']}'s work was approved for "
                  f"{req.get('duration_hours')} more hours — it's active now."),
        )
    except Exception as e:
        print(f"[cover_access] requester-extension email failed: {e}")


def _email_owner_extension_request(req, proposed_hours):
    try:
        who = req.get('requester_name') or req['requester_email']
        send_email(
            to=req['owner_email'],
            subject=f"[SAS] {who} is requesting more cover time",
            text=(f"{who} has asked to extend their cover of your work by {proposed_hours} hours. "
                  f"Open SAS → Cover Requests to approve that duration, set your own, or decline."),
        )
    except Exception as e:
        print(f"[cover_access] owner-extension-request email failed: {e}")
