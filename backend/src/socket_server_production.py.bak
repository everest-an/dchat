"""
Production-Grade Socket.IO Server for Real-time Communication
Supports multi-server clustering, message persistence, and high concurrency
"""

import socketio
import asyncio
import aioredis
from typing import Dict, Set, Optional
import logging
import jwt
import os
import json
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from src.models.message import Message
from src.models.user import User

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables
SECRET_KEY = os.environ.get('SECRET_KEY', 'dchat-secret-key')
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql+asyncpg://user:pass@localhost/dchat')

# Redis connection pool
redis_pool = None

# Database engine
db_engine = None
AsyncSessionLocal = None

# Create Socket.IO server with Redis adapter for clustering
mgr = socketio.AsyncRedisManager(REDIS_URL)
sio = socketio.AsyncServer(
    async_mode='aiohttp',
    client_manager=mgr,
    cors_allowed_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    logger=True,
    engineio_logger=False,
    ping_timeout=60,
    ping_interval=25,
    max_http_buffer_size=10 * 1024 * 1024  # 10MB
)


async def init_redis():
    """Initialize Redis connection pool"""
    global redis_pool
    redis_pool = await aioredis.create_redis_pool(REDIS_URL, minsize=5, maxsize=20)
    logger.info("Redis connection pool initialized")


async def init_database():
    """Initialize database connection"""
    global db_engine, AsyncSessionLocal
    db_engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        pool_size=20,
        max_overflow=40,
        pool_pre_ping=True
    )
    AsyncSessionLocal = sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    logger.info("Database connection initialized")


async def close_connections():
    """Close all connections"""
    if redis_pool:
        redis_pool.close()
        await redis_pool.wait_closed()
    if db_engine:
        await db_engine.dispose()
    logger.info("All connections closed")


