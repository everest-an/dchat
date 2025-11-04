"""
Custodial Wallet Model

Manages platform-hosted wallets for users who choose custodial option.
Lower fees, suitable for streaming payments.

Security:
- Private keys encrypted at rest
- Multi-signature support
- Withdrawal limits
- Audit logging

@author Manus AI
@date 2025-11-05
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import Index
import json

db = SQLAlchemy()

class CustodialWallet(db.Model):
    """
    Custodial Wallet Model
    
    Platform-managed wallets with enhanced security and lower transaction fees.
    Suitable for streaming payments and frequent transactions.
    """
    __tablename__ = 'custodial_wallets'
    
    # Primary fields
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    wallet_address = db.Column(db.String(42), unique=True, nullable=False, index=True)
    
    # Security
    encrypted_private_key = db.Column(db.Text, nullable=False)  # Encrypted with platform key
    encryption_method = db.Column(db.String(50), default='AES-256-GCM')
    
    # Balances (stored in wei for precision)
    balance_eth = db.Column(db.BigInteger, default=0)  # ETH balance in wei
    balance_usdt = db.Column(db.BigInteger, default=0)  # USDT balance (6 decimals)
    balance_usdc = db.Column(db.BigInteger, default=0)  # USDC balance (6 decimals)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    
    # Limits (in USD)
    daily_withdrawal_limit = db.Column(db.Float, default=1000.0)
    daily_withdrawn = db.Column(db.Float, default=0.0)
    last_withdrawal_reset = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_transaction_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('custodial_wallet', uselist=False))
    transactions = db.relationship('CustodialTransaction', backref='wallet', lazy='dynamic')
    
    # Indexes
    __table_args__ = (
        Index('idx_custodial_wallet_user', 'user_id'),
        Index('idx_custodial_wallet_address', 'wallet_address'),
        Index('idx_custodial_wallet_active', 'is_active'),
    )
    
    def __repr__(self):
        return f'<CustodialWallet {self.wallet_address}>'
    
    def to_dict(self, include_sensitive=False):
        """
        Convert to dictionary
        
        Args:
            include_sensitive: Whether to include sensitive data (for internal use only)
        
        Returns:
            dict: Wallet data
        """
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'wallet_address': self.wallet_address,
            'balances': {
                'eth': str(self.balance_eth),
                'usdt': str(self.balance_usdt),
                'usdc': str(self.balance_usdc)
            },
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'daily_withdrawal_limit': self.daily_withdrawal_limit,
            'daily_withdrawn': self.daily_withdrawn,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_transaction_at': self.last_transaction_at.isoformat() if self.last_transaction_at else None
        }
        
        if include_sensitive:
            data['encrypted_private_key'] = self.encrypted_private_key
            data['encryption_method'] = self.encryption_method
        
        return data
    
    def get_balance_usd(self, eth_price=2000.0, usdt_price=1.0, usdc_price=1.0):
        """
        Get total balance in USD
        
        Args:
            eth_price: Current ETH price in USD
            usdt_price: Current USDT price in USD
            usdc_price: Current USDC price in USD
        
        Returns:
            float: Total balance in USD
        """
        eth_usd = (self.balance_eth / 1e18) * eth_price
        usdt_usd = (self.balance_usdt / 1e6) * usdt_price
        usdc_usd = (self.balance_usdc / 1e6) * usdc_price
        
        return eth_usd + usdt_usd + usdc_usd
    
    def can_withdraw(self, amount_usd):
        """
        Check if withdrawal is allowed
        
        Args:
            amount_usd: Withdrawal amount in USD
        
        Returns:
            tuple: (bool, str) - (allowed, reason)
        """
        if not self.is_active:
            return False, "Wallet is not active"
        
        if not self.is_verified:
            return False, "Wallet is not verified"
        
        # Reset daily limit if needed
        now = datetime.utcnow()
        if (now - self.last_withdrawal_reset).days >= 1:
            self.daily_withdrawn = 0.0
            self.last_withdrawal_reset = now
            db.session.commit()
        
        # Check daily limit
        if self.daily_withdrawn + amount_usd > self.daily_withdrawal_limit:
            remaining = self.daily_withdrawal_limit - self.daily_withdrawn
            return False, f"Daily withdrawal limit exceeded. Remaining: ${remaining:.2f}"
        
        return True, "OK"


class CustodialTransaction(db.Model):
    """
    Custodial Wallet Transaction History
    
    Records all transactions for audit and tracking purposes.
    """
    __tablename__ = 'custodial_transactions'
    
    # Primary fields
    id = db.Column(db.Integer, primary_key=True)
    wallet_id = db.Column(db.Integer, db.ForeignKey('custodial_wallets.id'), nullable=False)
    
    # Transaction details
    transaction_type = db.Column(db.String(20), nullable=False)  # deposit, withdrawal, transfer, payment
    token = db.Column(db.String(10), nullable=False)  # ETH, USDT, USDC
    amount = db.Column(db.BigInteger, nullable=False)  # Amount in smallest unit (wei, etc.)
    amount_usd = db.Column(db.Float, nullable=True)  # USD value at time of transaction
    
    # Addresses
    from_address = db.Column(db.String(42), nullable=True)
    to_address = db.Column(db.String(42), nullable=True)
    
    # Blockchain
    transaction_hash = db.Column(db.String(66), nullable=True, index=True)
    block_number = db.Column(db.Integer, nullable=True)
    gas_used = db.Column(db.Integer, nullable=True)
    gas_price = db.Column(db.BigInteger, nullable=True)
    
    # Status
    status = db.Column(db.String(20), default='pending')  # pending, confirmed, failed
    
    # Metadata
    description = db.Column(db.Text, nullable=True)
    metadata = db.Column(db.Text, nullable=True)  # JSON string for additional data
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_custodial_tx_wallet', 'wallet_id'),
        Index('idx_custodial_tx_hash', 'transaction_hash'),
        Index('idx_custodial_tx_type', 'transaction_type'),
        Index('idx_custodial_tx_status', 'status'),
        Index('idx_custodial_tx_created', 'created_at'),
    )
    
    def __repr__(self):
        return f'<CustodialTransaction {self.transaction_type} {self.amount} {self.token}>'
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'wallet_id': self.wallet_id,
            'transaction_type': self.transaction_type,
            'token': self.token,
            'amount': str(self.amount),
            'amount_usd': self.amount_usd,
            'from_address': self.from_address,
            'to_address': self.to_address,
            'transaction_hash': self.transaction_hash,
            'block_number': self.block_number,
            'gas_used': self.gas_used,
            'gas_price': str(self.gas_price) if self.gas_price else None,
            'status': self.status,
            'description': self.description,
            'metadata': json.loads(self.metadata) if self.metadata else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'confirmed_at': self.confirmed_at.isoformat() if self.confirmed_at else None
        }
