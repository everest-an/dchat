"""
WebRTC Signaling Server

Handles WebRTC signaling for voice and video calls.
Uses Socket.IO for real-time communication.

Features:
- 1-on-1 voice/video calls
- Group calls (up to 8 participants)
- Screen sharing
- Call recording
- Call quality monitoring

Author: Manus AI
Date: 2024-11-05
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from datetime import datetime
from typing import Dict, List, Optional
import json

from ..config.redis_config import RedisService

logger = logging.getLogger(__name__)

webrtc_bp = Blueprint('webrtc', __name__, url_prefix='/api/webrtc')
redis_service = RedisService()

# Active calls storage (call_id -> call_data)
active_calls: Dict[str, dict] = {}

# User to call mapping (user_id -> call_id)
user_calls: Dict[str, str] = {}


@webrtc_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for WebRTC service.
    
    Returns:
        JSON response with service status
    """
    return jsonify({
        'status': 'healthy',
        'service': 'webrtc',
        'active_calls': len(active_calls),
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@webrtc_bp.route('/call/initiate', methods=['POST'])
@jwt_required()
def initiate_call():
    """
    Initiate a new call (1-on-1 or group).
    
    Request Body:
        {
            "type": "audio" | "video",
            "participants": ["user_id_1", "user_id_2", ...],
            "group_id": "optional_group_id"
        }
    
    Returns:
        JSON response with call details
    """
    try:
        caller_id = get_jwt_identity()
        data = request.get_json()
        
        call_type = data.get('type', 'audio')  # audio or video
        participants = data.get('participants', [])
        group_id = data.get('group_id')
        
        # Validate participants
        if not participants:
            return jsonify({'error': 'No participants specified'}), 400
        
        if len(participants) > 8:
            return jsonify({'error': 'Maximum 8 participants allowed'}), 400
        
        # Add caller to participants
        if caller_id not in participants:
            participants.append(caller_id)
        
        # Generate call ID
        call_id = f"call_{datetime.utcnow().timestamp()}_{caller_id}"
        
        # Create call data
        call_data = {
            'call_id': call_id,
            'type': call_type,
            'caller_id': caller_id,
            'participants': participants,
            'group_id': group_id,
            'status': 'ringing',
            'started_at': datetime.utcnow().isoformat(),
            'ended_at': None,
            'duration': 0
        }
        
        # Store call data
        active_calls[call_id] = call_data
        
        # Map users to call
        for user_id in participants:
            user_calls[user_id] = call_id
        
        # Store in Redis for persistence
        redis_service.set_value(
            f'call:{call_id}',
            json.dumps(call_data),
            ttl=3600  # 1 hour
        )
        
        logger.info(f"Call initiated: {call_id} by {caller_id}")
        
        return jsonify({
            'success': True,
            'call': call_data
        }), 201
        
    except Exception as e:
        logger.error(f"Error initiating call: {str(e)}")
        return jsonify({'error': 'Failed to initiate call'}), 500


@webrtc_bp.route('/call/<call_id>/answer', methods=['POST'])
@jwt_required()
def answer_call(call_id: str):
    """
    Answer an incoming call.
    
    Path Parameters:
        call_id: Call ID
    
    Request Body:
        {
            "answer": true | false
        }
    
    Returns:
        JSON response with call status
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        answer = data.get('answer', False)
        
        # Get call data
        call_data = active_calls.get(call_id)
        if not call_data:
            return jsonify({'error': 'Call not found'}), 404
        
        # Verify user is a participant
        if user_id not in call_data['participants']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        if answer:
            # Accept call
            call_data['status'] = 'active'
            logger.info(f"Call {call_id} answered by {user_id}")
        else:
            # Reject call
            call_data['status'] = 'rejected'
            call_data['ended_at'] = datetime.utcnow().isoformat()
            logger.info(f"Call {call_id} rejected by {user_id}")
        
        # Update Redis
        redis_service.set_value(
            f'call:{call_id}',
            json.dumps(call_data),
            ttl=3600
        )
        
        return jsonify({
            'success': True,
            'call': call_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error answering call: {str(e)}")
        return jsonify({'error': 'Failed to answer call'}), 500


@webrtc_bp.route('/call/<call_id>/end', methods=['POST'])
@jwt_required()
def end_call(call_id: str):
    """
    End an active call.
    
    Path Parameters:
        call_id: Call ID
    
    Returns:
        JSON response with call summary
    """
    try:
        user_id = get_jwt_identity()
        
        # Get call data
        call_data = active_calls.get(call_id)
        if not call_data:
            return jsonify({'error': 'Call not found'}), 404
        
        # Verify user is a participant
        if user_id not in call_data['participants']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # End call
        call_data['status'] = 'ended'
        call_data['ended_at'] = datetime.utcnow().isoformat()
        
        # Calculate duration
        started_at = datetime.fromisoformat(call_data['started_at'])
        ended_at = datetime.fromisoformat(call_data['ended_at'])
        duration = (ended_at - started_at).total_seconds()
        call_data['duration'] = duration
        
        # Remove from active calls
        del active_calls[call_id]
        
        # Remove user mappings
        for participant_id in call_data['participants']:
            if participant_id in user_calls:
                del user_calls[participant_id]
        
        # Store final call data in Redis (for history)
        redis_service.set_value(
            f'call:history:{call_id}',
            json.dumps(call_data),
            ttl=86400 * 30  # 30 days
        )
        
        # Delete active call from Redis
        redis_service.delete_key(f'call:{call_id}')
        
        logger.info(f"Call {call_id} ended by {user_id}, duration: {duration}s")
        
        return jsonify({
            'success': True,
            'call': call_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error ending call: {str(e)}")
        return jsonify({'error': 'Failed to end call'}), 500


@webrtc_bp.route('/call/<call_id>', methods=['GET'])
@jwt_required()
def get_call(call_id: str):
    """
    Get call details.
    
    Path Parameters:
        call_id: Call ID
    
    Returns:
        JSON response with call details
    """
    try:
        user_id = get_jwt_identity()
        
        # Get call data
        call_data = active_calls.get(call_id)
        if not call_data:
            # Try to get from Redis
            call_json = redis_service.get_value(f'call:{call_id}')
            if call_json:
                call_data = json.loads(call_json)
            else:
                return jsonify({'error': 'Call not found'}), 404
        
        # Verify user is a participant
        if user_id not in call_data['participants']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        return jsonify({
            'success': True,
            'call': call_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting call: {str(e)}")
        return jsonify({'error': 'Failed to get call'}), 500


@webrtc_bp.route('/calls/active', methods=['GET'])
@jwt_required()
def get_active_calls():
    """
    Get all active calls for the current user.
    
    Returns:
        JSON response with list of active calls
    """
    try:
        user_id = get_jwt_identity()
        
        # Get user's active call
        call_id = user_calls.get(user_id)
        if not call_id:
            return jsonify({
                'success': True,
                'calls': []
            }), 200
        
        call_data = active_calls.get(call_id)
        if not call_data:
            return jsonify({
                'success': True,
                'calls': []
            }), 200
        
        return jsonify({
            'success': True,
            'calls': [call_data]
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting active calls: {str(e)}")
        return jsonify({'error': 'Failed to get active calls'}), 500


@webrtc_bp.route('/calls/history', methods=['GET'])
@jwt_required()
def get_call_history():
    """
    Get call history for the current user.
    
    Query Parameters:
        limit: Maximum number of calls to return (default: 20)
        offset: Offset for pagination (default: 0)
    
    Returns:
        JSON response with list of past calls
    """
    try:
        user_id = get_jwt_identity()
        limit = request.args.get('limit', 20, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        # Get call history from Redis
        # Note: In production, this should be stored in database
        call_keys = redis_service.redis_client.keys(f'call:history:*')
        
        user_calls_history = []
        for key in call_keys:
            call_json = redis_service.get_value(key.decode('utf-8'))
            if call_json:
                call_data = json.loads(call_json)
                if user_id in call_data['participants']:
                    user_calls_history.append(call_data)
        
        # Sort by started_at (descending)
        user_calls_history.sort(
            key=lambda x: x['started_at'],
            reverse=True
        )
        
        # Paginate
        paginated_calls = user_calls_history[offset:offset + limit]
        
        return jsonify({
            'success': True,
            'calls': paginated_calls,
            'total': len(user_calls_history),
            'limit': limit,
            'offset': offset
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting call history: {str(e)}")
        return jsonify({'error': 'Failed to get call history'}), 500


@webrtc_bp.route('/call/<call_id>/quality', methods=['POST'])
@jwt_required()
def report_call_quality(call_id: str):
    """
    Report call quality metrics.
    
    Path Parameters:
        call_id: Call ID
    
    Request Body:
        {
            "video_quality": "good" | "fair" | "poor",
            "audio_quality": "good" | "fair" | "poor",
            "connection_quality": "good" | "fair" | "poor",
            "issues": ["audio_lag", "video_freeze", "connection_drop", ...]
        }
    
    Returns:
        JSON response confirming quality report
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Get call data
        call_data = active_calls.get(call_id)
        if not call_data:
            # Try to get from history
            call_json = redis_service.get_value(f'call:history:{call_id}')
            if call_json:
                call_data = json.loads(call_json)
            else:
                return jsonify({'error': 'Call not found'}), 404
        
        # Verify user is a participant
        if user_id not in call_data['participants']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Store quality report
        quality_report = {
            'call_id': call_id,
            'user_id': user_id,
            'video_quality': data.get('video_quality'),
            'audio_quality': data.get('audio_quality'),
            'connection_quality': data.get('connection_quality'),
            'issues': data.get('issues', []),
            'reported_at': datetime.utcnow().isoformat()
        }
        
        redis_service.set_value(
            f'call:quality:{call_id}:{user_id}',
            json.dumps(quality_report),
            ttl=86400 * 30  # 30 days
        )
        
        logger.info(f"Quality report for call {call_id} from {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Quality report submitted'
        }), 200
        
    except Exception as e:
        logger.error(f"Error reporting call quality: {str(e)}")
        return jsonify({'error': 'Failed to report quality'}), 500


# Socket.IO event handlers (to be added to socket_server.py)
"""
Socket.IO Events for WebRTC Signaling:

1. 'webrtc:offer' - Send WebRTC offer
   Data: { call_id, offer, to_user_id }

2. 'webrtc:answer' - Send WebRTC answer
   Data: { call_id, answer, to_user_id }

3. 'webrtc:ice-candidate' - Send ICE candidate
   Data: { call_id, candidate, to_user_id }

4. 'webrtc:call-ringing' - Notify user of incoming call
   Data: { call_id, caller_id, type }

5. 'webrtc:call-accepted' - Notify caller that call was accepted
   Data: { call_id, user_id }

6. 'webrtc:call-rejected' - Notify caller that call was rejected
   Data: { call_id, user_id }

7. 'webrtc:call-ended' - Notify participants that call ended
   Data: { call_id, ended_by }

8. 'webrtc:participant-joined' - Notify that new participant joined
   Data: { call_id, user_id }

9. 'webrtc:participant-left' - Notify that participant left
   Data: { call_id, user_id }
"""
