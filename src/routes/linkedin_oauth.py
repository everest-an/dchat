"""
LinkedIn OAuth 2.0 认证路由
实现完整的LinkedIn登录和资料同步功能
"""

from flask import Blueprint, request, jsonify, redirect
from src.models.user import db, User
from src.middleware.auth_middleware import require_auth
from src.middleware.security_middleware import rate_limit
import requests
import jwt
import datetime
import os

# Enhanced middleware for production
from ..middleware.auth import require_auth, optional_auth, require_role
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError



linkedin_bp = Blueprint('linkedin', __name__)

# LinkedIn OAuth配置
LINKEDIN_CLIENT_ID = os.environ.get('LINKEDIN_CLIENT_ID', '')
LINKEDIN_CLIENT_SECRET = os.environ.get('LINKEDIN_CLIENT_SECRET', '')
LINKEDIN_REDIRECT_URI = os.environ.get('LINKEDIN_REDIRECT_URI', 'https://dchat.pro/auth/linkedin/callback')
SECRET_KEY = os.environ.get('SECRET_KEY', 'dchat-secret-key')

# LinkedIn API端点
LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
LINKEDIN_PROFILE_URL = 'https://api.linkedin.com/v2/me'
LINKEDIN_EMAIL_URL = 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))'

@linkedin_bp.route('/auth/url', methods=['GET'])
@handle_errors
def get_auth_url():

    """
    获取LinkedIn OAuth授权URL
    """
    try:
        # 生成state参数用于防止CSRF攻击
        state = jwt.encode({
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'random': os.urandom(16).hex()
        }, SECRET_KEY, algorithm='HS256')
        
        # 构建授权URL
        params = {
            'response_type': 'code',
            'client_id': LINKEDIN_CLIENT_ID,
            'redirect_uri': LINKEDIN_REDIRECT_URI,
            'state': state,
            'scope': 'r_liteprofile r_emailaddress'
        }
        
        auth_url = f"{LINKEDIN_AUTH_URL}?{'&'.join([f'{k}={v}' for k, v in params.items()])}"
        
        return jsonify({
            'success': True,
            'auth_url': auth_url,
            'state': state
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'生成授权URL失败: {str(e)}'
        }), 500

@linkedin_bp.route('/callback', methods=['GET'])
@rate_limit(max_requests=10, window_seconds=60)
@handle_errors
def linkedin_callback():

    """
    LinkedIn OAuth回调处理
    """
    try:
        # 获取授权码和state
        code = request.args.get('code')
        state = request.args.get('state')
        error = request.args.get('error')
        
        if error:
            return jsonify({
                'success': False,
                'error': f'LinkedIn授权失败: {error}'
            }), 400
        
        if not code:
            return jsonify({
                'success': False,
                'error': '缺少授权码'
            }), 400
        
        # 验证state参数
        try:
            jwt.decode(state, SECRET_KEY, algorithms=['HS256'])
        except:
            return jsonify({
                'success': False,
                'error': '无效的state参数'
            }), 400
        
        # 交换访问令牌
        token_response = requests.post(LINKEDIN_TOKEN_URL, data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': LINKEDIN_REDIRECT_URI,
            'client_id': LINKEDIN_CLIENT_ID,
            'client_secret': LINKEDIN_CLIENT_SECRET
        })
        
        if token_response.status_code != 200:
            return jsonify({
                'success': False,
                'error': '获取访问令牌失败'
            }), 400
        
        token_data = token_response.json()
        access_token = token_data.get('access_token')
        
        if not access_token:
            return jsonify({
                'success': False,
                'error': '访问令牌为空'
            }), 400
        
        # 获取用户资料
        profile_data = get_linkedin_profile(access_token)
        
        if not profile_data:
            return jsonify({
                'success': False,
                'error': '获取用户资料失败'
            }), 400
        
        # 查找或创建用户
        linkedin_id = profile_data.get('id')
        user = User.query.filter_by(linkedin_id=linkedin_id).first()
        
        if not user:
            # 创建新用户
            user = User(
                linkedin_id=linkedin_id,
                name=profile_data.get('name', ''),
                email=profile_data.get('email', ''),
                company=profile_data.get('company', ''),
                position=profile_data.get('position', '')
            )
            db.session.add(user)
        else:
            # 更新现有用户资料
            user.name = profile_data.get('name', user.name)
            user.email = profile_data.get('email', user.email)
            user.company = profile_data.get('company', user.company)
            user.position = profile_data.get('position', user.position)
        
        db.session.commit()
        
        # 生成JWT token
        token = jwt.encode({
            'user_id': user.id,
            'linkedin_id': linkedin_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
        }, SECRET_KEY, algorithm='HS256')
        
        # 重定向到前端，带上token
        return redirect(f"https://dchat.pro/auth/linkedin/success?token={token}")
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'LinkedIn回调处理失败: {str(e)}'
        }), 500

