"""
User Profile API Routes

Provides CRUD endpoints for user profile extensions:
- Projects
- Skills
- Resources
- Seeking opportunities

@author Manus AI
@date 2025-11-05
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os
from src.models.user_profile import UserProject, UserSkill, UserResource, UserSeeking, db
from src.middleware.security_middleware import rate_limit
from datetime import datetime

# Enhanced middleware for production
from ..middleware.auth import require_auth, optional_auth, require_role
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError


user_profile_bp = Blueprint('user_profile', __name__)

JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')

# Authentication decorator
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'No authorization token provided'}), 401
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            request.user_id = payload.get('user_id')
        except:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated_function


# ============================================================================
# PROJECTS
# ============================================================================

@user_profile_bp.route('/api/profile/projects', methods=['GET'])
@require_auth
@rate_limit(max_requests=100, window_seconds=60)
def get_projects():
    """Get user's projects"""
    try:
        projects = UserProject.query.filter_by(user_id=request.user_id).all()
        return jsonify({
            'success': True,
            'projects': [p.to_dict() for p in projects]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@user_profile_bp.route('/api/profile/projects', methods=['POST'])
@require_auth
@rate_limit(max_requests=30, window_seconds=60)
def create_project():
    """Create new project"""
    try:
        data = request.json
        
        project = UserProject(
            user_id=request.user_id,
            title=data['title'],
            description=data.get('description'),
            status=data.get('status', 'In Progress'),
            progress=data.get('progress', 0),
            deadline=datetime.fromisoformat(data['deadline']) if data.get('deadline') else None
        )
        
        db.session.add(project)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'project': project.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@user_profile_bp.route('/api/profile/projects/<int:project_id>', methods=['PUT'])
@require_auth
def update_project(project_id):
    """Update project"""
    try:
        project = UserProject.query.filter_by(id=project_id, user_id=request.user_id).first()
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        data = request.json
        
        if 'title' in data:
            project.title = data['title']
        if 'description' in data:
            project.description = data['description']
        if 'status' in data:
            project.status = data['status']
        if 'progress' in data:
            project.progress = data['progress']
        if 'deadline' in data:
            project.deadline = datetime.fromisoformat(data['deadline']) if data['deadline'] else None
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'project': project.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@user_profile_bp.route('/api/profile/projects/<int:project_id>', methods=['DELETE'])
@require_auth
def delete_project(project_id):
    """Delete project"""
    try:
        project = UserProject.query.filter_by(id=project_id, user_id=request.user_id).first()
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        db.session.delete(project)
        db.session.commit()
        
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# SKILLS
# ============================================================================

@user_profile_bp.route('/api/profile/skills', methods=['GET'])
@require_auth
@rate_limit(max_requests=100, window_seconds=60)
def get_skills():
    """Get user's skills"""
    try:
        skills = UserSkill.query.filter_by(user_id=request.user_id).all()
        return jsonify({
            'success': True,
            'skills': [s.to_dict() for s in skills]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@user_profile_bp.route('/api/profile/skills', methods=['POST'])
@require_auth
@rate_limit(max_requests=30, window_seconds=60)
def create_skill():
    """Create new skill"""
    try:
        data = request.json
        
        skill = UserSkill(
            user_id=request.user_id,
            name=data['name'],
            category=data.get('category'),
            level=data.get('level', 'Intermediate'),
            years_of_experience=data.get('years_of_experience')
        )
        
        db.session.add(skill)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'skill': skill.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@user_profile_bp.route('/api/profile/skills/<int:skill_id>', methods=['PUT'])
@require_auth
def update_skill(skill_id):
    """Update skill"""
    try:
        skill = UserSkill.query.filter_by(id=skill_id, user_id=request.user_id).first()
        if not skill:
            return jsonify({'error': 'Skill not found'}), 404
        
        data = request.json
        
        if 'name' in data:
            skill.name = data['name']
        if 'category' in data:
            skill.category = data['category']
        if 'level' in data:
            skill.level = data['level']
        if 'years_of_experience' in data:
            skill.years_of_experience = data['years_of_experience']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'skill': skill.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@user_profile_bp.route('/api/profile/skills/<int:skill_id>', methods=['DELETE'])
@require_auth
def delete_skill(skill_id):
    """Delete skill"""
    try:
        skill = UserSkill.query.filter_by(id=skill_id, user_id=request.user_id).first()
        if not skill:
            return jsonify({'error': 'Skill not found'}), 404
        
        db.session.delete(skill)
        db.session.commit()
        
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# RESOURCES
# ============================================================================

@user_profile_bp.route('/api/profile/resources', methods=['GET'])
@require_auth
def get_resources():
    """Get user's resources"""
    try:
        resources = UserResource.query.filter_by(user_id=request.user_id).all()
        return jsonify({
            'success': True,
            'resources': [r.to_dict() for r in resources]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@user_profile_bp.route('/api/profile/resources', methods=['POST'])
@require_auth
def create_resource():
    """Create new resource"""
    try:
        data = request.json
        
        resource = UserResource(
            user_id=request.user_id,
            name=data['name'],
            description=data.get('description'),
            resource_type=data.get('resource_type'),
            availability=data.get('availability', 'Available')
        )
        
        db.session.add(resource)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'resource': resource.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@user_profile_bp.route('/api/profile/resources/<int:resource_id>', methods=['PUT'])
@require_auth
def update_resource(resource_id):
    """Update resource"""
    try:
        resource = UserResource.query.filter_by(id=resource_id, user_id=request.user_id).first()
        if not resource:
            return jsonify({'error': 'Resource not found'}), 404
        
        data = request.json
        
        if 'name' in data:
            resource.name = data['name']
        if 'description' in data:
            resource.description = data['description']
        if 'resource_type' in data:
            resource.resource_type = data['resource_type']
        if 'availability' in data:
            resource.availability = data['availability']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'resource': resource.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@user_profile_bp.route('/api/profile/resources/<int:resource_id>', methods=['DELETE'])
@require_auth
def delete_resource(resource_id):
    """Delete resource"""
    try:
        resource = UserResource.query.filter_by(id=resource_id, user_id=request.user_id).first()
        if not resource:
            return jsonify({'error': 'Resource not found'}), 404
        
        db.session.delete(resource)
        db.session.commit()
        
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# SEEKING
# ============================================================================

@user_profile_bp.route('/api/profile/seeking', methods=['GET'])
@require_auth
def get_seeking():
    """Get user's seeking opportunities"""
    try:
        seeking = UserSeeking.query.filter_by(user_id=request.user_id).all()
        return jsonify({
            'success': True,
            'seeking': [s.to_dict() for s in seeking]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@user_profile_bp.route('/api/profile/seeking', methods=['POST'])
@require_auth
def create_seeking():
    """Create new seeking opportunity"""
    try:
        data = request.json
        
        seeking = UserSeeking(
            user_id=request.user_id,
            title=data['title'],
            description=data.get('description'),
            category=data.get('category'),
            priority=data.get('priority', 'Medium'),
            is_active=data.get('is_active', True)
        )
        
        db.session.add(seeking)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'seeking': seeking.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@user_profile_bp.route('/api/profile/seeking/<int:seeking_id>', methods=['PUT'])
@require_auth
def update_seeking(seeking_id):
    """Update seeking opportunity"""
    try:
        seeking = UserSeeking.query.filter_by(id=seeking_id, user_id=request.user_id).first()
        if not seeking:
            return jsonify({'error': 'Seeking opportunity not found'}), 404
        
        data = request.json
        
        if 'title' in data:
            seeking.title = data['title']
        if 'description' in data:
            seeking.description = data['description']
        if 'category' in data:
            seeking.category = data['category']
        if 'priority' in data:
            seeking.priority = data['priority']
        if 'is_active' in data:
            seeking.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'seeking': seeking.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@user_profile_bp.route('/api/profile/seeking/<int:seeking_id>', methods=['DELETE'])
@require_auth
def delete_seeking(seeking_id):
    """Delete seeking opportunity"""
    try:
        seeking = UserSeeking.query.filter_by(id=seeking_id, user_id=request.user_id).first()
        if not seeking:
            return jsonify({'error': 'Seeking opportunity not found'}), 404
        
        db.session.delete(seeking)
        db.session.commit()
        
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
