"""
Red Packet API Routes

Provides CRUD endpoints for red packets:
- Create red packet
- Claim red packet
- Get red packet details
- Cancel red packet

@author Manus AI
@date 2025-11-16
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os
from datetime import datetime, timedelta
import random
from src.models.red_packet import RedPacket, RedPacketClaim, db
from src.middleware.security_middleware import rate_limit
from ..middleware.auth import require_auth

red_packets_bp = Blueprint('red_packets', __name__)

JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')

# ============================================================================
# RED PACKETS - CREATE
# ============================================================================

@red_packets_bp.route('/api/red-packets', methods=['POST'])
@require_auth
@rate_limit(max_requests=30, window_seconds=60)
def create_red_packet():
    """Create a new red packet"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['token', 'total_amount', 'packet_count', 'distribution_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Validate distribution type
        if data['distribution_type'] not in ['random', 'equal']:
            return jsonify({'error': 'Invalid distribution_type. Must be "random" or "equal"'}), 400
        
        # Create red packet
        packet = RedPacket(
            sender_id=request.user_id,
            sender_address=data.get('sender_address'),
            token=data['token'],
            total_amount=data['total_amount'],
            packet_count=data['packet_count'],
            distribution_type=data['distribution_type'],
            message=data.get('message'),
            chat_id=data.get('chat_id'),
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        
        db.session.add(packet)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'packet': packet.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# RED PACKETS - CLAIM
# ============================================================================

@red_packets_bp.route('/api/red-packets/<packet_id>/claim', methods=['POST'])
@require_auth
@rate_limit(max_requests=100, window_seconds=60)
def claim_red_packet(packet_id):
    """Claim a red packet"""
    try:
        data = request.json
        
        # Get packet
        packet = RedPacket.query.filter_by(id=packet_id).first()
        if not packet:
            return jsonify({'error': 'Red packet not found'}), 404
        
        # Check if packet is claimable
        if not packet.is_claimable:
            return jsonify({'error': 'Red packet is not available for claiming'}), 400
        
        # Check if user already claimed
        existing_claim = RedPacketClaim.query.filter_by(
            packet_id=packet_id,
            recipient_id=request.user_id
        ).first()
        if existing_claim:
            return jsonify({'error': 'You have already claimed this red packet'}), 400
        
        # Check if all packets have been claimed
        if packet.remaining_packets <= 0:
            return jsonify({'error': 'All packets have been claimed'}), 400
        
        # Calculate claim amount
        if packet.distribution_type == 'equal':
            claim_amount = packet.remaining_amount / packet.remaining_packets
        else:  # random
            # For random distribution, generate a random amount
            # Ensure at least some minimum amount for each packet
            min_amount = packet.remaining_amount / (packet.remaining_packets * 2)
            max_amount = packet.remaining_amount - (min_amount * (packet.remaining_packets - 1))
            claim_amount = random.uniform(min_amount, max_amount)
        
        # Create claim
        claim = RedPacketClaim(
            packet_id=packet_id,
            recipient_id=request.user_id,
            recipient_address=data.get('recipient_address'),
            amount=claim_amount
        )
        
        db.session.add(claim)
        
        # Update packet status if all claimed
        if packet.remaining_packets - 1 <= 0:
            packet.status = 'completed'
        else:
            packet.status = 'partial'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'claim': claim.to_dict(),
            'packet': packet.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# RED PACKETS - GET
# ============================================================================

@red_packets_bp.route('/api/red-packets/<packet_id>', methods=['GET'])
@require_auth
def get_red_packet(packet_id):
    """Get red packet details"""
    try:
        packet = RedPacket.query.filter_by(id=packet_id).first()
        if not packet:
            return jsonify({'error': 'Red packet not found'}), 404
        
        return jsonify({
            'success': True,
            'packet': packet.to_dict(),
            'claims': [c.to_dict() for c in packet.claims]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@red_packets_bp.route('/api/red-packets', methods=['GET'])
@require_auth
def list_red_packets():
    """List user's red packets (sent and received)"""
    try:
        # Get sent packets
        sent_packets = RedPacket.query.filter_by(sender_id=request.user_id).all()
        
        # Get received packets (claimed)
        received_claims = RedPacketClaim.query.filter_by(recipient_id=request.user_id).all()
        received_packet_ids = [c.packet_id for c in received_claims]
        received_packets = RedPacket.query.filter(RedPacket.id.in_(received_packet_ids)).all() if received_packet_ids else []
        
        return jsonify({
            'success': True,
            'sent': [p.to_dict() for p in sent_packets],
            'received': [p.to_dict() for p in received_packets],
            'claims': [c.to_dict() for c in received_claims]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# RED PACKETS - CANCEL
# ============================================================================

@red_packets_bp.route('/api/red-packets/<packet_id>/cancel', methods=['POST'])
@require_auth
def cancel_red_packet(packet_id):
    """Cancel a red packet (sender only)"""
    try:
        packet = RedPacket.query.filter_by(id=packet_id).first()
        if not packet:
            return jsonify({'error': 'Red packet not found'}), 404
        
        # Check if user is sender
        if packet.sender_id != request.user_id:
            return jsonify({'error': 'Only sender can cancel the red packet'}), 403
        
        # Check if packet is cancellable
        if packet.status not in ['active', 'partial']:
            return jsonify({'error': 'Red packet cannot be cancelled'}), 400
        
        # Update status
        packet.status = 'cancelled'
        db.session.commit()
        
        return jsonify({
            'success': True,
            'packet': packet.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
