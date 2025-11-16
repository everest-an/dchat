"""
WebSocket Real-time Notifications

Provides WebSocket endpoints for real-time notifications:
- Red packet claim notifications
- Transaction status updates
- Payment confirmations
- System alerts

Uses FastAPI WebSocket support with connection management.

Author: Manus AI
Date: 2024-11-16
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, List, Set
import logging
import json
import asyncio
from enum import Enum

from src.models.user import User, db
from src.models.red_packet import RedPacket, RedPacketClaim
from src.middleware.auth import require_auth

logger = logging.getLogger(__name__)

websocket_bp = APIRouter(prefix="/api/ws", tags=["WebSocket"])

# Connection manager for handling multiple WebSocket connections
class ConnectionManager:
    """Manages WebSocket connections and broadcasts messages"""
    
    def __init__(self):
        # Store active connections: {user_id: set of WebSocket connections}
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Store connection metadata
        self.connection_metadata: Dict[WebSocket, Dict] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Register a new WebSocket connection"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        self.connection_metadata[websocket] = {
            'user_id': user_id,
            'connected_at': datetime.utcnow(),
            'message_count': 0
        }
        
        logger.info(f"User {user_id} connected to WebSocket")
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        """Unregister a WebSocket connection"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        if websocket in self.connection_metadata:
            del self.connection_metadata[websocket]
        
        logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def broadcast_to_user(self, user_id: int, message: dict):
        """Send message to all connections of a specific user"""
        if user_id not in self.active_connections:
            return
        
        disconnected = set()
        for connection in self.active_connections[user_id]:
            try:
                await connection.send_json(message)
                # Update message count
                if connection in self.connection_metadata:
                    self.connection_metadata[connection]['message_count'] += 1
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {str(e)}")
                disconnected.add(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection, user_id)
    
    async def broadcast_to_users(self, user_ids: List[int], message: dict):
        """Send message to multiple users"""
        for user_id in user_ids:
            await self.broadcast_to_user(user_id, message)
    
    async def broadcast_to_all(self, message: dict):
        """Send message to all connected users"""
        user_ids = list(self.active_connections.keys())
        await self.broadcast_to_users(user_ids, message)
    
    def get_active_users(self) -> int:
        """Get number of active users"""
        return len(self.active_connections)
    
    def get_active_connections(self) -> int:
        """Get total number of active connections"""
        return sum(len(conns) for conns in self.active_connections.values())


# Global connection manager
manager = ConnectionManager()


# Notification types
class NotificationType(str, Enum):
    RED_PACKET_CREATED = "red_packet_created"
    RED_PACKET_CLAIMED = "red_packet_claimed"
    RED_PACKET_COMPLETED = "red_packet_completed"
    RED_PACKET_EXPIRED = "red_packet_expired"
    RED_PACKET_CANCELLED = "red_packet_cancelled"
    TRANSACTION_PENDING = "transaction_pending"
    TRANSACTION_CONFIRMED = "transaction_confirmed"
    TRANSACTION_FINALIZED = "transaction_finalized"
    TRANSACTION_FAILED = "transaction_failed"
    PAYMENT_RECEIVED = "payment_received"
    SYSTEM_ALERT = "system_alert"


