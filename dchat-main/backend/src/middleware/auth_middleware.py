"""
认证中间件
提供JWT token验证和用户认证功能
"""

from functools import wraps
from flask import request, jsonify
import jwt
import os

SECRET_KEY = os.environ.get('SECRET_KEY', 'dchat-secret-key')

def verify_token(token):
    """
    验证JWT token
    
    Args:
        token: JWT token字符串
        
    Returns:
        tuple: (user_id, error_message)
    """
    if not token:
        return None, 'Token不能为空'
    
    # 移除Bearer前缀
    if token.startswith('Bearer '):
        token = token[7:]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload.get('user_id'), None
    except jwt.ExpiredSignatureError:
        return None, 'Token已过期'
    except jwt.InvalidTokenError:
        return None, '无效的token'
    except Exception as e:
        return None, f'Token验证失败: {str(e)}'

def require_auth(f):
    """
    装饰器：要求请求必须包含有效的认证token
    
    使用方法:
        @require_auth
        def protected_route():
            user_id = request.user_id  # 可以通过request.user_id获取当前用户ID
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        user_id, error = verify_token(token)
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 401
        
        # 将user_id添加到request对象中，方便后续使用
        request.user_id = user_id
        
        return f(*args, **kwargs)
    
    return decorated_function

def optional_auth(f):
    """
    装饰器：可选认证，如果提供token则验证，否则继续执行
    
    使用方法:
        @optional_auth
        def public_route():
            user_id = getattr(request, 'user_id', None)  # 可能为None
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if token:
            user_id, error = verify_token(token)
            if not error:
                request.user_id = user_id
            else:
                request.user_id = None
        else:
            request.user_id = None
        
        return f(*args, **kwargs)
    
    return decorated_function
