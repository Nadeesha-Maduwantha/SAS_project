from flask import Blueprint, jsonify, request
from services.supabase_client import supabase

# =============================================================
#  Notepad CRUD for the user dashboards.
#
#  Routes:
#    GET    /api/notes?staff_code=<code>  — list a user's notes, newest first
#    POST   /api/notes                    — create
#    PUT    /api/notes/<note_id>          — update title/body
#    DELETE /api/notes/<note_id>          — delete
#
#  Requires the user_notes table — see migrations/user_notes.sql.
# =============================================================

notes_bp = Blueprint('notes', __name__)

MAX_TITLE = 200
MAX_BODY = 20000


def _missing_table(error: Exception) -> bool:
    """True when the failure is just that the migration has not been run yet."""
    text = str(error).lower()
    return 'user_notes' in text and ('does not exist' in text or 'not find' in text)


@notes_bp.route('/api/notes', methods=['GET'])
def list_notes():
    staff_code = (request.args.get('staff_code') or '').strip()
    if not staff_code:
        return jsonify({'error': 'staff_code is required'}), 400

    try:
        response = (
            supabase.table('user_notes')
            .select('id, staff_code, title, body, created_at, updated_at')
            .eq('staff_code', staff_code)
            .order('updated_at', desc=True)
            .execute()
        )
        return jsonify({'data': response.data or []}), 200
    except Exception as e:
        # An un-migrated database should read as "no notes", not as a crash.
        if _missing_table(e):
            return jsonify({'data': [], 'warning': 'user_notes table not found — run migrations/user_notes.sql'}), 200
        return jsonify({'error': str(e)}), 500


@notes_bp.route('/api/notes', methods=['POST'])
def create_note():
    payload = request.get_json(silent=True) or {}
    staff_code = (payload.get('staff_code') or '').strip()
    if not staff_code:
        return jsonify({'error': 'staff_code is required'}), 400

    title = (payload.get('title') or '').strip()[:MAX_TITLE]
    body = (payload.get('body') or '')[:MAX_BODY]

    if not title and not body.strip():
        return jsonify({'error': 'A note needs a title or a body'}), 400

    try:
        response = (
            supabase.table('user_notes')
            .insert({'staff_code': staff_code, 'title': title or None, 'body': body})
            .execute()
        )
        created = (response.data or [None])[0]
        return jsonify({'data': created}), 201
    except Exception as e:
        if _missing_table(e):
            return jsonify({'error': 'user_notes table not found — run migrations/user_notes.sql'}), 503
        return jsonify({'error': str(e)}), 500


@notes_bp.route('/api/notes/<note_id>', methods=['PUT'])
def update_note(note_id):
    payload = request.get_json(silent=True) or {}

    update = {}
    if 'title' in payload:
        title = (payload.get('title') or '').strip()[:MAX_TITLE]
        update['title'] = title or None
    if 'body' in payload:
        update['body'] = (payload.get('body') or '')[:MAX_BODY]

    if not update:
        return jsonify({'error': 'Nothing to update'}), 400

    try:
        response = (
            supabase.table('user_notes')
            .update(update)
            .eq('id', note_id)
            .execute()
        )
        rows = response.data or []
        if not rows:
            return jsonify({'error': 'Note not found'}), 404
        return jsonify({'data': rows[0]}), 200
    except Exception as e:
        if _missing_table(e):
            return jsonify({'error': 'user_notes table not found — run migrations/user_notes.sql'}), 503
        return jsonify({'error': str(e)}), 500


@notes_bp.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    try:
        response = (
            supabase.table('user_notes')
            .delete()
            .eq('id', note_id)
            .execute()
        )
        if not (response.data or []):
            return jsonify({'error': 'Note not found'}), 404
        return jsonify({'message': 'Note deleted'}), 200
    except Exception as e:
        if _missing_table(e):
            return jsonify({'error': 'user_notes table not found — run migrations/user_notes.sql'}), 503
        return jsonify({'error': str(e)}), 500
