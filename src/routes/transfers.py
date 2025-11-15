"""
Transfer API Routes

Provides endpoints for direct transfers between users:
- Create transfer
- Accept transfer
- Reject transfer
- Get transfer history

@author Manus AI
@date 2025-11-16
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os
from datetime import datetime, timedelta
from src.models.chat_transfer import ChatTransfer, db
from src.middleware.security_middleware import rate_limit
from ..middleware.auth import require_auth

transfers_bp = Blueprint('transfers', __name__)

JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')

# ============================================================================
# TRANSFERS - CREATE
# ============================================================================

@transfers_bp.route('/api/transfers', methods=['POST'])
@require_auth
@rate_limit(max_requests=30, window_seconds=60)
def create_transfer():
    """Create a new transfer"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['recipient_id', 'token', 'amount']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Validate amount
        try:
            amount = float(data['amount'])
            if amount <= 0:
                return jsonify({'error': 'Amount must be greater than 0'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid amount'}), 400
        
        # Create transfer
        transfer = ChatTransfer(
            sender_id=request.user_id,
            sender_address=data.get('sender_address'),
            recipient_id=data['recipient_id'],
            recipient_address=data.get('recipient_address'),
            token=data['token'],
            amount=amount,
            message=data.get('message'),
            chat_id=data.get('chat_id'),
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        
        db.session.add(transfer)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'transfer': transfer.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# TRANSFERS - ACCEPT
# ============================================================================

@transfers_bp.route('/api/transfers/<transfer_id>/accept', methods=['POST'])
@require_auth
@rate_limit(max_requests=100, window_seconds=60)
def accept_transfer(transfer_id):
    """Accept a transfer"""
    try:
        transfer = ChatTransfer.query.filter_by(id=transfer_id).first()
        if not transfer:
            return jsonify({'error': 'Transfer not found'}), 404
        
        # Check if user is recipient
        if transfer.recipient_id != request.user_id:
            return jsonify({'error': 'Only recipient can accept the transfer'}), 403
        
        # Check if transfer is claimable
        if not transfer.is_claimable:
            return jsonify({'error': 'Transfer is not available for claiming'}), 400
        
        # Update transfer status
        transfer.status = 'claimed'
        transfer.claimed_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'transfer': transfer.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# TRANSFERS - REJECT
# ============================================================================

@transfers_bp.route('/api/transfers/<transfer_id>/reject', methods=['POST'])
@require_auth
@rate_limit(max_requests=100, window_seconds=60)
def reject_transfer(transfer_id):
    """Reject a transfer (recipient can reject before accepting)"""
    try:
        transfer = ChatTransfer.query.filter_by(id=transfer_id).first()
        if not transfer:
            return jsonify({'error': 'Transfer not found'}), 404
        
        # Check if user is recipient
        if transfer.recipient_id != request.user_id:
            return jsonify({'error': 'Only recipient can reject the transfer'}), 403
        
        # Check if transfer is cancellable
        if transfer.status != 'pending':
            return jsonify({'error': 'Transfer cannot be rejected'}), 400
        
        # Update transfer status
        transfer.status = 'cancelled'
        transfer.cancelled_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'transfer': transfer.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# TRANSFERS - CANCEL
# ============================================================================

@transfers_bp.route('/api/transfers/<transfer_id>/cancel', methods=['POST'])
@require_auth
@rate_limit(max_requests=100, window_seconds=60)
def cancel_transfer(transfer_id):
    """Cancel a transfer (sender only)"""
    try:
        transfer = ChatTransfer.query.filter_by(id=transfer_id).first()
        if not transfer:
            return jsonify({'error': 'Transfer not found'}), 404
        
        # Check if user is sender
        if transfer.sender_id != request.user_id:
            return jsonify({'error': 'Only sender can cancel the transfer'}), 403
        
        # Check if transfer is cancellable
        if not transfer.is_cancellable:
            return jsonify({'error': 'Transfer cannot be cancelled'}), 400
        
        # Update transfer status
        transfer.status = 'cancelled'
        transfer.cancelled_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'transfer': transfer.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# TRANSFERS - GET
# ============================================================================

@transfers_bp.route('/api/transfers/<transfer_id>', methods=['GET'])
@require_auth
def get_transfer(transfer_id):
    """Get transfer details"""
    try:
        transfer = ChatTransfer.query.filter_by(id=transfer_id).first()
        if not transfer:
            return jsonify({'error': 'Transfer not found'}), 404
        
        # Check if user is sender or recipient
        if transfer.sender_id != request.user_id and transfer.recipient_id != request.user_id:
            return jsonify({'error': 'You do not have permission to view this transfer'}), 403
        
        return jsonify({
            'success': True,
            'transfer': transfer.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transfers_bp.route('/api/transfers', methods=['GET'])
@require_auth
def list_transfers():
    """List user's transfers (sent and received)"""
    try:
        # Get query parameters
        status = request.args.get('status')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        # Get sent transfers
        sent_query = ChatTransfer.query.filter_by(sender_id=request.user_id)
        if status:
            sent_query = sent_query.filter_by(status=status)
        sent_transfers = sent_query.order_by(ChatTransfer.created_at.desc()).limit(limit).offset(offset).all()
        
        # Get received transfers
        received_query = ChatTransfer.query.filter_by(recipient_id=request.user_id)
        if status:
            received_query = received_query.filter_by(status=status)
        received_transfers = received_query.order_by(ChatTransfer.created_at.desc()).limit(limit).offset(offset).all()
        
        return jsonify({
            'success': True,
            'sent': [t.to_dict() for t in sent_transfers],
            'received': [t.to_dict() for t in received_transfers],
            'total_sent': ChatTransfer.query.filter_by(sender_id=request.user_id).count(),
            'total_received': ChatTransfer.query.filter_by(recipient_id=request.user_id).count()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# TRANSFERS - STATISTICS
# ============================================================================

@transfers_bp.route('/api/transfers/stats', methods=['GET'])
@require_auth
def get_transfer_stats():
    """Get transfer statistics for user"""
    try:
        # Get sent transfers
        sent_transfers = ChatTransfer.query.filter_by(sender_id=request.user_id).all()
        sent_total = sum(float(t.amount) for t in sent_transfers if t.status == 'claimed')
        sent_pending = sum(float(t.amount) for t in sent_transfers if t.status == 'pending')
        
        # Get received transfers
        received_transfers = ChatTransfer.query.filter_by(recipient_id=request.user_id).all()
        received_total = sum(float(t.amount) for t in received_transfers if t.status == 'claimed')
        received_pending = sum(float(t.amount) for t in received_transfers if t.status == 'pending')
        
        return jsonify({
            'success': True,
            'stats': {
                'sent': {
                    'total': sent_total,
                    'pending': sent_pending,
                    'count': len(sent_transfers)
                },
                'received': {
                    'total': received_total,
                    'pending': received_pending,
                    'count': len(received_transfers)
                }
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
