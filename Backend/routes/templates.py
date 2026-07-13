from flask import Blueprint, request, jsonify
from services.supabase_client import supabase
from datetime import datetime, timedelta
import uuid

templates_bp = Blueprint('templates', __name__)


# ── Milestone-config keys carried into the shipment snapshot ──────────────────
_CONFIG_KEYS = (
    'name', 'description', 'is_critical', 'milestone_type', 'primary_field',
    'expected_date_source', 'expected_date_field', 'expected_date_offset',
    'document_name', 'tracking_field', 'field_a', 'operator', 'field_b',
    'fixed_value', 'threshold_value',
)


def _parse_date(value):
    """Best-effort parse of the many date shapes CargoWise/Supabase return."""
    if value in (None, ''):
        return None
    s = str(value).strip()
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00')).date()
    except Exception:
        pass
    for fmt in ('%m/%d/%Y %I:%M:%S %p', '%m/%d/%Y %H:%M:%S', '%m/%d/%Y', '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _compute_due_date(cfg, shipment):
    """Resolve a milestone's due date from the shipment's own field values."""
    src = cfg.get('expected_date_source')
    try:
        offset = int(cfg.get('expected_date_offset') or 0)
    except (TypeError, ValueError):
        offset = 0

    if src == 'self':
        d = _parse_date(shipment.get(cfg.get('primary_field')))
    elif src == 'another_field':
        d = _parse_date(shipment.get(cfg.get('expected_date_field')))
        d = d + timedelta(days=offset) if d else None
    elif src == 'days_after_creation':
        d = _parse_date(shipment.get('created_at'))
        d = d + timedelta(days=offset) if d else None
    else:  # 'manual' or unknown → no computed due date yet
        d = None
    return d.isoformat() if d else None


def _snapshot_row(shipment, template_id, cfg, rules, seq, milestone_lib_id):
    """One shipment_milestones row with the milestone + its rules frozen in."""
    clean_cfg = {k: cfg.get(k) for k in _CONFIG_KEYS}
    return {
        'shipment_id':          shipment['id'],
        'template_id':          template_id,
        'name':                 cfg.get('name') or 'Milestone',
        'sequence_order':       seq,
        'is_critical':          bool(cfg.get('is_critical', False)),
        'status':               'pending',
        'due_date':             _compute_due_date(cfg, shipment),
        'automated':            False,
        'milestone_lib_id':     milestone_lib_id,
        'milestone_type':       cfg.get('milestone_type'),
        'primary_field':        cfg.get('primary_field'),
        'milestone_snapshot':   clean_cfg,
        'alert_rules_snapshot': rules or [],
    }


def _resolve_template_milestones(template_row):
    """
    Return an ordered list of (config, rules, milestone_lib_id) for a template,
    reading the new library links first and falling back to legacy name-only rows.
    """
    links = sorted(
        template_row.get('template_milestone_library', []) or [],
        key=lambda x: x.get('sequence_order', 0),
    )
    specs = []
    for link in links:
        if link.get('is_local') or not link.get('milestone_lib_id'):
            cfg = link.get('local_config') or {}
            rules = cfg.get('alert_rules', []) or []
            specs.append((cfg, rules, None))
        else:
            lib = link.get('milestone_library') or {}
            rules = lib.get('milestone_alert_rules', []) or []
            specs.append((lib, rules, link.get('milestone_lib_id')))

    if specs:
        return specs

    # Legacy fallback — fetch name-only rows directly (no FK embed available).
    tid = template_row.get('id')
    legacy_rows = []
    if tid:
        try:
            legacy_rows = (
                supabase.table('template_milestones')
                .select('*')
                .eq('template_id', tid)
                .execute()
            ).data or []
        except Exception:
            legacy_rows = []
    legacy = sorted(legacy_rows, key=lambda x: x.get('sequence_order', 0))
    return [({'name': m['name'], 'is_critical': m.get('is_critical', False)}, [], None) for m in legacy]



# Nested select: pull the new library-linked milestones (with their library
# definition + alert rules). We do NOT embed template_milestones here because
# that table has no foreign-key relationship to milestone_templates in the DB,
# which makes PostgREST reject the whole query (PGRST200). Legacy name-only
# rows are fetched separately where needed.
_TEMPLATE_SELECT = (
    '*, '
    'template_milestone_library(*, milestone_library(*, milestone_alert_rules(*)))'
)


def _with_counts(tpl: dict) -> dict:
    """Attach a unified milestone_count so the list UI works for old + new."""
    lib = tpl.get('template_milestone_library') or []
    legacy = tpl.get('template_milestones') or []
    tpl['milestone_count'] = len(lib) if lib else len(legacy)
    return tpl


@templates_bp.route('/api/templates', methods=['GET'])
def get_all_templates():
    try:
        response = (
            supabase.table('milestone_templates')
            .select(_TEMPLATE_SELECT)
            .eq('is_active', True)
            .order('created_at', desc=True)
            .execute()
        )

        data = [_with_counts(t) for t in (response.data or [])]
        return jsonify({"data": data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@templates_bp.route('/api/templates/<template_id>', methods=['GET'])
def get_template(template_id):
    try:
        response = (
            supabase.table('milestone_templates')
            .select(_TEMPLATE_SELECT)
            .eq('id', template_id)
            .single()
            .execute()
        )

        if not response.data:
            return jsonify({"error": "Template not found"}), 404

        data = _with_counts(response.data)

        # Count distinct shipments currently using this template (their
        # milestones carry template_id after assignment).
        try:
            sm = (
                supabase.table('shipment_milestones')
                .select('shipment_id')
                .eq('template_id', template_id)
                .execute()
            )
            data['shipmentsUsing'] = len({m['shipment_id'] for m in (sm.data or [])})
        except Exception:
            data['shipmentsUsing'] = 0

        return jsonify({"data": data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _build_tml_row(template_id: str, milestone: dict, index: int) -> dict:
    """
    Build one template_milestone_library row from a milestone item sent by the
    builder. Two shapes are accepted:
      library: { "source": "library", "milestone_lib_id": "<uuid>" }
      local:   { "source": "local",   "local_config": { ...builder object... } }
    """
    seq = milestone.get('sequence_order', index)
    lib_id = milestone.get('milestone_lib_id')
    is_local = milestone.get('source') == 'local' or not lib_id

    if is_local:
        return {
            "template_id":    template_id,
            "milestone_lib_id": None,
            "sequence_order": seq,
            "is_local":       True,
            "local_config":   milestone.get('local_config') or {},
        }
    return {
        "template_id":      template_id,
        "milestone_lib_id": lib_id,
        "sequence_order":   seq,
        "is_local":         False,
        "local_config":     None,
    }


@templates_bp.route('/api/templates', methods=['POST'])
def create_template():
    try:
        data = request.get_json()

        if not data.get('name'):
            return jsonify({"error": "Template name is required"}), 400
        if not data.get('shipment_type'):
            return jsonify({"error": "Shipment type is required"}), 400
        if not data.get('milestones') or len(data['milestones']) == 0:
            return jsonify({"error": "At least one milestone is required"}), 400

        template_data = {
            "name":          data['name'],
            "shipment_type": data['shipment_type'],
            "description":   data.get('description', ''),
            "is_active":     True,
        }

        template_response = (
            supabase.table('milestone_templates')
            .insert(template_data)
            .execute()
        )

        new_template = template_response.data[0]
        template_id  = new_template['id']

        # Link each milestone (library or template-local) to the template.
        rows = [_build_tml_row(template_id, m, i) for i, m in enumerate(data['milestones'])]
        # Insert one at a time — avoids PGRST102 key-mismatch on differing null sets.
        for row in rows:
            supabase.table('template_milestone_library').insert(row).execute()

        return jsonify({
            "message": "Template created successfully",
            "data":    new_template
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500



#  PUT /api/templates/<template_id>
#  Updates an existing template

@templates_bp.route('/api/templates/<template_id>', methods=['PUT'])
def update_template(template_id):
    try:
        data = request.get_json()

         
        update_data = {
            "name":          data.get('name'),
            "shipment_type": data.get('shipment_type'),
            "description":   data.get('description', ''),
            "updated_at":    "now()", 
        }

        supabase.table('milestone_templates').update(update_data).eq('id', template_id).execute()

        # Replace all milestone links: delete old, insert new.
        # Clear both the legacy name-only rows and the library links so an
        # upgraded template no longer carries stale name-only milestones.
        supabase.table('template_milestones').delete().eq('template_id', template_id).execute()
        supabase.table('template_milestone_library').delete().eq('template_id', template_id).execute()

        if data.get('milestones'):
            rows = [_build_tml_row(template_id, m, i) for i, m in enumerate(data['milestones'])]
            for row in rows:
                supabase.table('template_milestone_library').insert(row).execute()

        return jsonify({"message": "Template updated successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


#  POST /api/templates/<template_id>/copy
#  Saves a template as a new copy
#  save as copy feature

@templates_bp.route('/api/templates/<template_id>/copy', methods=['POST'])
def copy_template(template_id):
    try:
        # Step 1: Get the original template and its milestones
        original = (
            supabase.table('milestone_templates')
            .select(_TEMPLATE_SELECT)
            .eq('id', template_id)
            .single()
            .execute()
        )

        if not original.data:
            return jsonify({"error": "Template not found"}), 404

        original_data = original.data

        # Step 2: Create new template with "Copy of" prefix
        new_template_data = {
            "name":          f"Copy of {original_data['name']}",
            "shipment_type": original_data['shipment_type'],
            "description":   original_data['description'],
            "is_active":     True,
        }

        new_template_response = (
            supabase.table('milestone_templates')
            .insert(new_template_data)
            .execute()
        )

        new_template_id = new_template_response.data[0]['id']

        # Step 3a: Copy legacy name-only milestones (older templates)
        original_milestones = original_data.get('template_milestones', [])
        if original_milestones:
            new_milestones = [{
                "template_id":    new_template_id,
                "name":           m['name'],
                "sequence_order": m['sequence_order'],
            } for m in original_milestones]
            supabase.table('template_milestones').insert(new_milestones).execute()

        # Step 3b: Copy library/local milestone links (new templates)
        original_links = original_data.get('template_milestone_library', [])
        for link in original_links:
            supabase.table('template_milestone_library').insert({
                "template_id":      new_template_id,
                "milestone_lib_id": link.get('milestone_lib_id'),
                "sequence_order":   link.get('sequence_order', 0),
                "is_local":         link.get('is_local', False),
                "local_config":     link.get('local_config'),
            }).execute()

        return jsonify({
            "message": "Template copied successfully",
            "data":    new_template_response.data[0]
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500



#  DELETE /api/templates/<template_id>


@templates_bp.route('/api/templates/<template_id>', methods=['DELETE'])
def delete_template(template_id):
    try:
        supabase.table('milestone_templates').update({"is_active": False}).eq('id', template_id).execute()
        return jsonify({"message": "Template deleted"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@templates_bp.route('/api/templates/<template_id>/preview-assignment', methods=['GET'])
def preview_assignment(template_id):
    try:
        assign_type    = request.args.get('type', 'all')
        consignee_name = request.args.get('consignee_name', '').strip()
        branch         = request.args.get('branch', '').strip()
 
        # ── Build the shipments query ─────────────────────────
        query = supabase.table('shipments').select(
            'id, job_number, consignee_name, transport_mode, '
            'origin_country_code, destination_country_code, branch'
        )
 
        if assign_type == 'air_import':
            # AIR, origin is NOT Sri Lanka → arriving into LK
            query = query.eq('transport_mode', 'AIR').neq('origin_country_code', 'LK')
 
        elif assign_type == 'air_export':
            # AIR, origin IS Sri Lanka → departing from LK
            query = query.eq('transport_mode', 'AIR').eq('origin_country_code', 'LK')
 
        elif assign_type == 'sea_import':
            query = query.eq('transport_mode', 'SEA').neq('origin_country_code', 'LK')
 
        elif assign_type == 'sea_export':
            query = query.eq('transport_mode', 'SEA').eq('origin_country_code', 'LK')
 
        elif assign_type == 'by_client':
            if not consignee_name:
                return jsonify({'error': 'consignee_name is required for by_client'}), 400
            query = query.ilike('consignee_name', f'%{consignee_name}%')
 
        elif assign_type == 'by_branch':
            if not branch:
                return jsonify({'error': 'branch is required for by_branch'}), 400
            # matches both "CMB" and "Colombo" style values
            query = query.ilike('branch', f'%{branch}%')
 
        # assign_type == 'all' → no filter, returns everything
 
        response  = query.execute()
        shipments = response.data or []
 
        # ── Flag which shipments already have milestones ───────
        conflict_ids = set()
        if shipments:
            ids = [s['id'] for s in shipments]
            conflicts_res = (
                supabase.table('shipment_milestones')
                .select('shipment_id')
                .in_('shipment_id', ids)
                .execute()
            )
            conflict_ids = {m['shipment_id'] for m in (conflicts_res.data or [])}
 
        for s in shipments:
            s['has_milestones'] = s['id'] in conflict_ids
 
        conflict_count = len(conflict_ids.intersection({s['id'] for s in shipments}))
 
        return jsonify({
            'data':           shipments,
            'conflict_count': conflict_count,
            'total':          len(shipments),
        }), 200
 
    except Exception as e:
        return jsonify({'error': str(e)}), 500
 
 
#  POST /api/templates/<template_id>/assign
#  Returns: { message, assigned: int, skipped: int }

@templates_bp.route('/api/templates/<template_id>/assign', methods=['POST'])
def assign_template_to_shipments(template_id):
    try:
        data              = request.get_json()
        shipment_ids      = data.get('shipment_ids', [])
        conflict_strategy = data.get('conflict_strategy', 'skip')  # 'skip' or 'replace'
 
        if not shipment_ids:
            return jsonify({'error': 'No shipments provided'}), 400
 
        if conflict_strategy not in ('skip', 'replace'):
            return jsonify({'error': 'conflict_strategy must be "skip" or "replace"'}), 400
 
        # Load the template with its library-linked milestones + alert rules.
        template_res = (
            supabase.table('milestone_templates')
            .select(_TEMPLATE_SELECT)
            .eq('id', template_id)
            .single()
            .execute()
        )

        if not template_res.data:
            return jsonify({'error': 'Template not found'}), 404

        milestone_specs = _resolve_template_milestones(template_res.data)

        if not milestone_specs:
            return jsonify({'error': 'This template has no milestones to assign'}), 400

        # Load the target shipments so due dates can be computed from their data.
        shipments_res = (
            supabase.table('shipments')
            .select('*')
            .in_('id', shipment_ids)
            .execute()
        )
        shipments_map = {s['id']: s for s in (shipments_res.data or [])}

        assigned = 0
        skipped  = 0
 
        for shipment_id in shipment_ids:
 
            # Check for existing milestones on this shipment
            existing = (
                supabase.table('shipment_milestones')
                .select('id')
                .eq('shipment_id', shipment_id)
                .execute()
            )
 
            if existing.data:
                if conflict_strategy == 'skip':
                    skipped += 1
                    continue
                elif conflict_strategy == 'replace':
                    # Remove dependent rows first. The foreign keys from `alerts`
                    # and `alert_fire_log` to shipment_milestones have no
                    # ON DELETE CASCADE, so deleting milestones directly is
                    # blocked with a 23503 constraint violation.
                    existing_ids = [m['id'] for m in existing.data]
                    if existing_ids:
                        for dep_table, dep_col in (('alerts', 'milestone_id'),
                                                   ('alert_fire_log', 'shipment_milestone_id')):
                            try:
                                supabase.table(dep_table).delete().in_(dep_col, existing_ids).execute()
                            except Exception:
                                pass  # table/column may not exist — safe to ignore
                    supabase.table('shipment_milestones') \
                        .delete() \
                        .eq('shipment_id', shipment_id) \
                        .execute()
 
            # Snapshot each milestone (config + alert rules) onto the shipment.
            # All rows share the same key set (built by _snapshot_row), so a
            # single batched insert is safe here and far faster than one-by-one.
            shipment = shipments_map.get(shipment_id, {'id': shipment_id})
            new_rows = [
                _snapshot_row(shipment, template_id, cfg, rules, seq, lib_id)
                for seq, (cfg, rules, lib_id) in enumerate(milestone_specs)
            ]
            if new_rows:
                supabase.table('shipment_milestones').insert(new_rows).execute()
            assigned += 1
 
        return jsonify({
            'message':  f'Assigned to {assigned} shipment(s), skipped {skipped}',
            'assigned': assigned,
            'skipped':  skipped,
        }), 200
 
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    


#  Returns shipments that have milestones assigned from
#  this template — used by the delete warning modal to show
#  which active shipments would be affected.
#  Returns: { data: [{ id, job_number, consignee_name }] }

@templates_bp.route('/api/templates/<template_id>/shipments', methods=['GET'])
def get_template_shipments(template_id):
    try:
        # Find all shipment_milestones that reference this template
        milestones_res = (
            supabase.table('shipment_milestones')
            .select('shipment_id')
            .eq('template_id', template_id)
            .execute()
        )

        if not milestones_res.data:
            return jsonify({'data': [], 'total': 0}), 200

        # Get unique shipment IDs
        shipment_ids = list({m['shipment_id'] for m in milestones_res.data})

        # Fetch those shipments
        shipments_res = (
            supabase.table('shipments')
            .select('id, job_number, consignee_name')
            .in_('id', shipment_ids)
            .execute()
        )

        return jsonify({
            'data':  shipments_res.data or [],
            'total': len(shipments_res.data or []),
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500