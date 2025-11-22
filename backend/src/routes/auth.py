from flask import Blueprint, request, jsonify
from src.models.user import db, User
import hashlib
import jwt
import datetime
import os

auth_bp = Blueprint('auth', __name__)

SECRET_KEY = os.environ.get('SECRET_KEY', 'dchat-secret-key')

@auth_bp.route('/connect-wallet', methods=['POST'])
def connect_wallet():
    """钱包连接登录"""
    try:
        data = request.get_json()
        wallet_address = data.get('wallet_address')
        signature = data.get('signature')
        
        if not wallet_address:
            return jsonify({'error': '钱包地址不能为空'}), 400
        
        # 查找或创建用户
        user = User.query.filter_by(wallet_address=wallet_address).first()
        if not user:
            user = User(
                wallet_address=wallet_address,
                name=f'用户{wallet_address[-6:]}',
                company='',
                position='',
                linkedin_id=None
            )
            db.session.add(user)
            db.session.commit()
        
        # 生成JWT token
        token = jwt.encode({
            'user_id': user.id,
            'wallet_address': wallet_address,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user.id,
                'wallet_address': user.wallet_address,
                'name': user.name,
                'company': user.company,
                'position': user.position,
                'linkedin_id': user.linkedin_id
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """验证JWT token"""
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': '未提供认证token'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload['user_id']
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': '用户不存在'}), 404
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'wallet_address': user.wallet_address,
                'name': user.name,
                'company': user.company,
                'position': user.position,
                'linkedin_id': user.linkedin_id
            }
        })
        
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token已过期'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': '无效的token'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/update-profile', methods=['PUT'])
def update_profile():
    """更新用户资料"""
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': '未提供认证token'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload['user_id']
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': '用户不存在'}), 404
        
        data = request.get_json()
        
        # 更新用户信息
        if 'name' in data:
            user.name = data['name']
        if 'company' in data:
            user.company = data['company']
        if 'position' in data:
            user.position = data['position']
        if 'linkedin_id' in data:
            user.linkedin_id = data['linkedin_id']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'wallet_address': user.wallet_address,
                'name': user.name,
                'company': user.company,
                'position': user.position,
                'linkedin_id': user.linkedin_id
            }
        })
        
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token已过期'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': '无效的token'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@auth_bp.route('/register', methods=['POST'])
def register():
    """Email/Password Registration"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password')
        username = data.get('username', '').strip()
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400
        
        # Validate email format
        import re
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, email):
            return jsonify({'success': False, 'error': 'Invalid email format'}), 400
        
        # Validate password length
        if len(password) < 8:
            return jsonify({'success': False, 'error': 'Password must be at least 8 characters long'}), 400
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'success': False, 'error': 'Email already registered'}), 400
        
        # Create new user
        user = User(
            email=email,
            username=username or email.split('@')[0],
            name=username or email.split('@')[0],
            wallet_address=None,
            company='',
            position='',
            linkedin_id=None
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # Generate JWT token
        token = jwt.encode({
            'user_id': user.id,
            'email': email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'name': user.name
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Email/Password Login"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 400
        
        # Generate JWT token
        token = jwt.encode({
            'user_id': user.id,
            'email': email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'name': user.name,
                'wallet_address': user.wallet_address
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
