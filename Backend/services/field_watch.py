"""
field_watch.py — Field Integrity / Registry Watch module.

Standalone from the milestone alert engine. It watches the DATA (not milestone
progress): an expected CargoWise field that hasn't arrived while the milestone is
overdue OR a later milestone's data already came — i.e. it's late, and may have
arrived under a different name. It:
  • writes shipment_milestones.field_alert (the yellow card detail),
  • emails ONE central admin, configured separately in System Settings
    (sync_settings.field_watch_alert_email), new-only.

It reuses the read-only milestone-evaluation helpers from status_recompute but
does NOT write milestone status — that stays the alert engine's job.
"""

import re
from datetime import datetime, timezone

from services.supabase_client import supabase
from services.field_registry import suggest_field
from services.status_recompute import (
    _milestone_satisfied, _expected_field, _unclaimed_for, _parse_dt,
)

_SUGGEST_THRESHOLD = 0.6


# ── recipient (its own setting) ───────────────────────────────────────────────
def _field_watch_emails():
    """Recipient(s) for field-watch alerts: the field_watch admin in Settings,
    else the general admin_emails. Respects field_watch_alert_on."""
    try:
        row = (supabase.table('sync_settings')
               .select('admin_emails, field_watch_alert_email, field_watch_alert_on')
               .limit(1).execute()).data
        if not row:
            return []
        row = row[0]
        if row.get('field_watch_alert_on') is False:
            return []
        target = row.get('field_watch_alert_email') or row.get('admin_emails') or ''
        return [e.strip() for e in re.split(r'[,;\s]+', target) if e.strip()]
    except Exception as e:
        print(f"[field_watch] could not load recipient: {e}")
        return []


# ── de-dup + logging (new-only email) ─────────────────────────────────────────
def _already_notified(job, field):
    try:
        rows = (supabase.table('sync_errors').select('id')
                .eq('job_number', f"[field-delayed] {job}")
                .eq('field_name', field).limit(1).execute()).data or []
        return len(rows) > 0
    except Exception:
        return False


def _log_delay(job, field, reason, suggested):
    try:
        sug = f" It may have arrived as '{suggested}'." if suggested else ""
        supabase.table('sync_errors').insert({
            'job_number':   f"[field-delayed] {job}",
            'field_name':   field,
            'error_reason': f"Expected field '{field}' has not arrived ({reason}).{sug} "
                            f"Check the Field Registry — it may be under a different name.",
            'severity':     'warning',
        }).execute()
    except Exception as e:
        print(f"[field_watch] could not log delay: {e}")


def _notify(new_delays):
    if not new_delays:
        return {'sent': 0}
    recipients = _field_watch_emails()
    if not recipients:
        return {'sent': 0, 'reason': 'no recipient / alerts off'}
    lines = [
        f"• Shipment {d['job']}: expected field '{d['field']}' still missing ({d['reason']})."
        + (f" Likely arrived as '{d['suggested']}' ({int((d['score'] or 0)*100)}% match)." if d.get('suggested') else "")
        for d in new_delays
    ]
    subject = f"[SAS] {len(new_delays)} expected data field(s) delayed / possibly renamed"
    body = ("These shipment milestones are outstanding because their expected CargoWise field hasn't "
            "arrived — either past due, or a later milestone's data already came. The data may be arriving "
            "under a different name.\n\n" + "\n".join(lines) +
            "\n\nOpen the Field Registry to map the real field, then update the milestone's expected field.")
    sent = 0
    try:
        from services.email_service import send_email
        for to in recipients:
            try:
                send_email(to, subject, body); sent += 1
            except Exception as e:
                print(f"[field_watch] email to {to} failed: {e}")
    except Exception as e:
        return {'sent': 0, 'reason': f'email unavailable: {e}'}
    return {'sent': sent, 'recipients': recipients}


