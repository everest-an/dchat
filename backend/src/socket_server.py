"""
Socket.IO Server for Real-time Communication
Handles real-time messaging, online status, and typing indicators
"""

import socketio
import asyncio
from typing import Dict, Set, Optional
import logging
import jwt
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Socket.IO server with CORS enabled
sio = socketio.AsyncServer(
    async_mode='aiohttp',
    cors_allowed_origins='*',  # In production, specify exact origins
    logger=True,
    engineio_logger=True
)

# Store user sessions and room memberships
user_sessions: Dict[str, str] = {}  # sid -> user_id
user_rooms: Dict[str, Set[str]] = {}  # user_id -> set of room_ids
online_users: Set[str] = set()  # set of online user_ids


@sio.event
async def connect(sid, environ):
    """
    Handle client connection
    """
    logger.info(f"Client connected: {sid}")
    return True


@sio.event
async def disconnect(sid):
    """
    Handle client disconnection
    """
    logger.info(f"Client disconnected: {sid}")
    
    # Get user_id from session
    user_id = user_sessions.get(sid)
    if user_id:
        # Remove from online users
        online_users.discard(user_id)
        
        # Notify all rooms that user is offline
        if user_id in user_rooms:
            for room_id in user_rooms[user_id]:
                await sio.emit('user_status', {
                    'user_id': user_id,
                    'status': 'offline'
                }, room=room_id)
        
        # Clean up
        del user_sessions[sid]
        if user_id in user_rooms:
            del user_rooms[user_id]


@sio.event
async def authenticate(sid, data):
    """
    Authenticate user and set up session with JWT token validation
    
    Args:
        data: {
            'token': str (required) - JWT authentication token
        }
    """
    token = data.get('token')
    
    if not token:
        await sio.emit('error', {'message': 'Authentication token required'}, room=sid)
        return
    
    # Verify JWT token
    try:
        secret_key = os.environ.get('SECRET_KEY', 'dchat-secret-key')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        user_id = str(payload.get('user_id'))
        
        if not user_id:
            await sio.emit('error', {'message': 'Invalid token: missing user_id'}, room=sid)
            return
        
    except jwt.ExpiredSignatureError:
        await sio.emit('error', {'message': 'Token expired'}, room=sid)
        return
    except jwt.InvalidTokenError as e:
        await sio.emit('error', {'message': f'Invalid token: {str(e)}'}, room=sid)
        return
    
    # Store session
    user_sessions[sid] = user_id
    online_users.add(user_id)
    
    # Initialize user rooms if not exists
    if user_id not in user_rooms:
        user_rooms[user_id] = set()
    
    logger.info(f"User authenticated via JWT: {user_id} (sid: {sid})")
    
    await sio.emit('authenticated', {'user_id': user_id}, room=sid)


@sio.event
async def join_room(sid, data):
    """
    Join a chat room
    
    Args:
        data: {
            'room_id': str
        }
    """
    room_id = data.get('room_id')
    user_id = user_sessions.get(sid)
    
    if not user_id:
        await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
        return
    
    if not room_id:
        await sio.emit('error', {'message': 'Room ID required'}, room=sid)
        return
    
    # Join Socket.IO room
    sio.enter_room(sid, room_id)
    
    # Track user's rooms
    user_rooms[user_id].add(room_id)
    
    logger.info(f"User {user_id} joined room {room_id}")
    
    # Notify room members
    await sio.emit('user_joined', {
        'user_id': user_id,
        'room_id': room_id
    }, room=room_id, skip_sid=sid)
    
    await sio.emit('room_joined', {'room_id': room_id}, room=sid)


@sio.event
async def leave_room(sid, data):
    """
    Leave a chat room
    
    Args:
        data: {
            'room_id': str
        }
    """
    room_id = data.get('room_id')
    user_id = user_sessions.get(sid)
    
    if not user_id:
        return
    
    if not room_id:
        return
    
    # Leave Socket.IO room
    sio.leave_room(sid, room_id)
    
    # Remove from user's rooms
    if user_id in user_rooms:
        user_rooms[user_id].discard(room_id)
    
    logger.info(f"User {user_id} left room {room_id}")
    
    # Notify room members
    await sio.emit('user_left', {
        'user_id': user_id,
        'room_id': room_id
    }, room=room_id)


