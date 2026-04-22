from flask import Blueprint

milestones_bp = Blueprint('milestones', __name__)

# Your milestone routes go here
@milestones_bp.route('/api/milestones', methods=['GET'])
def get_milestones():
    return {"message": "Milestones route working"}, 200