# ── the scan ──────────────────────────────────────────────────────────────────
def scan_field_alerts():
    """Recompute field_alert on every assigned milestone; email NEW delays."""
    ms_rows = (
        supabase.table('shipment_milestones')
        .select('id, shipment_id, sequence_order, status, due_date, completed_date, '
                'milestone_type, milestone_snapshot, field_alert')
        .execute()
    ).data or []

    ship_ids = list({r['shipment_id'] for r in ms_rows if r.get('shipment_id')})
    shipments = {}
    for i in range(0, len(ship_ids), 100):
        rs = (supabase.table('shipments').select('*')
              .in_('id', ship_ids[i:i + 100]).execute()).data or []
        for s in rs:
            shipments[s['id']] = s

    try:
        from services.cargowise_service import load_field_map
        field_map = load_field_map()
    except Exception:
        field_map = {}
    unclaimed_cache = {}

    now = datetime.now(timezone.utc)

    # satisfied per milestone
    info = {}
    for r in ms_rows:
        cfg = r.get('milestone_snapshot') or {}
        sh = shipments.get(r.get('shipment_id')) or {}
        info[r['id']] = {'sat': _milestone_satisfied(cfg, sh), 'cfg': cfg, 'row': r, 'later_sat': False}

    # a LATER milestone already arrived? (scan per shipment from the end)
    by_ship = {}
    for r in ms_rows:
        by_ship.setdefault(r['shipment_id'], []).append(r)
    for rows in by_ship.values():
        rows.sort(key=lambda x: (x.get('sequence_order') or 0))
        acc = False
        for r in reversed(rows):
            info[r['id']]['later_sat'] = acc
            if info[r['id']]['sat']:
                acc = True

    field_alert_count = 0
    new_delays = []
    for rid, d in info.items():
        r = d['row']
        cfg = d['cfg']
        sh = shipments.get(r.get('shipment_id')) or {}
        field_alert = None

        # Field Watch is strictly a DATA-INTEGRITY signal: it fires only when an
        # expected field is late AND a plausible RENAMED field is actually sitting
        # in the shipment's raw_json under a different name. A milestone that's
        # merely late (with no rename candidate) is the alert engine's concern —
        # it shows red on the board, NOT a yellow "map in Field Registry" card.
        if not d['sat']:
            dd = _parse_dt(r.get('due_date'))
            overdue = (r.get('status') == 'overdue') or (dd is not None and dd < now)
            if overdue or d['later_sat']:
                exp = _expected_field(cfg)
                sug = None
                if exp:
                    sid = r.get('shipment_id')
                    if sid not in unclaimed_cache:
                        unclaimed_cache[sid] = _unclaimed_for(sh, field_map)
                    cand = suggest_field(exp, unclaimed_cache[sid])
                    if cand and cand.get('score', 0) >= _SUGGEST_THRESHOLD:
                        sug = cand
                # Only raise the yellow alert when we found a real rename candidate.
                if sug:
                    field_alert = {
                        'reason':          'overdue' if overdue else 'out_of_sequence',
                        'expected_field':  exp,
                        'suggested_field': sug['field'],
                        'score':           sug['score'],
                    }

        if field_alert:
            field_alert_count += 1

        if (r.get('field_alert') or None) != field_alert:
            try:
                supabase.table('shipment_milestones').update({'field_alert': field_alert}).eq('id', rid).execute()
            except Exception as e:
                print(f"[field_watch] update failed for {rid}: {e}")

        if field_alert:
            job = sh.get('job_number') or r.get('shipment_id')
            fld = field_alert['expected_field'] or 'field'
            if not _already_notified(job, fld):
                _log_delay(job, fld, field_alert['reason'], field_alert['suggested_field'])
                new_delays.append({'job': job, 'field': fld, 'reason': field_alert['reason'],
                                   'suggested': field_alert['suggested_field'], 'score': field_alert['score']})

    notified = _notify(new_delays)
    print(f"[field_watch] field_alerts={field_alert_count} emailed={notified.get('sent')}")
    return {'field_alerts': field_alert_count, 'emailed': notified.get('sent', 0)}


