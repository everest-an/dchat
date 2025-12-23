from flask import Blueprint, request, jsonify
from src.models.user import db, User
import jwt
import os

contacts_bp = Blueprint('contacts', __name__)

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

@contacts_bp.route('/check', methods=['POST'])
def check_contacts():
    """批量检测通讯录中的用户是否已注册"""
    try:
        token = request.headers.get('Authorization')
        user_id, error = verify_token_helper(token)
        if error:
            return jsonify({'error': error}), 401
        
        data = request.get_json()
        contacts = data.get('contacts', [])
        
        if not contacts:
            return jsonify({'success': True, 'matches': []})
            
        # 提取所有手机号和邮箱
        phones = [c.get('phone') for c in contacts if c.get('phone')]
        emails = [c.get('email') for c in contacts if c.get('email')]
        
        # 查询匹配的用户
        matched_users = []
        
        if phones:
            users_by_phone = User.query.filter(User.phone.in_(phones)).all()
            matched_users.extend(users_by_phone)
            
        if emails:
            users_by_email = User.query.filter(User.email.in_(emails)).all()
            matched_users.extend(users_by_email)
            
        # 去重并格式化返回结果
        unique_users = {u.id: u for u in matched_users}
        
        results = []
        for user in unique_users.values():
            # 不返回自己
            if user.id == user_id:
                continue
                
            results.append({
                'id': user.id,
                'name': user.name,
                'wallet_address': user.wallet_address,
                'avatar': user.avatar,
                'phone': user.phone, # 仅用于客户端匹配，实际显示应脱敏
                'email': user.email
            })
            
        return jsonify({
            'success': True,
            'matches': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
