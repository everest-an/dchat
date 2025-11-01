"""
Socket.IO Server for Real-time Communication
Handles real-time messaging, online status, and typing indicators
"""

import socketio
import asyncio
from typing import Dict, Set
import logging

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
    Authenticate user and set up session
    
    Args:
        data: {
            'user_id': str,
            'token': str (optional)
        }
    """
    user_id = data.get('user_id')
    
    if not user_id:
        await sio.emit('error', {'message': 'User ID required'}, room=sid)
        return
    
    # Store session
    user_sessions[sid] = user_id
    online_users.add(user_id)
    
    # Initialize user rooms if not exists
    if user_id not in user_rooms:
        user_rooms[user_id] = set()
    
    logger.info(f"User authenticated: {user_id} (sid: {sid})")
    
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


# Export server instance
def get_socket_app():
    """
    Get Socket.IO application instance
    """
    return sio
