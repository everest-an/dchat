"""
Subscription API Routes

This module provides REST API endpoints for subscription management,
including subscription creation, cancellation, renewal, and history.

Features:
- Subscription plan management
- User subscription tracking
- Payment processing (Stripe, Web3)
- Auto-renewal management
- Subscription history

Author: Manus AI
Date: 2024-11-16
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
from enum import Enum
import logging

from src.models.user import User, db
from src.models.subscription import Subscription
from src.middleware.auth import require_auth
from src.middleware.error_handler import ValidationError

logger = logging.getLogger(__name__)

subscription_bp = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])

# Subscription tiers
class SubscriptionTier(str, Enum):
    FREE = "FREE"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"

# Subscription periods
class SubscriptionPeriod(str, Enum):
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"
    NFT = "NFT"

# Subscription status
class SubscriptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    SUSPENDED = "SUSPENDED"

# Subscription plans configuration
SUBSCRIPTION_PLANS = {
    'FREE': {
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
    'PRO': {
        'tier': 'PRO',
        'name': 'Pro',
        'description': 'For professionals and small teams',
        'pricing': {
            'monthly': '0.0025',
            'yearly': '0.025',
            'nft': '0.1',
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
    'ENTERPRISE': {
        'tier': 'ENTERPRISE',
        'name': 'Enterprise',
        'description': 'For large organizations',
        'pricing': {
            'monthly': '0.01',
            'yearly': '0.1',
            'nft': '0.5',
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
}


@subscription_bp.get('/plans')
async def get_subscription_plans():
    """
    Get available subscription plans with pricing
    
    Returns:
        JSON response with subscription plans
    """
    try:
        plans = list(SUBSCRIPTION_PLANS.values())
        
        return {
            'success': True,
            'plans': plans
        }
        
    except Exception as e:
        logger.error(f"Error retrieving subscription plans: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get subscription plans: {str(e)}'
        )


@subscription_bp.get('/me')
async def get_current_subscription(
    current_user: dict = Depends(require_auth)
):
    """
    Get current user's subscription
    
    Returns:
        JSON response with user's subscription details
    """
    try:
        user_id = current_user.get('user_id')
        user = db.session.query(User).filter_by(id=user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='User not found'
            )
        
        # Get active subscription
        subscription = db.session.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status == SubscriptionStatus.ACTIVE.value,
            Subscription.end_date > datetime.utcnow()
        ).first()
        
        if not subscription:
            return {
                'success': True,
                'subscription': None,
                'tier': SubscriptionTier.FREE.value
            }
        
        return {
            'success': True,
            'subscription': {
                'id': subscription.id,
                'tier': subscription.tier,
                'period': subscription.period,
                'status': subscription.status,
                'start_date': subscription.start_date.isoformat() if subscription.start_date else None,
                'end_date': subscription.end_date.isoformat() if subscription.end_date else None,
                'auto_renew': subscription.auto_renew,
                'payment_method': subscription.payment_method,
                'created_at': subscription.created_at.isoformat() if subscription.created_at else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get subscription: {str(e)}'
        )


@subscription_bp.post('/create')
async def create_subscription(
    subscription_data: dict,
    current_user: dict = Depends(require_auth)
):
    """
    Create a new subscription
    
    Request Body:
        {
            "tier": "PRO",
            "period": "MONTHLY",
            "payment_method": "stripe" | "web3",
            "payment_token": "ETH" | "USDC",
            "transaction_hash": "0x..." (for Web3 payments)
        }
    
    Returns:
        JSON response with subscription details
    """
    try:
        user_id = current_user.get('user_id')
        user = db.session.query(User).filter_by(id=user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='User not found'
            )
        
        # Validate tier
        tier = subscription_data.get('tier', '').upper()
        if tier not in SUBSCRIPTION_PLANS:
            raise ValidationError(f"Invalid subscription tier: {tier}")
        
        # Validate period
        period = subscription_data.get('period', '').upper()
        try:
            SubscriptionPeriod(period)
        except ValueError:
            raise ValidationError(f"Invalid subscription period: {period}")
        
        # Validate payment method
        payment_method = subscription_data.get('payment_method', 'stripe').lower()
        if payment_method not in ['stripe', 'web3']:
            raise ValidationError(f"Invalid payment method: {payment_method}")
        
        # Cancel existing active subscription
        existing_subscription = db.session.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status == SubscriptionStatus.ACTIVE.value
        ).first()
        
        if existing_subscription:
            existing_subscription.status = SubscriptionStatus.CANCELLED.value
            existing_subscription.cancelled_at = datetime.utcnow()
        
        # Calculate subscription dates
        start_date = datetime.utcnow()
        if period == SubscriptionPeriod.MONTHLY.value:
            end_date = start_date + timedelta(days=30)
        elif period == SubscriptionPeriod.YEARLY.value:
            end_date = start_date + timedelta(days=365)
        else:  # NFT
            end_date = start_date + timedelta(days=365)  # 1 year for NFT
        
        # Create new subscription
        new_subscription = Subscription(
            user_id=user_id,
            tier=tier,
            period=period,
            status=SubscriptionStatus.ACTIVE.value,
            start_date=start_date,
            end_date=end_date,
            payment_method=payment_method,
            payment_token=subscription_data.get('payment_token', 'ETH'),
            transaction_hash=subscription_data.get('transaction_hash'),
            auto_renew=subscription_data.get('auto_renew', True)
        )
        
        db.session.add(new_subscription)
        db.session.commit()
        
        logger.info(f"Subscription created for user {user_id}: {tier} {period}")
        
        return {
            'success': True,
            'subscription': {
                'id': new_subscription.id,
                'tier': new_subscription.tier,
                'period': new_subscription.period,
                'status': new_subscription.status,
                'start_date': new_subscription.start_date.isoformat(),
                'end_date': new_subscription.end_date.isoformat(),
                'auto_renew': new_subscription.auto_renew
            },
            'message': 'Subscription created successfully'
        }
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to create subscription: {str(e)}'
        )


@subscription_bp.post('/cancel')
async def cancel_subscription(
    current_user: dict = Depends(require_auth)
):
    """
    Cancel current subscription
    
    Returns:
        JSON response with cancellation status
    """
    try:
        user_id = current_user.get('user_id')
        user = db.session.query(User).filter_by(id=user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='User not found'
            )
        
        # Get active subscription
        subscription = db.session.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status == SubscriptionStatus.ACTIVE.value
        ).first()
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='No active subscription found'
            )
        
        # Cancel subscription
        subscription.status = SubscriptionStatus.CANCELLED.value
        subscription.cancelled_at = datetime.utcnow()
        subscription.auto_renew = False
        db.session.commit()
        
        logger.info(f"Subscription cancelled for user {user_id}")
        
        return {
            'success': True,
            'message': 'Subscription cancelled successfully'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to cancel subscription: {str(e)}'
        )


@subscription_bp.post('/renew')
async def renew_subscription(
    renewal_data: dict,
    current_user: dict = Depends(require_auth)
):
    """
    Renew an expired subscription
    
    Request Body:
        {
            "tier": "PRO",
            "period": "MONTHLY",
            "payment_method": "stripe" | "web3"
        }
    
    Returns:
        JSON response with renewed subscription details
    """
    try:
        user_id = current_user.get('user_id')
        user = db.session.query(User).filter_by(id=user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='User not found'
            )
        
        # Get expired subscription
        expired_subscription = db.session.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.end_date <= datetime.utcnow()
        ).order_by(Subscription.end_date.desc()).first()
        
        if not expired_subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='No expired subscription found'
            )
        
        # Mark old subscription as expired
        expired_subscription.status = SubscriptionStatus.EXPIRED.value
        
        # Create new subscription (reuse create_subscription logic)
        tier = renewal_data.get('tier', expired_subscription.tier)
        period = renewal_data.get('period', expired_subscription.period)
        payment_method = renewal_data.get('payment_method', expired_subscription.payment_method)
        
        start_date = datetime.utcnow()
        if period == SubscriptionPeriod.MONTHLY.value:
            end_date = start_date + timedelta(days=30)
        elif period == SubscriptionPeriod.YEARLY.value:
            end_date = start_date + timedelta(days=365)
        else:  # NFT
            end_date = start_date + timedelta(days=365)
        
        new_subscription = Subscription(
            user_id=user_id,
            tier=tier,
            period=period,
            status=SubscriptionStatus.ACTIVE.value,
            start_date=start_date,
            end_date=end_date,
            payment_method=payment_method,
            payment_token=renewal_data.get('payment_token', 'ETH'),
            transaction_hash=renewal_data.get('transaction_hash'),
            auto_renew=renewal_data.get('auto_renew', True)
        )
        
        db.session.add(new_subscription)
        db.session.commit()
        
        logger.info(f"Subscription renewed for user {user_id}: {tier} {period}")
        
        return {
            'success': True,
            'subscription': {
                'id': new_subscription.id,
                'tier': new_subscription.tier,
                'period': new_subscription.period,
                'status': new_subscription.status,
                'start_date': new_subscription.start_date.isoformat(),
                'end_date': new_subscription.end_date.isoformat()
            },
            'message': 'Subscription renewed successfully'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error renewing subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to renew subscription: {str(e)}'
        )


@subscription_bp.get('/history')
async def get_subscription_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_auth)
):
    """
    Get subscription history for current user
    
    Query Parameters:
        limit: Maximum number of records to return (default: 20)
        offset: Number of records to skip (default: 0)
    
    Returns:
        JSON response with subscription history
    """
    try:
        user_id = current_user.get('user_id')
        user = db.session.query(User).filter_by(id=user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='User not found'
            )
        
        # Get all subscriptions for user
        subscriptions_query = db.session.query(Subscription).filter(
            Subscription.user_id == user_id
        ).order_by(Subscription.created_at.desc())
        
        total_count = subscriptions_query.count()
        subscriptions = subscriptions_query.offset(offset).limit(limit).all()
        
        return {
            'success': True,
            'subscriptions': [
                {
                    'id': sub.id,
                    'tier': sub.tier,
                    'period': sub.period,
                    'status': sub.status,
                    'start_date': sub.start_date.isoformat() if sub.start_date else None,
                    'end_date': sub.end_date.isoformat() if sub.end_date else None,
                    'payment_method': sub.payment_method,
                    'created_at': sub.created_at.isoformat() if sub.created_at else None
                }
                for sub in subscriptions
            ],
            'total_count': total_count,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'has_more': (offset + limit) < total_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving subscription history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to retrieve subscription history: {str(e)}'
        )


@subscription_bp.get('/pricing/{tier}')
async def get_pricing(tier: str):
    """
    Get pricing information for a specific subscription tier
    
    Path Parameters:
        tier: Subscription tier (FREE, PRO, ENTERPRISE)
    
    Returns:
        JSON response with pricing details
    """
    try:
        tier = tier.upper()
        
        if tier not in SUBSCRIPTION_PLANS:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f'Subscription tier not found: {tier}'
            )
        
        plan = SUBSCRIPTION_PLANS[tier]
        
        return {
            'success': True,
            'tier': tier,
            'pricing': plan['pricing'],
            'features': plan['features']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving pricing: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get pricing: {str(e)}'
        )