@sio.event
async def send_message(sid, data):
    """
    Send a message to a room
    
    Args:
        data: {
            'room_id': str,
            'message': str,
            'message_id': str,
            'timestamp': int
        }
    """
    user_id = user_sessions.get(sid)
    
    if not user_id:
        await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
        return
    
    room_id = data.get('room_id')
    message = data.get('message')
    message_id = data.get('message_id')
    timestamp = data.get('timestamp')
    
    if not room_id or not message:
        await sio.emit('error', {'message': 'Room ID and message required'}, room=sid)
        return
    
    # Broadcast message to room
    await sio.emit('new_message', {
        'message_id': message_id,
        'room_id': room_id,
        'user_id': user_id,
        'message': message,
        'timestamp': timestamp
    }, room=room_id)
    
    logger.info(f"Message sent from {user_id} to room {room_id}")


@sio.event
async def typing_start(sid, data):
    """
    Notify room that user is typing
    
    Args:
        data: {
            'room_id': str
        }
    """
    user_id = user_sessions.get(sid)
    room_id = data.get('room_id')
    
    if user_id and room_id:
        await sio.emit('user_typing', {
            'user_id': user_id,
            'room_id': room_id,
            'typing': True
        }, room=room_id, skip_sid=sid)


@sio.event
async def typing_stop(sid, data):
    """
    Notify room that user stopped typing
    
    Args:
        data: {
            'room_id': str
        }
    """
    user_id = user_sessions.get(sid)
    room_id = data.get('room_id')
    
    if user_id and room_id:
        await sio.emit('user_typing', {
            'user_id': user_id,
            'room_id': room_id,
            'typing': False
        }, room=room_id, skip_sid=sid)


@sio.event
async def get_online_users(sid, data):
    """
    Get list of online users
    """
    await sio.emit('online_users', {
        'users': list(online_users)
    }, room=sid)


@sio.event
async def message_delivered(sid, data):
    """
    Mark message as delivered
    
    Args:
        data: {
            'message_id': str,
            'room_id': str
        }
    """
    user_id = user_sessions.get(sid)
    
    if not user_id:
        return
    
    message_id = data.get('message_id')
    room_id = data.get('room_id')
    
    if message_id and room_id:
        # Notify sender that message was delivered
        await sio.emit('message_status', {
            'message_id': message_id,
            'room_id': room_id,
            'status': 'delivered',
            'delivered_to': user_id,
            'timestamp': asyncio.get_event_loop().time()
        }, room=room_id)
        
        logger.info(f"Message {message_id} delivered to {user_id}")


@sio.event
async def message_read(sid, data):
    """
    Mark message as read
    
    Args:
        data: {
            'message_id': str,
            'room_id': str
        }
    """
    user_id = user_sessions.get(sid)
    
    if not user_id:
        return
    
    message_id = data.get('message_id')
    room_id = data.get('room_id')
    
    if message_id and room_id:
        # Notify sender that message was read
        await sio.emit('message_status', {
            'message_id': message_id,
            'room_id': room_id,
            'status': 'read',
            'read_by': user_id,
            'timestamp': asyncio.get_event_loop().time()
        }, room=room_id)
        
        logger.info(f"Message {message_id} read by {user_id}")


@sio.event
async def mark_all_read(sid, data):
    """
    Mark all messages in a room as read
    
    Args:
        data: {
            'room_id': str
        }
    """
    user_id = user_sessions.get(sid)
    room_id = data.get('room_id')
    
    if user_id and room_id:
        await sio.emit('all_messages_read', {
            'room_id': room_id,
            'read_by': user_id,
            'timestamp': asyncio.get_event_loop().time()
        }, room=room_id)
        
        logger.info(f"All messages in room {room_id} marked as read by {user_id}")


# Export server instance
def get_socket_app():
    """
    Get Socket.IO application instance
    """
    return sio


