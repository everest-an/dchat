"""
LinkedIn OAuth 2.0 认证路由
实现完整的LinkedIn登录和资料同步功能
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from src.models.user import User, db
from src.middleware.auth import require_auth, optional_auth
from src.middleware.error_handler import handle_errors, validate_request_json, ValidationError
import requests
import jwt
import datetime
import os
import logging

logger = logging.getLogger(__name__)

linkedin_bp = APIRouter(prefix="/auth/linkedin", tags=["LinkedIn OAuth"])

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


@linkedin_bp.get('/auth-url')
async def get_auth_url():
    """
    获取LinkedIn OAuth授权URL
    
    Returns:
        JSON with authorization URL and state parameter
    """
    try:
        if not LINKEDIN_CLIENT_ID or not LINKEDIN_CLIENT_SECRET:
            raise ValidationError("LinkedIn credentials not configured")
        
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
        
        return {
            'success': True,
            'auth_url': auth_url,
            'state': state
        }
        
    except Exception as e:
        logger.error(f"Error generating auth URL: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to generate authorization URL: {str(e)}'
        )


@linkedin_bp.get('/callback')
async def linkedin_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: str = Query(None)
):
    """
    LinkedIn OAuth回调处理
    
    Query Parameters:
        code: Authorization code from LinkedIn
        state: State parameter for CSRF validation
        error: Error message if authorization failed
    
    Returns:
        Redirect to frontend with JWT token
    """
    try:
        if error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'LinkedIn authorization failed: {error}'
            )
        
        if not code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Authorization code is missing'
            )
        
        # 验证state参数
        try:
            jwt.decode(state, SECRET_KEY, algorithms=['HS256'])
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Invalid state parameter'
            )
        
        # 交换访问令牌
        token_response = requests.post(LINKEDIN_TOKEN_URL, data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': LINKEDIN_REDIRECT_URI,
            'client_id': LINKEDIN_CLIENT_ID,
            'client_secret': LINKEDIN_CLIENT_SECRET
        })
        
        if token_response.status_code != 200:
            logger.error(f"Failed to get access token: {token_response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Failed to obtain access token'
            )
        
        token_data = token_response.json()
        access_token = token_data.get('access_token')
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Access token is empty'
            )
        
        # 获取用户资料
        profile_data = await get_linkedin_profile(access_token)
        
        if not profile_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Failed to retrieve user profile'
            )
        
        # 查找或创建用户
        linkedin_id = profile_data.get('id')
        user = db.session.query(User).filter_by(linkedin_id=linkedin_id).first()
        
        if not user:
            # 创建新用户 - 需要wallet_address
            # 为了支持LinkedIn-only登录，我们生成一个临时的钱包地址
            temp_wallet = f"linkedin_{linkedin_id}"
            user = User(
                wallet_address=temp_wallet,
                linkedin_id=linkedin_id,
                name=profile_data.get('name', ''),
                company=profile_data.get('company', ''),
                position=profile_data.get('position', '')
            )
            db.session.add(user)
            db.session.commit()
        else:
            # 更新现有用户资料
            user.name = profile_data.get('name', user.name)
            user.company = profile_data.get('company', user.company)
            user.position = profile_data.get('position', user.position)
            db.session.commit()
        
        # 生成JWT token
        token = jwt.encode({
            'user_id': user.id,
            'wallet_address': user.wallet_address,
            'linkedin_id': linkedin_id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
        }, SECRET_KEY, algorithm='HS256')
        
        # 重定向到前端，带上token
        return RedirectResponse(
            url=f"https://dchat.pro/auth/linkedin/success?token={token}",
            status_code=status.HTTP_302_FOUND
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in LinkedIn callback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'LinkedIn callback processing failed: {str(e)}'
        )


@linkedin_bp.get('/profile')
async def get_profile(
    current_user: dict = Depends(require_auth)
):
    """
    获取当前用户的LinkedIn资料
    
    Returns:
        JSON with user profile information
    """
    try:
        user_id = current_user.get('user_id')
        user = db.session.query(User).filter_by(id=user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='User not found'
            )
        
        return {
            'success': True,
            'profile': {
                'id': user.id,
                'wallet_address': user.wallet_address,
                'linkedin_id': user.linkedin_id,
                'name': user.name,
                'company': user.company,
                'position': user.position,
                'is_linked': user.linkedin_id is not None,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'updated_at': user.updated_at.isoformat() if user.updated_at else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to retrieve profile: {str(e)}'
        )


@linkedin_bp.post('/sync')
async def sync_profile(
    current_user: dict = Depends(require_auth)
):
    """
    手动同步LinkedIn资料
    
    Note: This requires re-authorization with LinkedIn to obtain a fresh access token.
    
    Returns:
        JSON with sync status
    """
    try:
        user_id = current_user.get('user_id')
        user = db.session.query(User).filter_by(id=user_id).first()
        
        if not user or not user.linkedin_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='User is not linked to LinkedIn account'
            )
        
        # 为了支持完整的同步，需要存储LinkedIn access token
        # 当前简化实现：返回需要重新授权的提示
        return {
            'success': False,
            'message': 'LinkedIn re-authorization required for profile sync',
            'auth_required': True,
            'auth_url': f'/auth/linkedin/auth-url'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to sync profile: {str(e)}'
        )


@linkedin_bp.post('/unlink')
async def unlink_linkedin(
    current_user: dict = Depends(require_auth)
):
    """
    解除LinkedIn账号绑定
    
    Returns:
        JSON with unlink status
    """
    try:
        user_id = current_user.get('user_id')
        user = db.session.query(User).filter_by(id=user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='User not found'
            )
        
        # 清除LinkedIn相关信息
        user.linkedin_id = None
        db.session.commit()
        
        return {
            'success': True,
            'message': 'LinkedIn account has been unlinked'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unlinking LinkedIn: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to unlink LinkedIn account: {str(e)}'
        )


async def get_linkedin_profile(access_token: str) -> dict:
    """
    获取LinkedIn用户资料
    
    Args:
        access_token: LinkedIn访问令牌
        
    Returns:
        dict: 用户资料数据，包括id、name、email、company、position
    """
    try:
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json'
        }
        
        # 获取基本资料
        profile_response = requests.get(LINKEDIN_PROFILE_URL, headers=headers, timeout=10)
        
        if profile_response.status_code != 200:
            logger.error(f"Failed to get LinkedIn profile: {profile_response.status_code}")
            return None
        
        profile_data = profile_response.json()
        
        # 获取邮箱
        email = None
        try:
            email_response = requests.get(LINKEDIN_EMAIL_URL, headers=headers, timeout=10)
            
            if email_response.status_code == 200:
                email_data = email_response.json()
                elements = email_data.get('elements', [])
                if elements:
                    email = elements[0].get('handle~', {}).get('emailAddress')
        except Exception as e:
            logger.warning(f"Failed to get LinkedIn email: {str(e)}")
        
        # 组合数据
        return {
            'id': profile_data.get('id'),
            'name': f"{profile_data.get('localizedFirstName', '')} {profile_data.get('localizedLastName', '')}".strip(),
            'email': email,
            'company': '',  # LinkedIn API v2需要额外权限获取公司信息
            'position': ''  # LinkedIn API v2需要额外权限获取职位信息
        }
        
    except Exception as e:
        logger.error(f"Error retrieving LinkedIn profile: {str(e)}")
        return None
