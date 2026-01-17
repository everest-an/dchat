from flask import Blueprint, request, jsonify
from src.models.user import db, User
from web3 import Web3
from eth_account.messages import encode_defunct
import hashlib
import jwt
import datetime
import os
import secrets
import time
from src.config.redis_config import redis_service

auth_bp = Blueprint('auth', __name__)

SECRET_KEY = os.environ.get('SECRET_KEY', 'dchat-secret-key')

# Nonce now stored in Redis (automatic expiration)

@auth_bp.route('/nonce', methods=['GET'])
def get_nonce():
    """获取登录 nonce"""
    try:
        address = request.args.get('address')
        
        if not address:
            return jsonify({'success': False, 'error': '地址不能为空'}), 400
        
        # 验证地址格式
        if not Web3.is_address(address):
            return jsonify({'success': False, 'error': '无效的以太坊地址'}), 400
        
        # 生成新的 nonce
        nonce = secrets.token_hex(16)
        timestamp = int(time.time())
        
        # Store in Redis with 5 minute expiration
        nonce_data = {
            'nonce': nonce,
            'timestamp': timestamp
        }
        redis_service.set(f'nonce:{address.lower()}', nonce_data, expire=300)
        
        return jsonify({
            'success': True,
            'nonce': nonce,
            'timestamp': timestamp,
            'message': f'Sign in to Dchat\n\nNonce: {nonce}\nTimestamp: {timestamp}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def verify_signature(address, signature):
    """验证 Web3 签名"""
    try:
        # 1. Get nonce from Redis
        nonce_data = redis_service.get(f'nonce:{address.lower()}')
        if not nonce_data:
            return False, 'Nonce not found or expired. Please request a new nonce.'
        
        # 3. 构造签名消息
        message = f"Sign in to Dchat\n\nNonce: {nonce_data['nonce']}\nTimestamp: {nonce_data['timestamp']}\n\nThis request will not trigger a blockchain transaction or cost any gas fees."
        encoded_message = encode_defunct(text=message)
        
        # 4. 恢复签名者地址
        w3 = Web3()
        recovered_address = w3.eth.account.recover_message(
            encoded_message,
            signature=signature
        )
        
        # 5. 验证地址是否匹配（不区分大小写）
        if recovered_address.lower() != address.lower():
            return False, f'Signature verification failed. Expected {address}, got {recovered_address}'
        
        # 6. Delete used nonce from Redis (prevent replay attacks)
        redis_service.delete(f'nonce:{address.lower()}')
        
        return True, 'Signature verified successfully'
        
    except Exception as e:
        return False, f'Signature verification error: {str(e)}'

@auth_bp.route('/connect-wallet', methods=['POST'])
def connect_wallet():
    """钱包连接登录（带签名验证）"""
    try:
        data = request.get_json()
        wallet_address = data.get('wallet_address') or data.get('address')
        signature = data.get('signature')
        
        if not wallet_address:
            return jsonify({'success': False, 'error': '钱包地址不能为空'}), 400
        
        if not signature:
            return jsonify({'success': False, 'error': '签名不能为空'}), 400
        
        # 验证地址格式
        if not Web3.is_address(wallet_address):
            return jsonify({'success': False, 'error': '无效的以太坊地址'}), 400
        
        # 验证签名
        is_valid, message = verify_signature(wallet_address, signature)
        if not is_valid:
            return jsonify({'success': False, 'error': message}), 401
        
        # 规范化地址（checksum）
        wallet_address = Web3.to_checksum_address(wallet_address)
        
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
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """验证JWT token"""
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'error': '未提供认证token'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload['user_id']
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': '用户不存在'}), 404
        
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
        return jsonify({'success': False, 'error': 'Token已过期'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'success': False, 'error': '无效的token'}), 401
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/update-profile', methods=['PUT'])
def update_profile():
    """更新用户资料"""
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'error': '未提供认证token'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload['user_id']
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': '用户不存在'}), 404
        
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
        if 'public_key' in data:
            user.public_key = data['public_key']
        
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
        return jsonify({'success': False, 'error': 'Token已过期'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'success': False, 'error': '无效的token'}), 401
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/register-public-key', methods=['POST'])
def register_public_key():
    """注册用户公钥（用于端到端加密）"""
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'error': '未提供认证token'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload['user_id']
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': '用户不存在'}), 404
        
        data = request.get_json()
        public_key = data.get('public_key')
        
        if not public_key:
            return jsonify({'success': False, 'error': '公钥不能为空'}), 400
        
        user.public_key = public_key
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '公钥注册成功'
        })
        
    except jwt.ExpiredSignatureError:
        return jsonify({'success': False, 'error': 'Token已过期'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'success': False, 'error': '无效的token'}), 401
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/public-key/<wallet_address>', methods=['GET'])
def get_public_key(wallet_address):
    """获取用户公钥"""
    try:
        if not Web3.is_address(wallet_address):
            return jsonify({'success': False, 'error': '无效的以太坊地址'}), 400
        
        wallet_address = Web3.to_checksum_address(wallet_address)
        user = User.query.filter_by(wallet_address=wallet_address).first()
        
        if not user:
            return jsonify({'success': False, 'error': '用户不存在'}), 404
        
        if not user.public_key:
            return jsonify({'success': False, 'error': '用户未注册公钥'}), 404
        
        return jsonify({
            'success': True,
            'public_key': user.public_key,
            'wallet_address': user.wallet_address
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
