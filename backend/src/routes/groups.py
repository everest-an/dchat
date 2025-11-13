"""
群组管理路由
处理群组创建、成员管理、群组消息等功能
"""

from flask import Blueprint, request, jsonify
from src.models.user import db, User
from src.middleware.auth_middleware import require_auth
from src.middleware.security_middleware import rate_limit, sanitize_input
import datetime
import json

# Enhanced middleware for production
from ..middleware.auth import require_auth, optional_auth, require_role
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError



groups_bp = Blueprint('groups', __name__)

# 简化实现：使用内存存储群组数据（生产环境应使用数据库）
groups_store = {}
group_messages_store = {}

@groups_bp.route('/create', methods=['POST'])
@require_auth
@rate_limit(max_requests=10, window_seconds=60)
def create_group():@handle_errors
@groups_bp.route('/create', methods=['POST'])
@require_auth
@rate_limit(max_requests=10, window_seconds=60)

    """创建群组"""
    try:
        data = request.get_json()
        
        # 验证必需字段
        name = data.get('name')
        if not name:
            return jsonify({
                'success': False,
                'error': '群组名称不能为空'
            }), 400
        
        # 清理输入
        name = sanitize_input(name, max_length=100)
        description = sanitize_input(data.get('description', ''), max_length=500)
        
        # 获取成员列表
        members = data.get('members', [])
        if not isinstance(members, list):
            return jsonify({
                'success': False,
                'error': '成员列表格式错误'
            }), 400
        
        # 创建群组ID
        group_id = f"group_{int(datetime.datetime.utcnow().timestamp() * 1000)}"
        
        # 创建群组数据
        group = {
            'id': group_id,
            'name': name,
            'description': description,
            'created_by': request.user_id,
            'created_at': datetime.datetime.utcnow().isoformat(),
            'members': [
                {
                    'user_id': request.user_id,
                    'role': 'admin',
                    'joined_at': datetime.datetime.utcnow().isoformat()
                }
            ]
        }
        
        # 添加其他成员
        for member_data in members:
            if isinstance(member_data, dict) and 'user_id' in member_data:
                group['members'].append({
                    'user_id': member_data['user_id'],
                    'role': 'member',
                    'joined_at': datetime.datetime.utcnow().isoformat()
                })
        
        # 保存群组
        groups_store[group_id] = group
        group_messages_store[group_id] = []
        
        return jsonify({
            'success': True,
            'group': group
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'创建群组失败: {str(e)}'
        }), 500

@groups_bp.route('/<group_id>', methods=['GET'])
@require_auth
def get_group(group_id):@handle_errors
@groups_bp.route('/<group_id>', methods=['GET'])
@require_auth

    """获取群组信息"""
    try:
        group = groups_store.get(group_id)
        
        if not group:
            return jsonify({
                'success': False,
                'error': '群组不存在'
            }), 404
        
        # 验证用户是否是群组成员
        is_member = any(
            member['user_id'] == request.user_id
            for member in group['members']
        )
        
        if not is_member:
            return jsonify({
                'success': False,
                'error': '无权访问该群组'
            }), 403
        
        # 获取成员详细信息
        members_with_details = []
        for member in group['members']:
            user = User.query.get(member['user_id'])
            if user:
                members_with_details.append({
                    'user_id': member['user_id'],
                    'role': member['role'],
                    'joined_at': member['joined_at'],
                    'name': user.name,
                    'wallet_address': user.wallet_address
                })
        
        group_with_details = {
            **group,
            'members': members_with_details
        }
        
        return jsonify({
            'success': True,
            'group': group_with_details
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'获取群组信息失败: {str(e)}'
        }), 500

@groups_bp.route('/<group_id>/messages', methods=['GET'])
@require_auth
def get_group_messages(group_id):@handle_errors
@groups_bp.route('/<group_id>/messages', methods=['GET'])
@require_auth

    """获取群组消息"""
    try:
        group = groups_store.get(group_id)
        
        if not group:
            return jsonify({
                'success': False,
                'error': '群组不存在'
            }), 404
        
        # 验证用户是否是群组成员
        is_member = any(
            member['user_id'] == request.user_id
            for member in group['members']
        )
        
        if not is_member:
            return jsonify({
                'success': False,
                'error': '无权访问该群组'
            }), 403
        
        messages = group_messages_store.get(group_id, [])
        
        return jsonify({
            'success': True,
            'messages': messages
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'获取群组消息失败: {str(e)}'
        }), 500

