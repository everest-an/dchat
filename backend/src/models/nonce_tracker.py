"""
Nonce Tracker Model

Database model for tracking transaction nonces to prevent conflicts
in concurrent transaction scenarios.

Features:
- Per-wallet nonce tracking
- Pending nonce list
- Lock mechanism for concurrent access
- Automatic nonce recovery

@author Manus AI
@date 2025-11-05
"""

from src.models.user import db
from datetime import datetime


class NonceTracker(db.Model):
    """
    Nonce tracking for custodial wallets
    
    Prevents nonce conflicts when multiple transactions are sent
    concurrently from the same wallet.
    """
    
    __tablename__ = 'nonce_tracker'
    
    id = db.Column(db.Integer, primary_key=True)
    wallet_address = db.Column(db.String(42), unique=True, nullable=False, index=True)
    current_nonce = db.Column(db.Integer, nullable=False, default=0)
    pending_nonces = db.Column(db.JSON, default=[])
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    lock_token = db.Column(db.String(64))
    lock_expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<NonceTracker {self.wallet_address}: {self.current_nonce}>'
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'wallet_address': self.wallet_address,
            'current_nonce': self.current_nonce,
            'pending_nonces': self.pending_nonces or [],
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'is_locked': bool(self.lock_token and self.lock_expires_at and self.lock_expires_at > datetime.utcnow()),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def is_locked(self) -> bool:
        """Check if nonce tracker is currently locked"""
        if not self.lock_token or not self.lock_expires_at:
            return False
        return self.lock_expires_at > datetime.utcnow()
    
    def has_pending_nonces(self) -> bool:
        """Check if there are pending nonces"""
        return bool(self.pending_nonces and len(self.pending_nonces) > 0)
    
    def get_pending_count(self) -> int:
        """Get number of pending nonces"""
        return len(self.pending_nonces) if self.pending_nonces else 0
