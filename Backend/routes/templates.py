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
        # We build a list of dictionaries — one per milestone
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
        }), 201  # 201 = Created (not 200, because we made something new)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
#  PUT /api/templates/<template_id>
#  Updates an existing template
#  Used when admin edits a template
# ─────────────────────────────────────────────
@templates_bp.route('/api/templates/<template_id>', methods=['PUT'])
def update_template(template_id):
    try:
        data = request.get_json()

        # Step 1: Update the template metadata
        update_data = {
            "name":          data.get('name'),
            "shipment_type": data.get('shipment_type'),
            "description":   data.get('description', ''),
            "updated_at":    "now()",  # Supabase understands "now()" as current timestamp
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


# ─────────────────────────────────────────────
#  POST /api/templates/<template_id>/copy
#  Saves a template as a new copy
#  This is your "save as copy" feature
# ─────────────────────────────────────────────
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


# ─────────────────────────────────────────────
#  DELETE /api/templates/<template_id>
#  Soft delete — sets is_active to False
#  We never fully delete templates in case shipments reference them
# ─────────────────────────────────────────────
@templates_bp.route('/api/templates/<template_id>', methods=['DELETE'])
def delete_template(template_id):
    try:
        supabase.table('milestone_templates').update({"is_active": False}).eq('id', template_id).execute()
        return jsonify({"message": "Template deleted"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500