@linkedin_bp.route('/profile', methods=['GET'])
@require_auth
@handle_errors
def get_profile():

    """
    获取当前用户的LinkedIn资料
    """
    try:
        user_id = request.user_id
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'error': '用户不存在'
            }), 404
        
        return jsonify({
            'success': True,
            'profile': {
                'linkedin_id': user.linkedin_id,
                'name': user.name,
                'email': user.email,
                'company': user.company,
                'position': user.position,
                'is_linked': user.linkedin_id is not None
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'获取资料失败: {str(e)}'
        }), 500

@linkedin_bp.route('/sync', methods=['POST'])
@require_auth
@rate_limit(max_requests=5, window_seconds=60)
@handle_errors
def sync_profile():

    """
    手动同步LinkedIn资料
    """
    try:
        user_id = request.user_id
        user = User.query.get(user_id)
        
        if not user or not user.linkedin_id:
            return jsonify({
                'success': False,
                'error': '用户未绑定LinkedIn账号'
            }), 400
        
        # 这里需要存储LinkedIn access token以便后续同步
        # 简化实现：返回需要重新授权的提示
        return jsonify({
            'success': False,
            'error': '需要重新授权LinkedIn',
            'auth_required': True
        }), 401
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'同步资料失败: {str(e)}'
        }), 500

@linkedin_bp.route('/unlink', methods=['POST'])
@require_auth
@rate_limit(max_requests=5, window_seconds=60)
@handle_errors
def unlink_linkedin():

    """
    解除LinkedIn账号绑定
    """
    try:
        user_id = request.user_id
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'error': '用户不存在'
            }), 404
        
        # 清除LinkedIn相关信息
        user.linkedin_id = None
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'LinkedIn账号已解除绑定'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'解除绑定失败: {str(e)}'
        }), 500

def get_linkedin_profile(access_token):
    """
    获取LinkedIn用户资料
    
    Args:
        access_token: LinkedIn访问令牌
        
    Returns:
        dict: 用户资料数据
    """
    try:
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
        # 获取基本资料
        profile_response = requests.get(LINKEDIN_PROFILE_URL, headers=headers)
        
        if profile_response.status_code != 200:
            return None
        
        profile_data = profile_response.json()
        
        # 获取邮箱
        email_response = requests.get(LINKEDIN_EMAIL_URL, headers=headers)
        email = None
        
        if email_response.status_code == 200:
            email_data = email_response.json()
            elements = email_data.get('elements', [])
            if elements:
                email = elements[0].get('handle~', {}).get('emailAddress')
        
        # 组合数据
        return {
            'id': profile_data.get('id'),
            'name': f"{profile_data.get('localizedFirstName', '')} {profile_data.get('localizedLastName', '')}".strip(),
            'email': email,
            'company': '',  # LinkedIn API v2需要额外权限获取公司信息
            'position': ''  # LinkedIn API v2需要额外权限获取职位信息
        }
        
    except Exception as e:
        print(f"获取LinkedIn资料失败: {str(e)}")
        return None
