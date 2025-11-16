"""
WebRTC Signaling Server

Handles WebRTC signaling for voice and video calls.
Uses FastAPI with WebSocket for real-time communication.

Features:
- 1-on-1 voice/video calls
- Group calls (up to 8 participants)
- Call state management
- Call quality monitoring
- Call history tracking

Author: Manus AI
Date: 2024-11-16
"""

from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from src.models.user import User, db
from src.middleware.auth import require_auth
from src.middleware.error_handler import ValidationError
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
import json
import uuid
from enum import Enum

logger = logging.getLogger(__name__)

webrtc_bp = APIRouter(prefix="/api/webrtc", tags=["WebRTC"])

# Call types
class CallType(str, Enum):
    AUDIO = "audio"
    VIDEO = "video"
    SCREEN_SHARE = "screen_share"

# Call states
class CallState(str, Enum):
    INITIATED = "initiated"
    RINGING = "ringing"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    FAILED = "failed"

# Active calls storage (call_id -> call_data)
active_calls: Dict[str, dict] = {}

# WebSocket connections (user_id -> WebSocket)
active_connections: Dict[str, WebSocket] = {}

# User to call mapping (user_id -> call_id)
user_calls: Dict[str, str] = {}


@webrtc_bp.get('/health')
async def health_check():
    """
    Health check endpoint for WebRTC service.
    
    Returns:
        JSON response with service status
    """
    return {
        'status': 'healthy',
        'service': 'webrtc',
        'active_calls': len(active_calls),
        'active_connections': len(active_connections),
        'timestamp': datetime.utcnow().isoformat()
    }


@webrtc_bp.post('/call/initiate')
async def initiate_call(
    call_data: dict,
    current_user: dict = Depends(require_auth)
):
    """
    Initiate a new call (1-on-1 or group).
    
    Request Body:
        {
            "type": "audio" | "video" | "screen_share",
            "participants": ["user_id_1", "user_id_2", ...],
            "group_id": "optional_group_id"
        }
    
    Returns:
        JSON response with call details
    """
    try:
        caller_id = current_user.get('user_id')
        
        call_type = call_data.get('type', 'audio')
        participants = call_data.get('participants', [])
        group_id = call_data.get('group_id')
        
        # Validate call type
        try:
            CallType(call_type)
        except ValueError:
            raise ValidationError(f"Invalid call type: {call_type}")
        
        # Validate participants
        if not participants:
            raise ValidationError("No participants specified")
        
        if len(participants) > 8:
            raise ValidationError("Maximum 8 participants allowed")
        
        # Add caller to participants
        if caller_id not in participants:
            participants.append(caller_id)
        
        # Generate call ID
        call_id = str(uuid.uuid4())
        
        # Create call object
        call_obj = {
            'call_id': call_id,
            'type': call_type,
            'caller_id': caller_id,
            'participants': participants,
            'group_id': group_id,
            'state': CallState.INITIATED.value,
            'created_at': datetime.utcnow().isoformat(),
            'sdp_offers': {},  # user_id -> SDP offer
            'sdp_answers': {},  # user_id -> SDP answer
            'ice_candidates': {},  # user_id -> list of ICE candidates
            'start_time': None,
            'end_time': None,
            'duration': 0
        }
        
        # Store call
        active_calls[call_id] = call_obj
        user_calls[caller_id] = call_id
        
        logger.info(f"Call initiated: {call_id} by user {caller_id} with {len(participants)} participants")
        
        return {
            'success': True,
            'call_id': call_id,
            'call_type': call_type,
            'participants': participants,
            'state': CallState.INITIATED.value,
            'created_at': call_obj['created_at']
        }
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error initiating call: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate call: {str(e)}"
        )