# ===== WebRTC Signaling Events =====

@sio.event
async def webrtc_offer(sid, data):
    """
    Handle WebRTC offer from caller.
    Forward offer to recipient.
    
    Args:
        data: {
            'call_id': str,
            'offer': dict,
            'to_user_id': str
        }
    """
    try:
        user_id = user_sessions.get(sid)
        if not user_id:
            await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
            return
        
        call_id = data.get('call_id')
        offer = data.get('offer')
        to_user_id = data.get('to_user_id')
        
        if not all([call_id, offer, to_user_id]):
            await sio.emit('error', {'message': 'Missing required fields'}, room=sid)
            return
        
        # Find recipient's session ID
        recipient_sid = None
        for s, u in user_sessions.items():
            if u == to_user_id:
                recipient_sid = s
                break
        
        # Forward offer to recipient
        if recipient_sid:
            await sio.emit('webrtc_offer', {
                'call_id': call_id,
                'offer': offer,
                'from_user_id': user_id
            }, room=recipient_sid)
            logger.info(f"WebRTC offer forwarded from {user_id} to {to_user_id}")
        else:
            await sio.emit('error', {'message': 'Recipient not online'}, room=sid)
    
    except Exception as e:
        logger.error(f"Error handling WebRTC offer: {str(e)}")
        await sio.emit('error', {'message': 'Failed to send offer'}, room=sid)


@sio.event
async def webrtc_answer(sid, data):
    """
    Handle WebRTC answer from callee.
    Forward answer to caller.
    
    Args:
        data: {
            'call_id': str,
            'answer': dict,
            'to_user_id': str
        }
    """
    try:
        user_id = user_sessions.get(sid)
        if not user_id:
            await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
            return
        
        call_id = data.get('call_id')
        answer = data.get('answer')
        to_user_id = data.get('to_user_id')
        
        if not all([call_id, answer, to_user_id]):
            await sio.emit('error', {'message': 'Missing required fields'}, room=sid)
            return
        
        # Find caller's session ID
        caller_sid = None
        for s, u in user_sessions.items():
            if u == to_user_id:
                caller_sid = s
                break
        
        # Forward answer to caller
        if caller_sid:
            await sio.emit('webrtc_answer', {
                'call_id': call_id,
                'answer': answer,
                'from_user_id': user_id
            }, room=caller_sid)
            logger.info(f"WebRTC answer forwarded from {user_id} to {to_user_id}")
        else:
            await sio.emit('error', {'message': 'Caller not online'}, room=sid)
    
    except Exception as e:
        logger.error(f"Error handling WebRTC answer: {str(e)}")
        await sio.emit('error', {'message': 'Failed to send answer'}, room=sid)


@sio.event
async def webrtc_ice_candidate(sid, data):
    """
    Handle ICE candidate exchange.
    Forward candidate to peer.
    
    Args:
        data: {
            'call_id': str,
            'candidate': dict,
            'to_user_id': str
        }
    """
    try:
        user_id = user_sessions.get(sid)
        if not user_id:
            await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
            return
        
        call_id = data.get('call_id')
        candidate = data.get('candidate')
        to_user_id = data.get('to_user_id')
        
        if not all([call_id, candidate, to_user_id]):
            await sio.emit('error', {'message': 'Missing required fields'}, room=sid)
            return
        
        # Find peer's session ID
        peer_sid = None
        for s, u in user_sessions.items():
            if u == to_user_id:
                peer_sid = s
                break
        
        # Forward ICE candidate to peer
        if peer_sid:
            await sio.emit('webrtc_ice_candidate', {
                'call_id': call_id,
                'candidate': candidate,
                'from_user_id': user_id
            }, room=peer_sid)
            logger.debug(f"ICE candidate forwarded from {user_id} to {to_user_id}")
        else:
            logger.warning(f"Peer {to_user_id} not online for ICE candidate")
    
    except Exception as e:
        logger.error(f"Error handling ICE candidate: {str(e)}")
        await sio.emit('error', {'message': 'Failed to send ICE candidate'}, room=sid)


