"""
Push Notifications API

Provides push notification functionality using Firebase Cloud Messaging (FCM).
Sends notifications for new messages, mentions, and important events.

Features:
- Register device tokens
- Send push notifications
- Manage notification preferences
- Notification history
- Real-time notification delivery

Author: Manus AI
Date: 2024-11-12
"""

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from datetime import datetime
from typing import List, Dict, Optional
import os
import json

from ..models.user import db
from ..config.redis_config import RedisService

# Enhanced middleware for production
from ..middleware.auth import require_auth, optional_auth, require_role
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError


logger = logging.getLogger(__name__)

push_notifications_bp = Blueprint('push_notifications', __name__, url_prefix='/api/push-notifications')
redis_service = RedisService()

# Firebase Admin SDK (optional - will be initialized if credentials are available)
try:
    import firebase_admin
    from firebase_admin import credentials, messaging

    
    # Try to initialize Firebase Admin SDK
    firebase_credentials_path = os.environ.get('FIREBASE_CREDENTIALS_PATH')
    if firebase_credentials_path and os.path.exists(firebase_credentials_path):
        cred = credentials.Certificate(firebase_credentials_path)
        firebase_admin.initialize_app(cred)
        FIREBASE_ENABLED = True
        logger.info("Firebase Admin SDK initialized successfully")
    else:
        FIREBASE_ENABLED = False
        logger.warning("Firebase credentials not found - push notifications will be simulated")
except ImportError:
    FIREBASE_ENABLED = False
    logger.warning("Firebase Admin SDK not installed - push notifications will be simulated")


