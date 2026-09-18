from flask import Blueprint, jsonify, request
from services.supabase_client import supabase

# =============================================================
#  Notepad CRUD for the user dashboards.
#
#  A note is private: it belongs to one person, identified by the
#  email they signed in with (owner_email). Every route is scoped by
#  that email, so one user can never read, edit or delete another
#  user's notes — the note id alone is not enough.
#
#  A note may also be attached to one shipment the user owns. The
#  link is validated against that user's shipments before it is
#  stored, so a note can only point at a shipment they can see.
#
#  Routes:
#    GET    /api/notes?email=<email>          — list a user's notes, newest first
#    POST   /api/notes                        — create
#    PUT    /api/notes/<note_id>?email=<email>— update body/shipment
#    DELETE /api/notes/<note_id>?email=<email>— delete
#
#  Requires the user_notes table — see migrations/user_notes.sql.
# =============================================================

notes_bp = Blueprint('notes', __name__)

MAX_BODY = 20000

# A note is just its text plus an optional shipment link — there is no title.
# The user_notes.title column is left in place, unused and null.
NOTE_COLUMNS = (
    'id, owner_email, staff_code, body, '
    'shipment_id, shipment_job_number, created_at, updated_at'
)


def _missing_table(error: Exception) -> bool:
    """True when the failure is just that the migration has not been run yet."""
    text = str(error).lower()
    return 'user_notes' in text and ('does not exist' in text or 'not find' in text)


def _missing_column(error: Exception) -> bool:
    """True when the table exists but predates the owner_email/shipment columns."""
    text = str(error).lower()
    return any(
        col in text for col in ('owner_email', 'shipment_id', 'shipment_job_number')
    ) and ('does not exist' in text or 'not find' in text or 'column' in text)


MIGRATION_HINT = 'user_notes table is out of date — run migrations/user_notes.sql'


def _owner(payload=None) -> str:
    """
    The signed-in user's email, from the query string or the JSON body.
    Lowercased so 'A@x.com' and 'a@x.com' are the same owner — notes are
    stored lowercased too, so every lookup can be an exact match.
    """
    email = request.args.get('email') or ((payload or {}).get('email'))
    return (email or '').strip().lower()


