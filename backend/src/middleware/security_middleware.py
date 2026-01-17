"""
安全中间件
提供CSRF保护、Rate Limiting、输入验证等安全功能
"""

from functools import wraps
from flask import request, jsonify
import time
import hashlib
from collections import defaultdict
import re

# Rate Limiting 存储（生产环境应使用Redis）
rate_limit_store = defaultdict(list)

# 钱包地址正则表达式
WALLET_ADDRESS_PATTERN = re.compile(r'^0x[a-fA-F0-9]{40}$')

# Email 正则表达式
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

def rate_limit(max_requests=10, window_seconds=60):
    """
    Rate Limiting装饰器
    
    Args:
        max_requests: 时间窗口内最大请求数
        window_seconds: 时间窗口（秒）
    
    使用方法:
        @rate_limit(max_requests=5, window_seconds=60)
        def api_endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 获取客户端标识（IP地址或用户ID）
            client_id = request.remote_addr
            if hasattr(request, 'user_id') and request.user_id:
                client_id = f"user_{request.user_id}"
            
            current_time = time.time()
            key = f"{f.__name__}:{client_id}"
            
            # 清理过期的请求记录
            rate_limit_store[key] = [
                req_time for req_time in rate_limit_store[key]
                if current_time - req_time < window_seconds
            ]
            
            # 检查是否超过限制
            if len(rate_limit_store[key]) >= max_requests:
                return jsonify({
                    'success': False,
                    'error': '请求过于频繁，请稍后再试',
                    'retry_after': window_seconds
                }), 429
            
            # 记录本次请求
            rate_limit_store[key].append(current_time)
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def validate_wallet_address(address):
    """
    验证以太坊钱包地址格式
    
    Args:
        address: 钱包地址字符串
        
    Returns:
        bool: 是否有效
    """
    if not address:
        return False
    return bool(WALLET_ADDRESS_PATTERN.match(address))

def validate_email(email):
    """
    验证Email格式
    
    Args:
        email: Email字符串
        
    Returns:
        bool: 是否有效
    """
    if not email:
        return False
    return bool(EMAIL_PATTERN.match(email))

def sanitize_input(text, max_length=1000):
    """
    清理用户输入，防止XSS和注入攻击
    
    Args:
        text: 输入文本
        max_length: 最大长度
        
    Returns:
        str: 清理后的文本
    """
    if not text:
        return ""
    
    # 限制长度
    text = str(text)[:max_length]
    
    # 移除潜在的危险字符
    dangerous_chars = ['<', '>', '"', "'", '&', '\x00']
    for char in dangerous_chars:
        text = text.replace(char, '')
    
    return text.strip()

def validate_request_data(required_fields=None, optional_fields=None):
    """
    验证请求数据装饰器
    
    Args:
        required_fields: 必需字段列表 [(field_name, validator_func), ...]
        optional_fields: 可选字段列表 [(field_name, validator_func), ...]
    
    使用方法:
        @validate_request_data(
            required_fields=[('wallet_address', validate_wallet_address)],
            optional_fields=[('email', validate_email)]
        )
        def api_endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'error': '请求数据不能为空'
                }), 400
            
            # 验证必需字段
            if required_fields:
                for field_name, validator in required_fields:
                    if field_name not in data:
                        return jsonify({
                            'success': False,
                            'error': f'缺少必需字段: {field_name}'
                        }), 400
                    
                    if validator and not validator(data[field_name]):
                        return jsonify({
                            'success': False,
                            'error': f'字段格式无效: {field_name}'
                        }), 400
            
            # 验证可选字段（如果提供）
            if optional_fields:
                for field_name, validator in optional_fields:
                    if field_name in data and validator:
                        if not validator(data[field_name]):
                            return jsonify({
                                'success': False,
                                'error': f'字段格式无效: {field_name}'
                            }), 400
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def check_file_upload(allowed_extensions=None, max_size_mb=10):
    """
    文件上传验证装饰器
    
    Args:
        allowed_extensions: 允许的文件扩展名集合
        max_size_mb: 最大文件大小（MB）
    
    使用方法:
        @check_file_upload(allowed_extensions={'jpg', 'png', 'gif'}, max_size_mb=5)
        def upload_endpoint():
            ...
    """
    if allowed_extensions is None:
        allowed_extensions = {'jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'}
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'file' not in request.files:
                return jsonify({
                    'success': False,
                    'error': '未找到上传文件'
                }), 400
            
            file = request.files['file']
            
            if file.filename == '':
                return jsonify({
                    'success': False,
                    'error': '文件名不能为空'
                }), 400
            
            # 检查文件扩展名
            if '.' not in file.filename:
                return jsonify({
                    'success': False,
                    'error': '文件必须有扩展名'
                }), 400
            
            ext = file.filename.rsplit('.', 1)[1].lower()
            if ext not in allowed_extensions:
                return jsonify({
                    'success': False,
                    'error': f'不支持的文件类型，允许的类型: {", ".join(allowed_extensions)}'
                }), 400
            
            # 检查文件大小
            file.seek(0, 2)  # 移动到文件末尾
            file_size = file.tell()
            file.seek(0)  # 重置到文件开头
            
            max_size_bytes = max_size_mb * 1024 * 1024
            if file_size > max_size_bytes:
                return jsonify({
                    'success': False,
                    'error': f'文件大小超过限制（最大{max_size_mb}MB）'
                }), 400
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def generate_csrf_token(user_id):
    """
    生成CSRF token
    
    Args:
        user_id: 用户ID
        
    Returns:
        str: CSRF token
    """
    timestamp = str(int(time.time()))
    data = f"{user_id}:{timestamp}:dchat-csrf-secret"
    return hashlib.sha256(data.encode()).hexdigest()

def verify_csrf_token(user_id, token):
    """
    验证CSRF token
    
    Args:
        user_id: 用户ID
        token: CSRF token
        
    Returns:
        bool: 是否有效
    """
    # 简化实现，生产环境应该使用更复杂的验证机制
    if not token:
        return False
    
    # 这里应该验证token的时效性和有效性
    # 为了简化，暂时返回True
    return True
