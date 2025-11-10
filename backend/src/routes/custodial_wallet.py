"""
Custodial Wallet API Routes

Provides endpoints for managing custodial wallets.

Endpoints:
- POST /api/wallets/custodial/create - Create custodial wallet
- GET /api/wallets/custodial/me - Get my custodial wallet
- POST /api/wallets/custodial/deposit - Process deposit
- POST /api/wallets/custodial/withdraw - Process withdrawal
- POST /api/wallets/custodial/transfer - Transfer funds
- GET /api/wallets/custodial/transactions - Get transaction history
- POST /api/wallets/custodial/sync - Sync balance with blockchain

@author Manus AI
@date 2025-11-05
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os
from src.services.custodial_wallet_service import CustodialWalletService
from src.models.custodial_wallet import db
from src.middleware.security_middleware import rate_limit

custodial_wallet_bp = Blueprint('custodial_wallet', __name__)

JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')

# Authentication decorator
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'No authorization token provided'}), 401
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            request.user_id = payload.get('user_id')
            request.wallet_address = payload.get('wallet_address')
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated_function


@custodial_wallet_bp.route('/api/wallets/custodial/create', methods=['POST'])
@require_auth
@rate_limit(max_requests=5, window_seconds=60)
def create_custodial_wallet():
    """
    Create a new custodial wallet for the authenticated user
    
    Returns:
        201: Wallet created successfully
        400: Wallet already exists
        500: Server error
    """
    try:
        user_id = request.user_id
        
        # Create wallet
        wallet = CustodialWalletService.create_wallet(user_id)
        
        if not wallet:
            return jsonify({'error': 'Failed to create wallet'}), 500
        
        return jsonify({
            'success': True,
            'wallet': wallet.to_dict(include_sensitive=False)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@custodial_wallet_bp.route('/api/wallets/custodial/me', methods=['GET'])
@require_auth
def get_my_custodial_wallet():
    """
    Get authenticated user's custodial wallet
    
    Returns:
        200: Wallet data
        404: Wallet not found
    """
    try:
        user_id = request.user_id
        
        wallet = CustodialWalletService.get_wallet(user_id)
        
        if not wallet:
            return jsonify({'error': 'Custodial wallet not found'}), 404
        
        return jsonify({
            'success': True,
            'wallet': wallet.to_dict(include_sensitive=False)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@custodial_wallet_bp.route('/api/wallets/custodial/deposit', methods=['POST'])
@require_auth
@rate_limit(max_requests=20, window_seconds=60)
def process_deposit():
    """
    Process a deposit to custodial wallet
    
    Request body:
        token: Token symbol (ETH, USDT, USDC)
        amount: Amount in smallest unit (wei, etc.)
        from_address: Source address
        tx_hash: Transaction hash
    
    Returns:
        200: Deposit processed
        400: Invalid request
        404: Wallet not found
        500: Server error
    """
    try:
        user_id = request.user_id
        data = request.json
        
        # Validate request
        required_fields = ['token', 'amount', 'from_address', 'tx_hash']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Get wallet
        wallet = CustodialWalletService.get_wallet(user_id)
        if not wallet:
            return jsonify({'error': 'Custodial wallet not found'}), 404
        
        # Process deposit
        transaction = CustodialWalletService.deposit(
            wallet=wallet,
            token=data['token'],
            amount=int(data['amount']),
            from_address=data['from_address'],
            tx_hash=data['tx_hash']
        )
        
        if not transaction:
            return jsonify({'error': 'Failed to process deposit'}), 500
        
        return jsonify({
            'success': True,
            'transaction': transaction.to_dict(),
            'wallet': wallet.to_dict(include_sensitive=False)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@custodial_wallet_bp.route('/api/wallets/custodial/withdraw', methods=['POST'])
@require_auth
@rate_limit(max_requests=10, window_seconds=60)
def process_withdrawal():
    """
    Process a withdrawal from custodial wallet
    
    Request body:
        token: Token symbol (ETH, USDT, USDC)
        amount: Amount in smallest unit (wei, etc.)
        to_address: Destination address
        amount_usd: USD value (optional, for limit checking)
    
    Returns:
        200: Withdrawal processed
        400: Invalid request or insufficient balance
        404: Wallet not found
        500: Server error
    """
    try:
        user_id = request.user_id
        data = request.json
        
        # Validate request
        required_fields = ['token', 'amount', 'to_address']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Get wallet
        wallet = CustodialWalletService.get_wallet(user_id)
        if not wallet:
            return jsonify({'error': 'Custodial wallet not found'}), 404
        
        # Process withdrawal
        success, message, tx_hash = CustodialWalletService.withdraw(
            wallet=wallet,
            token=data['token'],
            amount=int(data['amount']),
            to_address=data['to_address'],
            amount_usd=float(data.get('amount_usd', 0.0))
        )
        
        if not success:
            return jsonify({'error': message}), 400
        
        return jsonify({
            'success': True,
            'message': message,
            'tx_hash': tx_hash,
            'wallet': wallet.to_dict(include_sensitive=False)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@custodial_wallet_bp.route('/api/wallets/custodial/transfer', methods=['POST'])
@require_auth
@rate_limit(max_requests=30, window_seconds=60)
def process_transfer():
    """
    Transfer funds to another wallet
    
    Request body:
        to_address: Destination wallet address
        token: Token symbol (ETH, USDT, USDC)
        amount: Amount in smallest unit (wei, etc.)
    
    Returns:
        200: Transfer successful
        400: Invalid request or insufficient balance
        404: Wallet not found
        500: Server error
    """
    try:
        user_id = request.user_id
        data = request.json
        
        # Validate request
        required_fields = ['to_address', 'token', 'amount']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Get wallet
        wallet = CustodialWalletService.get_wallet(user_id)
        if not wallet:
            return jsonify({'error': 'Custodial wallet not found'}), 404
        
        # Process transfer
        success, message, tx_id = CustodialWalletService.transfer(
            from_wallet=wallet,
            to_address=data['to_address'],
            token=data['token'],
            amount=int(data['amount'])
        )
        
        if not success:
            return jsonify({'error': message}), 400
        
        return jsonify({
            'success': True,
            'message': message,
            'tx_id': tx_id,
            'wallet': wallet.to_dict(include_sensitive=False)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@custodial_wallet_bp.route('/api/wallets/custodial/transactions', methods=['GET'])
@require_auth
def get_transaction_history():
    """
    Get custodial wallet transaction history
    
    Query params:
        limit: Maximum number of transactions (default: 50)
    
    Returns:
        200: Transaction history
        404: Wallet not found
        500: Server error
    """
    try:
        user_id = request.user_id
        limit = int(request.args.get('limit', 50))
        
        # Get wallet
        wallet = CustodialWalletService.get_wallet(user_id)
        if not wallet:
            return jsonify({'error': 'Custodial wallet not found'}), 404
        
        # Get transactions
        transactions = CustodialWalletService.get_transaction_history(wallet, limit)
        
        return jsonify({
            'success': True,
            'transactions': transactions,
            'count': len(transactions)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@custodial_wallet_bp.route('/api/wallets/custodial/sync', methods=['POST'])
@require_auth
def sync_balance():
    """
    Sync wallet balance with blockchain
    
    Returns:
        200: Balance synced
        404: Wallet not found
        500: Server error
    """
    try:
        user_id = request.user_id
        
        # Get wallet
        wallet = CustodialWalletService.get_wallet(user_id)
        if not wallet:
            return jsonify({'error': 'Custodial wallet not found'}), 404
        
        # Sync balance
        success = CustodialWalletService.sync_balance(wallet)
        
        if not success:
            return jsonify({'error': 'Failed to sync balance'}), 500
        
        return jsonify({
            'success': True,
            'wallet': wallet.to_dict(include_sensitive=False)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
