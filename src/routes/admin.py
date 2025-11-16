"""
Admin Management Routes

Provides admin endpoints for:
- WebSocket connection management
- Refund processing
- System monitoring
- Transaction monitoring

Requires admin authentication.

Author: Manus AI
Date: 2024-11-16
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import logging

from src.models.user import User, db
from src.middleware.auth import require_auth
from src.routes.websocket_notifications import manager as ws_manager
from src.routes.refund_processor import refund_processor, get_pending_refunds, get_refund_status

logger = logging.getLogger(__name__)

admin_bp = APIRouter(prefix="/api/admin", tags=["Admin"])


def require_admin(current_user: dict = Depends(require_auth)):
    """Dependency to require admin role"""
    user_id = current_user.get('user_id')
    user = db.session.query(User).filter_by(id=user_id).first()
    
    if not user or not getattr(user, 'is_admin', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Admin access required'
        )
    
    return current_user


# ============================================================================
# WEBSOCKET MANAGEMENT
# ============================================================================

@admin_bp.get('/websocket/status')
async def get_websocket_status(current_user: dict = Depends(require_admin)):
    """
    Get WebSocket connection status
    
    Returns:
        JSON response with connection statistics
    """
    return {
        'success': True,
        'active_users': ws_manager.get_active_users(),
        'active_connections': ws_manager.get_active_connections(),
        'timestamp': datetime.utcnow().isoformat()
    }


@admin_bp.get('/websocket/connections')
async def get_websocket_connections(current_user: dict = Depends(require_admin)):
    """
    Get detailed WebSocket connection information
    
    Returns:
        JSON response with connection details
    """
    connections = []
    
    for user_id, conns in ws_manager.active_connections.items():
        for conn in conns:
            metadata = ws_manager.connection_metadata.get(conn, {})
            connections.append({
                'user_id': user_id,
                'connected_at': metadata.get('connected_at', '').isoformat() if metadata.get('connected_at') else None,
                'message_count': metadata.get('message_count', 0)
            })
    
    return {
        'success': True,
        'total_connections': len(connections),
        'connections': connections,
        'timestamp': datetime.utcnow().isoformat()
    }


@admin_bp.post('/websocket/broadcast')
async def broadcast_websocket_message(
    message_data: dict,
    current_user: dict = Depends(require_admin)
):
    """
    Broadcast message to all connected users
    
    Request Body:
        {
            "type": "system_alert",
            "data": {
                "message": "System maintenance scheduled",
                "severity": "warning"
            }
        }
    
    Returns:
        JSON response with broadcast result
    """
    try:
        message = {
            'type': message_data.get('type'),
            'timestamp': datetime.utcnow().isoformat(),
            'data': message_data.get('data', {})
        }
        
        await ws_manager.broadcast_to_all(message)
        
        logger.info(f"Admin broadcast message: {message_data.get('type')}")
        
        return {
            'success': True,
            'message': 'Message broadcast successfully',
            'users_notified': ws_manager.get_active_users(),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error broadcasting message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to broadcast message: {str(e)}'
        )


# ============================================================================
# REFUND MANAGEMENT
# ============================================================================

@admin_bp.get('/refunds/pending')
async def get_pending_refunds_list(
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(require_admin)
):
    """
    Get list of pending refunds
    
    Query Parameters:
        limit: Maximum number of refunds to return
    
    Returns:
        JSON response with pending refunds
    """
    try:
        pending = get_pending_refunds()
        
        return {
            'success': True,
            'pending_count': len(pending),
            'total_amount': sum(r.get('refund_amount', 0) for r in pending),
            'refunds': pending[:limit],
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting pending refunds: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get pending refunds: {str(e)}'
        )


@admin_bp.get('/refunds/{packet_id}')
async def get_refund_status_endpoint(
    packet_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    Get refund status for a specific packet
    
    Path Parameters:
        packet_id: Red packet ID
    
    Returns:
        JSON response with refund status
    """
    try:
        status_info = get_refund_status(packet_id)
        
        if not status_info.get('success'):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Packet not found'
            )
        
        return status_info
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting refund status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get refund status: {str(e)}'
        )


@admin_bp.post('/refunds/process')
async def process_refunds(
    current_user: dict = Depends(require_admin)
):
    """
    Trigger refund processing
    
    Returns:
        JSON response with processing results
    """
    try:
        result = await refund_processor.run_all_processors()
        
        logger.info(f"Admin triggered refund processing: {result}")
        
        return result
    
    except Exception as e:
        logger.error(f"Error processing refunds: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to process refunds: {str(e)}'
        )


@admin_bp.get('/refunds/history')
async def get_refund_history(
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(require_admin)
):
    """
    Get refund processing history
    
    Query Parameters:
        limit: Maximum number of records to return
    
    Returns:
        JSON response with refund history
    """
    try:
        history = refund_processor.get_refund_history(limit)
        
        return {
            'success': True,
            'total_records': len(history),
            'total_refunded': sum(r.get('refund_amount', 0) for r in history),
            'history': history,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting refund history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get refund history: {str(e)}'
        )


@admin_bp.get('/refunds/processor-status')
async def get_refund_processor_status(
    current_user: dict = Depends(require_admin)
):
    """
    Get refund processor status
    
    Returns:
        JSON response with processor status
    """
    try:
        status_info = refund_processor.get_status()
        
        return {
            'success': True,
            'processor_status': status_info,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting processor status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get processor status: {str(e)}'
        )


# ============================================================================
# SYSTEM MONITORING
# ============================================================================

@admin_bp.get('/system/health')
async def get_system_health(current_user: dict = Depends(require_admin)):
    """
    Get system health status
    
    Returns:
        JSON response with system health information
    """
    try:
        # Get database connection status
        db_status = 'healthy'
        try:
            db.session.execute('SELECT 1')
        except:
            db_status = 'unhealthy'
        
        # Get WebSocket status
        ws_status = 'healthy'
        
        # Get refund processor status
        processor_status = refund_processor.get_status()
        
        return {
            'success': True,
            'database': db_status,
            'websocket': ws_status,
            'refund_processor': processor_status,
            'active_users': ws_manager.get_active_users(),
            'active_connections': ws_manager.get_active_connections(),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting system health: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get system health: {str(e)}'
        )


@admin_bp.get('/system/stats')
async def get_system_stats(current_user: dict = Depends(require_admin)):
    """
    Get system statistics
    
    Returns:
        JSON response with system statistics
    """
    try:
        from src.models.red_packet import RedPacket, RedPacketClaim
        
        # Get red packet statistics
        total_packets = db.session.query(RedPacket).count()
        active_packets = db.session.query(RedPacket).filter_by(status='active').count()
        completed_packets = db.session.query(RedPacket).filter_by(status='completed').count()
        
        # Get claim statistics
        total_claims = db.session.query(RedPacketClaim).count()
        
        # Get user statistics
        total_users = db.session.query(User).count()
        
        return {
            'success': True,
            'red_packets': {
                'total': total_packets,
                'active': active_packets,
                'completed': completed_packets
            },
            'claims': {
                'total': total_claims
            },
            'users': {
                'total': total_users
            },
            'websocket': {
                'active_users': ws_manager.get_active_users(),
                'active_connections': ws_manager.get_active_connections()
            },
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting system stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get system stats: {str(e)}'
        )
