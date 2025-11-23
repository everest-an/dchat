"""
Subscription API Routes

This module provides REST API endpoints for subscription management,
including subscription creation, cancellation, renewal, and history.

Author: Manus AI
Date: 2025-11-05
"""

from flask import Blueprint, request, jsonify, g
from datetime import datetime
from ..services.subscription_service import subscription_service
from ..models.subscription import Subscription, db

# Enhanced middleware for production
from ..middleware.auth import require_auth, optional_auth, require_role
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError

from ..middleware.auth_middleware import authenticate
from ..middleware.subscription_middleware import get_current_user_address



# Create blueprint
subscription_bp = Blueprint('subscription', __name__)


@subscription_bp.route('/plans', methods=['GET'])
@subscription_bp.route('/plans', methods=['GET'])
@handle_errors
def get_subscription_plans():

    """
    Get available subscription plans with pricing
    
    GET /api/subscriptions/plans
    
    Response:
        {
            "plans": [
                {
                    "tier": "PRO",
                    "name": "Pro",
                    "description": "For professionals and small teams",
                    "pricing": {
                        "monthly": "0.0025",
                        "yearly": "0.025",
                        "nft": "0.1",
                        "monthlyUsd": "$5",
                        "yearlyUsd": "$50",
                        "nftUsd": "$200"
                    },
                    "features": [...]
                },
                ...
            ]
        }
    """
    try:
        # Get pricing from smart contract
        pro_pricing = subscription_service.get_pricing('PRO')
        enterprise_pricing = subscription_service.get_pricing('ENTERPRISE')
        
        plans = [
            {
                'tier': 'FREE',
                'name': 'Free',
                'description': 'For individuals getting started',
                'pricing': {
                    'monthly': '0',
                    'yearly': '0',
                    'nft': '0',
                    'monthlyUsd': '$0',
                    'yearlyUsd': '$0',
                    'nftUsd': '$0'
                },
                'features': [
                    'Up to 100 group members',
                    '100MB file uploads',
                    '60 minutes call duration',
                    '5GB storage',
                    'Basic search',
                    'Standard support'
                ]
            },
            {
                'tier': 'PRO',
                'name': 'Pro',
                'description': 'For professionals and small teams',
                'pricing': {
                    'monthly': pro_pricing['monthlyPrice'],
                    'yearly': pro_pricing['yearlyPrice'],
                    'nft': pro_pricing['nftPrice'],
                    'monthlyEth': str(pro_pricing['monthlyPriceEth']),
                    'yearlyEth': str(pro_pricing['yearlyPriceEth']),
                    'nftEth': str(pro_pricing['nftPriceEth']),
                    'monthlyUsd': '$4.99',
                    'yearlyUsd': '$49.99',
                    'nftUsd': '$199'
                },
                'features': [
                    'Up to 500 group members',
                    '1GB file uploads',
                    'Unlimited call duration',
                    'Call recording',
                    '100GB storage',
                    'Advanced search',
                    '50 custom stickers',
                    'NFT avatars',
                    'Priority support'
                ]
            },
            {
                'tier': 'ENTERPRISE',
                'name': 'Enterprise',
                'description': 'For large organizations',
                'pricing': {
                    'monthly': enterprise_pricing['monthlyPrice'],
                    'yearly': enterprise_pricing['yearlyPrice'],
                    'nft': enterprise_pricing['nftPrice'],
                    'monthlyEth': str(enterprise_pricing['monthlyPriceEth']),
                    'yearlyEth': str(enterprise_pricing['yearlyPriceEth']),
                    'nftEth': str(enterprise_pricing['nftPriceEth']),
                    'monthlyUsd': '$19.99',
                    'yearlyUsd': '$199.99',
                    'nftUsd': '$999'
                },
                'features': [
                    'Unlimited group members',
                    '10GB file uploads',
                    'Unlimited call duration',
                    'Call recording',
                    '1TB storage',
                    'Advanced search',
                    'Unlimited custom stickers',
                    'NFT avatars',
                    'Custom branding',
                    'API access',
                    'Dedicated support'
                ]
            }
        ]
        
        return jsonify({
            'success': True,
            'plans': plans
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get subscription plans',
            'message': str(e)
        }), 500


