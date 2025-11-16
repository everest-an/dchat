"""
Red Packet API Routes

Provides REST API endpoints for red packet management:
- Create red packet
- Claim red packet
- Get red packet details
- Cancel red packet
- List red packets

Supports multiple tokens and distribution types (random/equal).

Author: Manus AI
Date: 2024-11-16
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
from enum import Enum
import logging
import random

from src.models.user import User, db
from src.models.red_packet import RedPacket, RedPacketClaim
from src.middleware.auth import require_auth
from src.middleware.error_handler import ValidationError

logger = logging.getLogger(__name__)

red_packets_bp = APIRouter(prefix="/api/red-packets", tags=["Red Packets"])

# Distribution types
class DistributionType(str, Enum):
    RANDOM = "random"
    EQUAL = "equal"

# Token types
class TokenType(str, Enum):
    DOT = "DOT"
    ETH = "ETH"
    USDT = "USDT"
    USDC = "USDC"


@red_packets_bp.post('')
async def create_red_packet(
    packet_data: dict,
    current_user: dict = Depends(require_auth)
):
    """
    Create a new red packet
    
    Request Body:
        {
            "token": "DOT",
            "total_amount": "1000000000000",
            "packet_count": 10,
            "distribution_type": "random" | "equal",
            "message": "Happy New Year!",
            "chat_id": "optional_chat_id",
            "sender_address": "1ABC..."
        }
    
    Returns:
        JSON response with created red packet details
    """
    try:
        user_id = current_user.get('user_id')
        user = db.session.query(User).filter_by(id=user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='User not found'
            )
        
        # Validate required fields
        required_fields = ['token', 'total_amount', 'packet_count', 'distribution_type', 'sender_address']
        for field in required_fields:
            if field not in packet_data:
                raise ValidationError(f'Missing required field: {field}')
        
        # Validate token
        token = packet_data.get('token', '').upper()
        try:
            TokenType(token)
        except ValueError:
            raise ValidationError(f'Invalid token: {token}')
        
        # Validate distribution type
        distribution_type = packet_data.get('distribution_type', 'random').lower()
        try:
            DistributionType(distribution_type)
        except ValueError:
            raise ValidationError(f'Invalid distribution_type: {distribution_type}')
        
        # Validate amounts
        try:
            total_amount = int(packet_data.get('total_amount'))
            packet_count = int(packet_data.get('packet_count'))
            
            if total_amount <= 0:
                raise ValueError('total_amount must be greater than 0')
            if packet_count <= 0 or packet_count > 100:
                raise ValueError('packet_count must be between 1 and 100')
        except (ValueError, TypeError) as e:
            raise ValidationError(f'Invalid amount or packet_count: {str(e)}')
        
        # Create red packet
        red_packet = RedPacket(
            sender_id=user_id,
            sender_address=packet_data.get('sender_address'),
            token=token,
            total_amount=total_amount,
            packet_count=packet_count,
            distribution_type=distribution_type,
            message=packet_data.get('message'),
            chat_id=packet_data.get('chat_id'),
            status='active',
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        
        db.session.add(red_packet)
        db.session.commit()
        
        logger.info(f"Red packet created: {red_packet.id} by user {user_id}")
        
        return {
            'success': True,
            'red_packet': red_packet.to_dict(),
            'message': 'Red packet created successfully'
        }
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating red packet: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to create red packet: {str(e)}'
        )


@red_packets_bp.post('/{packet_id}/claim')
async def claim_red_packet(
    packet_id: str,
    claim_data: dict,
    current_user: dict = Depends(require_auth)
):
    """
    Claim a red packet
    
    Path Parameters:
        packet_id: Red packet ID
    
    Request Body:
        {
            "recipient_address": "1ABC..."
        }
    
    Returns:
        JSON response with claim details
    """
    try:
        user_id = current_user.get('user_id')
        user = db.session.query(User).filter_by(id=user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='User not found'
            )
        
        # Get red packet
        red_packet = db.session.query(RedPacket).filter_by(id=packet_id).first()
        if not red_packet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Red packet not found'
            )
        
        # Check if packet is claimable
        if not red_packet.is_claimable:
            if red_packet.is_expired:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Red packet has expired'
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Red packet is not available for claiming'
                )
        
        # Check if user already claimed
        existing_claim = db.session.query(RedPacketClaim).filter_by(
            packet_id=packet_id,
            recipient_id=user_id
        ).first()
        
        if existing_claim:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='You have already claimed this red packet'
            )
        
        # Check if there are remaining packets
        if red_packet.remaining_packets <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='All packets have been claimed'
            )
        
        # Calculate claim amount
        if red_packet.distribution_type == DistributionType.EQUAL.value:
            # Equal distribution
            claim_amount = red_packet.total_amount // red_packet.packet_count
        else:
            # Random distribution (luck-based)
            remaining_amount = red_packet.remaining_amount
            remaining_packets = red_packet.remaining_packets
            
            if remaining_packets <= 1:
                claim_amount = remaining_amount
            else:
                # Random amount between 1 and (remaining / remaining_packets) * 2
                max_amount = max(1, (remaining_amount // remaining_packets) * 2)
                claim_amount = random.randint(1, max_amount)
                claim_amount = min(claim_amount, remaining_amount)
        
        # Validate recipient address
        recipient_address = claim_data.get('recipient_address')
        if not recipient_address:
            raise ValidationError('Missing recipient_address')
        
        # Create claim record
        claim = RedPacketClaim(
            packet_id=packet_id,
            recipient_id=user_id,
            recipient_address=recipient_address,
            amount=claim_amount,
            status='claimed'
        )
        
        db.session.add(claim)
        
        # Update packet status if all packets claimed
        if red_packet.remaining_packets <= 1:
            red_packet.status = 'completed'
        
        db.session.commit()
        
        logger.info(f"Red packet claimed: {packet_id} by user {user_id}, amount: {claim_amount}")
        
        return {
            'success': True,
            'claim': claim.to_dict(),
            'packet_status': red_packet.status,
            'message': f'Successfully claimed {claim_amount} {red_packet.token}'
        }
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error claiming red packet: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to claim red packet: {str(e)}'
        )


@red_packets_bp.get('/{packet_id}')
async def get_red_packet(
    packet_id: str,
    current_user: dict = Depends(require_auth)
):
    """
    Get details of a red packet
    
    Path Parameters:
        packet_id: Red packet ID
    
    Returns:
        JSON response with red packet details and claims
    """
    try:
        red_packet = db.session.query(RedPacket).filter_by(id=packet_id).first()
        if not red_packet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Red packet not found'
            )
        
        # Get claims for this packet
        claims = db.session.query(RedPacketClaim).filter_by(packet_id=packet_id).all()
        
        return {
            'success': True,
            'red_packet': red_packet.to_dict(),
            'claims': [claim.to_dict() for claim in claims],
            'remaining_amount': red_packet.remaining_amount,
            'remaining_packets': red_packet.remaining_packets,
            'is_expired': red_packet.is_expired,
            'is_claimable': red_packet.is_claimable
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving red packet: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to retrieve red packet: {str(e)}'
        )


@red_packets_bp.get('')
async def list_red_packets(
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_auth)
):
    """
    List red packets for current user
    
    Query Parameters:
        status: Filter by status (active, completed, expired, cancelled)
        limit: Maximum number of packets to return (default: 20)
        offset: Number of packets to skip (default: 0)
    
    Returns:
        JSON response with list of red packets
    """
    try:
        user_id = current_user.get('user_id')
        
        # Build query
        query = db.session.query(RedPacket).filter_by(sender_id=user_id)
        
        if status:
            query = query.filter_by(status=status)
        
        total_count = query.count()
        packets = query.order_by(RedPacket.created_at.desc()).offset(offset).limit(limit).all()
        
        return {
            'success': True,
            'red_packets': [packet.to_dict() for packet in packets],
            'total_count': total_count,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'has_more': (offset + limit) < total_count
            }
        }
        
    except Exception as e:
        logger.error(f"Error listing red packets: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to list red packets: {str(e)}'
        )


@red_packets_bp.post('/{packet_id}/cancel')
async def cancel_red_packet(
    packet_id: str,
    current_user: dict = Depends(require_auth)
):
    """
    Cancel a red packet and refund unclaimed amounts
    
    Path Parameters:
        packet_id: Red packet ID
    
    Returns:
        JSON response with cancellation status
    """
    try:
        user_id = current_user.get('user_id')
        
        red_packet = db.session.query(RedPacket).filter_by(id=packet_id).first()
        if not red_packet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Red packet not found'
            )
        
        # Check if user is sender
        if red_packet.sender_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Only the sender can cancel this red packet'
            )
        
        # Check if packet can be cancelled
        if red_packet.status in ['completed', 'cancelled', 'expired']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Cannot cancel red packet with status: {red_packet.status}'
            )
        
        # Update packet status
        red_packet.status = 'cancelled'
        db.session.commit()
        
        logger.info(f"Red packet cancelled: {packet_id} by user {user_id}")
        
        return {
            'success': True,
            'red_packet': red_packet.to_dict(),
            'message': 'Red packet cancelled. Unclaimed funds will be refunded.'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error cancelling red packet: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to cancel red packet: {str(e)}'
        )


@red_packets_bp.get('/claims/me')
async def get_my_claims(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_auth)
):
    """
    Get red packet claims for current user
    
    Query Parameters:
        limit: Maximum number of claims to return (default: 20)
        offset: Number of claims to skip (default: 0)
    
    Returns:
        JSON response with list of claims
    """
    try:
        user_id = current_user.get('user_id')
        
        # Get all claims for user
        claims_query = db.session.query(RedPacketClaim).filter_by(recipient_id=user_id)
        
        total_count = claims_query.count()
        claims = claims_query.order_by(RedPacketClaim.claimed_at.desc()).offset(offset).limit(limit).all()
        
        # Get associated packets
        claim_data = []
        for claim in claims:
            packet = db.session.query(RedPacket).filter_by(id=claim.packet_id).first()
            claim_data.append({
                'claim': claim.to_dict(),
                'packet': packet.to_dict() if packet else None
            })
        
        return {
            'success': True,
            'claims': claim_data,
            'total_count': total_count,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'has_more': (offset + limit) < total_count
            }
        }
        
    except Exception as e:
        logger.error(f"Error retrieving claims: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to retrieve claims: {str(e)}'
        )
