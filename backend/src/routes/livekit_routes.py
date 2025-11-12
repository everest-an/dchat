"""
LiveKit API Routes

Provides endpoints for LiveKit token generation and room management.
Integrates with Dchat's authentication and call system.

Author: Manus AI
Date: 2024-11-13
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from datetime import datetime

from ..services.livekit_service import get_livekit_service

logger = logging.getLogger(__name__)

livekit_bp = Blueprint('livekit', __name__, url_prefix='/api/livekit')


@livekit_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check for LiveKit service.
    
    Returns:
        JSON response with service status
    """
    try:
        service = get_livekit_service()
        details = service.get_connection_details()
        
        return jsonify({
            'status': 'healthy',
            'service': 'livekit',
            'details': details,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"LiveKit health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503


@livekit_bp.route('/token', methods=['POST'])
@jwt_required()
def create_token():
    """
    Create a LiveKit access token.
    
    Request Body:
        {
            "room_name": "my_room",
            "participant_name": "User Name",  // optional
            "metadata": "{}",  // optional JSON string
            "can_publish": true,  // optional, default true
            "can_subscribe": true,  // optional, default true
            "valid_for": 3600  // optional, seconds, default 3600
        }
    
    Returns:
        JSON response with token and connection details
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        room_name = data.get('room_name')
        if not room_name:
            return jsonify({'error': 'room_name is required'}), 400
        
        # Get optional parameters
        participant_name = data.get('participant_name', user_id)
        metadata = data.get('metadata')
        can_publish = data.get('can_publish', True)
        can_subscribe = data.get('can_subscribe', True)
        valid_for = data.get('valid_for', 3600)
        
        # Create token
        service = get_livekit_service()
        token = service.create_token(
            room_name=room_name,
            participant_identity=user_id,
            participant_name=participant_name,
            metadata=metadata,
            can_publish=can_publish,
            can_subscribe=can_subscribe,
            valid_for=valid_for
        )
        
        return jsonify({
            'success': True,
            'token': token,
            'url': service.url,
            'room_name': room_name,
            'participant_identity': user_id
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to create token: {str(e)}")
        return jsonify({'error': 'Failed to create token'}), 500


@livekit_bp.route('/call/token', methods=['POST'])
@jwt_required()
def create_call_token():
    """
    Create a LiveKit token specifically for a Dchat call.
    
    Request Body:
        {
            "call_id": "call_123",
            "call_type": "video",  // 'audio' or 'video'
            "is_host": false  // optional, default false
        }
    
    Returns:
        JSON response with token and call details
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        call_id = data.get('call_id')
        if not call_id:
            return jsonify({'error': 'call_id is required'}), 400
        
        call_type = data.get('call_type', 'video')
        if call_type not in ['audio', 'video']:
            return jsonify({'error': 'call_type must be "audio" or "video"'}), 400
        
        is_host = data.get('is_host', False)
        
        # Get user name from request or use user_id
        user_name = data.get('user_name', user_id)
        
        # Create call token
        service = get_livekit_service()
        token_data = service.create_room_token_for_call(
            call_id=call_id,
            user_id=user_id,
            user_name=user_name,
            call_type=call_type,
            is_host=is_host
        )
        
        logger.info(f"Call token created for user {user_id} in call {call_id}")
        
        return jsonify({
            'success': True,
            **token_data
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to create call token: {str(e)}")
        return jsonify({'error': 'Failed to create call token'}), 500


@livekit_bp.route('/rooms/<room_name>/participants', methods=['GET'])
@jwt_required()
def get_room_participants(room_name: str):
    """
    Get list of participants in a room.
    
    Note: This requires LiveKit server API access.
    For now, returns a placeholder response.
    
    Path Parameters:
        room_name: Name of the room
    
    Returns:
        JSON response with participant list
    """
    try:
        user_id = get_jwt_identity()
        
        # TODO: Implement actual LiveKit API call to get participants
        # This requires the LiveKit server SDK with admin permissions
        
        return jsonify({
            'success': True,
            'room_name': room_name,
            'participants': [],
            'message': 'Participant list feature coming soon'
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get participants: {str(e)}")
        return jsonify({'error': 'Failed to get participants'}), 500


@livekit_bp.route('/config', methods=['GET'])
def get_config():
    """
    Get LiveKit client configuration.
    
    Returns:
        JSON response with public configuration
    """
    try:
        service = get_livekit_service()
        
        return jsonify({
            'success': True,
            'url': service.url,
            'features': {
                'audio': True,
                'video': True,
                'screen_share': True,
                'data_channels': True
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get config: {str(e)}")
        return jsonify({'error': 'Failed to get configuration'}), 500


# Error handlers
@livekit_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'error': 'Bad request',
        'message': str(error)
    }), 400


@livekit_bp.errorhandler(401)
def unauthorized(error):
    return jsonify({
        'success': False,
        'error': 'Unauthorized',
        'message': 'Authentication required'
    }), 401


@livekit_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'message': str(error)
    }), 500