@websocket_bp.websocket("/notifications/{token}")
async def websocket_notifications(
    websocket: WebSocket,
    token: str,
    query: str = Query(None)
):
    """
    WebSocket endpoint for real-time notifications
    
    Path Parameters:
        token: JWT authentication token
    
    Query Parameters:
        query: Optional filter for notification types (comma-separated)
    
    Message Format (Received):
        {
            "type": "subscribe" | "unsubscribe" | "ping",
            "data": {...}
        }
    
    Message Format (Sent):
        {
            "type": "notification_type",
            "timestamp": "2024-11-16T07:30:00Z",
            "data": {...}
        }
    """
    try:
        # Authenticate user from token
        from src.middleware.auth import decode_token
        user_id = decode_token(token)
        
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Connect user
        await manager.connect(websocket, user_id)
        
        # Send connection confirmation
        await websocket.send_json({
            'type': 'connection_established',
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'message': 'Connected to notification service'
        })
        
        # Parse notification filters
        notification_filters = set()
        if query:
            notification_filters = set(query.split(','))
        
        # Listen for messages
        while True:
            data = await websocket.receive_json()
            
            message_type = data.get('type')
            
            if message_type == 'ping':
                # Respond to ping
                await websocket.send_json({
                    'type': 'pong',
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            elif message_type == 'subscribe':
                # Subscribe to notification types
                notification_types = data.get('data', {}).get('types', [])
                notification_filters.update(notification_types)
                
                await websocket.send_json({
                    'type': 'subscription_updated',
                    'timestamp': datetime.utcnow().isoformat(),
                    'subscribed_to': list(notification_filters)
                })
            
            elif message_type == 'unsubscribe':
                # Unsubscribe from notification types
                notification_types = data.get('data', {}).get('types', [])
                notification_filters.difference_update(notification_types)
                
                await websocket.send_json({
                    'type': 'subscription_updated',
                    'timestamp': datetime.utcnow().isoformat(),
                    'subscribed_to': list(notification_filters)
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        logger.info(f"User {user_id} disconnected from WebSocket")
    
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.close(code=status.WS_1011_SERVER_ERROR)
        except:
            pass


@websocket_bp.get('/status')
async def websocket_status():
    """
    Get WebSocket connection status
    
    Returns:
        JSON response with connection statistics
    """
    return {
        'success': True,
        'active_users': manager.get_active_users(),
        'active_connections': manager.get_active_connections(),
        'timestamp': datetime.utcnow().isoformat()
    }


# Notification helper functions
async def notify_red_packet_created(packet_id: str, sender_id: int, packet_data: dict):
    """Notify users about new red packet"""
    message = {
        'type': NotificationType.RED_PACKET_CREATED.value,
        'timestamp': datetime.utcnow().isoformat(),
        'data': {
            'packet_id': packet_id,
            'sender_id': sender_id,
            'message': packet_data.get('message'),
            'total_amount': packet_data.get('total_amount'),
            'packet_count': packet_data.get('packet_count'),
            'distribution_type': packet_data.get('distribution_type')
        }
    }
    
    # Broadcast to sender
    await manager.broadcast_to_user(sender_id, message)


async def notify_red_packet_claimed(
    packet_id: str,
    sender_id: int,
    recipient_id: int,
    claim_amount: int,
    remaining_packets: int
):
    """Notify users about red packet claim"""
    message = {
        'type': NotificationType.RED_PACKET_CLAIMED.value,
        'timestamp': datetime.utcnow().isoformat(),
        'data': {
            'packet_id': packet_id,
            'sender_id': sender_id,
            'recipient_id': recipient_id,
            'claim_amount': claim_amount,
            'remaining_packets': remaining_packets
        }
    }
    
    # Notify sender and recipient
    await manager.broadcast_to_users([sender_id, recipient_id], message)


async def notify_red_packet_completed(packet_id: str, sender_id: int, total_claimed: int):
    """Notify users about red packet completion"""
    message = {
        'type': NotificationType.RED_PACKET_COMPLETED.value,
        'timestamp': datetime.utcnow().isoformat(),
        'data': {
            'packet_id': packet_id,
            'sender_id': sender_id,
            'total_claimed': total_claimed
        }
    }
    
    # Notify sender
    await manager.broadcast_to_user(sender_id, message)


async def notify_transaction_status(
    tx_hash: str,
    user_id: int,
    status: str,
    amount: int,
    block_number: int = None
):
    """Notify user about transaction status update"""
    notification_type = {
        'pending': NotificationType.TRANSACTION_PENDING,
        'confirmed': NotificationType.TRANSACTION_CONFIRMED,
        'finalized': NotificationType.TRANSACTION_FINALIZED,
        'failed': NotificationType.TRANSACTION_FAILED
    }.get(status, NotificationType.TRANSACTION_PENDING)
    
    message = {
        'type': notification_type.value,
        'timestamp': datetime.utcnow().isoformat(),
        'data': {
            'transaction_hash': tx_hash,
            'status': status,
            'amount': amount,
            'block_number': block_number
        }
    }
    
    # Notify user
    await manager.broadcast_to_user(user_id, message)


async def notify_payment_received(
    user_id: int,
    sender_address: str,
    amount: int,
    token: str = 'DOT'
):
    """Notify user about payment received"""
    message = {
        'type': NotificationType.PAYMENT_RECEIVED.value,
        'timestamp': datetime.utcnow().isoformat(),
        'data': {
            'sender_address': sender_address,
            'amount': amount,
            'token': token
        }
    }
    
    # Notify user
    await manager.broadcast_to_user(user_id, message)


async def notify_system_alert(
    user_ids: List[int],
    alert_message: str,
    severity: str = 'info'
):
    """Send system alert to users"""
    message = {
        'type': NotificationType.SYSTEM_ALERT.value,
        'timestamp': datetime.utcnow().isoformat(),
        'data': {
            'message': alert_message,
            'severity': severity  # info, warning, error
        }
    }
    
    # Broadcast to users
    await manager.broadcast_to_users(user_ids, message)