async def verify_jwt_token(token: str) -> Optional[str]:
    """Verify JWT token and return user_id"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = str(payload.get('user_id'))
        return user_id if user_id else None
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None


async def get_user_session(sid: str) -> Optional[str]:
    """Get user_id from session ID via Redis"""
    if not redis_pool:
        return None
    user_id = await redis_pool.get(f"session:{sid}")
    return user_id.decode() if user_id else None


async def set_user_session(sid: str, user_id: str, ttl: int = 86400):
    """Store user session in Redis with TTL"""
    if redis_pool:
        await redis_pool.setex(f"session:{sid}", ttl, user_id)
        await redis_pool.sadd(f"user_sessions:{user_id}", sid)


async def del_user_session(sid: str):
    """Delete user session from Redis"""
    if not redis_pool:
        return
    user_id = await get_user_session(sid)
    if user_id:
        await redis_pool.delete(f"session:{sid}")
        await redis_pool.srem(f"user_sessions:{user_id}", sid)


async def set_user_online(user_id: str):
    """Mark user as online in Redis"""
    if redis_pool:
        await redis_pool.sadd("online_users", user_id)
        await redis_pool.setex(f"user_online:{user_id}", 300, "1")  # 5 min TTL


async def set_user_offline(user_id: str):
    """Mark user as offline in Redis"""
    if not redis_pool:
        return
    # Check if user has other active sessions
    sessions = await redis_pool.smembers(f"user_sessions:{user_id}")
    if not sessions or len(sessions) == 0:
        await redis_pool.srem("online_users", user_id)
        await redis_pool.delete(f"user_online:{user_id}")


async def get_online_users() -> Set[str]:
    """Get list of online users from Redis"""
    if not redis_pool:
        return set()
    users = await redis_pool.smembers("online_users")
    return {u.decode() for u in users}


async def save_message_to_db(sender_id: str, receiver_id: str, content: str, 
                             message_type: str = 'text', metadata: dict = None) -> Optional[int]:
    """Save message to database"""
    if not AsyncSessionLocal:
        logger.error("Database not initialized")
        return None
    
    try:
        async with AsyncSessionLocal() as session:
            message = Message(
                sender_id=int(sender_id),
                receiver_id=int(receiver_id),
                content=content,
                message_type=message_type,
                timestamp=datetime.utcnow(),
                metadata=json.dumps(metadata) if metadata else None
            )
            session.add(message)
            await session.commit()
            await session.refresh(message)
            logger.info(f"Message saved to DB: {message.id}")
            return message.id
    except Exception as e:
        logger.error(f"Failed to save message to DB: {e}")
        return None


async def get_undelivered_messages(user_id: str, limit: int = 100):
    """Get undelivered messages for user from database"""
    if not AsyncSessionLocal:
        return []
    
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                f"SELECT * FROM messages WHERE receiver_id = {user_id} "
                f"AND delivered = FALSE ORDER BY timestamp DESC LIMIT {limit}"
            )
            messages = result.fetchall()
            return messages
    except Exception as e:
        logger.error(f"Failed to get undelivered messages: {e}")
        return []


@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    logger.info(f"Client connected: {sid} from {environ.get('REMOTE_ADDR')}")
    return True


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"Client disconnected: {sid}")
    
    # Get user_id from session
    user_id = await get_user_session(sid)
    if user_id:
        # Remove session
        await del_user_session(sid)
        
        # Update online status
        await set_user_offline(user_id)
        
        # Broadcast offline status
        await sio.emit('user_status', {
            'user_id': user_id,
            'status': 'offline',
            'timestamp': datetime.utcnow().isoformat()
        })


@sio.event
async def authenticate(sid, data):
    """
    Authenticate user with JWT token
    
    Args:
        data: {
            'token': str (required) - JWT authentication token
        }
    """
    token = data.get('token')
    
    if not token:
        await sio.emit('error', {
            'code': 'AUTH_REQUIRED',
            'message': 'Authentication token required'
        }, room=sid)
        return
    
    # Verify JWT token
    user_id = await verify_jwt_token(token)
    
    if not user_id:
        await sio.emit('error', {
            'code': 'AUTH_FAILED',
            'message': 'Invalid or expired token'
        }, room=sid)
        return
    
    # Store session in Redis
    await set_user_session(sid, user_id)
    
    # Mark user as online
    await set_user_online(user_id)
    
    logger.info(f"User authenticated: {user_id} (sid: {sid})")
    
    # Send authentication success
    await sio.emit('authenticated', {
        'user_id': user_id,
        'timestamp': datetime.utcnow().isoformat()
    }, room=sid)
    
    # Broadcast online status
    await sio.emit('user_status', {
        'user_id': user_id,
        'status': 'online',
        'timestamp': datetime.utcnow().isoformat()
    })
    
    # Send undelivered messages
    undelivered = await get_undelivered_messages(user_id)
    if undelivered:
        await sio.emit('undelivered_messages', {
            'messages': undelivered
        }, room=sid)


@sio.event
async def join_room(sid, data):
    """
    Join a chat room (conversation)
    
    Args:
        data: {
            'room_id': str - conversation ID or user pair ID
        }
    """
    user_id = await get_user_session(sid)
    
    if not user_id:
        await sio.emit('error', {
            'code': 'NOT_AUTHENTICATED',
            'message': 'Not authenticated'
        }, room=sid)
        return
    
    room_id = data.get('room_id')
    if not room_id:
        await sio.emit('error', {
            'code': 'INVALID_REQUEST',
            'message': 'Room ID required'
        }, room=sid)
        return
    
    # Join Socket.IO room
    sio.enter_room(sid, room_id)
    
    # Store in Redis
    if redis_pool:
        await redis_pool.sadd(f"user_rooms:{user_id}", room_id)
        await redis_pool.sadd(f"room_members:{room_id}", user_id)
    
    logger.info(f"User {user_id} joined room {room_id}")
    
    # Notify room members
    await sio.emit('user_joined', {
        'user_id': user_id,
        'room_id': room_id,
        'timestamp': datetime.utcnow().isoformat()
    }, room=room_id, skip_sid=sid)
    
    await sio.emit('room_joined', {
        'room_id': room_id
    }, room=sid)


@sio.event
async def leave_room(sid, data):
    """
    Leave a chat room
    
    Args:
        data: {
            'room_id': str
        }
    """
    user_id = await get_user_session(sid)
    if not user_id:
        return
    
    room_id = data.get('room_id')
    if not room_id:
        return
    
    # Leave Socket.IO room
    sio.leave_room(sid, room_id)
    
    # Remove from Redis
    if redis_pool:
        await redis_pool.srem(f"user_rooms:{user_id}", room_id)
        await redis_pool.srem(f"room_members:{room_id}", user_id)
    
    logger.info(f"User {user_id} left room {room_id}")
    
    # Notify room members
    await sio.emit('user_left', {
        'user_id': user_id,
        'room_id': room_id,
        'timestamp': datetime.utcnow().isoformat()
    }, room=room_id)


@sio.event
async def send_message(sid, data):
    """
    Send a message to another user
    
    Args:
        data: {
            'receiver_id': str (required),
            'content': str (required),
            'message_type': str (optional, default: 'text'),
            'metadata': dict (optional)
        }
    """
    user_id = await get_user_session(sid)
    
    if not user_id:
        await sio.emit('error', {
            'code': 'NOT_AUTHENTICATED',
            'message': 'Not authenticated'
        }, room=sid)
        return
    
    receiver_id = data.get('receiver_id')
    content = data.get('content')
    message_type = data.get('message_type', 'text')
    metadata = data.get('metadata')
    
    if not receiver_id or not content:
        await sio.emit('error', {
            'code': 'INVALID_REQUEST',
            'message': 'Receiver ID and content required'
        }, room=sid)
        return
    
    # Save message to database
    message_id = await save_message_to_db(
        sender_id=user_id,
        receiver_id=receiver_id,
        content=content,
        message_type=message_type,
        metadata=metadata
    )
    
    if not message_id:
        await sio.emit('error', {
            'code': 'MESSAGE_SAVE_FAILED',
            'message': 'Failed to save message'
        }, room=sid)
        return
    
    # Create room ID for this conversation
    room_id = f"chat_{min(user_id, receiver_id)}_{max(user_id, receiver_id)}"
    
    # Broadcast message to room
    message_data = {
        'message_id': message_id,
        'sender_id': user_id,
        'receiver_id': receiver_id,
        'content': content,
        'message_type': message_type,
        'metadata': metadata,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    await sio.emit('new_message', message_data, room=room_id)
    
    # Also send to specific receiver's personal room
    await sio.emit('new_message', message_data, room=f"user_{receiver_id}")
    
    logger.info(f"Message {message_id} sent from {user_id} to {receiver_id}")
    
    # Send delivery confirmation to sender
    await sio.emit('message_sent', {
        'message_id': message_id,
        'timestamp': datetime.utcnow().isoformat()
    }, room=sid)


@sio.event
async def typing_start(sid, data):
    """
    Notify that user is typing
    
    Args:
        data: {
            'receiver_id': str
        }
    """
    user_id = await get_user_session(sid)
    receiver_id = data.get('receiver_id')
    
    if user_id and receiver_id:
        room_id = f"chat_{min(user_id, receiver_id)}_{max(user_id, receiver_id)}"
        await sio.emit('user_typing', {
            'user_id': user_id,
            'typing': True
        }, room=room_id, skip_sid=sid)


@sio.event
async def typing_stop(sid, data):
    """
    Notify that user stopped typing
    
    Args:
        data: {
            'receiver_id': str
        }
    """
    user_id = await get_user_session(sid)
    receiver_id = data.get('receiver_id')
    
    if user_id and receiver_id:
        room_id = f"chat_{min(user_id, receiver_id)}_{max(user_id, receiver_id)}"
        await sio.emit('user_typing', {
            'user_id': user_id,
            'typing': False
        }, room=room_id, skip_sid=sid)


@sio.event
async def message_delivered(sid, data):
    """
    Mark message as delivered
    
    Args:
        data: {
            'message_id': int
        }
    """
    user_id = await get_user_session(sid)
    message_id = data.get('message_id')
    
    if not user_id or not message_id:
        return
    
    # Update database
    if AsyncSessionLocal:
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(
                    f"UPDATE messages SET delivered = TRUE, "
                    f"delivered_at = '{datetime.utcnow().isoformat()}' "
                    f"WHERE id = {message_id}"
                )
                await session.commit()
        except Exception as e:
            logger.error(f"Failed to mark message as delivered: {e}")


@sio.event
async def message_read(sid, data):
    """
    Mark message as read
    
    Args:
        data: {
            'message_id': int
        }
    """
    user_id = await get_user_session(sid)
    message_id = data.get('message_id')
    
    if not user_id or not message_id:
        return
    
    # Update database
    if AsyncSessionLocal:
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    f"UPDATE messages SET read = TRUE, "
                    f"read_at = '{datetime.utcnow().isoformat()}' "
                    f"WHERE id = {message_id} RETURNING sender_id"
                )
                await session.commit()
                
                # Notify sender
                row = result.fetchone()
                if row:
                    sender_id = str(row[0])
                    await sio.emit('message_read', {
                        'message_id': message_id,
                        'read_by': user_id,
                        'timestamp': datetime.utcnow().isoformat()
                    }, room=f"user_{sender_id}")
        except Exception as e:
            logger.error(f"Failed to mark message as read: {e}")


@sio.event
async def get_online_users(sid, data):
    """Get list of online users"""
    users = await get_online_users()
    await sio.emit('online_users', {
        'users': list(users),
        'count': len(users)
    }, room=sid)


def get_socket_app():
    """Get Socket.IO server instance"""
    return sio


async def startup():
    """Initialize connections on startup"""
    await init_redis()
    await init_database()


async def shutdown():
    """Close connections on shutdown"""
    await close_connections()
