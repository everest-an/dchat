"""
NFT Avatar API Routes

This module provides REST API endpoints for NFT avatar management,
including setting, removing, and viewing NFT avatars.

Author: Manus AI
Date: 2025-11-05
"""

from flask import Blueprint, request, jsonify, g
from datetime import datetime
from ..services.nft_avatar_service import nft_avatar_service
from ..models.subscription import NFTAvatar, db

# Enhanced middleware for production
from ..middleware.auth import require_auth, optional_auth, require_role
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError

from ..middleware.auth_middleware import authenticate
from ..middleware.subscription_middleware import (

    get_current_user_address,
    require_subscription
)


# Create blueprint
nft_avatar_bp = Blueprint('nft_avatar', __name__)


@nft_avatar_bp.route('/set', methods=['POST'])
@authenticate
@require_subscription('PRO')  # NFT avatars require Pro or Enterprise
@nft_avatar_bp.route('/set', methods=['POST'])
@handle_errors
def set_nft_avatar():
@authenticate
@require_subscription('PRO')  # NFT avatars require Pro or Enterprise

    """
    Set NFT as user's avatar
    
    POST /api/avatars/nft/set
    
    Headers:
        Authorization: Bearer <token>
        X-User-Address: <wallet_address>
    
    Body:
        {
            "nftContract": "0x...",
            "tokenId": "123",
            "standard": "ERC721",
            "transactionHash": "0x..."
        }
    
    Response:
        {
            "success": true,
            "avatar": {
                "contractAddress": "0x...",
                "tokenId": "123",
                "standard": "ERC721",
                "setAt": "2025-11-05T00:00:00"
            }
        }
    """
    try:
        user_address = get_current_user_address()
        if not user_address:
            return jsonify({
                'success': False,
                'error': 'User address not found'
            }), 401
        
        # Get request data
        data = request.get_json()
        tx_hash = data.get('transactionHash')
        
        if not tx_hash:
            return jsonify({
                'success': False,
                'error': 'Transaction hash is required'
            }), 400
        
        # Verify transaction
        success, receipt = nft_avatar_service.verify_transaction(tx_hash)
        if not success:
            return jsonify({
                'success': False,
                'error': 'Transaction verification failed'
            }), 400
        
        # Sync avatar from blockchain to database
        avatar = nft_avatar_service.sync_avatar_to_db(user_address, tx_hash)
        
        if not avatar:
            return jsonify({
                'success': False,
                'error': 'Failed to sync avatar'
            }), 500
        
        return jsonify({
            'success': True,
            'avatar': avatar.to_dict(),
            'message': 'NFT avatar set successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to set NFT avatar',
            'message': str(e)
        }), 500


@nft_avatar_bp.route('/me', methods=['GET'])
@authenticate
@nft_avatar_bp.route('/me', methods=['GET'])
@handle_errors
def get_my_nft_avatar():
@authenticate

    """
    Get current user's NFT avatar
    
    GET /api/avatars/nft/me
    
    Headers:
        Authorization: Bearer <token>
        X-User-Address: <wallet_address>
    
    Response:
        {
            "success": true,
            "avatar": {
                "contractAddress": "0x...",
                "tokenId": "123",
                "standard": "ERC721",
                "setAt": "2025-11-05T00:00:00",
                "isValid": true
            }
        }
    """
    try:
        user_address = get_current_user_address()
        if not user_address:
            return jsonify({
                'success': False,
                'error': 'User address not found'
            }), 401
        
        # Get avatar from database
        avatar = nft_avatar_service.get_user_avatar_from_db(user_address)
        
        if not avatar:
            # Try to get from blockchain
            blockchain_avatar = nft_avatar_service.get_user_avatar(user_address)
            if blockchain_avatar:
                return jsonify({
                    'success': True,
                    'avatar': blockchain_avatar
                }), 200
            else:
                return jsonify({
                    'success': True,
                    'avatar': None,
                    'message': 'No NFT avatar set'
                }), 200
        
        return jsonify({
            'success': True,
            'avatar': avatar
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get NFT avatar',
            'message': str(e)
        }), 500


@nft_avatar_bp.route('/<user_address>', methods=['GET'])
@nft_avatar_bp.route('/<user_address>', methods=['GET'])
@handle_errors
def get_user_nft_avatar(user_address):

    """
    Get any user's NFT avatar (public endpoint)
    
    GET /api/avatars/nft/<user_address>
    
    Response:
        {
            "success": true,
            "avatar": {
                "contractAddress": "0x...",
                "tokenId": "123",
                "standard": "ERC721",
                "setAt": "2025-11-05T00:00:00",
                "isValid": true
            }
        }
    """
    try:
        # Get avatar from database
        avatar = nft_avatar_service.get_user_avatar_from_db(user_address)
        
        if not avatar:
            return jsonify({
                'success': True,
                'avatar': None,
                'message': 'No NFT avatar set'
            }), 200
        
        return jsonify({
            'success': True,
            'avatar': avatar
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get NFT avatar',
            'message': str(e)
        }), 500


