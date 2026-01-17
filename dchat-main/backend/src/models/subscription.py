"""
Subscription Database Models

This module defines the database models for subscription management,
including subscription records, NFT memberships, and NFT avatars.

Author: Manus AI
Date: 2025-11-05
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from enum import Enum

db = SQLAlchemy()


class SubscriptionTier(str, Enum):
    """Subscription tier enumeration"""
    FREE = "FREE"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"


class SubscriptionPeriod(str, Enum):
    """Subscription period enumeration"""
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"


class SubscriptionStatus(str, Enum):
    """Subscription status enumeration"""
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class Subscription(db.Model):
    """
    Subscription model
    
    Stores subscription information synced from blockchain
    """
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Blockchain data
    blockchain_id = db.Column(db.Integer, nullable=False, unique=True, index=True)
    user_address = db.Column(db.String(42), nullable=False, index=True)
    tier = db.Column(db.Enum(SubscriptionTier), nullable=False, default=SubscriptionTier.FREE)
    period = db.Column(db.Enum(SubscriptionPeriod), nullable=True)
    status = db.Column(db.Enum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.ACTIVE)
    
    # Timestamps
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    
    # Payment info
    amount = db.Column(db.String(100), nullable=False)  # Store as string to preserve precision
    payment_token = db.Column(db.String(42), nullable=False)  # Token contract address or "ETH"
    transaction_hash = db.Column(db.String(66), nullable=False, index=True)
    
    # Auto-renewal
    auto_renew = db.Column(db.Boolean, default=False)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f'<Subscription {self.blockchain_id} - {self.user_address} - {self.tier}>'
    
    def to_dict(self):
        """Convert subscription to dictionary"""
        return {
            'id': self.id,
            'blockchainId': self.blockchain_id,
            'userAddress': self.user_address,
            'tier': self.tier.value,
            'period': self.period.value if self.period else None,
            'status': self.status.value,
            'startTime': self.start_time.isoformat() if self.start_time else None,
            'endTime': self.end_time.isoformat() if self.end_time else None,
            'amount': self.amount,
            'paymentToken': self.payment_token,
            'transactionHash': self.transaction_hash,
            'autoRenew': self.auto_renew,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


class NFTMembership(db.Model):
    """
    NFT Membership model
    
    Stores NFT membership card information synced from blockchain
    """
    __tablename__ = 'nft_memberships'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Blockchain data
    token_id = db.Column(db.Integer, nullable=False, unique=True, index=True)
    owner_address = db.Column(db.String(42), nullable=False, index=True)
    tier = db.Column(db.Enum(SubscriptionTier), nullable=False)
    
    # Status
    active = db.Column(db.Boolean, default=True)
    
    # Payment info
    amount = db.Column(db.String(100), nullable=False)
    payment_token = db.Column(db.String(42), nullable=False)
    transaction_hash = db.Column(db.String(66), nullable=False, index=True)
    
    # Timestamps
    minted_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f'<NFTMembership {self.token_id} - {self.owner_address} - {self.tier}>'
    
    def to_dict(self):
        """Convert NFT membership to dictionary"""
        return {
            'id': self.id,
            'tokenId': self.token_id,
            'ownerAddress': self.owner_address,
            'tier': self.tier.value,
            'active': self.active,
            'amount': self.amount,
            'paymentToken': self.payment_token,
            'transactionHash': self.transaction_hash,
            'mintedAt': self.minted_at.isoformat() if self.minted_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


class NFTStandard(str, Enum):
    """NFT standard enumeration"""
    ERC721 = "ERC721"
    ERC1155 = "ERC1155"


class NFTAvatar(db.Model):
    """
    NFT Avatar model
    
    Stores user's NFT avatar information synced from blockchain
    """
    __tablename__ = 'nft_avatars'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # User info
    user_address = db.Column(db.String(42), nullable=False, index=True)
    
    # NFT info
    contract_address = db.Column(db.String(42), nullable=False)
    token_id = db.Column(db.String(100), nullable=False)  # Store as string for large numbers
    standard = db.Column(db.Enum(NFTStandard), nullable=False)
    
    # Status
    is_current = db.Column(db.Boolean, default=True)  # Is this the current avatar?
    is_valid = db.Column(db.Boolean, default=True)    # Does user still own this NFT?
    
    # Transaction info
    transaction_hash = db.Column(db.String(66), nullable=False, index=True)
    
    # Timestamps
    set_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f'<NFTAvatar {self.user_address} - {self.contract_address}:{self.token_id}>'
    
    def to_dict(self):
        """Convert NFT avatar to dictionary"""
        return {
            'id': self.id,
            'userAddress': self.user_address,
            'contractAddress': self.contract_address,
            'tokenId': self.token_id,
            'standard': self.standard.value,
            'isCurrent': self.is_current,
            'isValid': self.is_valid,
            'transactionHash': self.transaction_hash,
            'setAt': self.set_at.isoformat() if self.set_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


class SubscriptionFeatureUsage(db.Model):
    """
    Subscription feature usage tracking
    
    Tracks usage of subscription features for quota enforcement
    """
    __tablename__ = 'subscription_feature_usage'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # User info
    user_address = db.Column(db.String(42), nullable=False, index=True)
    
    # Feature tracking
    feature_name = db.Column(db.String(100), nullable=False)  # e.g., "custom_stickers", "call_duration"
    usage_count = db.Column(db.Integer, default=0)
    usage_limit = db.Column(db.Integer, nullable=True)  # NULL means unlimited
    
    # Period tracking (monthly reset)
    period_start = db.Column(db.DateTime, nullable=False)
    period_end = db.Column(db.DateTime, nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f'<FeatureUsage {self.user_address} - {self.feature_name}: {self.usage_count}/{self.usage_limit}>'
    
    def to_dict(self):
        """Convert feature usage to dictionary"""
        return {
            'id': self.id,
            'userAddress': self.user_address,
            'featureName': self.feature_name,
            'usageCount': self.usage_count,
            'usageLimit': self.usage_limit,
            'periodStart': self.period_start.isoformat() if self.period_start else None,
            'periodEnd': self.period_end.isoformat() if self.period_end else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
