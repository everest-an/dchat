"""
Database Persistence Layer

Handles all database operations:
- User management
- Red packet operations
- Transaction tracking
- Call session management
- Refund processing
- Subscription management

Author: Manus AI
Date: 2024-11-16
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import logging

from src.models.database_models import (
    UserProfile, RedPacketModel, RedPacketClaimModel, TransactionModel,
    CallSessionModel, CallMetricsModel, RefundRecordModel, SubscriptionModel,
    WebSocketConnectionModel, AuditLogModel, NotificationModel
)

logger = logging.getLogger(__name__)


class UserRepository:
    """User data repository"""
    
    @staticmethod
    def create_user(
        db: Session,
        email: str,
        name: str,
        linkedin_id: Optional[str] = None,
        **kwargs
    ) -> UserProfile:
        """Create new user"""
        user = UserProfile(
            email=email,
            name=name,
            linkedin_id=linkedin_id,
            **kwargs
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"Created user {user.id} with email {email}")
        return user
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[UserProfile]:
        """Get user by ID"""
        return db.query(UserProfile).filter(UserProfile.id == user_id).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[UserProfile]:
        """Get user by email"""
        return db.query(UserProfile).filter(UserProfile.email == email).first()
    
    @staticmethod
    def get_user_by_linkedin_id(db: Session, linkedin_id: str) -> Optional[UserProfile]:
        """Get user by LinkedIn ID"""
        return db.query(UserProfile).filter(UserProfile.linkedin_id == linkedin_id).first()
    
    @staticmethod
    def update_user(db: Session, user_id: int, **kwargs) -> Optional[UserProfile]:
        """Update user"""
        user = UserRepository.get_user_by_id(db, user_id)
        if not user:
            return None
        
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        logger.info(f"Updated user {user_id}")
        return user
    
    @staticmethod
    def list_users(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None
    ) -> List[UserProfile]:
        """List users"""
        query = db.query(UserProfile)
        
        if is_active is not None:
            query = query.filter(UserProfile.is_active == is_active)
        
        return query.offset(skip).limit(limit).all()


class RedPacketRepository:
    """Red packet data repository"""
    
    @staticmethod
    def create_packet(
        db: Session,
        packet_id: str,
        sender_id: int,
        sender_address: str,
        total_amount: int,
        packet_count: int,
        distribution_type: str = 'random',
        message: Optional[str] = None,
        expires_in_hours: int = 24
    ) -> RedPacketModel:
        """Create new red packet"""
        packet = RedPacketModel(
            id=packet_id,
            sender_id=sender_id,
            sender_address=sender_address,
            total_amount=total_amount,
            packet_count=packet_count,
            distribution_type=distribution_type,
            message=message,
            expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours)
        )
        db.add(packet)
        db.commit()
        db.refresh(packet)
        logger.info(f"Created red packet {packet_id}")
        return packet
    
    @staticmethod
    def get_packet_by_id(db: Session, packet_id: str) -> Optional[RedPacketModel]:
        """Get packet by ID"""
        return db.query(RedPacketModel).filter(RedPacketModel.id == packet_id).first()
    
    @staticmethod
    def claim_packet(
        db: Session,
        packet_id: str,
        claimer_id: int,
        amount: int
    ) -> Optional[RedPacketClaimModel]:
        """Claim red packet"""
        packet = RedPacketRepository.get_packet_by_id(db, packet_id)
        if not packet:
            return None
        
        # Check if already claimed
        existing_claim = db.query(RedPacketClaimModel).filter(
            and_(
                RedPacketClaimModel.packet_id == packet_id,
                RedPacketClaimModel.claimer_id == claimer_id
            )
        ).first()
        
        if existing_claim:
            return None  # Already claimed
        
        # Create claim
        claim = RedPacketClaimModel(
            packet_id=packet_id,
            claimer_id=claimer_id,
            amount=amount
        )
        
        # Update packet
        packet.claimed_count += 1
        packet.claimed_amount += amount
        if packet.claimed_count >= packet.packet_count:
            packet.status = 'completed'
            packet.completed_at = datetime.utcnow()
        
        db.add(claim)
        db.commit()
        db.refresh(claim)
        logger.info(f"Claimed red packet {packet_id} for user {claimer_id}")
        return claim
    
    @staticmethod
    def list_packets(
        db: Session,
        sender_id: Optional[int] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[RedPacketModel]:
        """List red packets"""
        query = db.query(RedPacketModel)
        
        if sender_id:
            query = query.filter(RedPacketModel.sender_id == sender_id)
        
        if status:
            query = query.filter(RedPacketModel.status == status)
        
        return query.order_by(desc(RedPacketModel.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_expired_packets(db: Session) -> List[RedPacketModel]:
        """Get expired packets"""
        return db.query(RedPacketModel).filter(
            and_(
                RedPacketModel.status == 'active',
                RedPacketModel.expires_at <= datetime.utcnow()
            )
        ).all()


class TransactionRepository:
    """Transaction data repository"""
    
    @staticmethod
    def create_transaction(
        db: Session,
        tx_hash: str,
        sender_address: str,
        recipient_address: str,
        amount: int,
        token: str = 'DOT',
        sender_id: Optional[int] = None,
        transaction_type: str = 'transfer',
        metadata: Optional[Dict] = None
    ) -> TransactionModel:
        """Create new transaction"""
        transaction = TransactionModel(
            tx_hash=tx_hash,
            sender_id=sender_id,
            sender_address=sender_address,
            recipient_address=recipient_address,
            amount=amount,
            token=token,
            transaction_type=transaction_type,
            metadata=metadata
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        logger.info(f"Created transaction {tx_hash}")
        return transaction
    
    @staticmethod
    def get_transaction_by_hash(db: Session, tx_hash: str) -> Optional[TransactionModel]:
        """Get transaction by hash"""
        return db.query(TransactionModel).filter(TransactionModel.tx_hash == tx_hash).first()
    
    @staticmethod
    def update_transaction_status(
        db: Session,
        tx_hash: str,
        status: str,
        block_number: Optional[int] = None,
        block_hash: Optional[str] = None
    ) -> Optional[TransactionModel]:
        """Update transaction status"""
        transaction = TransactionRepository.get_transaction_by_hash(db, tx_hash)
        if not transaction:
            return None
        
        transaction.status = status
        if block_number:
            transaction.block_number = block_number
        if block_hash:
            transaction.block_hash = block_hash
        
        if status == 'confirmed':
            transaction.confirmed_at = datetime.utcnow()
        elif status == 'finalized':
            transaction.finalized_at = datetime.utcnow()
        
        db.commit()
        db.refresh(transaction)
        logger.info(f"Updated transaction {tx_hash} status to {status}")
        return transaction
    
    @staticmethod
    def list_transactions(
        db: Session,
        sender_id: Optional[int] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[TransactionModel]:
        """List transactions"""
        query = db.query(TransactionModel)
        
        if sender_id:
            query = query.filter(TransactionModel.sender_id == sender_id)
        
        if status:
            query = query.filter(TransactionModel.status == status)
        
        return query.order_by(desc(TransactionModel.created_at)).offset(skip).limit(limit).all()


class CallSessionRepository:
    """Call session data repository"""
    
    @staticmethod
    def create_session(
        db: Session,
        session_id: str,
        initiator_id: int,
        participants: List[int],
        call_type: str = '1v1'
    ) -> CallSessionModel:
        """Create new call session"""
        session = CallSessionModel(
            id=session_id,
            initiator_id=initiator_id,
            participants=participants,
            call_type=call_type,
            participant_count=len(participants)
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        logger.info(f"Created call session {session_id}")
        return session
    
    @staticmethod
    def get_session_by_id(db: Session, session_id: str) -> Optional[CallSessionModel]:
        """Get session by ID"""
        return db.query(CallSessionModel).filter(CallSessionModel.id == session_id).first()
    
    @staticmethod
    def record_metrics(
        db: Session,
        session_id: str,
        user_id: int,
        metrics: Dict[str, Any]
    ) -> Optional[CallMetricsModel]:
        """Record call metrics"""
        metric = CallMetricsModel(
            session_id=session_id,
            user_id=user_id,
            **metrics
        )
        db.add(metric)
        db.commit()
        db.refresh(metric)
        logger.info(f"Recorded metrics for session {session_id} user {user_id}")
        return metric
    
    @staticmethod
    def end_session(
        db: Session,
        session_id: str,
        quality_level: Optional[str] = None
    ) -> Optional[CallSessionModel]:
        """End call session"""
        session = CallSessionRepository.get_session_by_id(db, session_id)
        if not session:
            return None
        
        session.status = 'ended'
        session.ended_at = datetime.utcnow()
        if session.started_at:
            session.duration_seconds = int((session.ended_at - session.started_at).total_seconds())
        if quality_level:
            session.quality_level = quality_level
        
        db.commit()
        db.refresh(session)
        logger.info(f"Ended call session {session_id}")
        return session


class RefundRepository:
    """Refund data repository"""
    
    @staticmethod
    def create_refund(
        db: Session,
        packet_id: str,
        sender_id: int,
        sender_address: str,
        refund_amount: int,
        reason: str = 'expired'
    ) -> RefundRecordModel:
        """Create refund record"""
        refund = RefundRecordModel(
            packet_id=packet_id,
            sender_id=sender_id,
            sender_address=sender_address,
            refund_amount=refund_amount,
            reason=reason
        )
        db.add(refund)
        db.commit()
        db.refresh(refund)
        logger.info(f"Created refund record for packet {packet_id}")
        return refund
    
    @staticmethod
    def get_pending_refunds(db: Session) -> List[RefundRecordModel]:
        """Get pending refunds"""
        return db.query(RefundRecordModel).filter(
            RefundRecordModel.status == 'pending'
        ).all()
    
    @staticmethod
    def update_refund_status(
        db: Session,
        refund_id: int,
        status: str,
        transaction_hash: Optional[str] = None
    ) -> Optional[RefundRecordModel]:
        """Update refund status"""
        refund = db.query(RefundRecordModel).filter(RefundRecordModel.id == refund_id).first()
        if not refund:
            return None
        
        refund.status = status
        if transaction_hash:
            refund.transaction_hash = transaction_hash
        if status == 'completed':
            refund.processed_at = datetime.utcnow()
        
        db.commit()
        db.refresh(refund)
        logger.info(f"Updated refund {refund_id} status to {status}")
        return refund


class SubscriptionRepository:
    """Subscription data repository"""
    
    @staticmethod
    def create_subscription(
        db: Session,
        user_id: int,
        tier: str = 'FREE',
        billing_cycle: str = 'monthly'
    ) -> SubscriptionModel:
        """Create subscription"""
        # Calculate expiration date
        if billing_cycle == 'monthly':
            expires_at = datetime.utcnow() + timedelta(days=30)
        else:  # yearly
            expires_at = datetime.utcnow() + timedelta(days=365)
        
        subscription = SubscriptionModel(
            user_id=user_id,
            tier=tier,
            billing_cycle=billing_cycle,
            expires_at=expires_at
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        logger.info(f"Created subscription for user {user_id}")
        return subscription
    
    @staticmethod
    def get_subscription_by_user(db: Session, user_id: int) -> Optional[SubscriptionModel]:
        """Get subscription by user"""
        return db.query(SubscriptionModel).filter(SubscriptionModel.user_id == user_id).first()
    
    @staticmethod
    def upgrade_subscription(
        db: Session,
        user_id: int,
        new_tier: str
    ) -> Optional[SubscriptionModel]:
        """Upgrade subscription"""
        subscription = SubscriptionRepository.get_subscription_by_user(db, user_id)
        if not subscription:
            return None
        
        subscription.tier = new_tier
        subscription.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(subscription)
        logger.info(f"Upgraded subscription for user {user_id} to {new_tier}")
        return subscription


class AuditLogRepository:
    """Audit log data repository"""
    
    @staticmethod
    def log_action(
        db: Session,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        user_id: Optional[int] = None,
        old_values: Optional[Dict] = None,
        new_values: Optional[Dict] = None,
        status: str = 'success',
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLogModel:
        """Log action"""
        log = AuditLogModel(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            old_values=old_values,
            new_values=new_values,
            status=status,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    
    @staticmethod
    def list_logs(
        db: Session,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLogModel]:
        """List audit logs"""
        query = db.query(AuditLogModel)
        
        if user_id:
            query = query.filter(AuditLogModel.user_id == user_id)
        
        if action:
            query = query.filter(AuditLogModel.action == action)
        
        return query.order_by(desc(AuditLogModel.created_at)).offset(skip).limit(limit).all()


class NotificationRepository:
    """Notification data repository"""
    
    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        notification_type: str,
        title: str,
        message: str,
        related_resource_type: Optional[str] = None,
        related_resource_id: Optional[str] = None,
        data: Optional[Dict] = None
    ) -> NotificationModel:
        """Create notification"""
        notification = NotificationModel(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            related_resource_type=related_resource_type,
            related_resource_id=related_resource_id,
            data=data
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        logger.info(f"Created notification for user {user_id}")
        return notification
    
    @staticmethod
    def get_unread_notifications(
        db: Session,
        user_id: int,
        limit: int = 50
    ) -> List[NotificationModel]:
        """Get unread notifications"""
        return db.query(NotificationModel).filter(
            and_(
                NotificationModel.user_id == user_id,
                NotificationModel.is_read == False
            )
        ).order_by(desc(NotificationModel.created_at)).limit(limit).all()
    
    @staticmethod
    def mark_as_read(db: Session, notification_id: int) -> Optional[NotificationModel]:
        """Mark notification as read"""
        notification = db.query(NotificationModel).filter(NotificationModel.id == notification_id).first()
        if not notification:
            return None
        
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)
        return notification
