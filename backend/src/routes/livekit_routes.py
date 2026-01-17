"""
LiveKit API Routes

Provides endpoints for LiveKit token generation and room management.
Integrates with Dchat's authentication and call system.

Author: Manus AI
Date: 2024-11-13
"""

from flask import Blueprint, request, jsonify, g
import logging
from datetime import datetime

from ..services.livekit_service import get_livekit_service
from ..middleware.auth import require_auth, optional_auth
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError
from ..schemas.livekit_schemas import CreateTokenSchema, CreateCallTokenSchema
from marshmallow import ValidationError as MarshmallowValidationError

logger = logging.getLogger(__name__)

livekit_bp = Blueprint('livekit', __name__, url_prefix='/api/livekit')


@livekit_bp.route('/health', methods=['GET'])
@handle_errors
def health_check():
    """
    Health check for LiveKit service.
    
    Returns:
        JSON response with service status
    """
    service = get_livekit_service()
    details = service.get_connection_details()
    
    return jsonify({
        'status': 'healthy',
        'service': 'livekit',
        'details': details,
        'timestamp': datetime.utcnow().isoformat()
    })


@livekit_bp.route('/token', methods=['POST'])
@require_auth
@handle_errors
@validate_request_json(['room_name'])
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
    data = request.json
    
    # Validate with schema
    schema = CreateTokenSchema()
    try:
        validated_data = schema.load(data)
    except MarshmallowValidationError as e:
        raise ValidationError("Invalid input", payload={'errors': e.messages})
    
    user_id = str(g.user_id)
    room_name = validated_data['room_name']
        
    # Get optional parameters
    participant_name = validated_data.get('participant_name', user_id)
    can_publish = validated_data.get('can_publish', True)
    can_subscribe = validated_data.get('can_subscribe', True)
    
    # Create token
    service = get_livekit_service()
    token = service.create_token(
        room_name=room_name,
        participant_identity=user_id,
        participant_name=participant_name,
        metadata=None,
        can_publish=can_publish,
        can_subscribe=can_subscribe,
        valid_for=3600
    )
    
    return jsonify({
        'success': True,
        'token': token,
        'url': service.url,
        'room_name': room_name,
        'participant_identity': user_id
    })


@livekit_bp.route('/call/token', methods=['POST'])
@require_auth
@handle_errors
@validate_request_json(['call_id', 'call_type'])
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
@require_auth
@handle_errors
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
@handle_errors
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


# Error handlers are now handled globally by error_handler middleware
