from flask import Blueprint, request, jsonify
from src.models.user import db, User
from src.models.message import Message
import jwt
import datetime
import os

messages_bp = Blueprint('messages', __name__)

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

@messages_bp.route('/conversations', methods=['GET'])
def get_conversations():
    """获取用户的对话列表"""
    try:
        token = request.headers.get('Authorization')
        user_id, error = verify_token_helper(token)
        if error:
            return jsonify({'error': error}), 401
        
        # 获取用户参与的所有对话
        conversations = db.session.query(Message).filter(
            (Message.sender_id == user_id) | (Message.receiver_id == user_id)
        ).order_by(Message.timestamp.desc()).all()
        
        # 按对话分组并获取最新消息
        conversation_dict = {}
        for msg in conversations:
            other_user_id = msg.receiver_id if msg.sender_id == user_id else msg.sender_id
            if other_user_id not in conversation_dict:
                other_user = User.query.get(other_user_id)
                conversation_dict[other_user_id] = {
                    'user': {
                        'id': other_user.id,
                        'name': other_user.name,
                        'company': other_user.company,
                        'wallet_address': other_user.wallet_address
                    },
                    'last_message': {
                        'id': msg.id,
                        'content': msg.content,
                        'timestamp': msg.timestamp.isoformat(),
                        'sender_id': msg.sender_id
                    },
                    'unread_count': 0  # 简化处理，实际应该计算未读数量
                }
        
        return jsonify({
            'success': True,
            'conversations': list(conversation_dict.values())
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/conversations/<int:user_id>', methods=['GET'])
def get_conversation_messages(user_id):
    """获取与特定用户的对话消息"""
    try:
        token = request.headers.get('Authorization')
        current_user_id, error = verify_token_helper(token)
        if error:
            return jsonify({'error': error}), 401
        
        # 获取两个用户之间的所有消息
        messages = Message.query.filter(
            ((Message.sender_id == current_user_id) & (Message.receiver_id == user_id)) |
            ((Message.sender_id == user_id) & (Message.receiver_id == current_user_id))
        ).order_by(Message.timestamp.asc()).all()
        
        # 获取对方用户信息
        other_user = User.query.get(user_id)
        if not other_user:
            return jsonify({'error': '用户不存在'}), 404
        
        message_list = []
        for msg in messages:
            message_list.append({
                'id': msg.id,
                'content': msg.content,
                'sender_id': msg.sender_id,
                'receiver_id': msg.receiver_id,
                'timestamp': msg.timestamp.isoformat(),
                'message_type': msg.message_type
            })
        
        return jsonify({
            'success': True,
            'user': {
                'id': other_user.id,
                'name': other_user.name,
                'company': other_user.company,
                'wallet_address': other_user.wallet_address
            },
            'messages': message_list
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/send', methods=['POST'])
def send_message():
    """发送消息"""
    try:
        token = request.headers.get('Authorization')
        sender_id, error = verify_token_helper(token)
        if error:
            return jsonify({'error': error}), 401
        
        data = request.get_json()
        receiver_id = data.get('receiver_id')
        content = data.get('content')
        message_type = data.get('message_type', 'text')
        
        if not receiver_id or not content:
            return jsonify({'error': '接收者ID和消息内容不能为空'}), 400
        
        # 验证接收者存在
        receiver = User.query.get(receiver_id)
        if not receiver:
            return jsonify({'error': '接收者不存在'}), 404
        
        # 创建消息
        message = Message(
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
            message_type=message_type,
            timestamp=datetime.datetime.utcnow()
        )
        
        db.session.add(message)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': {
                'id': message.id,
                'content': message.content,
                'sender_id': message.sender_id,
                'receiver_id': message.receiver_id,
                'timestamp': message.timestamp.isoformat(),
                'message_type': message.message_type
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/encrypt', methods=['POST'])
def encrypt_message():
    """端到端加密消息（模拟）"""
    try:
        data = request.get_json()
        content = data.get('content')
        public_key = data.get('public_key')
        
        if not content or not public_key:
            return jsonify({'error': '消息内容和公钥不能为空'}), 400
        
        # 这里应该实现真正的端到端加密
        # 为了演示，我们只是简单地返回base64编码的内容
        import base64
        encrypted_content = base64.b64encode(content.encode()).decode()
        
        return jsonify({
            'success': True,
            'encrypted_content': encrypted_content
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/decrypt', methods=['POST'])
def decrypt_message():
    """解密消息（模拟）"""
    try:
        data = request.get_json()
        encrypted_content = data.get('encrypted_content')
        private_key = data.get('private_key')
        
        if not encrypted_content or not private_key:
            return jsonify({'error': '加密内容和私钥不能为空'}), 400
        
        # 这里应该实现真正的解密
        # 为了演示，我们只是简单地base64解码
        import base64
        try:
            decrypted_content = base64.b64decode(encrypted_content.encode()).decode()
        except:
            return jsonify({'error': '解密失败'}), 400
        
        return jsonify({
            'success': True,
            'decrypted_content': decrypted_content
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