@groups_bp.route('/<group_id>/messages', methods=['POST'])
@require_auth
@rate_limit(max_requests=30, window_seconds=60)
def send_group_message(group_id):@handle_errors
@groups_bp.route('/<group_id>/messages', methods=['POST'])
@require_auth
@rate_limit(max_requests=30, window_seconds=60)

    """发送群组消息"""
    try:
        group = groups_store.get(group_id)
        
        if not group:
            return jsonify({
                'success': False,
                'error': '群组不存在'
            }), 404
        
        # 验证用户是否是群组成员
        is_member = any(
            member['user_id'] == request.user_id
            for member in group['members']
        )
        
        if not is_member:
            return jsonify({
                'success': False,
                'error': '无权在该群组发送消息'
            }), 403
        
        data = request.get_json()
        content = data.get('content')
        
        if not content:
            return jsonify({
                'success': False,
                'error': '消息内容不能为空'
            }), 400
        
        # 清理输入
        content = sanitize_input(content, max_length=5000)
        
        # 获取发送者信息
        sender = User.query.get(request.user_id)
        
        # 创建消息
        message = {
            'id': f"msg_{int(datetime.datetime.utcnow().timestamp() * 1000)}",
            'group_id': group_id,
            'sender_id': request.user_id,
            'sender_name': sender.name if sender else 'Unknown',
            'content': content,
            'message_type': data.get('message_type', 'text'),
            'timestamp': datetime.datetime.utcnow().isoformat()
        }
        
        # 保存消息
        if group_id not in group_messages_store:
            group_messages_store[group_id] = []
        
        group_messages_store[group_id].append(message)
        
        return jsonify({
            'success': True,
            'message': message
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'发送消息失败: {str(e)}'
        }), 500

@groups_bp.route('/<group_id>/members', methods=['POST'])
@require_auth
@rate_limit(max_requests=10, window_seconds=60)
def add_group_member(group_id):@handle_errors
@groups_bp.route('/<group_id>/members', methods=['POST'])
@require_auth
@rate_limit(max_requests=10, window_seconds=60)

    """添加群组成员"""
    try:
        group = groups_store.get(group_id)
        
        if not group:
            return jsonify({
                'success': False,
                'error': '群组不存在'
            }), 404
        
        # 验证用户是否是管理员
        user_role = None
        for member in group['members']:
            if member['user_id'] == request.user_id:
                user_role = member['role']
                break
        
        if user_role != 'admin':
            return jsonify({
                'success': False,
                'error': '只有管理员可以添加成员'
            }), 403
        
        data = request.get_json()
        new_member_id = data.get('user_id')
        
        if not new_member_id:
            return jsonify({
                'success': False,
                'error': '用户ID不能为空'
            }), 400
        
        # 检查用户是否已经是成员
        is_already_member = any(
            member['user_id'] == new_member_id
            for member in group['members']
        )
        
        if is_already_member:
            return jsonify({
                'success': False,
                'error': '用户已经是群组成员'
            }), 400
        
        # 验证用户存在
        user = User.query.get(new_member_id)
        if not user:
            return jsonify({
                'success': False,
                'error': '用户不存在'
            }), 404
        
        # 添加成员
        new_member = {
            'user_id': new_member_id,
            'role': 'member',
            'joined_at': datetime.datetime.utcnow().isoformat()
        }
        
        group['members'].append(new_member)
        
        return jsonify({
            'success': True,
            'member': {
                **new_member,
                'name': user.name,
                'wallet_address': user.wallet_address
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'添加成员失败: {str(e)}'
        }), 500

@groups_bp.route('/<group_id>/members/<int:member_id>', methods=['DELETE'])
@require_auth
@rate_limit(max_requests=10, window_seconds=60)
def remove_group_member(group_id, member_id):@handle_errors
@groups_bp.route('/<group_id>/members/<int:member_id>', methods=['DELETE'])
@require_auth
@rate_limit(max_requests=10, window_seconds=60)

    """移除群组成员"""
    try:
        group = groups_store.get(group_id)
        
        if not group:
            return jsonify({
                'success': False,
                'error': '群组不存在'
            }), 404
        
        # 验证用户是否是管理员或移除自己
        user_role = None
        for member in group['members']:
            if member['user_id'] == request.user_id:
                user_role = member['role']
                break
        
        if user_role != 'admin' and request.user_id != member_id:
            return jsonify({
                'success': False,
                'error': '只有管理员可以移除其他成员'
            }), 403
        
        # 移除成员
        group['members'] = [
            member for member in group['members']
            if member['user_id'] != member_id
        ]
        
        return jsonify({
            'success': True,
            'message': '成员已移除'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'移除成员失败: {str(e)}'
        }), 500

@groups_bp.route('/list', methods=['GET'])
@require_auth
def list_user_groups():@handle_errors
@groups_bp.route('/list', methods=['GET'])
@require_auth

    """获取用户的群组列表"""
    try:
        user_groups = []
        
        for group_id, group in groups_store.items():
            # 检查用户是否是成员
            is_member = any(
                member['user_id'] == request.user_id
                for member in group['members']
            )
            
            if is_member:
                # 获取最后一条消息
                messages = group_messages_store.get(group_id, [])
                last_message = messages[-1] if messages else None
                
                user_groups.append({
                    'id': group['id'],
                    'name': group['name'],
                    'description': group['description'],
                    'member_count': len(group['members']),
                    'last_message': last_message,
                    'created_at': group['created_at']
                })
        
        # 按创建时间排序
        user_groups.sort(key=lambda x: x['created_at'], reverse=True)
        
        return jsonify({
            'success': True,
            'groups': user_groups
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'获取群组列表失败: {str(e)}'
        }), 500
