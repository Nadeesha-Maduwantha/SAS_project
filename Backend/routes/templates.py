from flask import Blueprint, request, jsonify
from services.supabase_client import supabase
import uuid

templates_bp = Blueprint('templates', __name__)



@templates_bp.route('/api/templates', methods=['GET'])
def get_all_templates():
    try:
        response = (
            supabase.table('milestone_templates')
            .select('*, template_milestones(*)')  
            .eq('is_active', True)
            .order('created_at', desc=True)
            .execute()
        )

        return jsonify({"data": response.data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@templates_bp.route('/api/templates/<template_id>', methods=['GET'])
def get_template(template_id):
    try:
        response = (
            supabase.table('milestone_templates')
            .select('*, template_milestones(*)')
            .eq('id', template_id)
            .single()   
            .execute()
        )

        if not response.data:
            return jsonify({"error": "Template not found"}), 404

        return jsonify({"data": response.data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


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

        # Step 2: Insert all the milestones linked to this template
        # build a list of dictionaries — one per milestone

        milestones_to_insert = []
        for i, milestone in enumerate(data['milestones']):
            milestones_to_insert.append({
                "template_id":    template_id,
                "name":           milestone['name'],
                "sequence_order": i,  # use index as order to preserve the drag-drop sequence
            })

        # Insert all milestones in one call (more efficient than one by one)
        supabase.table('template_milestones').insert(milestones_to_insert).execute()

        # Return the full template object back to Next.js
        return jsonify({
            "message": "Template created successfully",
            "data":    new_template
        }), 201  # 201 = Created (not 200, because made something new)

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

        # Step 2: Replace all milestones
        # Easiest approach: delete old ones, insert new ones
        # This handles reordering and additions/removals cleanly
        supabase.table('template_milestones').delete().eq('template_id', template_id).execute()

        if data.get('milestones'):
            milestones_to_insert = []
            for i, milestone in enumerate(data['milestones']):
                milestones_to_insert.append({
                    "template_id":    template_id,
                    "name":           milestone['name'],
                    "sequence_order": i,
                })
            supabase.table('template_milestones').insert(milestones_to_insert).execute()

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
            .select('*, template_milestones(*)')
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

        # Step 3: Copy all milestones from original to new template
        original_milestones = original_data.get('template_milestones', [])
        if original_milestones:
            new_milestones = []
            for m in original_milestones:
                new_milestones.append({
                    "template_id":    new_template_id,
                    "name":           m['name'],
                    "sequence_order": m['sequence_order'],
                })
            supabase.table('template_milestones').insert(new_milestones).execute()

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
 
        # Load the template and its milestones 
        template_res = (
            supabase.table('milestone_templates')
            .select('*, template_milestones(*)')
            .eq('id', template_id)
            .single()
            .execute()
        )
 
        if not template_res.data:
            return jsonify({'error': 'Template not found'}), 404
 
        template_milestones = sorted(
            template_res.data.get('template_milestones', []),
            key=lambda x: x.get('sequence_order', 0),
        )
 
        if not template_milestones:
            return jsonify({'error': 'This template has no milestones to assign'}), 400
 
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
                    # Delete all existing milestones before assigning
                    supabase.table('shipment_milestones') \
                        .delete() \
                        .eq('shipment_id', shipment_id) \
                        .execute()
 
            # Build milestone rows from template
            new_milestones = [
                {
                    'shipment_id':    shipment_id,
                    'template_id':    template_id,
                    'name':           m['name'],
                    'sequence_order': m['sequence_order'],
                    'status':         'pending',
                    'automated':      m.get('automated', False),
                    'is_critical':    m.get('is_critical', False),
                }
                for m in template_milestones
            ]
 
            supabase.table('shipment_milestones').insert(new_milestones).execute()
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