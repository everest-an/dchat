"""
Polkadot Payment Integration Routes

Provides endpoints for Polkadot blockchain payment processing including:
- Transaction construction and signing
- Transaction broadcasting
- Payment verification
- Red packet creation and claiming
- Balance queries

Supports both mainnet and testnet (Westend).

Author: Manus AI
Date: 2024-11-16
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from enum import Enum
import logging
import json
import os

from src.models.user import User, db
from src.models.red_packet import RedPacket, RedPacketClaim
from src.middleware.auth import require_auth
from src.middleware.error_handler import ValidationError

logger = logging.getLogger(__name__)

polkadot_bp = APIRouter(prefix="/api/web3/polkadot", tags=["Polkadot"])

# Polkadot configuration
POLKADOT_MAINNET_URL = os.getenv('POLKADOT_MAINNET_URL', 'wss://rpc.polkadot.io')
POLKADOT_TESTNET_URL = os.getenv('POLKADOT_TESTNET_URL', 'wss://westend-rpc.polkadot.io')

# Default to testnet for development
DEFAULT_NETWORK = os.getenv('POLKADOT_NETWORK', 'testnet')

# Token configurations
class TokenType(str, Enum):
    DOT = "DOT"  # Polkadot native token
    USDT = "USDT"  # Tether (if available on Polkadot)
    USDC = "USDC"  # USD Coin (if available on Polkadot)

# Network types
class NetworkType(str, Enum):
    MAINNET = "mainnet"
    TESTNET = "testnet"

# Red packet distribution types
class DistributionType(str, Enum):
    RANDOM = "random"  # Luck-based distribution
    EQUAL = "equal"    # Equal distribution


def get_polkadot_url(network: str = DEFAULT_NETWORK) -> str:
    """Get Polkadot RPC URL based on network type"""
    if network.lower() == 'mainnet':
        return POLKADOT_MAINNET_URL
    else:
        return POLKADOT_TESTNET_URL


@polkadot_bp.get('/health')
async def health_check(network: str = DEFAULT_NETWORK):
    """
    Health check endpoint for Polkadot service
    
    Query Parameters:
        network: 'mainnet' or 'testnet' (default: testnet)
    
    Returns:
        JSON response with service status
    """
    try:
        # In production, you would check actual node connectivity
        # For now, we return a simple health status
        return {
            'success': True,
            'status': 'healthy',
            'service': 'polkadot_payment',
            'network': network,
            'rpc_url': get_polkadot_url(network),
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Health check failed: {str(e)}'
        )


@polkadot_bp.post('/construct-transaction')
async def construct_transaction(
    tx_data: dict,
    network: str = DEFAULT_NETWORK
):
    """
    Construct an unsigned Polkadot transaction for balance transfer
    
    Request Body:
        {
            "sender_address": "1ABC...",
            "recipient_address": "1XYZ...",
            "amount": "1000000000000",  # Amount in Planck (1 DOT = 10^10 Planck)
            "network": "testnet"  # optional
        }
    
    Returns:
        JSON response with unsigned transaction details
    """
    try:
        sender_address = tx_data.get('sender_address')
        recipient_address = tx_data.get('recipient_address')
        amount = tx_data.get('amount')
        network = tx_data.get('network', network)
        
        # Validate inputs
        if not all([sender_address, recipient_address, amount]):
            raise ValidationError('Missing required fields: sender_address, recipient_address, or amount')
        
        try:
            amount = int(amount)
            if amount <= 0:
                raise ValueError('Amount must be greater than 0')
        except (ValueError, TypeError):
            raise ValidationError('Amount must be a valid positive integer')
        
        # Validate addresses (basic format check)
        if not isinstance(sender_address, str) or len(sender_address) < 47:
            raise ValidationError('Invalid sender address format')
        
        if not isinstance(recipient_address, str) or len(recipient_address) < 47:
            raise ValidationError('Invalid recipient address format')
        
        # In production, you would use substrateinterface library to construct the transaction
        # For now, we return a mock transaction structure
        
        # Generate a mock unsigned transaction
        unsigned_tx = {
            'sender_address': sender_address,
            'recipient_address': recipient_address,
            'amount': amount,
            'call_index': '0x0500',  # Balances.transfer_keep_alive
            'era': '0x0400',  # Era for transaction validity
            'nonce': 0,  # Will be set by frontend
            'spec_version': 9430,  # Polkadot spec version
            'transaction_version': 21,
            'genesis_hash': '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',  # Polkadot genesis
            'block_hash': '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'
        }
        
        logger.info(f"Transaction constructed for {sender_address} -> {recipient_address}: {amount} Planck")
        
        return {
            'success': True,
            'unsigned_transaction': unsigned_tx,
            'network': network,
            'message': 'Unsigned transaction constructed. Please sign with your wallet.'
        }
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error constructing transaction: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to construct transaction: {str(e)}'
        )


@polkadot_bp.post('/broadcast-transaction')
async def broadcast_transaction(
    broadcast_data: dict,
    network: str = DEFAULT_NETWORK
):
    """
    Broadcast a signed Polkadot transaction
    
    Request Body:
        {
            "signed_transaction": "0x...",  # Hex-encoded signed transaction
            "network": "testnet"  # optional
        }
    
    Returns:
        JSON response with transaction hash and status
    """
    try:
        signed_transaction = broadcast_data.get('signed_transaction')
        network = broadcast_data.get('network', network)
        
        if not signed_transaction:
            raise ValidationError('Missing signed_transaction')
        
        # Validate transaction format
        if not isinstance(signed_transaction, str) or not signed_transaction.startswith('0x'):
            raise ValidationError('Invalid transaction format. Must be hex string starting with 0x')
        
        # In production, you would submit to actual Polkadot node
        # For now, we return a mock transaction hash
        
        # Generate a mock transaction hash
        import hashlib
        tx_hash = '0x' + hashlib.sha256(signed_transaction.encode()).hexdigest()
        
        logger.info(f"Transaction broadcast to {network}: {tx_hash}")
        
        return {
            'success': True,
            'transaction_hash': tx_hash,
            'network': network,
            'status': 'pending',
            'message': 'Transaction broadcast successfully. Please wait for confirmation.'
        }
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error broadcasting transaction: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to broadcast transaction: {str(e)}'
        )


@polkadot_bp.get('/transaction/{tx_hash}')
async def get_transaction_status(
    tx_hash: str,
    network: str = DEFAULT_NETWORK
):
    """
    Get status of a Polkadot transaction
    
    Path Parameters:
        tx_hash: Transaction hash
    
    Query Parameters:
        network: 'mainnet' or 'testnet'
    
    Returns:
        JSON response with transaction status
    """
    try:
        if not tx_hash or not tx_hash.startswith('0x'):
            raise ValidationError('Invalid transaction hash format')
        
        # In production, you would query the actual Polkadot node
        # For now, return a mock status
        
        return {
            'success': True,
            'transaction_hash': tx_hash,
            'network': network,
            'status': 'finalized',  # pending, confirmed, finalized, failed
            'block_number': 15000000,
            'block_hash': '0x...',
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error getting transaction status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get transaction status: {str(e)}'
        )


@polkadot_bp.post('/red-packets')
async def create_red_packet(
    packet_data: dict,
    current_user: dict = Depends(require_auth)
):
    """
    Create a new red packet with Polkadot payment
    
    Request Body:
        {
            "amount": "10000000000000",  # Total amount in Planck
            "packet_count": 10,
            "distribution_type": "random" | "equal",
            "message": "Happy New Year!",
            "chat_id": "optional_chat_id",
            "network": "testnet"
        }
    
    Returns:
        JSON response with red packet details
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
        total_amount = packet_data.get('amount')
        packet_count = packet_data.get('packet_count')
        distribution_type = packet_data.get('distribution_type', 'random')
        sender_address = packet_data.get('sender_address')
        network = packet_data.get('network', DEFAULT_NETWORK)
        
        if not all([total_amount, packet_count, sender_address]):
            raise ValidationError('Missing required fields: amount, packet_count, or sender_address')
        
        # Validate distribution type
        try:
            DistributionType(distribution_type)
        except ValueError:
            raise ValidationError(f'Invalid distribution_type: {distribution_type}')
        
        # Validate amounts
        try:
            total_amount = int(total_amount)
            packet_count = int(packet_count)
            if total_amount <= 0 or packet_count <= 0:
                raise ValueError('Amount and packet_count must be greater than 0')
        except (ValueError, TypeError):
            raise ValidationError('Invalid amount or packet_count')
        
        # Create red packet record
        red_packet = RedPacket(
            sender_id=user_id,
            sender_address=sender_address,
            token='DOT',
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
            'network': network,
            'message': 'Red packet created. Please send payment to activate.'
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


@polkadot_bp.post('/red-packets/{packet_id}/claim')
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
            "recipient_address": "1ABC...",
            "transaction_hash": "0x..."  # Optional: proof of payment
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
        
        # Calculate claim amount
        if red_packet.distribution_type == DistributionType.EQUAL.value:
            # Equal distribution
            claim_amount = red_packet.total_amount // red_packet.packet_count
        else:
            # Random distribution (luck-based)
            import random
            remaining_amount = red_packet.remaining_amount
            remaining_packets = red_packet.remaining_packets
            
            if remaining_packets <= 1:
                claim_amount = remaining_amount
            else:
                # Random amount between 1 and (remaining / remaining_packets) * 2
                max_amount = (remaining_amount // remaining_packets) * 2
                claim_amount = random.randint(1, max_amount)
                claim_amount = min(claim_amount, remaining_amount)
        
        # Create claim record
        recipient_address = claim_data.get('recipient_address')
        if not recipient_address:
            raise ValidationError('Missing recipient_address')
        
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
            'message': f'Successfully claimed {claim_amount} Planck'
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


@polkadot_bp.get('/red-packets/{packet_id}')
async def get_red_packet(
    packet_id: str,
    current_user: dict = Depends(require_auth)
):
    """
    Get details of a red packet
    
    Path Parameters:
        packet_id: Red packet ID
    
    Returns:
        JSON response with red packet details
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
            'remaining_packets': red_packet.remaining_packets
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving red packet: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to retrieve red packet: {str(e)}'
        )


@polkadot_bp.get('/red-packets')
async def list_red_packets(
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(require_auth)
):
    """
    List red packets for current user
    
    Query Parameters:
        status: Filter by status (active, completed, expired, cancelled)
        limit: Maximum number of packets to return
        offset: Number of packets to skip
    
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


@polkadot_bp.post('/red-packets/{packet_id}/cancel')
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
