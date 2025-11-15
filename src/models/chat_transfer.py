"""
Chat Transfer Database Model

Represents money transfers sent in chat (similar to WeChat/Telegram transfers).

Author: Manus AI
Date: 2025-11-05
"""

from ..database import db
from datetime import datetime
import uuid

class ChatTransfer(db.Model):
    """
    Chat Transfer Model
    
    Represents a money transfer sent in a chat conversation.
    Transfer lifecycle:
    1. Created: Money deducted from sender's wallet, locked on platform
    2. Pending: Waiting for recipient to claim
    3. Claimed: Recipient claimed, money credited to recipient's wallet
    4. Cancelled: Sender cancelled, money refunded
    5. Expired: 24 hours passed, money refunded to sender
    """
    __tablename__ = 'chat_transfers'
    
    # Primary key
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Sender information
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    sender_address = db.Column(db.String(42), nullable=False, index=True)
    
    # Recipient information
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipient_address = db.Column(db.String(42), nullable=False, index=True)
    
    # Transfer details
    token = db.Column(db.String(10), nullable=False)  # ETH, USDT, USDC
    amount = db.Column(db.Numeric(20, 8), nullable=False)
    message = db.Column(db.Text)  # Optional message from sender
    
    # Chat context
    chat_id = db.Column(db.String(100), index=True)  # Optional chat/conversation ID
    
    # Status tracking
    status = db.Column(
        db.String(20), 
        nullable=False, 
        default='pending',
        index=True
    )  # pending, claimed, cancelled, expired
    
    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    expires_at = db.Column(db.DateTime, index=True)  # When transfer expires (24 hours)
    claimed_at = db.Column(db.DateTime)  # When recipient claimed
    cancelled_at = db.Column(db.DateTime)  # When sender cancelled
    
    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_transfers')
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='received_transfers')
    
    def __repr__(self):
        return f'<ChatTransfer {self.id}: {self.amount} {self.token} from {self.sender_address} to {self.recipient_address}>'
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'sender_address': self.sender_address,
            'recipient_id': self.recipient_id,
            'recipient_address': self.recipient_address,
            'token': self.token,
            'amount': float(self.amount),
            'message': self.message,
            'chat_id': self.chat_id,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'claimed_at': self.claimed_at.isoformat() if self.claimed_at else None,
            'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None
        }
    
    @property
    def is_expired(self):
        """Check if transfer has expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_claimable(self):
        """Check if transfer can be claimed"""
        return self.status == 'pending' and not self.is_expired
    
    @property
    def is_cancellable(self):
        """Check if transfer can be cancelled by sender"""
        return self.status == 'pending'