@webrtc_bp.post('/call/{call_id}/offer')
async def submit_sdp_offer(
    call_id: str,
    offer_data: dict,
    current_user: dict = Depends(require_auth)
):
    """
    Submit SDP offer for a call.
    
    Request Body:
        {
            "sdp": "v=0\r\no=...",
            "type": "offer"
        }
    
    Returns:
        JSON response with status
    """
    try:
        user_id = current_user.get('user_id')
        
        if call_id not in active_calls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )
        
        call_obj = active_calls[call_id]
        
        # Validate user is participant
        if user_id not in call_obj['participants']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a participant in this call"
            )
        
        sdp = offer_data.get('sdp')
        if not sdp:
            raise ValidationError("SDP offer is required")
        
        # Store SDP offer
        call_obj['sdp_offers'][user_id] = {
            'sdp': sdp,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Update call state if all participants have submitted offers
        if len(call_obj['sdp_offers']) == len(call_obj['participants']):
            call_obj['state'] = CallState.CONNECTED.value
            call_obj['start_time'] = datetime.utcnow().isoformat()
        
        logger.info(f"SDP offer received for call {call_id} from user {user_id}")
        
        return {
            'success': True,
            'call_id': call_id,
            'user_id': user_id,
            'state': call_obj['state']
        }
        
    except HTTPException:
        raise
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error submitting SDP offer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit SDP offer: {str(e)}"
        )


@webrtc_bp.post('/call/{call_id}/answer')
async def submit_sdp_answer(
    call_id: str,
    answer_data: dict,
    current_user: dict = Depends(require_auth)
):
    """
    Submit SDP answer for a call.
    
    Request Body:
        {
            "sdp": "v=0\r\no=...",
            "type": "answer"
        }
    
    Returns:
        JSON response with status
    """
    try:
        user_id = current_user.get('user_id')
        
        if call_id not in active_calls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )
        
        call_obj = active_calls[call_id]
        
        # Validate user is participant
        if user_id not in call_obj['participants']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a participant in this call"
            )
        
        sdp = answer_data.get('sdp')
        if not sdp:
            raise ValidationError("SDP answer is required")
        
        # Store SDP answer
        call_obj['sdp_answers'][user_id] = {
            'sdp': sdp,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        logger.info(f"SDP answer received for call {call_id} from user {user_id}")
        
        return {
            'success': True,
            'call_id': call_id,
            'user_id': user_id,
            'state': call_obj['state']
        }
        
    except HTTPException:
        raise
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error submitting SDP answer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit SDP answer: {str(e)}"
        )


@webrtc_bp.post('/call/{call_id}/ice-candidate')
async def submit_ice_candidate(
    call_id: str,
    candidate_data: dict,
    current_user: dict = Depends(require_auth)
):
    """
    Submit ICE candidate for a call.
    
    Request Body:
        {
            "candidate": "candidate:...",
            "sdpMLineIndex": 0,
            "sdpMid": "0"
        }
    
    Returns:
        JSON response with status
    """
    try:
        user_id = current_user.get('user_id')
        
        if call_id not in active_calls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )
        
        call_obj = active_calls[call_id]
        
        # Validate user is participant
        if user_id not in call_obj['participants']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a participant in this call"
            )
        
        candidate = candidate_data.get('candidate')
        if not candidate:
            raise ValidationError("ICE candidate is required")
        
        # Initialize ICE candidates list for user if not exists
        if user_id not in call_obj['ice_candidates']:
            call_obj['ice_candidates'][user_id] = []
        
        # Store ICE candidate
        call_obj['ice_candidates'][user_id].append({
            'candidate': candidate,
            'sdpMLineIndex': candidate_data.get('sdpMLineIndex'),
            'sdpMid': candidate_data.get('sdpMid'),
            'timestamp': datetime.utcnow().isoformat()
        })
        
        return {
            'success': True,
            'call_id': call_id,
            'user_id': user_id
        }
        
    except HTTPException:
        raise
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error submitting ICE candidate: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit ICE candidate: {str(e)}"
        )


@webrtc_bp.get('/call/{call_id}')
async def get_call_details(
    call_id: str,
    current_user: dict = Depends(require_auth)
):
    """
    Get details of a specific call.
    
    Returns:
        JSON response with call details
    """
    try:
        user_id = current_user.get('user_id')
        
        if call_id not in active_calls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )
        
        call_obj = active_calls[call_id]
        
        # Validate user is participant
        if user_id not in call_obj['participants']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a participant in this call"
            )
        
        # Calculate duration if call is connected
        duration = 0
        if call_obj['state'] == CallState.CONNECTED.value and call_obj['start_time']:
            start = datetime.fromisoformat(call_obj['start_time'])
            duration = int((datetime.utcnow() - start).total_seconds())
        
        return {
            'success': True,
            'call_id': call_id,
            'type': call_obj['type'],
            'caller_id': call_obj['caller_id'],
            'participants': call_obj['participants'],
            'state': call_obj['state'],
            'created_at': call_obj['created_at'],
            'start_time': call_obj['start_time'],
            'duration': duration,
            'sdp_offers_count': len(call_obj['sdp_offers']),
            'sdp_answers_count': len(call_obj['sdp_answers']),
            'ice_candidates_count': sum(len(v) for v in call_obj['ice_candidates'].values())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving call details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve call details: {str(e)}"
        )