def _owned_shipment(shipment_id: str, owner_email: str):
    """
    The shipment row when `owner_email` owns it, otherwise None.

    Ownership works differently per role, so both are accepted: a sales
    user owns the shipment itself (sales_user_email), an operation user
    is assigned to one of its milestones (shipment_milestones.assigned_email).
    """
    response = (
        supabase.table('shipments')
        .select('id, job_number, sales_user_email')
        .eq('id', shipment_id)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    if not rows:
        return None
    shipment = rows[0]

    if (shipment.get('sales_user_email') or '').strip().lower() == owner_email:
        return shipment

    # Compared in Python rather than with ilike: an email containing '_'
    # would be read as a single-character wildcard and could match somebody
    # else's address.
    assigned = (
        supabase.table('shipment_milestones')
        .select('assigned_email')
        .eq('shipment_id', shipment_id)
        .execute()
    )
    emails = {
        (m.get('assigned_email') or '').strip().lower()
        for m in (assigned.data or [])
    }
    return shipment if owner_email in emails else None


def _note_owned_by(note_id: str, owner_email: str):
    """The note row when this user owns it, otherwise None."""
    response = (
        supabase.table('user_notes')
        .select(NOTE_COLUMNS)
        .eq('id', note_id)
        .eq('owner_email', owner_email)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    return rows[0] if rows else None


def _apply_shipment(update: dict, payload: dict, owner_email: str):
    """
    Read the optional shipment link off `payload` into `update`.
    Returns an error message when the shipment is not one this user owns.
    """
    if 'shipment_id' not in payload:
        return None

    shipment_id = (payload.get('shipment_id') or '').strip()
    if not shipment_id:
        # Explicitly cleared — detach the note from whatever it pointed at.
        update['shipment_id'] = None
        update['shipment_job_number'] = None
        return None

    shipment = _owned_shipment(shipment_id, owner_email)
    if not shipment:
        return 'That shipment is not assigned to you'

    update['shipment_id'] = shipment['id']
    update['shipment_job_number'] = shipment.get('job_number')
    return None


@notes_bp.route('/api/notes', methods=['GET'])
def list_notes():
    owner_email = _owner()
    if not owner_email:
        return jsonify({'error': 'email is required'}), 400

    try:
        response = (
            supabase.table('user_notes')
            .select(NOTE_COLUMNS)
            .eq('owner_email', owner_email)
            .order('updated_at', desc=True)
            .execute()
        )
        return jsonify({'data': response.data or []}), 200
    except Exception as e:
        # An un-migrated database should read as "no notes", not as a crash.
        if _missing_table(e):
            return jsonify({'data': [], 'warning': 'user_notes table not found — run migrations/user_notes.sql'}), 200
        if _missing_column(e):
            return jsonify({'data': [], 'warning': MIGRATION_HINT}), 200
        return jsonify({'error': str(e)}), 500


@notes_bp.route('/api/notes', methods=['POST'])
def create_note():
    payload = request.get_json(silent=True) or {}
    owner_email = _owner(payload)
    if not owner_email:
        return jsonify({'error': 'email is required'}), 400

    body = (payload.get('body') or '')[:MAX_BODY]

    if not body.strip():
        return jsonify({'error': 'A note needs some text'}), 400

    row = {
        'owner_email': owner_email,
        'staff_code': (payload.get('staff_code') or '').strip() or None,
        'body': body,
    }

    error = _apply_shipment(row, payload, owner_email)
    if error:
        return jsonify({'error': error}), 403

    try:
        response = supabase.table('user_notes').insert(row).execute()
        created = (response.data or [None])[0]
        return jsonify({'data': created}), 201
    except Exception as e:
        if _missing_table(e):
            return jsonify({'error': 'user_notes table not found — run migrations/user_notes.sql'}), 503
        if _missing_column(e):
            return jsonify({'error': MIGRATION_HINT}), 503
        return jsonify({'error': str(e)}), 500


@notes_bp.route('/api/notes/<note_id>', methods=['PUT'])
def update_note(note_id):
    payload = request.get_json(silent=True) or {}
    owner_email = _owner(payload)
    if not owner_email:
        return jsonify({'error': 'email is required'}), 400

    update = {}
    if 'body' in payload:
        body = (payload.get('body') or '')[:MAX_BODY]
        if not body.strip():
            return jsonify({'error': 'A note needs some text'}), 400
        update['body'] = body

    error = _apply_shipment(update, payload, owner_email)
    if error:
        return jsonify({'error': error}), 403

    if not update:
        return jsonify({'error': 'Nothing to update'}), 400

    try:
        # Ownership is checked first so someone else's note id reads as
        # "not found" rather than being edited.
        if not _note_owned_by(note_id, owner_email):
            return jsonify({'error': 'Note not found'}), 404

        response = (
            supabase.table('user_notes')
            .update(update)
            .eq('id', note_id)
            .eq('owner_email', owner_email)
            .execute()
        )
        rows = response.data or []
        if not rows:
            return jsonify({'error': 'Note not found'}), 404
        return jsonify({'data': rows[0]}), 200
    except Exception as e:
        if _missing_table(e):
            return jsonify({'error': 'user_notes table not found — run migrations/user_notes.sql'}), 503
        if _missing_column(e):
            return jsonify({'error': MIGRATION_HINT}), 503
        return jsonify({'error': str(e)}), 500


@notes_bp.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    owner_email = _owner(request.get_json(silent=True) or {})
    if not owner_email:
        return jsonify({'error': 'email is required'}), 400

    try:
        response = (
            supabase.table('user_notes')
            .delete()
            .eq('id', note_id)
            .eq('owner_email', owner_email)
            .execute()
        )
        if not (response.data or []):
            return jsonify({'error': 'Note not found'}), 404
        return jsonify({'message': 'Note deleted'}), 200
    except Exception as e:
        if _missing_table(e):
            return jsonify({'error': 'user_notes table not found — run migrations/user_notes.sql'}), 503
        if _missing_column(e):
            return jsonify({'error': MIGRATION_HINT}), 503
        return jsonify({'error': str(e)}), 500
