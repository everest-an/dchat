from flask import Blueprint, request, jsonify
from src.models.user import db, User
from src.models.project import Project, Moment
import jwt
import json
import os

projects_bp = Blueprint('projects', __name__)

SECRET_KEY = os.environ.get('SECRET_KEY', 'dchat-secret-key')

def verify_token_helper(token):
    """验证token的辅助函数"""
    if not token:
        return None, 'Token不能为空'
    
    if token.startswith('Bearer '):
        token = token[7:]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id'], None
    except jwt.ExpiredSignatureError:
        return None, 'Token已过期'
    except jwt.InvalidTokenError:
        return None, '无效的token'

@projects_bp.route('/projects', methods=['GET'])
def get_projects():
    """获取项目列表"""
    try:
        token = request.headers.get('Authorization')
        user_id, error = verify_token_helper(token)
        if error:
            return jsonify({'error': error}), 401
        
        project_type = request.args.get('type', 'all')
        
        query = Project.query.filter_by(user_id=user_id)
        if project_type != 'all':
            query = query.filter_by(project_type=project_type)
        
        projects = query.order_by(Project.updated_at.desc()).all()
        
        return jsonify({
            'success': True,
            'projects': [project.to_dict() for project in projects]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/projects', methods=['POST'])
def create_project():
    """创建新项目"""
    try:
        token = request.headers.get('Authorization')
        user_id, error = verify_token_helper(token)
        if error:
            return jsonify({'error': error}), 401
        
        data = request.get_json()
        
        project = Project(
            user_id=user_id,
            title=data.get('title'),
            description=data.get('description'),
            project_type=data.get('project_type'),
            status=data.get('status', 'active'),
            progress=data.get('progress', 0),
            budget=data.get('budget'),
            deadline=data.get('deadline'),
            team_size=data.get('team_size'),
            requirements=json.dumps(data.get('requirements', [])),
            tags=json.dumps(data.get('tags', []))
        )
        
        db.session.add(project)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'project': project.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    """更新项目"""
    try:
        token = request.headers.get('Authorization')
        user_id, error = verify_token_helper(token)
        if error:
            return jsonify({'error': error}), 401
        
        project = Project.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({'error': '项目不存在'}), 404
        
        data = request.get_json()
        
        # 更新项目字段
        for field in ['title', 'description', 'status', 'progress', 'budget', 'deadline', 'team_size']:
            if field in data:
                setattr(project, field, data[field])
        
        if 'requirements' in data:
            project.requirements = json.dumps(data['requirements'])
        if 'tags' in data:
            project.tags = json.dumps(data['tags'])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'project': project.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/moments', methods=['GET'])
def get_moments():
    """获取朋友圈动态"""
    try:
        token = request.headers.get('Authorization')
        user_id, error = verify_token_helper(token)
        if error:
            return jsonify({'error': error}), 401
        
        # 获取所有用户的动态（简化处理，实际应该根据关注关系）
        moments = Moment.query.order_by(Moment.created_at.desc()).limit(50).all()
        
        return jsonify({
            'success': True,
            'moments': [moment.to_dict() for moment in moments]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/moments', methods=['POST'])
def create_moment():
    """发布朋友圈动态"""
    try:
        token = request.headers.get('Authorization')
        user_id, error = verify_token_helper(token)
        if error:
            return jsonify({'error': error}), 401
        
        data = request.get_json()
        
        moment = Moment(
            user_id=user_id,
            content=data.get('content'),
            moment_type=data.get('moment_type'),
            media_url=data.get('media_url')
        )
        
        db.session.add(moment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'moment': moment.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/moments/<int:moment_id>/like', methods=['POST'])
def like_moment(moment_id):
    """点赞动态"""
    try:
        token = request.headers.get('Authorization')
        user_id, error = verify_token_helper(token)
        if error:
            return jsonify({'error': error}), 401
        
        moment = Moment.query.get(moment_id)
        if not moment:
            return jsonify({'error': '动态不存在'}), 404
        
        # 简化处理，直接增加点赞数
        moment.likes_count += 1
        db.session.commit()
        
        return jsonify({
            'success': True,
            'likes_count': moment.likes_count
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

