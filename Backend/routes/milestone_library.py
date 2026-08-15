from flask import Blueprint, request, jsonify
from services.supabase_client import supabase
from utils.auth_helper import require_auth, get_current_user
from services.field_registry import (
    make_milestone_key, register_milestone_fields,
    sync_registered_fields, deactivate_milestone_fields,
)

milestone_library_bp = Blueprint('milestone_library', __name__)


# Columns that are integer/date in Postgres. The builder sends '' when a
# field is unused; '' is invalid for these types, so we null-and-cast here.
_INT_FIELDS  = {'expected_date_offset', 'threshold_value', 'days_offset',
                'recurrence_interval', 'recurrence_end_n'}
_DATE_FIELDS = {'recurrence_end_date'}


def _clean_row(row: dict) -> dict:
    """Convert empty strings to None and coerce integer columns."""
    out = dict(row)
    for k, v in list(out.items()):
        if v == '':
            out[k] = None
        elif k in _INT_FIELDS and v is not None:
            try:
                out[k] = int(v)
            except (TypeError, ValueError):
                out[k] = None
    # days_offset is NOT NULL (default 0) — never send None
    if 'days_offset' in out and out['days_offset'] is None:
        out['days_offset'] = 0
    return out


# ── Helper ────────────────────────────────────────────────────────────────────
def _fetch_library_milestone(milestone_id: str):
    """
    Fetch one library milestone with its alert rules.
    Returns None if not found.
    """
    resp = (
        supabase.table('milestone_library')
        .select('*, milestone_alert_rules(*)')
        .eq('id', milestone_id)
        .eq('is_active', True)
        .single()
        .execute()
    )
    return resp.data


# ── GET /api/milestone-library ────────────────────────────────────────────────
# Returns all active library milestones with their alert rules.
# Used by the template builder to populate the "pick from library" dropdown.

