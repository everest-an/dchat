"""
Red Packet Database Model

Represents a red packet (红包) sent in chat with luck-based or equal distribution.
Red packets are a way to distribute funds to multiple recipients.

Author: Manus AI
Date: 2025-11-16
"""

from ..database import db
from datetime import datetime, timedelta
import uuid
import json

class RedPacket(db.Model):
    """
    Red Packet Model
    
    Represents a red packet with funds to be distributed.
    Lifecycle:
    1. Created: Funds locked, waiting for recipients to claim
    2. Partial: Some recipients have claimed
    3. Completed: All recipients have claimed
    4. Expired: 24 hours passed, unclaimed funds refunded
    5. Cancelled: Sender cancelled, all funds refunded
    """
    __tablename__ = 'red_packets'
    
    # Primary key
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Sender information
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    sender_address = db.Column(db.String(42), nullable=False, index=True)
    
    # Packet details
    token = db.Column(db.String(10), nullable=False)  # ETH, USDT, USDC, DOT, etc.
    total_amount = db.Column(db.Numeric(20, 8), nullable=False)  # Total amount in packet
    packet_count = db.Column(db.Integer, nullable=False)  # Number of packets
    
    # Distribution type
    distribution_type = db.Column(
        db.String(20),
        nullable=False,
        default='random'
    )  # random (luck-based), equal
    
    # Message and metadata
    message = db.Column(db.Text)  # Optional message from sender
    chat_id = db.Column(db.String(100), index=True)  # Optional chat/conversation ID
    
    # Status tracking
    status = db.Column(
        db.String(20),
        nullable=False,
        default='active',
        index=True
    )  # active, completed, expired, cancelled
    
    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    expires_at = db.Column(db.DateTime, index=True)  # When packet expires (24 hours)
    
    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_packets')
    claims = db.relationship('RedPacketClaim', backref='packet', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<RedPacket {self.id}: {self.total_amount} {self.token} x{self.packet_count}>'
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'sender_address': self.sender_address,
            'token': self.token,
            'total_amount': float(self.total_amount),
            'packet_count': self.packet_count,
            'distribution_type': self.distribution_type,
            'message': self.message,
            'chat_id': self.chat_id,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'claimed_count': len([c for c in self.claims if c.status == 'claimed']),
            'total_claimed': float(sum(c.amount for c in self.claims if c.status == 'claimed'))
        }
    
    @property
    def is_expired(self):
        """Check if packet has expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_claimable(self):
        """Check if packet can be claimed"""
        return self.status == 'active' and not self.is_expired
    
    @property
    def remaining_amount(self):
        """Calculate remaining amount"""
        claimed = sum(c.amount for c in self.claims if c.status == 'claimed')
        return float(self.total_amount) - claimed
    
    @property
    def remaining_packets(self):
        """Calculate remaining packets"""
        claimed = len([c for c in self.claims if c.status == 'claimed'])
        return self.packet_count - claimed


class RedPacketClaim(db.Model):
    """
    Red Packet Claim Model
    
    Represents a claim on a red packet by a recipient.
    """
    __tablename__ = 'red_packet_claims'
    
    # Primary key
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign keys
    packet_id = db.Column(db.String(36), db.ForeignKey('red_packets.id'), nullable=False, index=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Claim details
    recipient_address = db.Column(db.String(42), nullable=False)
    amount = db.Column(db.Numeric(20, 8), nullable=False)  # Amount claimed
    
    # Status
    status = db.Column(
        db.String(20),
        nullable=False,
        default='claimed'
    )  # claimed, refunded
    
    # Timestamps
    claimed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Relationships
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref='claimed_packets')
    
    def __repr__(self):
        return f'<RedPacketClaim {self.id}: {self.amount} to {self.recipient_address}>'
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'packet_id': self.packet_id,
            'recipient_id': self.recipient_id,
            'recipient_address': self.recipient_address,
            'amount': float(self.amount),
            'status': self.status,
            'claimed_at': self.claimed_at.isoformat() if self.claimed_at else None
        }
