"""
Automatic Refund Processing

Handles automatic refund processing for:
- Expired red packets
- Cancelled red packets
- Failed transactions

Includes scheduled tasks for periodic refund processing.

Author: Manus AI
Date: 2024-11-16
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
import asyncio

from src.models.user import User, db
from src.models.red_packet import RedPacket, RedPacketClaim

logger = logging.getLogger(__name__)


class RefundProcessor:
    """Handles automatic refund processing"""
    
    def __init__(self):
        self.processing = False
        self.last_run = None
        self.refund_history: List[Dict] = []
    
    async def process_expired_packets(self) -> Dict:
        """
        Process expired red packets and refund unclaimed amounts
        
        Returns:
            Dictionary with processing results
        """
        try:
            logger.info("Starting expired red packet processing...")
            
            now = datetime.utcnow()
            
            # Find expired packets that haven't been processed
            expired_packets = db.session.query(RedPacket).filter(
                RedPacket.status == 'active',
                RedPacket.expires_at <= now
            ).all()
            
            refund_count = 0
            total_refunded = 0
            
            for packet in expired_packets:
                result = await self._process_single_refund(packet, 'expired')
                if result['success']:
                    refund_count += 1
                    total_refunded += result['refund_amount']
            
            logger.info(f"Processed {refund_count} expired packets, refunded {total_refunded} Planck")
            
            return {
                'success': True,
                'packet_count': refund_count,
                'total_refunded': total_refunded,
                'timestamp': datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error processing expired packets: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def process_cancelled_packets(self) -> Dict:
        """
        Process cancelled red packets and refund all amounts
        
        Returns:
            Dictionary with processing results
        """
        try:
            logger.info("Starting cancelled red packet processing...")
            
            # Find cancelled packets that haven't been processed
            cancelled_packets = db.session.query(RedPacket).filter(
                RedPacket.status == 'cancelled'
            ).all()
            
            refund_count = 0
            total_refunded = 0
            
            for packet in cancelled_packets:
                result = await self._process_single_refund(packet, 'cancelled')
                if result['success']:
                    refund_count += 1
                    total_refunded += result['refund_amount']
            
            logger.info(f"Processed {refund_count} cancelled packets, refunded {total_refunded} Planck")
            
            return {
                'success': True,
                'packet_count': refund_count,
                'total_refunded': total_refunded,
                'timestamp': datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error processing cancelled packets: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def _process_single_refund(self, packet: RedPacket, reason: str) -> Dict:
        """
        Process refund for a single red packet
        
        Args:
            packet: RedPacket object
            reason: Reason for refund ('expired' or 'cancelled')
        
        Returns:
            Dictionary with refund result
        """
        try:
            # Calculate refund amount
            claimed_amount = sum(
                claim.amount for claim in packet.claims
                if claim.status == 'claimed'
            )
            refund_amount = packet.total_amount - claimed_amount
            
            if refund_amount <= 0:
                logger.info(f"No refund needed for packet {packet.id}")
                return {
                    'success': True,
                    'packet_id': packet.id,
                    'refund_amount': 0,
                    'reason': reason
                }
            
            # Create refund transaction record
            refund_record = {
                'packet_id': packet.id,
                'sender_id': packet.sender_id,
                'sender_address': packet.sender_address,
                'refund_amount': refund_amount,
                'reason': reason,
                'status': 'pending',
                'created_at': datetime.utcnow()
            }
            
            # In production, this would trigger actual blockchain transaction
            # For now, we just record the refund
            logger.info(
                f"Refund processed for packet {packet.id}: "
                f"{refund_amount} Planck to {packet.sender_address} (reason: {reason})"
            )
            
            # Update packet status
            packet.status = f'{reason}_refunded'
            db.session.commit()
            
            # Record refund history
            self.refund_history.append({
                **refund_record,
                'processed_at': datetime.utcnow().isoformat()
            })
            
            return {
                'success': True,
                'packet_id': packet.id,
                'refund_amount': refund_amount,
                'reason': reason,
                'refund_record': refund_record
            }
        
        except Exception as e:
            logger.error(f"Error processing refund for packet {packet.id}: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'packet_id': packet.id,
                'error': str(e)
            }
    
    async def process_failed_transactions(self) -> Dict:
        """
        Process failed transactions and handle refunds
        
        Returns:
            Dictionary with processing results
        """
        try:
            logger.info("Starting failed transaction processing...")
            
            # In production, this would check blockchain for failed transactions
            # For now, return empty result
            
            return {
                'success': True,
                'transaction_count': 0,
                'total_refunded': 0,
                'timestamp': datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error processing failed transactions: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def run_all_processors(self) -> Dict:
        """
        Run all refund processors
        
        Returns:
            Dictionary with combined results
        """
        if self.processing:
            logger.warning("Refund processing already in progress")
            return {
                'success': False,
                'error': 'Processing already in progress'
            }
        
        self.processing = True
        
        try:
            results = {
                'expired_packets': await self.process_expired_packets(),
                'cancelled_packets': await self.process_cancelled_packets(),
                'failed_transactions': await self.process_failed_transactions(),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            self.last_run = datetime.utcnow()
            
            return {
                'success': True,
                'results': results,
                'last_run': self.last_run.isoformat()
            }
        
        finally:
            self.processing = False
    
    def get_refund_history(self, limit: int = 100) -> List[Dict]:
        """
        Get refund processing history
        
        Args:
            limit: Maximum number of records to return
        
        Returns:
            List of refund records
        """
        return self.refund_history[-limit:]
    
    def get_status(self) -> Dict:
        """
        Get current processor status
        
        Returns:
            Dictionary with status information
        """
        return {
            'processing': self.processing,
            'last_run': self.last_run.isoformat() if self.last_run else None,
            'refund_count': len(self.refund_history),
            'total_refunded': sum(r.get('refund_amount', 0) for r in self.refund_history)
        }


# Global refund processor instance
refund_processor = RefundProcessor()


async def schedule_refund_processing(interval_seconds: int = 3600):
    """
    Schedule periodic refund processing
    
    Args:
        interval_seconds: Interval between processing runs (default: 1 hour)
    """
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            logger.info("Running scheduled refund processing...")
            result = await refund_processor.run_all_processors()
            logger.info(f"Refund processing completed: {result}")
        
        except Exception as e:
            logger.error(f"Error in scheduled refund processing: {str(e)}")


# Refund status tracking
class RefundStatus:
    """Track refund status for a specific packet"""
    
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


def get_refund_status(packet_id: str) -> Dict:
    """
    Get refund status for a packet
    
    Args:
        packet_id: Red packet ID
    
    Returns:
        Dictionary with refund status
    """
    packet = db.session.query(RedPacket).filter_by(id=packet_id).first()
    
    if not packet:
        return {
            'success': False,
            'error': 'Packet not found'
        }
    
    # Check if packet is eligible for refund
    if packet.status not in ['expired', 'cancelled', 'expired_refunded', 'cancelled_refunded']:
        return {
            'success': True,
            'packet_id': packet_id,
            'status': 'no_refund_needed',
            'reason': f'Packet status is {packet.status}'
        }
    
    # Calculate refund amount
    claimed_amount = sum(
        claim.amount for claim in packet.claims
        if claim.status == 'claimed'
    )
    refund_amount = packet.total_amount - claimed_amount
    
    # Check refund history
    refund_record = next(
        (r for r in refund_processor.refund_history if r['packet_id'] == packet_id),
        None
    )
    
    return {
        'success': True,
        'packet_id': packet_id,
        'status': 'refunded' if refund_record else 'pending',
        'refund_amount': refund_amount,
        'claimed_amount': claimed_amount,
        'total_amount': packet.total_amount,
        'refund_record': refund_record
    }


def get_pending_refunds() -> List[Dict]:
    """
    Get list of pending refunds
    
    Returns:
        List of packets pending refund
    """
    now = datetime.utcnow()
    
    # Find expired packets
    expired_packets = db.session.query(RedPacket).filter(
        RedPacket.status == 'active',
        RedPacket.expires_at <= now
    ).all()
    
    # Find cancelled packets
    cancelled_packets = db.session.query(RedPacket).filter(
        RedPacket.status == 'cancelled'
    ).all()
    
    pending_refunds = []
    
    for packet in expired_packets + cancelled_packets:
        claimed_amount = sum(
            claim.amount for claim in packet.claims
            if claim.status == 'claimed'
        )
        refund_amount = packet.total_amount - claimed_amount
        
        if refund_amount > 0:
            pending_refunds.append({
                'packet_id': packet.id,
                'sender_id': packet.sender_id,
                'sender_address': packet.sender_address,
                'refund_amount': refund_amount,
                'reason': 'expired' if packet.status == 'active' else 'cancelled',
                'created_at': packet.created_at.isoformat(),
                'expires_at': packet.expires_at.isoformat() if packet.expires_at else None
            })
    
    return pending_refunds