@webrtc_bp.post('/call/{call_id}/end')
async def end_call(
    call_id: str,
    current_user: dict = Depends(require_auth)
):
    """
    End a call.
    
    Returns:
        JSON response with call summary
    """
    try:
        user_id = current_user.get('user_id')
        
        if call_id not in active_calls:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )
        
        call_obj = active_calls[call_id]
        
        # Validate user is participant
        if user_id not in call_obj['participants']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a participant in this call"
            )
        
        # Update call state
        call_obj['state'] = CallState.DISCONNECTED.value
        call_obj['end_time'] = datetime.utcnow().isoformat()
        
        # Calculate duration
        if call_obj['start_time']:
            start = datetime.fromisoformat(call_obj['start_time'])
            end = datetime.fromisoformat(call_obj['end_time'])
            call_obj['duration'] = int((end - start).total_seconds())
        
        # Clean up user call mapping
        for participant in call_obj['participants']:
            if participant in user_calls:
                del user_calls[participant]
        
        logger.info(f"Call ended: {call_id}, duration: {call_obj['duration']}s")
        
        return {
            'success': True,
            'call_id': call_id,
            'state': call_obj['state'],
            'duration': call_obj['duration'],
            'end_time': call_obj['end_time']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending call: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end call: {str(e)}"
        )


@webrtc_bp.get('/calls/active')
async def get_active_calls(
    current_user: dict = Depends(require_auth)
):
    """
    Get all active calls for the current user.
    
    Returns:
        JSON response with list of active calls
    """
    try:
        user_id = current_user.get('user_id')
        
        # Find all calls where user is a participant
        user_calls_list = []
        for call_id, call_obj in active_calls.items():
            if user_id in call_obj['participants'] and call_obj['state'] != CallState.DISCONNECTED.value:
                user_calls_list.append({
                    'call_id': call_id,
                    'type': call_obj['type'],
                    'caller_id': call_obj['caller_id'],
                    'participants': call_obj['participants'],
                    'state': call_obj['state'],
                    'created_at': call_obj['created_at']
                })
        
        return {
            'success': True,
            'calls': user_calls_list,
            'count': len(user_calls_list)
        }
        
    except Exception as e:
        logger.error(f"Error retrieving active calls: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve active calls: {str(e)}"
        )


@webrtc_bp.get('/calls/history')
async def get_call_history(
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(require_auth)
):
    """
    Get call history for the current user.
    
    Query Parameters:
        limit: Maximum number of calls to return (default: 20)
        offset: Number of calls to skip (default: 0)
    
    Returns:
        JSON response with call history
    """
    try:
        user_id = current_user.get('user_id')
        
        # Find all calls where user is a participant
        user_calls_list = []
        for call_id, call_obj in active_calls.items():
            if user_id in call_obj['participants']:
                user_calls_list.append({
                    'call_id': call_id,
                    'type': call_obj['type'],
                    'caller_id': call_obj['caller_id'],
                    'participants': call_obj['participants'],
                    'state': call_obj['state'],
                    'created_at': call_obj['created_at'],
                    'start_time': call_obj['start_time'],
                    'end_time': call_obj['end_time'],
                    'duration': call_obj['duration']
                })
        
        # Sort by created_at descending
        user_calls_list.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Apply pagination
        total_count = len(user_calls_list)
        paginated_calls = user_calls_list[offset:offset + limit]
        
        return {
            'success': True,
            'calls': paginated_calls,
            'total_count': total_count,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'has_more': (offset + limit) < total_count
            }
        }
        
    except Exception as e:
        logger.error(f"Error retrieving call history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve call history: {str(e)}"
        )