def list_field_conflicts():
    """
    The naming mismatches, DEDUPED and grouped by template.

    A yellow alert is per shipment, but the same expected field renamed the same
    way is ONE conflict — "if one is correct, the rest are too." So we collapse all
    per-shipment field_alerts into one row per (template, milestone_key, expected
    field), carrying how many shipments it affects and the rows it covers.

    Shape: [ { template_id, template_name,
               conflicts: [ { milestone_key, milestone_name, expected_field,
                              suggested_field, score, affected_count } ] } ]
    """
    rows = (
        supabase.table('shipment_milestones')
        .select('id, name, template_id, milestone_snapshot, field_alert')
        .not_.is_('field_alert', 'null')
        .execute()
    ).data or []

    # template names
    tids = list({r['template_id'] for r in rows if r.get('template_id')})
    tmap = {}
    for i in range(0, len(tids), 100):
        ts = (supabase.table('milestone_templates')
              .select('id, name').in_('id', tids[i:i + 100]).execute()).data or []
        for t in ts:
            tmap[t['id']] = t.get('name')

    conflicts = {}
    for r in rows:
        fa = r.get('field_alert') or {}
        snap = r.get('milestone_snapshot') or {}
        exp = fa.get('expected_field')
        if not exp:
            continue
        mkey = snap.get('milestone_key') or (r.get('name') or '').strip().lower()
        key = (r.get('template_id'), mkey, exp)
        c = conflicts.get(key)
        if not c:
            c = conflicts[key] = {
                'template_id':     r.get('template_id'),
                'template_name':   tmap.get(r.get('template_id')) or 'Unassigned template',
                'milestone_key':   mkey,
                'milestone_name':  r.get('name'),
                'expected_field':  exp,
                'suggested_field': fa.get('suggested_field'),
                'score':           fa.get('score'),
                'affected_count':  0,
            }
        c['affected_count'] += 1
        # keep the strongest suggestion across the shipments in this conflict
        if fa.get('score') is not None and (c['score'] is None or fa['score'] > c['score']):
            c['suggested_field'] = fa.get('suggested_field')
            c['score'] = fa.get('score')

    groups = {}
    for c in conflicts.values():
        gk = c['template_id'] or '__none__'
        g = groups.setdefault(gk, {
            'template_id':   c['template_id'],
            'template_name': c['template_name'],
            'conflicts':     [],
        })
        g['conflicts'].append(c)
    for g in groups.values():
        g['conflicts'].sort(key=lambda c: (-c['affected_count'], c['expected_field']))
    return sorted(groups.values(), key=lambda g: g['template_name'] or '')


def resolve_field_conflict(expected_field, real_field, milestone_key=None):
    """
    Resolve a naming mismatch ONCE for every shipment it affects.

      • maps expected→real globally in the registry (per milestone_key), so the
        sync/alert engine finds the field from now on;
      • clears the yellow field_alert on every matching shipment_milestone.

    Scope: pass milestone_key to resolve just that milestone's conflict; omit it to
    resolve this expected_field everywhere it appears (across templates/milestones).
    """
    if not expected_field:
        return {'error': 'expected_field is required'}

    rows = (
        supabase.table('shipment_milestones')
        .select('id, milestone_snapshot, field_alert')
        .not_.is_('field_alert', 'null')
        .execute()
    ).data or []

    keys_to_map, cleared = set(), 0
    for r in rows:
        fa = r.get('field_alert') or {}
        snap = r.get('milestone_snapshot') or {}
        if fa.get('expected_field') != expected_field:
            continue
        mk = snap.get('milestone_key')
        if milestone_key and mk != milestone_key:
            continue
        if mk:
            keys_to_map.add(mk)
        try:
            supabase.table('shipment_milestones').update({'field_alert': None}).eq('id', r['id']).execute()
            cleared += 1
        except Exception as e:
            print(f"[field_watch] clear failed for {r['id']}: {e}")

    mapped = []
    if real_field:
        for mk in keys_to_map:
            try:
                supabase.table('milestone_field_map').upsert(
                    {'milestone_key': mk, 'api_field': real_field.strip(),
                     'source': 'api_discovery', 'is_active': True},
                    on_conflict='milestone_key,api_field',
                ).execute()
                mapped.append(mk)
            except Exception as e:
                print(f"[field_watch] map failed ({mk}->{real_field}): {e}")

    return {'expected_field': expected_field, 'real_field': real_field,
            'cleared': cleared, 'mapped_keys': mapped}


def list_field_alerts():
    """The current field-watch alerts, joined with shipment info (for the UI)."""
    rows = (
        supabase.table('shipment_milestones')
        .select('id, shipment_id, name, due_date, is_critical, field_alert')
        .not_.is_('field_alert', 'null')
        .execute()
    ).data or []
    ship_ids = list({r['shipment_id'] for r in rows if r.get('shipment_id')})
    ships = {}
    for i in range(0, len(ship_ids), 100):
        rs = (supabase.table('shipments')
              .select('id, job_number, consignee_name')
              .in_('id', ship_ids[i:i + 100]).execute()).data or []
        for s in rs:
            ships[s['id']] = s
    out = []
    for r in rows:
        fa = r.get('field_alert') or {}
        s = ships.get(r.get('shipment_id'), {})
        out.append({
            'id':              r['id'],
            'shipment_id':     r.get('shipment_id'),
            'job_number':      s.get('job_number'),
            'consignee_name':  s.get('consignee_name'),
            'milestone_name':  r.get('name'),
            'is_critical':     r.get('is_critical', False),
            'expected_field':  fa.get('expected_field'),
            'suggested_field': fa.get('suggested_field'),
            'score':           fa.get('score'),
            'reason':          fa.get('reason'),
        })
    return out
