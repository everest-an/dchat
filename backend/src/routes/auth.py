"""
Authentication API Routes
Enhanced with comprehensive error handling and validation
"""
from flask import Blueprint, request, jsonify
from src.models.user import db, User
from web3 import Web3
from eth_account.messages import encode_defunct
import hashlib
import secrets
import time
import os

# Import new middleware
from src.middleware.error_handler import (
    handle_errors,
    validate_request_json,
    ValidationError,
    AuthenticationError
)
from src.middleware.auth import generate_token, require_auth, optional_auth
from src.config.redis_config import redis_service

auth_bp = Blueprint('auth', __name__)

SECRET_KEY = os.environ.get('SECRET_KEY', 'dchat-secret-key')


@auth_bp.route('/nonce', methods=['GET'])
@handle_errors
def get_nonce():
    """
    Get login nonce for wallet signature
    
    Query Parameters:
        address: Ethereum wallet address
    
    Returns:
        JSON with nonce, timestamp, and message to sign
    """
    address = request.args.get('address')
    
    if not address:
        raise ValidationError('Address parameter is required')
    
    # Validate address format
    if not Web3.is_address(address):
        raise ValidationError('Invalid Ethereum address format')
    
    # Generate new nonce
    nonce = secrets.token_hex(16)
    timestamp = int(time.time())
    
    # Store in Redis with 5 minute expiration
    nonce_data = {
        'nonce': nonce,
        'timestamp': timestamp
    }
    redis_service.set(f'nonce:{address.lower()}', nonce_data, expire=300)
    
    message = (
        f'Sign in to Dchat\n\n'
        f'Nonce: {nonce}\n'
        f'Timestamp: {timestamp}\n\n'
        f'This request will not trigger a blockchain transaction or cost any gas fees.'
    )
    
    return jsonify({
        'success': True,
        'nonce': nonce,
        'timestamp': timestamp,
        'message': message
    })


def verify_signature(address, signature):
    """
    Verify Web3 signature
    
    Args:
        address: Wallet address
        signature: Signed message
    
    Returns:
        Tuple of (success: bool, message: str)
    """
    try:
        # Get nonce from Redis
        nonce_data = redis_service.get(f'nonce:{address.lower()}')
        if not nonce_data:
            return False, 'Nonce not found or expired. Please request a new nonce.'
        
        # Construct signed message
        message = (
            f"Sign in to Dchat\n\n"
            f"Nonce: {nonce_data['nonce']}\n"
            f"Timestamp: {nonce_data['timestamp']}\n\n"
            f"This request will not trigger a blockchain transaction or cost any gas fees."
        )
        encoded_message = encode_defunct(text=message)
        
        # Recover signer address
        w3 = Web3()
        recovered_address = w3.eth.account.recover_message(
            encoded_message,
            signature=signature
        )
        
        # Verify address matches (case-insensitive)
        if recovered_address.lower() != address.lower():
            return False, f'Signature verification failed. Expected {address}, got {recovered_address}'
        
        # Delete used nonce from Redis (prevent replay attacks)
        redis_service.delete(f'nonce:{address.lower()}')
        
        return True, 'Signature verified successfully'
        
    except Exception as e:
        return False, f'Signature verification error: {str(e)}'


@auth_bp.route('/connect-wallet', methods=['POST'])
@handle_errors
@validate_request_json(['wallet_address', 'signature'])
def connect_wallet():
    """
    Wallet connection login with signature verification
    
    Request Body:
        {
            "wallet_address": "0x...",
            "signature": "0x...",
            "username": "optional_username",
            "email": "optional_email"
        }
    
    Returns:
        JSON with success status, token, and user info
    """
    data = request.json
    wallet_address = data.get('wallet_address') or data.get('address')
    signature = data.get('signature')
    
    if not wallet_address:
        raise ValidationError('Wallet address is required')
    
    if not signature:
        raise ValidationError('Signature is required')
    
    # Validate address format
    if not Web3.is_address(wallet_address):
        raise ValidationError('Invalid Ethereum address format')
    
    # Verify signature
    success, message = verify_signature(wallet_address, signature)
    if not success:
        raise AuthenticationError(message)
    
    # Normalize address to lowercase
    wallet_address = wallet_address.lower()
    
    # Check if user exists
    user = User.query.filter_by(wallet_address=wallet_address).first()
    
    if not user:
        # Create new user
        username = data.get('username') or f'user_{wallet_address[:8]}'
        email = data.get('email')
        
        user = User(
            wallet_address=wallet_address,
            username=username,
            email=email
        )
        db.session.add(user)
        db.session.commit()
        
        is_new_user = True
    else:
        is_new_user = False
        
        # Update last login
        user.last_login = db.func.now()
        db.session.commit()
    
    # Generate JWT token
    token = generate_token(
        user_id=user.id,
        wallet_address=wallet_address,
        additional_claims={'role': 'user'}
    )
    
    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'id': user.id,
            'wallet_address': user.wallet_address,
            'username': user.username,
            'email': user.email,
            'is_new_user': is_new_user
        }
    })


@auth_bp.route('/verify-token', methods=['GET'])
@require_auth
@handle_errors
def verify_token():
    """
    Verify JWT token validity
    
    Headers:
        Authorization: Bearer <token>
    
    Returns:
        JSON with user info if token is valid
    """
    from flask import g
    
    user = User.query.get(g.user_id)
    if not user:
        raise AuthenticationError('User not found')
    
    return jsonify({
        'success': True,
        'user': {
            'id': user.id,
            'wallet_address': user.wallet_address,
            'username': user.username,
            'email': user.email
        }
    })


@auth_bp.route('/refresh-token', methods=['POST'])
@require_auth
@handle_errors
def refresh_token():
    """
    Refresh JWT token
    
    Headers:
        Authorization: Bearer <old_token>
    
    Returns:
        JSON with new token
    """
    from flask import g
    
    # Generate new token
    new_token = generate_token(
        user_id=g.user_id,
        wallet_address=g.wallet_address,
        additional_claims={'role': 'user'}
    )
    
    return jsonify({
        'success': True,
        'token': new_token
    })


@auth_bp.route('/logout', methods=['POST'])
@require_auth
@handle_errors
def logout():
    """
    Logout (client should delete token)
    
    Headers:
        Authorization: Bearer <token>
    
    Returns:
        JSON with success status
    """
    # In a stateless JWT system, logout is handled client-side
    # But we can add the token to a blacklist if needed
    
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    })