@push_notifications_bp.route('/health', methods=['GET'])
@handle_errors
def health_check():

    """
    Health check endpoint for push notifications service.
    
    Returns:
        JSON response with service status
    """
    return jsonify({
        'status': 'healthy',
        'service': 'push_notifications',
        'firebase_enabled': FIREBASE_ENABLED,
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@push_notifications_bp.route('/register-token', methods=['POST'])
@require_auth
@handle_errors
def register_device_token():

    """
    Register a device token for push notifications.
    
    Request Body:
        {
            "token": "fcm_device_token",
            "device_type": "web" | "ios" | "android",
            "device_name": "Chrome on MacOS" (optional)
        }
    
    Returns:
        JSON response confirming registration
    """
    try:
        user_id = g.user_id
        data = request.get_json()
        
        if not data or 'token' not in data:
            return jsonify({'error': 'Device token required'}), 400
        
        device_token = data['token']
        device_type = data.get('device_type', 'web')
        device_name = data.get('device_name', 'Unknown Device')
        
        # Store device token in Redis
        token_key = f"device_token:{user_id}:{device_token}"
        token_data = {
            'user_id': user_id,
            'token': device_token,
            'device_type': device_type,
            'device_name': device_name,
            'registered_at': datetime.utcnow().isoformat(),
            'last_used': datetime.utcnow().isoformat()
        }
        
        redis_service.set_value(token_key, json.dumps(token_data), ttl=86400 * 90)  # 90 days
        
        # Add to user's device tokens list
        user_tokens_key = f"user_tokens:{user_id}"
        tokens_json = redis_service.get_value(user_tokens_key)
        
        if tokens_json:
            tokens = json.loads(tokens_json)
        else:
            tokens = []
        
        # Add token if not already in list
        if device_token not in tokens:
            tokens.append(device_token)
            redis_service.set_value(user_tokens_key, json.dumps(tokens), ttl=86400 * 90)
        
        logger.info(f"Device token registered for user {user_id}: {device_type}")
        
        return jsonify({
            'success': True,
            'message': 'Device token registered successfully',
            'device_type': device_type,
            'firebase_enabled': FIREBASE_ENABLED
        }), 201
        
    except Exception as e:
        logger.error(f"Error registering device token: {str(e)}")
        return jsonify({'error': 'Failed to register device token'}), 500


@push_notifications_bp.route('/unregister-token', methods=['POST'])
@require_auth
@handle_errors
def unregister_device_token():

    """
    Unregister a device token.
    
    Request Body:
        {
            "token": "fcm_device_token"
        }
    
    Returns:
        JSON response confirming unregistration
    """
    try:
        user_id = g.user_id
        data = request.get_json()
        
        if not data or 'token' not in data:
            return jsonify({'error': 'Device token required'}), 400
        
        device_token = data['token']
        
        # Remove device token from Redis
        token_key = f"device_token:{user_id}:{device_token}"
        redis_service.delete_value(token_key)
        
        # Remove from user's device tokens list
        user_tokens_key = f"user_tokens:{user_id}"
        tokens_json = redis_service.get_value(user_tokens_key)
        
        if tokens_json:
            tokens = json.loads(tokens_json)
            if device_token in tokens:
                tokens.remove(device_token)
                redis_service.set_value(user_tokens_key, json.dumps(tokens), ttl=86400 * 90)
        
        logger.info(f"Device token unregistered for user {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Device token unregistered successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error unregistering device token: {str(e)}")
        return jsonify({'error': 'Failed to unregister device token'}), 500


@push_notifications_bp.route('/send', methods=['POST'])
@require_auth
@handle_errors
def send_notification():

    """
    Send a push notification to a user.
    
    Request Body:
        {
            "recipient_id": "user_id",
            "title": "Notification title",
            "body": "Notification body",
            "data": {
                "type": "message" | "mention" | "call" | "payment",
                "conversation_id": "...",
                "message_id": "..."
            },
            "priority": "high" | "normal" (default: "normal")
        }
    
    Returns:
        JSON response with notification status
    """
    try:
        sender_id = g.user_id
        data = request.get_json()
        
        if not data or 'recipient_id' not in data:
            return jsonify({'error': 'Recipient ID required'}), 400
        
        recipient_id = data['recipient_id']
        title = data.get('title', 'New Notification')
        body = data.get('body', '')
        notification_data = data.get('data', {})
        priority = data.get('priority', 'normal')
        
        # Get recipient's device tokens
        user_tokens_key = f"user_tokens:{recipient_id}"
        tokens_json = redis_service.get_value(user_tokens_key)
        
        if not tokens_json:
            return jsonify({
                'success': False,
                'error': 'No device tokens found for recipient'
            }), 404
        
        tokens = json.loads(tokens_json)
        
        if not tokens:
            return jsonify({
                'success': False,
                'error': 'No device tokens found for recipient'
            }), 404
        
        # Send notification via Firebase (if enabled)
        if FIREBASE_ENABLED:
            try:
                # Create notification message
                message = messaging.MulticastMessage(
                    notification=messaging.Notification(
                        title=title,
                        body=body
                    ),
                    data=notification_data,
                    tokens=tokens,
                    android=messaging.AndroidConfig(
                        priority=priority
                    ),
                    apns=messaging.APNSConfig(
                        headers={'apns-priority': '10' if priority == 'high' else '5'}
                    ),
                    webpush=messaging.WebpushConfig(
                        notification=messaging.WebpushNotification(
                            title=title,
                            body=body,
                            icon='/icon-192x192.png',
                            badge='/badge-72x72.png'
                        )
                    )
                )
                
                # Send notification
                response = messaging.send_multicast(message)
                
                logger.info(f"Notification sent from {sender_id} to {recipient_id}: {response.success_count} successful, {response.failure_count} failed")
                
                return jsonify({
                    'success': True,
                    'success_count': response.success_count,
                    'failure_count': response.failure_count,
                    'total_tokens': len(tokens)
                }), 200
                
            except Exception as e:
                logger.error(f"Error sending Firebase notification: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': 'Failed to send notification via Firebase',
                    'details': str(e)
                }), 500
        else:
            # Simulate notification sending
            logger.info(f"Simulated notification from {sender_id} to {recipient_id}: {title}")
            
            # Store notification in Redis for testing
            notification_key = f"notification:{recipient_id}:{datetime.utcnow().timestamp()}"
            notification_record = {
                'sender_id': sender_id,
                'recipient_id': recipient_id,
                'title': title,
                'body': body,
                'data': notification_data,
                'sent_at': datetime.utcnow().isoformat(),
                'status': 'simulated'
            }
            
            redis_service.set_value(notification_key, json.dumps(notification_record), ttl=86400 * 7)
            
            return jsonify({
                'success': True,
                'message': 'Notification simulated (Firebase not configured)',
                'total_tokens': len(tokens),
                'firebase_enabled': False
            }), 200
        
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        return jsonify({'error': 'Failed to send notification'}), 500


@push_notifications_bp.route('/preferences', methods=['GET'])
@require_auth
@handle_errors
def get_notification_preferences():

    """
    Get user's notification preferences.
    
    Returns:
        JSON response with notification preferences
    """
    try:
        user_id = g.user_id
        
        # Get preferences from Redis
        prefs_key = f"notification_prefs:{user_id}"
        prefs_json = redis_service.get_value(prefs_key)
        
        if prefs_json:
            preferences = json.loads(prefs_json)
        else:
            # Default preferences
            preferences = {
                'enabled': True,
                'messages': True,
                'mentions': True,
                'calls': True,
                'payments': True,
                'group_messages': True,
                'sound': True,
                'vibration': True
            }
        
        return jsonify({
            'success': True,
            'preferences': preferences
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting notification preferences: {str(e)}")
        return jsonify({'error': 'Failed to get preferences'}), 500


@push_notifications_bp.route('/preferences', methods=['PUT'])
@require_auth
@handle_errors
def update_notification_preferences():

    """
    Update user's notification preferences.
    
    Request Body:
        {
            "enabled": true,
            "messages": true,
            "mentions": true,
            "calls": true,
            "payments": true,
            "group_messages": true,
            "sound": true,
            "vibration": true
        }
    
    Returns:
        JSON response confirming update
    """
    try:
        user_id = g.user_id
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Preferences data required'}), 400
        
        # Save preferences to Redis
        prefs_key = f"notification_prefs:{user_id}"
        redis_service.set_value(prefs_key, json.dumps(data), ttl=86400 * 365)  # 1 year
        
        logger.info(f"Notification preferences updated for user {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Preferences updated successfully',
            'preferences': data
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating notification preferences: {str(e)}")
        return jsonify({'error': 'Failed to update preferences'}), 500


@push_notifications_bp.route('/test', methods=['POST'])
@require_auth
@handle_errors
def send_test_notification():

    """
    Send a test notification to the current user.
    
    Returns:
        JSON response with test notification status
    """
    try:
        user_id = g.user_id
        
        # Get user's device tokens
        user_tokens_key = f"user_tokens:{user_id}"
        tokens_json = redis_service.get_value(user_tokens_key)
        
        if not tokens_json:
            return jsonify({
                'success': False,
                'error': 'No device tokens registered. Please register a device token first.'
            }), 404
        
        tokens = json.loads(tokens_json)
        
        if not tokens:
            return jsonify({
                'success': False,
                'error': 'No device tokens registered'
            }), 404
        
        # Send test notification
        title = "Dchat Test Notification"
        body = "This is a test notification from Dchat. Notifications are working!"
        
        if FIREBASE_ENABLED:
            try:
                message = messaging.MulticastMessage(
                    notification=messaging.Notification(
                        title=title,
                        body=body
                    ),
                    data={'type': 'test'},
                    tokens=tokens
                )
                
                response = messaging.send_multicast(message)
                
                return jsonify({
                    'success': True,
                    'message': 'Test notification sent',
                    'success_count': response.success_count,
                    'failure_count': response.failure_count
                }), 200
                
            except Exception as e:
                logger.error(f"Error sending test notification: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': 'Failed to send test notification',
                    'details': str(e)
                }), 500
        else:
            logger.info(f"Test notification simulated for user {user_id}")
            return jsonify({
                'success': True,
                'message': 'Test notification simulated (Firebase not configured)',
                'firebase_enabled': False
            }), 200
        
    except Exception as e:
        logger.error(f"Error sending test notification: {str(e)}")
        return jsonify({'error': 'Failed to send test notification'}), 500