@subscription_bp.route('/me', methods=['GET'])
@authenticate
@subscription_bp.route('/me', methods=['GET'])
@handle_errors
def get_current_subscription():
@authenticate

    """
    Get current user's subscription
    
    GET /api/subscriptions/me
    
    Headers:
        Authorization: Bearer <token>
        X-User-Address: <wallet_address>
    
    Response:
        {
            "subscription": {
                "id": 1,
                "blockchainId": 1,
                "tier": "PRO",
                "period": "MONTHLY",
                "status": "ACTIVE",
                "startTime": "2025-11-05T00:00:00",
                "endTime": "2025-12-05T00:00:00",
                "amount": "2500000000000000",
                "paymentToken": "ETH",
                "autoRenew": true
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
        
        # Get subscription from blockchain
        subscription_data = subscription_service.get_user_subscription(user_address)
        
        if not subscription_data:
            return jsonify({
                'success': True,
                'subscription': None,
                'tier': 'FREE'
            }), 200
        
        # Get from database if exists
        db_subscription = Subscription.query.filter_by(
            blockchain_id=subscription_data['blockchainId']
        ).first()
        
        if db_subscription:
            return jsonify({
                'success': True,
                'subscription': db_subscription.to_dict()
            }), 200
        else:
            return jsonify({
                'success': True,
                'subscription': subscription_data
            }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get subscription',
            'message': str(e)
        }), 500


@subscription_bp.route('/create', methods=['POST'])
@authenticate
@subscription_bp.route('/create', methods=['POST'])
@handle_errors
def create_subscription():
@authenticate

    """
    Create a new subscription (sync from blockchain)
    
    POST /api/subscriptions/create
    
    Headers:
        Authorization: Bearer <token>
        X-User-Address: <wallet_address>
    
    Body:
        {
            "tier": "PRO",
            "period": "MONTHLY",
            "paymentToken": "ETH",
            "transactionHash": "0x..."
        }
    
    Response:
        {
            "success": true,
            "subscription": {...}
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
        success, receipt = subscription_service.verify_transaction(tx_hash)
        if not success:
            return jsonify({
                'success': False,
                'error': 'Transaction verification failed'
            }), 400
        
        # Sync subscription from blockchain to database
        subscription = subscription_service.sync_subscription_to_db(user_address, tx_hash)
        
        if not subscription:
            return jsonify({
                'success': False,
                'error': 'Failed to sync subscription'
            }), 500
        
        return jsonify({
            'success': True,
            'subscription': subscription.to_dict(),
            'message': 'Subscription created successfully'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to create subscription',
            'message': str(e)
        }), 500


@subscription_bp.route('/cancel', methods=['POST'])
@authenticate
@subscription_bp.route('/cancel', methods=['POST'])
@handle_errors
def cancel_subscription():
@authenticate

    """
    Cancel current subscription
    
    POST /api/subscriptions/cancel
    
    Headers:
        Authorization: Bearer <token>
        X-User-Address: <wallet_address>
    
    Response:
        {
            "success": true,
            "message": "Subscription cancelled"
        }
    """
    try:
        user_address = get_current_user_address()
        if not user_address:
            return jsonify({
                'success': False,
                'error': 'User address not found'
            }), 401
        
        # Note: Actual cancellation happens on blockchain
        # This endpoint is for updating database status
        
        return jsonify({
            'success': True,
            'message': 'Please cancel subscription via smart contract',
            'note': 'Call cancelSubscription() on the SubscriptionManager contract'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to cancel subscription',
            'message': str(e)
        }), 500


@subscription_bp.route('/renew', methods=['POST'])
@authenticate
@subscription_bp.route('/renew', methods=['POST'])
@handle_errors
def renew_subscription():
@authenticate

    """
    Renew subscription (sync from blockchain)
    
    POST /api/subscriptions/renew
    
    Headers:
        Authorization: Bearer <token>
        X-User-Address: <wallet_address>
    
    Body:
        {
            "period": "MONTHLY",
            "paymentToken": "ETH",
            "transactionHash": "0x..."
        }
    
    Response:
        {
            "success": true,
            "subscription": {...}
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
        success, receipt = subscription_service.verify_transaction(tx_hash)
        if not success:
            return jsonify({
                'success': False,
                'error': 'Transaction verification failed'
            }), 400
        
        # Sync subscription from blockchain
        subscription = subscription_service.sync_subscription_to_db(user_address, tx_hash)
        
        if not subscription:
            return jsonify({
                'success': False,
                'error': 'Failed to sync subscription'
            }), 500
        
        return jsonify({
            'success': True,
            'subscription': subscription.to_dict(),
            'message': 'Subscription renewed successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to renew subscription',
            'message': str(e)
        }), 500


@subscription_bp.route('/history', methods=['GET'])
@authenticate
@subscription_bp.route('/history', methods=['GET'])
@handle_errors
def get_subscription_history():
@authenticate

    """
    Get user's subscription history
    
    GET /api/subscriptions/history
    
    Headers:
        Authorization: Bearer <token>
        X-User-Address: <wallet_address>
    
    Response:
        {
            "success": true,
            "subscriptions": [...]
        }
    """
    try:
        user_address = get_current_user_address()
        if not user_address:
            return jsonify({
                'success': False,
                'error': 'User address not found'
            }), 401
        
        # Get subscription history from database
        subscriptions = subscription_service.get_user_subscription_history(user_address)
        
        return jsonify({
            'success': True,
            'subscriptions': subscriptions
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get subscription history',
            'message': str(e)
        }), 500


@subscription_bp.route('/tier', methods=['GET'])
@authenticate
@subscription_bp.route('/tier', methods=['GET'])
@handle_errors
def get_user_tier():
@authenticate

    """
    Get user's current subscription tier
    
    GET /api/subscriptions/tier
    
    Headers:
        Authorization: Bearer <token>
        X-User-Address: <wallet_address>
    
    Response:
        {
            "success": true,
            "tier": "PRO",
            "isActive": true
        }
    """
    try:
        user_address = get_current_user_address()
        if not user_address:
            return jsonify({
                'success': False,
                'error': 'User address not found'
            }), 401
        
        # Get tier from blockchain
        tier = subscription_service.get_user_tier(user_address)
        is_active = subscription_service.is_subscription_active(user_address)
        
        return jsonify({
            'success': True,
            'tier': tier,
            'isActive': is_active
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get user tier',
            'message': str(e)
        }), 500


@subscription_bp.route('/pricing/<tier>', methods=['GET'])
@subscription_bp.route('/pricing/<tier>', methods=['GET'])
@handle_errors
def get_tier_pricing(tier):

    """
    Get pricing for a specific tier
    
    GET /api/subscriptions/pricing/<tier>
    
    Response:
        {
            "success": true,
            "tier": "PRO",
            "pricing": {
                "monthlyPrice": "2500000000000000",
                "yearlyPrice": "25000000000000000",
                "nftPrice": "100000000000000000",
                "monthlyPriceEth": "0.0025",
                "yearlyPriceEth": "0.025",
                "nftPriceEth": "0.1"
            }
        }
    """
    try:
        if tier.upper() not in ['PRO', 'ENTERPRISE']:
            return jsonify({
                'success': False,
                'error': 'Invalid tier'
            }), 400
        
        pricing = subscription_service.get_pricing(tier.upper())
        
        return jsonify({
            'success': True,
            'tier': tier.upper(),
            'pricing': pricing
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get pricing',
            'message': str(e)
        }), 500


# Error handlers
@subscription_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'error': 'Bad request',
        'message': str(error)
    }), 400


@subscription_bp.errorhandler(401)
def unauthorized(error):
    return jsonify({
        'success': False,
        'error': 'Unauthorized',
        'message': 'Authentication required'
    }), 401


@subscription_bp.errorhandler(403)
def forbidden(error):
    return jsonify({
        'success': False,
        'error': 'Forbidden',
        'message': str(error)
    }), 403


@subscription_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'message': str(error)
    }), 500
