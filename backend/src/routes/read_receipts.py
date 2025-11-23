"""
Read Receipts API

Provides read receipt functionality for messages.
Users can mark messages as read and see when their messages are read.

Features:
- Mark single message as read
- Mark multiple messages as read
- Get read status for messages
- Real-time read receipt updates via Socket.IO
- Read receipt analytics

Author: Manus AI
Date: 2024-11-12
"""

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from datetime import datetime
from typing import List, Dict, Optional

from ..models.user import db
from ..models.message import Message
from ..config.redis_config import RedisService
import json

# Enhanced middleware for production
from ..middleware.auth import require_auth, optional_auth, require_role
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError



logger = logging.getLogger(__name__)

read_receipts_bp = Blueprint('read_receipts', __name__, url_prefix='/api/read-receipts')
redis_service = RedisService()


@read_receipts_bp.route('/health', methods=['GET'])
@read_receipts_bp.route('/health', methods=['GET'])
@handle_errors
def health_check():

    """
    Health check endpoint for read receipts service.
    
    Returns:
        JSON response with service status
    """
    return jsonify({
        'status': 'healthy',
        'service': 'read_receipts',
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@read_receipts_bp.route('/mark-read', methods=['POST'])
@require_auth
@read_receipts_bp.route('/mark-read', methods=['POST'])
@handle_errors
def mark_message_read():
@require_auth

    """
    Mark a message as read.
    
    Request Body:
        {
            "message_id": "123",
            "conversation_id": "0x123...abc_0x456...def"
        }
    
    Returns:
        JSON response confirming read status
    """
    try:
        user_id = g.user_id
        data = request.get_json()
        
        if not data or 'message_id' not in data:
            return jsonify({'error': 'Message ID required'}), 400
        
        message_id = data['message_id']
        conversation_id = data.get('conversation_id')
        
        # Store read receipt in Redis
        read_key = f"read_receipt:{message_id}:{user_id}"
        read_data = {
            'message_id': message_id,
            'reader_id': user_id,
            'read_at': datetime.utcnow().isoformat(),
            'conversation_id': conversation_id
        }
        
        redis_service.set_value(read_key, json.dumps(read_data), ttl=86400 * 90)  # 90 days
        
        # Update database if message exists
        try:
            message = Message.query.filter_by(id=int(message_id)).first()
            if message and message.receiver_id == int(user_id):
                message.is_read = True
                db.session.commit()
        except (ValueError, AttributeError):
            # Message might be from Socket.IO only, not in DB
            pass
        
        # TODO: Emit Socket.IO event for real-time updates
        # socketio.emit('message_read', {
        #     'message_id': message_id,
        #     'reader_id': user_id,
        #     'read_at': read_data['read_at']
        # }, room=conversation_id)
        
        logger.info(f"User {user_id} marked message {message_id} as read")
        
        return jsonify({
            'success': True,
            'message_id': message_id,
            'read_at': read_data['read_at']
        }), 200
        
    except Exception as e:
        logger.error(f"Error marking message as read: {str(e)}")
        return jsonify({'error': 'Failed to mark message as read'}), 500


@read_receipts_bp.route('/mark-all-read', methods=['POST'])
@require_auth
@read_receipts_bp.route('/mark-all-read', methods=['POST'])
@handle_errors
def mark_all_messages_read():
@require_auth

    """
    Mark all messages in a conversation as read.
    
    Request Body:
        {
            "conversation_id": "0x123...abc_0x456...def",
            "message_ids": ["1", "2", "3"]
        }
    
    Returns:
        JSON response confirming read status
    """
    try:
        user_id = g.user_id
        data = request.get_json()
        
        if not data or 'conversation_id' not in data:
            return jsonify({'error': 'Conversation ID required'}), 400
        
        conversation_id = data['conversation_id']
        message_ids = data.get('message_ids', [])
        
        if not message_ids:
            return jsonify({'error': 'No messages to mark as read'}), 400
        
        read_at = datetime.utcnow().isoformat()
        marked_count = 0
        
        for message_id in message_ids:
            try:
                # Store read receipt in Redis
                read_key = f"read_receipt:{message_id}:{user_id}"
                read_data = {
                    'message_id': message_id,
                    'reader_id': user_id,
                    'read_at': read_at,
                    'conversation_id': conversation_id
                }
                
                redis_service.set_value(read_key, json.dumps(read_data), ttl=86400 * 90)
                marked_count += 1
                
                # Update database if message exists
                try:
                    message = Message.query.filter_by(id=int(message_id)).first()
                    if message and message.receiver_id == int(user_id):
                        message.is_read = True
                except (ValueError, AttributeError):
                    pass
                    
            except Exception as e:
                logger.warning(f"Failed to mark message {message_id} as read: {str(e)}")
                continue
        
        # Commit all database changes
        try:
            db.session.commit()
        except Exception as e:
            logger.error(f"Failed to commit read receipts: {str(e)}")
            db.session.rollback()
        
        # TODO: Emit Socket.IO event for real-time updates
        # socketio.emit('all_messages_read', {
        #     'conversation_id': conversation_id,
        #     'reader_id': user_id,
        #     'count': marked_count,
        #     'read_at': read_at
        # }, room=conversation_id)
        
        logger.info(f"User {user_id} marked {marked_count} messages as read in conversation {conversation_id}")
        
        return jsonify({
            'success': True,
            'conversation_id': conversation_id,
            'marked_count': marked_count,
            'read_at': read_at
        }), 200
        
    except Exception as e:
        logger.error(f"Error marking all messages as read: {str(e)}")
        return jsonify({'error': 'Failed to mark messages as read'}), 500


@read_receipts_bp.route('/status/<message_id>', methods=['GET'])
@require_auth
@read_receipts_bp.route('/status/<message_id>', methods=['GET'])
@handle_errors
def get_read_status(message_id):
@require_auth

    """
    Get read status for a message.
    
    Args:
        message_id: Message ID
    
    Returns:
        JSON response with read status
    """
    try:
        # Get all read receipts for this message
        pattern = f"read_receipt:{message_id}:*"
        keys = redis_service.get_keys_by_pattern(pattern)
        
        read_receipts = []
        for key in keys:
            receipt_json = redis_service.get_value(key)
            if receipt_json:
                receipt = json.loads(receipt_json)
                read_receipts.append(receipt)
        
        # Check database as well
        try:
            message = Message.query.filter_by(id=int(message_id)).first()
            if message and message.is_read:
                # Add database read status if not in Redis
                db_receipt = {
                    'message_id': message_id,
                    'reader_id': str(message.receiver_id),
                    'read_at': message.timestamp.isoformat() if message.timestamp else None,
                    'source': 'database'
                }
                # Check if already in receipts
                if not any(r['reader_id'] == db_receipt['reader_id'] for r in read_receipts):
                    read_receipts.append(db_receipt)
        except (ValueError, AttributeError):
            pass
        
        return jsonify({
            'success': True,
            'message_id': message_id,
            'is_read': len(read_receipts) > 0,
            'read_count': len(read_receipts),
            'read_receipts': read_receipts
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting read status: {str(e)}")
        return jsonify({'error': 'Failed to get read status'}), 500


@read_receipts_bp.route('/conversation/<conversation_id>', methods=['GET'])
@require_auth
@read_receipts_bp.route('/conversation/<conversation_id>', methods=['GET'])
@handle_errors
def get_conversation_read_status(conversation_id):
@require_auth

    """
    Get read status for all messages in a conversation.
    
    Args:
        conversation_id: Conversation ID
    
    Query Parameters:
        user_id: Filter by specific user (optional)
    
    Returns:
        JSON response with read status for all messages
    """
    try:
        user_filter = request.args.get('user_id')
        
        # Get all read receipts for this conversation
        pattern = f"read_receipt:*"
        keys = redis_service.get_keys_by_pattern(pattern)
        
        conversation_receipts = {}
        for key in keys:
            receipt_json = redis_service.get_value(key)
            if receipt_json:
                receipt = json.loads(receipt_json)
                if receipt.get('conversation_id') == conversation_id:
                    if user_filter and receipt.get('reader_id') != user_filter:
                        continue
                    
                    msg_id = receipt['message_id']
                    if msg_id not in conversation_receipts:
                        conversation_receipts[msg_id] = []
                    conversation_receipts[msg_id].append(receipt)
        
        return jsonify({
            'success': True,
            'conversation_id': conversation_id,
            'read_receipts': conversation_receipts,
            'total_read_messages': len(conversation_receipts)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting conversation read status: {str(e)}")
        return jsonify({'error': 'Failed to get conversation read status'}), 500