@sio.event
async def webrtc_call_ringing(sid, data):
    """
    Notify participants that call is ringing.
    
    Args:
        data: {
            'call_id': str,
            'participants': list,
            'type': str
        }
    """
    try:
        user_id = user_sessions.get(sid)
        if not user_id:
            await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
            return
        
        call_id = data.get('call_id')
        participants = data.get('participants', [])
        call_type = data.get('type', 'audio')
        
        # Notify all participants except caller
        for participant_id in participants:
            if participant_id != user_id:
                # Find participant's session ID
                participant_sid = None
                for s, u in user_sessions.items():
                    if u == participant_id:
                        participant_sid = s
                        break
                
                if participant_sid:
                    await sio.emit('webrtc_call_ringing', {
                        'call_id': call_id,
                        'caller_id': user_id,
                        'type': call_type,
                        'participants': participants
                    }, room=participant_sid)
        
        logger.info(f"Call ringing notification sent for {call_id}")
    
    except Exception as e:
        logger.error(f"Error handling call ringing: {str(e)}")
        await sio.emit('error', {'message': 'Failed to notify participants'}, room=sid)


@sio.event
async def webrtc_call_accepted(sid, data):
    """
    Notify caller that call was accepted.
    
    Args:
        data: {
            'call_id': str,
            'caller_id': str
        }
    """
    try:
        user_id = user_sessions.get(sid)
        if not user_id:
            await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
            return
        
        call_id = data.get('call_id')
        caller_id = data.get('caller_id')
        
        # Find caller's session ID
        caller_sid = None
        for s, u in user_sessions.items():
            if u == caller_id:
                caller_sid = s
                break
        
        # Notify caller
        if caller_sid:
            await sio.emit('webrtc_call_accepted', {
                'call_id': call_id,
                'user_id': user_id
            }, room=caller_sid)
            logger.info(f"Call {call_id} accepted by {user_id}")
    
    except Exception as e:
        logger.error(f"Error handling call accepted: {str(e)}")
        await sio.emit('error', {'message': 'Failed to notify caller'}, room=sid)


@sio.event
async def webrtc_call_rejected(sid, data):
    """
    Notify caller that call was rejected.
    
    Args:
        data: {
            'call_id': str,
            'caller_id': str
        }
    """
    try:
        user_id = user_sessions.get(sid)
        if not user_id:
            await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
            return
        
        call_id = data.get('call_id')
        caller_id = data.get('caller_id')
        
        # Find caller's session ID
        caller_sid = None
        for s, u in user_sessions.items():
            if u == caller_id:
                caller_sid = s
                break
        
        # Notify caller
        if caller_sid:
            await sio.emit('webrtc_call_rejected', {
                'call_id': call_id,
                'user_id': user_id
            }, room=caller_sid)
            logger.info(f"Call {call_id} rejected by {user_id}")
    
    except Exception as e:
        logger.error(f"Error handling call rejected: {str(e)}")
        await sio.emit('error', {'message': 'Failed to notify caller'}, room=sid)


@sio.event
async def webrtc_call_ended(sid, data):
    """
    Notify all participants that call ended.
    
    Args:
        data: {
            'call_id': str,
            'participants': list
        }
    """
    try:
        user_id = user_sessions.get(sid)
        if not user_id:
            await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
            return
        
        call_id = data.get('call_id')
        participants = data.get('participants', [])
        
        # Notify all participants except the one who ended
        for participant_id in participants:
            if participant_id != user_id:
                # Find participant's session ID
                participant_sid = None
                for s, u in user_sessions.items():
                    if u == participant_id:
                        participant_sid = s
                        break
                
                if participant_sid:
                    await sio.emit('webrtc_call_ended', {
                        'call_id': call_id,
                        'ended_by': user_id
                    }, room=participant_sid)
        
        logger.info(f"Call {call_id} ended by {user_id}")
    
    except Exception as e:
        logger.error(f"Error handling call ended: {str(e)}")
        await sio.emit('error', {'message': 'Failed to notify participants'}, room=sid)
