"""
Chat Transfer API Routes

Handles in-chat money transfers (similar to WeChat/Telegram transfers).
Transfer flow:
1. Sender initiates transfer → Money deducted from sender's custodial wallet → Locked on platform
2. Recipient sees transfer message in chat
3. Recipient claims transfer → Money credited to recipient's custodial wallet

Author: Manus AI
Date: 2025-11-05
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os
from datetime import datetime, timedelta
from decimal import Decimal

from ..models.user import User
from ..models.custodial_wallet import CustodialWallet, CustodialTransaction
from ..models.chat_transfer import ChatTransfer
from ..database import db

# Enhanced middleware for production
from ..middleware.auth import require_auth, optional_auth, require_role
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError


chat_transfer_bp = Blueprint('chat_transfer', __name__)

def token_required(f):
    """JWT token authentication decorator"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, os.getenv('JWT_SECRET_KEY'), algorithms=['HS256'])
            current_user = User.query.filter_by(wallet_address=data['wallet_address']).first()
            
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated


@chat_transfer_bp.route('/create', methods=['POST'])
@token_required
def create_transfer(current_user):@handle_errors
@chat_transfer_bp.route('/create', methods=['POST'])
@token_required

    """
    Create a new chat transfer
    
    Request body:
    {
        "recipient_address": "0x...",
        "token": "USDT",
        "amount": 10.5,
        "message": "Thanks for lunch!",
        "chat_id": "optional_chat_id"
    }
    
    Returns:
    {
        "transfer_id": "uuid",
        "status": "pending",
        "expires_at": "2025-11-06T12:00:00Z"
    }
    """
    try:
        data = request.get_json()
        
        # Validate input
        recipient_address = data.get('recipient_address')
        token = data.get('token', 'USDT')
        amount = Decimal(str(data.get('amount', 0)))
        message = data.get('message', '')
        chat_id = data.get('chat_id')
        
        if not recipient_address:
            return jsonify({'error': 'Recipient address is required'}), 400
        
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than 0'}), 400
        
        if token not in ['ETH', 'USDT', 'USDC']:
            return jsonify({'error': 'Invalid token'}), 400
        
        # Check recipient exists
        recipient = User.query.filter_by(wallet_address=recipient_address).first()
        if not recipient:
            return jsonify({'error': 'Recipient not found'}), 404
        
        # Get sender's custodial wallet
        sender_wallet = CustodialWallet.query.filter_by(
            user_id=current_user.id,
            is_active=True
        ).first()
        
        if not sender_wallet:
            return jsonify({'error': 'Custodial wallet not found'}), 404
        
        # Check balance
        balance_field = f'{token.lower()}_balance'
        current_balance = Decimal(str(getattr(sender_wallet, balance_field, 0)))
        
        if current_balance < amount:
            return jsonify({'error': 'Insufficient balance'}), 400
        
        # Deduct from sender's wallet
        setattr(sender_wallet, balance_field, float(current_balance - amount))
        
        # Create transfer record
        transfer = ChatTransfer(
            sender_id=current_user.id,
            recipient_id=recipient.id,
            sender_address=current_user.wallet_address,
            recipient_address=recipient_address,
            token=token,
            amount=float(amount),
            message=message,
            chat_id=chat_id,
            status='pending',
            expires_at=datetime.utcnow() + timedelta(hours=24)  # 24 hour expiry
        )
        
        db.session.add(transfer)
        
        # Create transaction record
        transaction = CustodialTransaction(
            wallet_id=sender_wallet.id,
            transaction_type='chat_transfer_send',
            token=token,
            amount=float(amount),
            to_address=recipient_address,
            status='confirmed',
            transaction_metadata={
                'transfer_id': str(transfer.id),
                'message': message,
                'chat_id': chat_id
            }
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'transfer_id': str(transfer.id),
            'status': transfer.status,
            'expires_at': transfer.expires_at.isoformat(),
            'message': 'Transfer created successfully'
        }), 201
        
    except ValueError as e:
        return jsonify({'error': f'Invalid amount: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        print(f'Error creating transfer: {str(e)}')
        return jsonify({'error': 'Failed to create transfer'}), 500


@chat_transfer_bp.route('/claim/<transfer_id>', methods=['POST'])
@token_required
def claim_transfer(current_user, transfer_id):@handle_errors
@chat_transfer_bp.route('/claim/<transfer_id>', methods=['POST'])
@token_required

    """
    Claim a pending transfer
    
    Returns:
    {
        "status": "claimed",
        "amount": 10.5,
        "token": "USDT"
    }
    """
    try:
        # Get transfer
        transfer = ChatTransfer.query.filter_by(id=transfer_id).first()
        
        if not transfer:
            return jsonify({'error': 'Transfer not found'}), 404
        
        # Verify recipient
        if transfer.recipient_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Check status
        if transfer.status != 'pending':
            return jsonify({'error': f'Transfer already {transfer.status}'}), 400
        
        # Check expiry
        if transfer.expires_at and transfer.expires_at < datetime.utcnow():
            transfer.status = 'expired'
            db.session.commit()
            return jsonify({'error': 'Transfer has expired'}), 400
        
        # Get recipient's custodial wallet (create if not exists)
        recipient_wallet = CustodialWallet.query.filter_by(
            user_id=current_user.id,
            is_active=True
        ).first()
        
        if not recipient_wallet:
            # Auto-create wallet for recipient
            from ..services.custodial_wallet_service import CustodialWalletService

            wallet_service = CustodialWalletService()
            recipient_wallet = wallet_service.create_wallet(current_user.id)
        
        # Credit recipient's wallet
        balance_field = f'{transfer.token.lower()}_balance'
        current_balance = Decimal(str(getattr(recipient_wallet, balance_field, 0)))
        setattr(recipient_wallet, balance_field, float(current_balance + Decimal(str(transfer.amount))))
        
        # Update transfer status
        transfer.status = 'claimed'
        transfer.claimed_at = datetime.utcnow()
        
        # Create transaction record
        transaction = CustodialTransaction(
            wallet_id=recipient_wallet.id,
            transaction_type='chat_transfer_receive',
            token=transfer.token,
            amount=transfer.amount,
            from_address=transfer.sender_address,
            status='confirmed',
            transaction_metadata={
                'transfer_id': str(transfer.id),
                'message': transfer.message,
                'sender': transfer.sender_address
            }
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'status': transfer.status,
            'amount': transfer.amount,
            'token': transfer.token,
            'message': 'Transfer claimed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f'Error claiming transfer: {str(e)}')
        return jsonify({'error': 'Failed to claim transfer'}), 500


@chat_transfer_bp.route('/cancel/<transfer_id>', methods=['POST'])
@token_required
def cancel_transfer(current_user, transfer_id):@handle_errors
@chat_transfer_bp.route('/cancel/<transfer_id>', methods=['POST'])
@token_required

    """
    Cancel a pending transfer (sender only)
    
    Returns:
    {
        "status": "cancelled",
        "refunded_amount": 10.5
    }
    """
    try:
        # Get transfer
        transfer = ChatTransfer.query.filter_by(id=transfer_id).first()
        
        if not transfer:
            return jsonify({'error': 'Transfer not found'}), 404
        
        # Verify sender
        if transfer.sender_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Check status
        if transfer.status != 'pending':
            return jsonify({'error': f'Cannot cancel {transfer.status} transfer'}), 400
        
        # Get sender's wallet
        sender_wallet = CustodialWallet.query.filter_by(
            user_id=current_user.id,
            is_active=True
        ).first()
        
        if not sender_wallet:
            return jsonify({'error': 'Wallet not found'}), 404
        
        # Refund to sender
        balance_field = f'{transfer.token.lower()}_balance'
        current_balance = Decimal(str(getattr(sender_wallet, balance_field, 0)))
        setattr(sender_wallet, balance_field, float(current_balance + Decimal(str(transfer.amount))))
        
        # Update transfer status
        transfer.status = 'cancelled'
        transfer.cancelled_at = datetime.utcnow()
        
        # Create refund transaction record
        transaction = CustodialTransaction(
            wallet_id=sender_wallet.id,
            transaction_type='chat_transfer_refund',
            token=transfer.token,
            amount=transfer.amount,
            status='confirmed',
            transaction_metadata={
                'transfer_id': str(transfer.id),
                'reason': 'cancelled_by_sender'
            }
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'status': transfer.status,
            'refunded_amount': transfer.amount,
            'message': 'Transfer cancelled and refunded'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f'Error cancelling transfer: {str(e)}')
        return jsonify({'error': 'Failed to cancel transfer'}), 500


@chat_transfer_bp.route('/status/<transfer_id>', methods=['GET'])
@token_required
def get_transfer_status(current_user, transfer_id):@handle_errors
@chat_transfer_bp.route('/status/<transfer_id>', methods=['GET'])
@token_required

    """
    Get transfer status
    
    Returns:
    {
        "transfer_id": "uuid",
        "status": "pending",
        "amount": 10.5,
        "token": "USDT",
        "sender": "0x...",
        "recipient": "0x...",
        "message": "Thanks!",
        "created_at": "2025-11-05T12:00:00Z",
        "expires_at": "2025-11-06T12:00:00Z",
        "claimed_at": null
    }
    """
    try:
        transfer = ChatTransfer.query.filter_by(id=transfer_id).first()
        
        if not transfer:
            return jsonify({'error': 'Transfer not found'}), 404
        
        # Verify access (sender or recipient only)
        if transfer.sender_id != current_user.id and transfer.recipient_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        return jsonify({
            'transfer_id': str(transfer.id),
            'status': transfer.status,
            'amount': transfer.amount,
            'token': transfer.token,
            'sender': transfer.sender_address,
            'recipient': transfer.recipient_address,
            'message': transfer.message,
            'created_at': transfer.created_at.isoformat(),
            'expires_at': transfer.expires_at.isoformat() if transfer.expires_at else None,
            'claimed_at': transfer.claimed_at.isoformat() if transfer.claimed_at else None,
            'cancelled_at': transfer.cancelled_at.isoformat() if transfer.cancelled_at else None
        }), 200
        
    except Exception as e:
        print(f'Error getting transfer status: {str(e)}')
        return jsonify({'error': 'Failed to get transfer status'}), 500


@chat_transfer_bp.route('/my-transfers', methods=['GET'])
@token_required
def get_my_transfers(current_user):@handle_errors
@chat_transfer_bp.route('/my-transfers', methods=['GET'])
@token_required

    """
    Get user's transfers (sent and received)
    
    Query params:
    - type: 'sent' | 'received' | 'all' (default: 'all')
    - status: 'pending' | 'claimed' | 'cancelled' | 'expired' | 'all' (default: 'all')
    - page: int (default: 1)
    - per_page: int (default: 20)
    
    Returns:
    {
        "transfers": [...],
        "total": 100,
        "page": 1,
        "per_page": 20
    }
    """
    try:
        transfer_type = request.args.get('type', 'all')
        status_filter = request.args.get('status', 'all')
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        
        # Build query
        query = ChatTransfer.query
        
        if transfer_type == 'sent':
            query = query.filter_by(sender_id=current_user.id)
        elif transfer_type == 'received':
            query = query.filter_by(recipient_id=current_user.id)
        else:  # all
            query = query.filter(
                (ChatTransfer.sender_id == current_user.id) | 
                (ChatTransfer.recipient_id == current_user.id)
            )
        
        if status_filter != 'all':
            query = query.filter_by(status=status_filter)
        
        # Paginate
        pagination = query.order_by(ChatTransfer.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        transfers = [{
            'transfer_id': str(t.id),
            'type': 'sent' if t.sender_id == current_user.id else 'received',
            'status': t.status,
            'amount': t.amount,
            'token': t.token,
            'sender': t.sender_address,
            'recipient': t.recipient_address,
            'message': t.message,
            'created_at': t.created_at.isoformat(),
            'expires_at': t.expires_at.isoformat() if t.expires_at else None,
            'claimed_at': t.claimed_at.isoformat() if t.claimed_at else None
        } for t in pagination.items]
        
        return jsonify({
            'transfers': transfers,
            'total': pagination.total,
            'page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        print(f'Error getting transfers: {str(e)}')
        return jsonify({'error': 'Failed to get transfers'}), 500