@nft_avatar_bp.route('/remove', methods=['DELETE'])
@authenticate
@nft_avatar_bp.route('/remove', methods=['DELETE'])
@handle_errors
def remove_nft_avatar():
@authenticate

    """
    Remove current NFT avatar
    
    DELETE /api/avatars/nft/remove
    
    Headers:
        Authorization: Bearer <token>
        X-User-Address: <wallet_address>
    
    Response:
        {
            "success": true,
            "message": "NFT avatar removed"
        }
    """
    try:
        user_address = get_current_user_address()
        if not user_address:
            return jsonify({
                'success': False,
                'error': 'User address not found'
            }), 401
        
        # Note: Actual removal happens on blockchain
        # This endpoint is for updating database status
        
        # Mark current avatar as not current
        NFTAvatar.query.filter_by(
            user_address=user_address.lower(),
            is_current=True
        ).update({'is_current': False})
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'NFT avatar removed from database',
            'note': 'Call removeAvatar() on the NFTAvatarManager contract to remove from blockchain'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to remove NFT avatar',
            'message': str(e)
        }), 500


@nft_avatar_bp.route('/history', methods=['GET'])
@authenticate
@nft_avatar_bp.route('/history', methods=['GET'])
@handle_errors
def get_avatar_history():
@authenticate

    """
    Get user's NFT avatar history
    
    GET /api/avatars/nft/history
    
    Headers:
        Authorization: Bearer <token>
        X-User-Address: <wallet_address>
    
    Response:
        {
            "success": true,
            "avatars": [
                {
                    "contractAddress": "0x...",
                    "tokenId": "123",
                    "standard": "ERC721",
                    "setAt": "2025-11-05T00:00:00"
                },
                ...
            ]
        }
    """
    try:
        user_address = get_current_user_address()
        if not user_address:
            return jsonify({
                'success': False,
                'error': 'User address not found'
            }), 401
        
        # Get avatar history from database
        avatars = nft_avatar_service.get_user_avatar_history_from_db(user_address)
        
        return jsonify({
            'success': True,
            'avatars': avatars
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get avatar history',
            'message': str(e)
        }), 500


@nft_avatar_bp.route('/verify/<user_address>', methods=['GET'])
@nft_avatar_bp.route('/verify/<user_address>', methods=['GET'])
@handle_errors
def verify_avatar_ownership(user_address):

    """
    Verify if user still owns their NFT avatar
    
    GET /api/avatars/nft/verify/<user_address>
    
    Response:
        {
            "success": true,
            "isValid": true,
            "avatar": {...}
        }
    """
    try:
        # Get avatar from database
        avatar = nft_avatar_service.get_user_avatar_from_db(user_address)
        
        if not avatar:
            return jsonify({
                'success': True,
                'isValid': False,
                'avatar': None,
                'message': 'No NFT avatar set'
            }), 200
        
        # Verify ownership on blockchain
        is_valid = nft_avatar_service.verify_avatar_ownership(user_address)
        
        # Update database if ownership changed
        if avatar['isValid'] != is_valid:
            db_avatar = NFTAvatar.query.filter_by(
                user_address=user_address.lower(),
                is_current=True
            ).first()
            if db_avatar:
                db_avatar.is_valid = is_valid
                db.session.commit()
                avatar['isValid'] = is_valid
        
        return jsonify({
            'success': True,
            'isValid': is_valid,
            'avatar': avatar
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to verify avatar ownership',
            'message': str(e)
        }), 500


@nft_avatar_bp.route('/sync', methods=['POST'])
@authenticate
@nft_avatar_bp.route('/sync', methods=['POST'])
@handle_errors
def sync_avatar_from_blockchain():
@authenticate

    """
    Manually sync avatar from blockchain to database
    
    POST /api/avatars/nft/sync
    
    Headers:
        Authorization: Bearer <token>
        X-User-Address: <wallet_address>
    
    Body:
        {
            "transactionHash": "0x..."
        }
    
    Response:
        {
            "success": true,
            "avatar": {...}
        }
    """
    try:
        user_address = get_current_user_address()
        if not user_address:
            return jsonify({
                'success': False,
                'error': 'User address not found'
            }), 401
        
        # Get request data
        data = request.get_json()
        tx_hash = data.get('transactionHash')
        
        if not tx_hash:
            return jsonify({
                'success': False,
                'error': 'Transaction hash is required'
            }), 400
        
        # Sync avatar from blockchain
        avatar = nft_avatar_service.sync_avatar_to_db(user_address, tx_hash)
        
        if not avatar:
            return jsonify({
                'success': False,
                'error': 'Failed to sync avatar'
            }), 500
        
        return jsonify({
            'success': True,
            'avatar': avatar.to_dict(),
            'message': 'Avatar synced successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to sync avatar',
            'message': str(e)
        }), 500


# Error handlers
@nft_avatar_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'error': 'Bad request',
        'message': str(error)
    }), 400


@nft_avatar_bp.errorhandler(401)
def unauthorized(error):
    return jsonify({
        'success': False,
        'error': 'Unauthorized',
        'message': 'Authentication required'
    }), 401


@nft_avatar_bp.errorhandler(403)
def forbidden(error):
    return jsonify({
        'success': False,
        'error': 'Forbidden',
        'message': str(error)
    }), 403


@nft_avatar_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'message': str(error)
    }), 500
