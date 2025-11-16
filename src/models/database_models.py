"""
Enhanced Database Models

Complete data models for persistent storage:
- User profiles with MFA configuration
- Red packets with claim tracking
- Transactions and payments
- Call sessions and quality metrics
- WebSocket connections
- Refund records

Author: Manus AI
Date: 2024-11-16
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class UserProfile(Base):
    """Enhanced user profile model"""
    __tablename__ = 'user_profiles'
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    linkedin_id = Column(String(255), unique=True, index=True, nullable=True)
    avatar_url = Column(String(512), nullable=True)
    bio = Column(Text, nullable=True)
    
    # Account status
    is_active = Column(Boolean, default=True, index=True)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    
    # Blockchain addresses
    polkadot_address = Column(String(255), unique=True, index=True, nullable=True)
    ethereum_address = Column(String(255), unique=True, index=True, nullable=True)
    
    # MFA configuration
    mfa_enabled = Column(Boolean, default=False)
    mfa_method = Column(String(50), nullable=True)  # 'totp', 'sms', 'email'
    totp_secret = Column(String(255), nullable=True)
    backup_codes_hash = Column(JSON, nullable=True)
    
    # Subscription
    subscription_tier = Column(String(50), default='FREE')  # FREE, PRO, ENTERPRISE
    subscription_expires_at = Column(DateTime, nullable=True)
    
    # Statistics
    total_packets_sent = Column(Integer, default=0)
    total_packets_claimed = Column(Integer, default=0)
    total_amount_sent = Column(Integer, default=0)  # in Planck
    total_amount_received = Column(Integer, default=0)  # in Planck
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)
    
    # Relationships
    red_packets = relationship('RedPacketModel', back_populates='sender')
    transactions = relationship('TransactionModel', back_populates='sender')
    calls = relationship('CallSessionModel', back_populates='initiator')
    
    __table_args__ = (
        UniqueConstraint('email', name='uq_user_email'),
        UniqueConstraint('linkedin_id', name='uq_user_linkedin_id'),
    )


class RedPacketModel(Base):
    """Enhanced red packet model"""
    __tablename__ = 'red_packets'
    
    id = Column(String(36), primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey('user_profiles.id'), index=True, nullable=False)
    sender_address = Column(String(255), nullable=False)
    
    # Packet details
    total_amount = Column(Integer, nullable=False)  # in Planck
    packet_count = Column(Integer, nullable=False)
    claimed_count = Column(Integer, default=0)
    claimed_amount = Column(Integer, default=0)  # in Planck
    
    # Distribution
    distribution_type = Column(String(50), default='random')  # 'random', 'equal'
    amounts = Column(JSON, nullable=True)  # Pre-calculated amounts
    
    # Status
    status = Column(String(50), default='active')  # active, completed, expired, cancelled
    message = Column(Text, nullable=True)
    
    # Timing
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    sender = relationship('UserProfile', back_populates='red_packets')
    claims = relationship('RedPacketClaimModel', back_populates='packet')
    
    __table_args__ = (
        UniqueConstraint('id', name='uq_red_packet_id'),
    )


class RedPacketClaimModel(Base):
    """Red packet claim tracking"""
    __tablename__ = 'red_packet_claims'
    
    id = Column(Integer, primary_key=True, index=True)
    packet_id = Column(String(36), ForeignKey('red_packets.id'), index=True, nullable=False)
    claimer_id = Column(Integer, ForeignKey('user_profiles.id'), index=True, nullable=False)
    
    # Claim details
    amount = Column(Integer, nullable=False)  # in Planck
    status = Column(String(50), default='claimed')  # claimed, refunded
    
    # Timestamps
    claimed_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    packet = relationship('RedPacketModel', back_populates='claims')
    
    __table_args__ = (
        UniqueConstraint('packet_id', 'claimer_id', name='uq_packet_claimer'),
    )


class TransactionModel(Base):
    """Blockchain transaction model"""
    __tablename__ = 'transactions'
    
    id = Column(Integer, primary_key=True, index=True)
    tx_hash = Column(String(255), unique=True, index=True, nullable=False)
    
    # Parties
    sender_id = Column(Integer, ForeignKey('user_profiles.id'), index=True, nullable=True)
    sender_address = Column(String(255), nullable=False)
    recipient_address = Column(String(255), nullable=False)
    
    # Transaction details
    amount = Column(Integer, nullable=False)  # in Planck
    token = Column(String(50), default='DOT')  # DOT, USDT, etc.
    
    # Status
    status = Column(String(50), default='pending')  # pending, confirmed, finalized, failed
    block_number = Column(Integer, nullable=True)
    block_hash = Column(String(255), nullable=True)
    
    # Metadata
    transaction_type = Column(String(50), default='transfer')  # transfer, red_packet, payment
    metadata = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    confirmed_at = Column(DateTime, nullable=True)
    finalized_at = Column(DateTime, nullable=True)
    
    # Relationships
    sender = relationship('UserProfile', back_populates='transactions')
    
    __table_args__ = (
        UniqueConstraint('tx_hash', name='uq_transaction_hash'),
    )


class CallSessionModel(Base):
    """WebRTC call session model"""
    __tablename__ = 'call_sessions'
    
    id = Column(String(36), primary_key=True, index=True)
    initiator_id = Column(Integer, ForeignKey('user_profiles.id'), index=True, nullable=False)
    
    # Call details
    call_type = Column(String(50), default='1v1')  # 1v1, group
    participant_count = Column(Integer, default=2)
    participants = Column(JSON, nullable=False)  # List of user IDs
    
    # Status
    status = Column(String(50), default='initiated')  # initiated, connected, ended
    
    # Quality metrics
    avg_rtt_ms = Column(Float, nullable=True)
    avg_jitter_ms = Column(Float, nullable=True)
    avg_packet_loss_percent = Column(Float, nullable=True)
    quality_level = Column(String(50), nullable=True)  # excellent, good, fair, poor
    
    # Duration
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    initiator = relationship('UserProfile', back_populates='calls')
    metrics = relationship('CallMetricsModel', back_populates='session')
    
    __table_args__ = (
        UniqueConstraint('id', name='uq_call_session_id'),
    )


class CallMetricsModel(Base):
    """Call quality metrics model"""
    __tablename__ = 'call_metrics'
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(36), ForeignKey('call_sessions.id'), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey('user_profiles.id'), index=True, nullable=False)
    
    # Network metrics
    rtt_ms = Column(Float, nullable=True)
    jitter_ms = Column(Float, nullable=True)
    packet_loss_percent = Column(Float, nullable=True)
    bandwidth_kbps = Column(Float, nullable=True)
    
    # Audio metrics
    audio_codec = Column(String(50), nullable=True)
    audio_bitrate_kbps = Column(Float, nullable=True)
    audio_sample_rate = Column(Integer, nullable=True)
    
    # Video metrics
    video_codec = Column(String(50), nullable=True)
    video_bitrate_kbps = Column(Float, nullable=True)
    video_resolution = Column(String(50), nullable=True)
    video_framerate = Column(Float, nullable=True)
    
    # Connection info
    connection_state = Column(String(50), default='connected')
    ice_candidate_pair = Column(String(100), nullable=True)
    bytes_sent = Column(Integer, nullable=True)
    bytes_received = Column(Integer, nullable=True)
    
    # Timestamp
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    session = relationship('CallSessionModel', back_populates='metrics')


class RefundRecordModel(Base):
    """Refund tracking model"""
    __tablename__ = 'refund_records'
    
    id = Column(Integer, primary_key=True, index=True)
    packet_id = Column(String(36), ForeignKey('red_packets.id'), index=True, nullable=False)
    
    # Refund details
    sender_id = Column(Integer, ForeignKey('user_profiles.id'), index=True, nullable=False)
    sender_address = Column(String(255), nullable=False)
    refund_amount = Column(Integer, nullable=False)  # in Planck
    
    # Reason
    reason = Column(String(50), default='expired')  # expired, cancelled, failed
    
    # Status
    status = Column(String(50), default='pending')  # pending, processing, completed, failed
    transaction_hash = Column(String(255), nullable=True, unique=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    processed_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        UniqueConstraint('packet_id', 'reason', name='uq_refund_packet_reason'),
    )


class SubscriptionModel(Base):
    """Subscription management model"""
    __tablename__ = 'subscriptions'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('user_profiles.id'), unique=True, index=True, nullable=False)
    
    # Subscription details
    tier = Column(String(50), default='FREE')  # FREE, PRO, ENTERPRISE
    status = Column(String(50), default='active')  # active, cancelled, expired
    
    # Pricing
    price = Column(Float, default=0.0)  # in USD
    billing_cycle = Column(String(50), default='monthly')  # monthly, yearly
    
    # Dates
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    cancelled_at = Column(DateTime, nullable=True)
    
    # Payment
    payment_method = Column(String(50), nullable=True)  # stripe, crypto, etc.
    last_payment_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('user_id', name='uq_subscription_user'),
    )


class WebSocketConnectionModel(Base):
    """WebSocket connection tracking"""
    __tablename__ = 'websocket_connections'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('user_profiles.id'), index=True, nullable=False)
    
    # Connection details
    connection_id = Column(String(255), unique=True, index=True, nullable=False)
    device_info = Column(JSON, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    
    # Metrics
    message_count = Column(Integer, default=0)
    last_heartbeat_at = Column(DateTime, nullable=True)
    
    # Timestamps
    connected_at = Column(DateTime, default=datetime.utcnow, index=True)
    disconnected_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        UniqueConstraint('connection_id', name='uq_ws_connection_id'),
    )


class AuditLogModel(Base):
    """Audit log for tracking all operations"""
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('user_profiles.id'), index=True, nullable=True)
    
    # Operation details
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False)  # user, red_packet, transaction, etc.
    resource_id = Column(String(255), nullable=True, index=True)
    
    # Changes
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    
    # Status
    status = Column(String(50), default='success')  # success, failure
    error_message = Column(Text, nullable=True)
    
    # Request info
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    __table_args__ = (
        UniqueConstraint('id', name='uq_audit_log_id'),
    )


class NotificationModel(Base):
    """Notification tracking"""
    __tablename__ = 'notifications'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('user_profiles.id'), index=True, nullable=False)
    
    # Notification details
    notification_type = Column(String(50), nullable=False)  # red_packet_claimed, transaction_finalized, etc.
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Data
    related_resource_type = Column(String(50), nullable=True)
    related_resource_id = Column(String(255), nullable=True)
    data = Column(JSON, nullable=True)
    
    # Status
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    __table_args__ = (
        UniqueConstraint('id', name='uq_notification_id'),
    )


# Database initialization functions

def create_tables(engine):
    """Create all tables in the database"""
    Base.metadata.create_all(bind=engine)


def drop_tables(engine):
    """Drop all tables from the database"""
    Base.metadata.drop_all(bind=engine)


def get_database_url(
    db_type: str = 'postgresql',
    host: str = 'localhost',
    port: int = 5432,
    user: str = 'postgres',
    password: str = 'password',
    database: str = 'dchat'
) -> str:
    """Generate database URL"""
    if db_type == 'sqlite':
        return f'sqlite:///{database}.db'
    elif db_type == 'postgresql':
        return f'postgresql://{user}:{password}@{host}:{port}/{database}'
    elif db_type == 'mysql':
        return f'mysql+pymysql://{user}:{password}@{host}:{port}/{database}'
    else:
        raise ValueError(f'Unsupported database type: {db_type}')