@milestone_library_bp.route('/api/milestone-library', methods=['GET'])
@require_auth
def get_all_library_milestones():
    try:
        # Optional filter: ?type=date or ?type=missing etc.
        milestone_type = request.args.get('type')
        # Optional filter: ?system_only=true to get only pre-built defaults
        system_only = request.args.get('system_only', 'false').lower() == 'true'

        query = (
            supabase.table('milestone_library')
            .select('*, milestone_alert_rules(*)')
            .eq('is_active', True)
            .order('is_system_default', desc=True)  # system defaults first
            .order('created_at', desc=False)
        )

        if milestone_type:
            query = query.eq('milestone_type', milestone_type)
        if system_only:
            query = query.eq('is_system_default', True)

        resp = query.execute()
        return jsonify({'data': resp.data or []}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── GET /api/milestone-library/<milestone_id> ─────────────────────────────────
# Returns one library milestone with all its alert rules.

@milestone_library_bp.route('/api/milestone-library/<milestone_id>', methods=['GET'])
@require_auth
def get_library_milestone(milestone_id):
    try:
        data = _fetch_library_milestone(milestone_id)
        if not data:
            return jsonify({'error': 'Milestone not found'}), 404
        return jsonify({'data': data}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── POST /api/milestone-library ───────────────────────────────────────────────
# Creates a new library milestone with its alert rules.
# Admin only — enforced here and at the RLS level.
#
# Expected body:
# {
#   "name": "Cargo Ready Check",
#   "description": "...",
#   "is_critical": false,
#   "milestone_type": "date",       -- date | document | comparison | missing
#   "primary_field": "cargo_ready_date",
#   "expected_date_source": "self", -- self | another_field | days_after_creation | manual
#   "expected_date_field": null,
#   "expected_date_offset": 0,
#   "alert_rules": [
#     {
#       "timing": "before",         -- before | on_date | after
#       "days_offset": 2,
#       "fire_time": "09:00",
#       "condition": "always",      -- always | if_not_recorded | if_comparison_true | if_missing
#       "recipient_type": "operations",
#       "recurrence_type": "once",
#       "recurrence_end_type": "after_n_times",
#       "recurrence_end_n": 1,
#       "stop_condition_field": null,
#       "stop_condition_type": null,
#       "stop_condition_value": null
#     }
#   ]
# }

@milestone_library_bp.route('/api/milestone-library', methods=['POST'])
@require_auth
def create_library_milestone():
    try:
        user_id, user_role = get_current_user()

        # Admin only
        if 'admin' not in (user_role or '').lower():
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json()

        # Validate required fields
        if not data.get('name', '').strip():
            return jsonify({'error': 'Milestone name is required'}), 400
        if not data.get('milestone_type'):
            return jsonify({'error': 'Milestone type is required'}), 400
        if data['milestone_type'] not in ('date', 'document', 'comparison', 'missing', 'status', 'custom'):
            return jsonify({'error': 'Invalid milestone type'}), 400
        if not data.get('alert_rules') or len(data['alert_rules']) == 0:
            return jsonify({'error': 'At least one alert rule is required'}), 400

        # Build the milestone library row
        milestone_row = {
            'name':                 data['name'].strip(),
            'description':          data.get('description', ''),
            'is_critical':          bool(data.get('is_critical', False)),
            'milestone_type':       data['milestone_type'],
            'is_system_default':    False,  # user-created milestones are never system defaults
            'is_active':            True,
            'created_by':           user_id,
            # Stable registry key — generated once, never changed on rename.
            'milestone_key':        make_milestone_key(data['name']),

            # Date / missing type fields
            'primary_field':        data.get('primary_field'),
            'expected_date_source': data.get('expected_date_source'),
            'expected_date_field':  data.get('expected_date_field'),
            'expected_date_offset': data.get('expected_date_offset', 0),

            # Document type fields
            'document_name':        data.get('document_name'),
            'tracking_field':       data.get('tracking_field'),

            # Comparison type fields
            'field_a':              data.get('field_a'),
            'operator':             data.get('operator'),
            'field_b':              data.get('field_b'),
            'fixed_value':          data.get('fixed_value'),
            'threshold_value':      data.get('threshold_value'),
        }

        # Additional logic blocks (multi-check milestones). Only sent when used,
        # so single-check milestones keep working before the columns migration.
        if data.get('extra_logics'):
            milestone_row['extra_logics']  = data['extra_logics']
            milestone_row['logic_combine'] = data.get('logic_combine') or 'and'

        # Insert the milestone
        milestone_resp = (
            supabase.table('milestone_library')
            .insert(_clean_row(milestone_row))
            .execute()
        )
        new_milestone = milestone_resp.data[0]
        new_id = new_milestone['id']

        # Insert all alert rules linked to this milestone
        rules = data['alert_rules']
        rule_rows = []
        for rule in rules:
            rule_rows.append(_clean_row({
                'milestone_lib_id':      new_id,
                'timing':                rule.get('timing', 'on_date'),
                'days_offset':           rule.get('days_offset', 0),
                'fire_time':             rule.get('fire_time', '09:00'),
                'condition':             rule.get('condition', 'always'),
                'recipient_type':        rule.get('recipient_type', 'operations'),
                'custom_email':          rule.get('custom_email'),
                'recurrence_type':       rule.get('recurrence_type', 'once'),
                'recurrence_interval':   rule.get('recurrence_interval'),
                'recurrence_end_type':   rule.get('recurrence_end_type'),
                'recurrence_end_n':      rule.get('recurrence_end_n'),
                'recurrence_end_date':   rule.get('recurrence_end_date'),
                'stop_condition_field':  rule.get('stop_condition_field'),
                'stop_condition_type':   rule.get('stop_condition_type'),
                'stop_condition_value':  rule.get('stop_condition_value'),
                'is_active':             True,
            }))

        supabase.table('milestone_alert_rules').insert(rule_rows).execute()

        # Door 2 — register this milestone's CargoWise fields so the sync
        # starts collecting them into shipments.milestones automatically.
        register_milestone_fields(new_milestone.get('milestone_key'), data)

        # Return the full milestone with rules
        full = _fetch_library_milestone(new_id)
        return jsonify({
            'message': 'Milestone created successfully',
            'data':    full,
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── PUT /api/milestone-library/<milestone_id> ─────────────────────────────────
# Updates a library milestone and replaces its alert rules.
# System defaults (is_system_default=true) can be edited by admin —
# their is_system_default flag is preserved.
#
# IMPORTANT: editing a library milestone does NOT affect shipments
# that already have this milestone assigned — those use the snapshot.

@milestone_library_bp.route('/api/milestone-library/<milestone_id>', methods=['PUT'])
@require_auth
def update_library_milestone(milestone_id):
    try:
        user_id, user_role = get_current_user()

        if 'admin' not in (user_role or '').lower():
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json()

        # Validate
        if not data.get('name', '').strip():
            return jsonify({'error': 'Milestone name is required'}), 400

        # Update the milestone row
        update_row = {
            'name':                 data['name'].strip(),
            'description':          data.get('description', ''),
            'is_critical':          bool(data.get('is_critical', False)),
            'milestone_type':       data.get('milestone_type'),
            'primary_field':        data.get('primary_field'),
            'expected_date_source': data.get('expected_date_source'),
            'expected_date_field':  data.get('expected_date_field'),
            'expected_date_offset': data.get('expected_date_offset', 0),
            'document_name':        data.get('document_name'),
            'tracking_field':       data.get('tracking_field'),
            'field_a':              data.get('field_a'),
            'operator':             data.get('operator'),
            'field_b':              data.get('field_b'),
            'fixed_value':          data.get('fixed_value'),
            'threshold_value':      data.get('threshold_value'),
        }

        # Only touch the multi-logic columns when extra checks are present, so
        # editing a plain milestone works before the columns migration is run.
        if data.get('extra_logics'):
            update_row['extra_logics']  = data['extra_logics']
            update_row['logic_combine'] = data.get('logic_combine') or 'and'

        supabase.table('milestone_library') \
            .update(_clean_row(update_row)) \
            .eq('id', milestone_id) \
            .execute()

        # Replace alert rules: delete old ones, insert new ones
        supabase.table('milestone_alert_rules') \
            .delete() \
            .eq('milestone_lib_id', milestone_id) \
            .execute()

        if data.get('alert_rules'):
            rule_rows = []
            for rule in data['alert_rules']:
                rule_rows.append(_clean_row({
                    'milestone_lib_id':      milestone_id,
                    'timing':                rule.get('timing', 'on_date'),
                    'days_offset':           rule.get('days_offset', 0),
                    'fire_time':             rule.get('fire_time', '09:00'),
                    'condition':             rule.get('condition', 'always'),
                    'recipient_type':        rule.get('recipient_type', 'operations'),
                    'custom_email':          rule.get('custom_email'),
                    'recurrence_type':       rule.get('recurrence_type', 'once'),
                    'recurrence_interval':   rule.get('recurrence_interval'),
                    'recurrence_end_type':   rule.get('recurrence_end_type'),
                    'recurrence_end_n':      rule.get('recurrence_end_n'),
                    'recurrence_end_date':   rule.get('recurrence_end_date'),
                    'stop_condition_field':  rule.get('stop_condition_field'),
                    'stop_condition_type':   rule.get('stop_condition_type'),
                    'stop_condition_value':  rule.get('stop_condition_value'),
                    'is_active':             True,
                }))
            supabase.table('milestone_alert_rules').insert(rule_rows).execute()

        # Door 2 — keep the field registry in sync with the edited fields.
        # milestone_key is preserved (renames never change it).
        try:
            key_row = (
                supabase.table('milestone_library')
                .select('milestone_key')
                .eq('id', milestone_id).single().execute()
            ).data or {}
            if key_row.get('milestone_key'):
                sync_registered_fields(key_row['milestone_key'], data)
        except Exception as _e:
            print(f"[milestone_library] registry sync skipped: {_e}")

        full = _fetch_library_milestone(milestone_id)
        return jsonify({
            'message': 'Milestone updated successfully',
            'data':    full,
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── DELETE /api/milestone-library/<milestone_id> ──────────────────────────────
# Soft deletes a library milestone (sets is_active = false).
# Does NOT delete alert rules — they stay linked for audit purposes.
# Does NOT affect shipments using a snapshot of this milestone.

@milestone_library_bp.route('/api/milestone-library/<milestone_id>', methods=['DELETE'])
@require_auth
def delete_library_milestone(milestone_id):
    try:
        _, user_role = get_current_user()

        if 'admin' not in (user_role or '').lower():
            return jsonify({'error': 'Admin access required'}), 403

        # Check if any active templates are still using this milestone
        usage = (
            supabase.table('template_milestone_library')
            .select('id, template_id')
            .eq('milestone_lib_id', milestone_id)
            .execute()
        )

        if usage.data:
            return jsonify({
                'error': 'Cannot delete — this milestone is used in one or more templates.',
                'template_count': len(usage.data),
            }), 409

        supabase.table('milestone_library') \
            .update({'is_active': False}) \
            .eq('id', milestone_id) \
            .execute()

        # Stop the sync collecting this milestone's fields.
        try:
            key_row = (
                supabase.table('milestone_library')
                .select('milestone_key')
                .eq('id', milestone_id).single().execute()
            ).data or {}
            if key_row.get('milestone_key'):
                deactivate_milestone_fields(key_row['milestone_key'])
        except Exception as _e:
            print(f"[milestone_library] registry deactivate skipped: {_e}")

        return jsonify({'message': 'Milestone deleted'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── POST /api/milestone-library/<milestone_id>/duplicate ──────────────────────
# Creates a copy of a library milestone (including its rules).
# Used when admin wants to base a new milestone on an existing one.

@milestone_library_bp.route('/api/milestone-library/<milestone_id>/duplicate', methods=['POST'])
@require_auth
def duplicate_library_milestone(milestone_id):
    try:
        user_id, user_role = get_current_user()

        if 'admin' not in (user_role or '').lower():
            return jsonify({'error': 'Admin access required'}), 403

        original = _fetch_library_milestone(milestone_id)
        if not original:
            return jsonify({'error': 'Milestone not found'}), 404

        # Build copy — strip id, timestamps, set new name and creator
        copy_row = {k: v for k, v in original.items()
                    if k not in ('id', 'created_at', 'updated_at',
                                 'milestone_alert_rules')}
        copy_row['name']              = f"Copy of {original['name']}"
        copy_row['is_system_default'] = False
        copy_row['created_by']        = user_id

        copy_resp = (
            supabase.table('milestone_library')
            .insert(copy_row)
            .execute()
        )
        new_id = copy_resp.data[0]['id']

        # Copy alert rules
        original_rules = original.get('milestone_alert_rules', [])
        if original_rules:
            rule_rows = []
            for rule in original_rules:
                rule_copy = {k: v for k, v in rule.items()
                             if k not in ('id', 'created_at', 'milestone_lib_id')}
                rule_copy['milestone_lib_id'] = new_id
                rule_rows.append(rule_copy)
            supabase.table('milestone_alert_rules').insert(rule_rows).execute()

        full = _fetch_library_milestone(new_id)
        return jsonify({
            'message': 'Milestone duplicated successfully',
            'data':    full,
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── GET /api/milestone-library/<milestone_id>/usage ───────────────────────────
# Returns which templates are using this library milestone.
# Used in the delete warning modal.

@milestone_library_bp.route('/api/milestone-library/<milestone_id>/usage', methods=['GET'])
@require_auth
def get_milestone_usage(milestone_id):
    try:
        usage = (
            supabase.table('template_milestone_library')
            .select('template_id, milestone_templates(id, name, shipment_type)')
            .eq('milestone_lib_id', milestone_id)
            .execute()
        )

        templates = []
        seen = set()
        for row in (usage.data or []):
            t = row.get('milestone_templates')
            if t and t['id'] not in seen:
                templates.append(t)
                seen.add(t['id'])

        return jsonify({
            'data':  templates,
            'total': len(templates),
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── POST /api/milestone-library/promote ───────────────────────────────────────
# Promotes a template-local milestone (stored in template_milestone_library.
# local_config) into a reusable library milestone. The template link is
# rewired to point at the new library milestone.
#
# Body: { "tml_id": "<template_milestone_library row id>" }

def _milestone_row_from_config(cfg: dict, user_id: str) -> dict:
    return {
        'name':                 (cfg.get('name') or 'Untitled milestone').strip(),
        'description':          cfg.get('description', ''),
        'is_critical':          bool(cfg.get('is_critical', False)),
        'milestone_type':       cfg.get('milestone_type'),
        'is_system_default':    False,
        'is_active':            True,
        'created_by':           user_id,
        'milestone_key':        make_milestone_key(cfg.get('name') or 'milestone'),
        'primary_field':        cfg.get('primary_field'),
        'expected_date_source': cfg.get('expected_date_source'),
        'expected_date_field':  cfg.get('expected_date_field'),
        'expected_date_offset': cfg.get('expected_date_offset', 0),
        'document_name':        cfg.get('document_name'),
        'tracking_field':       cfg.get('tracking_field'),
        'field_a':              cfg.get('field_a'),
        'operator':             cfg.get('operator'),
        'field_b':              cfg.get('field_b'),
        'fixed_value':          cfg.get('fixed_value'),
        'threshold_value':      cfg.get('threshold_value'),
    }


def _rule_row_from_config(rule: dict, milestone_id: str) -> dict:
    return _clean_row({
        'milestone_lib_id':     milestone_id,
        'timing':               rule.get('timing', 'on_date'),
        'days_offset':          rule.get('days_offset', 0),
        'fire_time':            rule.get('fire_time', '09:00'),
        'condition':            rule.get('condition', 'always'),
        'recipient_type':       rule.get('recipient_type', 'operations'),
        'custom_email':         rule.get('custom_email'),
        'recurrence_type':      rule.get('recurrence_type', 'once'),
        'recurrence_interval':  rule.get('recurrence_interval'),
        'recurrence_end_type':  rule.get('recurrence_end_type'),
        'recurrence_end_n':     rule.get('recurrence_end_n'),
        'recurrence_end_date':  rule.get('recurrence_end_date'),
        'stop_condition_field': rule.get('stop_condition_field'),
        'stop_condition_type':  rule.get('stop_condition_type'),
        'stop_condition_value': rule.get('stop_condition_value'),
        'is_active':            True,
    })


@milestone_library_bp.route('/api/milestone-library/promote', methods=['POST'])
@require_auth
def promote_local_milestone():
    try:
        user_id, user_role = get_current_user()
        if 'admin' not in (user_role or '').lower():
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json() or {}
        tml_id = data.get('tml_id')
        if not tml_id:
            return jsonify({'error': 'tml_id is required'}), 400

        tml = (
            supabase.table('template_milestone_library')
            .select('*')
            .eq('id', tml_id)
            .single()
            .execute()
        ).data
        if not tml:
            return jsonify({'error': 'Template milestone not found'}), 404
        if tml.get('milestone_lib_id') and not tml.get('is_local'):
            return jsonify({'error': 'This milestone is already in the library'}), 409

        cfg = tml.get('local_config') or {}
        if not cfg.get('milestone_type'):
            return jsonify({'error': 'This milestone has no saved configuration to promote'}), 400

        # Create the library milestone
        new_milestone = (
            supabase.table('milestone_library')
            .insert(_clean_row(_milestone_row_from_config(cfg, user_id)))
            .execute()
        ).data[0]
        new_id = new_milestone['id']

        # Copy its alert rules
        rules = cfg.get('alert_rules') or []
        if rules:
            supabase.table('milestone_alert_rules').insert(
                [_rule_row_from_config(r, new_id) for r in rules]
            ).execute()

        # Door 2 — register the promoted milestone's fields.
        register_milestone_fields(new_milestone.get('milestone_key'), cfg)

        # Rewire the template link to the new library milestone
        supabase.table('template_milestone_library').update({
            'milestone_lib_id': new_id,
            'is_local':         False,
            'local_config':     None,
        }).eq('id', tml_id).execute()

        return jsonify({
            'message': 'Milestone promoted to library',
            'data':    _fetch_library_milestone(new_id),
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500