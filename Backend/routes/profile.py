import os
import uuid
from flask import Blueprint, jsonify, request
from utils.auth_helper import require_auth, get_current_user
from services.supabase_service import get_supabase

bp = Blueprint('profile', __name__, url_prefix='/api/profile')

AVATAR_BUCKET = 'avatars'
ALLOWED_AVATAR_TYPES = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
}
MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5MB

# 1. Remove 'OPTIONS' from methods. Keep strict_slashes=False to fix the 308 redirect.
@bp.route('', methods=['GET', 'PUT'], strict_slashes=False)
@bp.route('/', methods=['GET', 'PUT'], strict_slashes=False)
@require_auth
def manage_profile():
    # 2. Remove the if request.method == 'OPTIONS': block since Flask-CORS handles it automatically
        
    if request.method == 'GET':
        # Your GET profile logic
        return jsonify({"message": "GET route hit"}), 200

    if request.method == 'PUT':
        user_id, _ = get_current_user()
        data = request.json
        supabase = get_supabase()
        
        update_data = {}
        if 'full_name' in data:
            update_data['full_name'] = data['full_name']
        if 'phone_number' in data:
            # Change the key here to exactly match your Supabase column: 'phoneNumber'
            update_data['phoneNumber'] = data['phone_number']
            
        try:
            supabase.table('profiles').update(update_data).eq('id', user_id).execute()
            return jsonify({"message": "Profile updated successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400


@bp.route('/avatar', methods=['POST'], strict_slashes=False)
@require_auth
def upload_avatar():
    user_id, _ = get_current_user()

    if 'file' not in request.files:
        return jsonify({'error': 'No file was uploaded'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'No file was uploaded'}), 400

    content_type = file.mimetype
    ext = ALLOWED_AVATAR_TYPES.get(content_type)
    if not ext:
        return jsonify({'error': 'Unsupported image type. Use JPEG, PNG, WEBP or GIF.'}), 400

    file_bytes = file.read()
    if len(file_bytes) > MAX_AVATAR_BYTES:
        return jsonify({'error': 'Image is too large. Maximum size is 5MB.'}), 400

    # A fresh filename per upload (rather than a fixed "avatar.<ext>") so the
    # public URL changes too — browsers aggressively cache image URLs, so
    # reusing the same path would keep showing the old picture after a change.
    path = f"{user_id}/{uuid.uuid4().hex}.{ext}"

    try:
        supabase = get_supabase()
        supabase.storage.from_(AVATAR_BUCKET).upload(
            path,
            file_bytes,
            {'content-type': content_type},
        )
        public_url = supabase.storage.from_(AVATAR_BUCKET).get_public_url(path)

        supabase.table('profiles').update({'avatar_url': public_url}).eq('id', user_id).execute()

        return jsonify({'message': 'Avatar updated successfully', 'avatarUrl': public_url}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500