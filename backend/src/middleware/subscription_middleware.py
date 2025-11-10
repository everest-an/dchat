"""
Subscription Middleware

This module provides middleware for checking subscription tiers
and enforcing feature access control.

Author: Manus AI
Date: 2025-11-05
"""

from functools import wraps
from flask import request, jsonify, g
from typing import Callable
from ..services.subscription_service import subscription_service


# Tier hierarchy levels
TIER_LEVELS = {
    'FREE': 0,
    'PRO': 1,
    'ENTERPRISE': 2
}


def get_current_user_address() -> str:
    """
    Get current user's wallet address from request context
    
    Returns:
        User's wallet address or empty string
    """
    # Try to get from Flask g object (set by auth middleware)
    if hasattr(g, 'user_address'):
        return g.user_address
    
    # Try to get from request headers
    user_address = request.headers.get('X-User-Address', '')
    if user_address:
        return user_address.lower()
    
    # Try to get from JWT token or session
    # TODO: Implement JWT token parsing
    
    return ''


def require_subscription(required_tier: str):
    """
    Decorator to require a minimum subscription tier
    
    Args:
        required_tier: Minimum required tier (FREE, PRO, ENTERPRISE)
        
    Usage:
        @app.route('/api/features/advanced')
        @require_subscription('PRO')
        def advanced_feature():
            return jsonify({'message': 'Advanced feature'})
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get current user address
            user_address = get_current_user_address()
            if not user_address:
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Please connect your wallet'
                }), 401
            
            # Get user's subscription tier
            user_tier = subscription_service.get_user_tier(user_address)
            
            # Check tier level
            user_level = TIER_LEVELS.get(user_tier, 0)
            required_level = TIER_LEVELS.get(required_tier, 0)
            
            if user_level < required_level:
                return jsonify({
                    'error': 'Subscription required',
                    'message': f'This feature requires {required_tier} subscription',
                    'currentTier': user_tier,
                    'requiredTier': required_tier,
                    'upgradeUrl': '/subscription/plans'
                }), 403
            
            # Store tier in request context for use in route
            g.user_tier = user_tier
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_active_subscription():
    """
    Decorator to require an active subscription (any paid tier)
    
    Usage:
        @app.route('/api/features/premium')
        @require_active_subscription()
        def premium_feature():
            return jsonify({'message': 'Premium feature'})
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get current user address
            user_address = get_current_user_address()
            if not user_address:
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Please connect your wallet'
                }), 401
            
            # Check if subscription is active
            is_active = subscription_service.is_subscription_active(user_address)
            
            if not is_active:
                return jsonify({
                    'error': 'Active subscription required',
                    'message': 'This feature requires an active subscription',
                    'upgradeUrl': '/subscription/plans'
                }), 403
            
            # Get and store tier
            user_tier = subscription_service.get_user_tier(user_address)
            g.user_tier = user_tier
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def check_feature_limit(feature_name: str, limit_map: dict):
    """
    Decorator to check feature usage limits based on subscription tier
    
    Args:
        feature_name: Name of the feature to check
        limit_map: Dictionary mapping tier to limit (e.g., {'FREE': 100, 'PRO': 500, 'ENTERPRISE': None})
        
    Usage:
        @app.route('/api/groups/create')
        @check_feature_limit('group_members', {'FREE': 100, 'PRO': 500, 'ENTERPRISE': None})
        def create_group():
            return jsonify({'message': 'Group created'})
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get current user address
            user_address = get_current_user_address()
            if not user_address:
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Please connect your wallet'
                }), 401
            
            # Get user's subscription tier
            user_tier = subscription_service.get_user_tier(user_address)
            
            # Get limit for user's tier
            limit = limit_map.get(user_tier)
            
            # None means unlimited
            if limit is None:
                g.feature_limit = None
                g.user_tier = user_tier
                return f(*args, **kwargs)
            
            # Store limit in request context
            g.feature_limit = limit
            g.user_tier = user_tier
            
            # Note: Actual usage checking should be done in the route handler
            # This decorator just sets the limit for reference
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def get_tier_limits(feature_name: str) -> dict:
    """
    Get feature limits for all tiers
    
    Args:
        feature_name: Name of the feature
        
    Returns:
        Dictionary mapping tier to limit
    """
    # Feature limit configuration
    FEATURE_LIMITS = {
        'group_members': {
            'FREE': 100,
            'PRO': 500,
            'ENTERPRISE': None  # Unlimited
        },
        'file_size_mb': {
            'FREE': 100,
            'PRO': 1000,
            'ENTERPRISE': 10000
        },
        'call_duration_minutes': {
            'FREE': 60,
            'PRO': None,  # Unlimited
            'ENTERPRISE': None
        },
        'custom_stickers': {
            'FREE': 0,
            'PRO': 50,
            'ENTERPRISE': None
        },
        'storage_gb': {
            'FREE': 5,
            'PRO': 100,
            'ENTERPRISE': 1000
        },
        'api_calls_per_day': {
            'FREE': 1000,
            'PRO': 10000,
            'ENTERPRISE': None
        }
    }
    
    return FEATURE_LIMITS.get(feature_name, {})


def check_user_limit(user_address: str, feature_name: str, requested_value: int) -> tuple:
    """
    Check if user can perform action based on their tier limits
    
    Args:
        user_address: User's wallet address
        feature_name: Name of the feature to check
        requested_value: Requested value (e.g., number of members, file size)
        
    Returns:
        Tuple of (allowed: bool, current_tier: str, limit: int, message: str)
    """
    # Get user's tier
    user_tier = subscription_service.get_user_tier(user_address)
    
    # Get limits for this feature
    limits = get_tier_limits(feature_name)
    user_limit = limits.get(user_tier, 0)
    
    # None means unlimited
    if user_limit is None:
        return True, user_tier, None, 'Unlimited'
    
    # Check if within limit
    if requested_value <= user_limit:
        return True, user_tier, user_limit, f'Within limit ({requested_value}/{user_limit})'
    else:
        # Find next tier that allows this
        next_tier = None
        for tier in ['PRO', 'ENTERPRISE']:
            tier_limit = limits.get(tier)
            if tier_limit is None or requested_value <= tier_limit:
                next_tier = tier
                break
        
        message = f'Limit exceeded ({requested_value}/{user_limit}). '
        if next_tier:
            message += f'Upgrade to {next_tier} to increase limit.'
        
        return False, user_tier, user_limit, message
