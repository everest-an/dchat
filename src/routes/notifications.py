"""
通知管理路由
处理用户通知的创建、获取、标记已读等功能
"""

from flask import Blueprint, request, jsonify
from src.middleware.auth_middleware import require_auth
from src.middleware.security_middleware import rate_limit
import datetime

# Enhanced middleware for production
from ..middleware.auth import require_auth, optional_auth, require_role
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError



notifications_bp = Blueprint('notifications', __name__)

# 简化实现：使用内存存储通知数据（生产环境应使用数据库）
notifications_store = {}

@notifications_bp.route('/', methods=['GET'])
@require_auth
@handle_errors
def get_notifications():

    """获取用户的通知列表"""
    try:
        user_id = request.user_id
        
        # 获取用户的所有通知
        user_notifications = notifications_store.get(user_id, [])
        
        # 按时间倒序排序
        user_notifications.sort(key=lambda x: x['created_at'], reverse=True)
        
        # 分页参数
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        start = (page - 1) * per_page
        end = start + per_page
        
        paginated_notifications = user_notifications[start:end]
        
        return jsonify({
            'success': True,
            'notifications': paginated_notifications,
            'total': len(user_notifications),
            'page': page,
            'per_page': per_page,
            'unread_count': sum(1 for n in user_notifications if not n.get('is_read', False))
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'获取通知失败: {str(e)}'
        }), 500

@notifications_bp.route('/<notification_id>/read', methods=['PUT'])
@require_auth
@rate_limit(max_requests=30, window_seconds=60)
@handle_errors
def mark_notification_read(notification_id):

    """标记通知为已读"""
    try:
        user_id = request.user_id
        user_notifications = notifications_store.get(user_id, [])
        
        # 查找并更新通知
        notification_found = False
        for notification in user_notifications:
            if notification['id'] == notification_id:
                notification['is_read'] = True
                notification['read_at'] = datetime.datetime.utcnow().isoformat()
                notification_found = True
                break
        
        if not notification_found:
            return jsonify({
                'success': False,
                'error': '通知不存在'
            }), 404
        
        return jsonify({
            'success': True,
            'message': '通知已标记为已读'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'标记通知失败: {str(e)}'
        }), 500

@notifications_bp.route('/read-all', methods=['PUT'])
@require_auth
@rate_limit(max_requests=10, window_seconds=60)
@handle_errors
def mark_all_read():

    """标记所有通知为已读"""
    try:
        user_id = request.user_id
        user_notifications = notifications_store.get(user_id, [])
        
        # 更新所有未读通知
        for notification in user_notifications:
            if not notification.get('is_read', False):
                notification['is_read'] = True
                notification['read_at'] = datetime.datetime.utcnow().isoformat()
        
        return jsonify({
            'success': True,
            'message': '所有通知已标记为已读'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'标记所有通知失败: {str(e)}'
        }), 500

@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@require_auth
@rate_limit(max_requests=20, window_seconds=60)
@handle_errors
def delete_notification(notification_id):

    """删除通知"""
    try:
        user_id = request.user_id
        user_notifications = notifications_store.get(user_id, [])
        
        # 过滤掉要删除的通知
        initial_count = len(user_notifications)
        notifications_store[user_id] = [
            n for n in user_notifications
            if n['id'] != notification_id
        ]
        
        if len(notifications_store[user_id]) == initial_count:
            return jsonify({
                'success': False,
                'error': '通知不存在'
            }), 404
        
        return jsonify({
            'success': True,
            'message': '通知已删除'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'删除通知失败: {str(e)}'
        }), 500

@notifications_bp.route('/clear', methods=['DELETE'])
@require_auth
@rate_limit(max_requests=5, window_seconds=60)
@handle_errors
def clear_notifications():

    """清空所有通知"""
    try:
        user_id = request.user_id
        notifications_store[user_id] = []
        
        return jsonify({
            'success': True,
            'message': '所有通知已清空'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'清空通知失败: {str(e)}'
        }), 500

def create_notification(user_id, notification_type, title, content, data=None):
    """
    创建通知的辅助函数
    
    Args:
        user_id: 接收通知的用户ID
        notification_type: 通知类型 (message, group, payment, subscription, etc.)
        title: 通知标题
        content: 通知内容
        data: 附加数据（可选）
    
    Returns:
        dict: 创建的通知对象
    """
    notification = {
        'id': f"notif_{int(datetime.datetime.utcnow().timestamp() * 1000)}",
        'type': notification_type,
        'title': title,
        'content': content,
        'data': data or {},
        'is_read': False,
        'created_at': datetime.datetime.utcnow().isoformat(),
        'read_at': None
    }
    
    if user_id not in notifications_store:
        notifications_store[user_id] = []
    
    notifications_store[user_id].append(notification)
    
    return notification
