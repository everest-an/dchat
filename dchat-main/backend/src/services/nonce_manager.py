"""
Nonce Management Service

Manages transaction nonces for custodial wallets with support for
concurrent transactions and automatic recovery.

Features:
- Nonce allocation with distributed locking
- Pending transaction tracking
- Nonce recovery and synchronization
- Concurrent transaction support
- Automatic lock expiration

@author Manus AI
@date 2025-11-05
"""

from web3 import Web3
from src.models.nonce_tracker import NonceTracker, db
from datetime import datetime, timedelta
from contextlib import contextmanager
import uuid
import time
import logging

logger = logging.getLogger(__name__)


class NonceManager:
    """
    Nonce management service for custodial wallets
    
    Provides thread-safe nonce allocation for concurrent transactions.
    """
    
    def __init__(self, w3: Web3):
        """
        Initialize nonce manager
        
        Args:
            w3: Web3 instance
        """
        self.w3 = w3
    
    @contextmanager
    def nonce_lock(self, wallet_address: str, timeout: int = 30):
        """
        Acquire lock for nonce allocation
        
        Args:
            wallet_address: Wallet address
            timeout: Lock timeout in seconds
        
        Yields:
            NonceTracker: Locked nonce tracker
        
        Raises:
            Exception: If lock cannot be acquired
        
        Example:
            >>> with nonce_manager.nonce_lock(wallet_address) as tracker:
            ...     nonce = tracker.current_nonce
            ...     tracker.current_nonce += 1
        """
        lock_token = str(uuid.uuid4())
        lock_expires = datetime.utcnow() + timedelta(seconds=timeout)
        
        # Try to acquire lock
        max_attempts = 10
        wait_time = 0.5  # seconds
        
        for attempt in range(max_attempts):
            try:
                # Use SELECT FOR UPDATE to prevent race conditions
                tracker = NonceTracker.query.filter_by(
                    wallet_address=wallet_address
                ).with_for_update().first()
                
                if not tracker:
                    # Create new tracker
                    chain_nonce = self.w3.eth.get_transaction_count(wallet_address)
                    tracker = NonceTracker(
                        wallet_address=wallet_address,
                        current_nonce=chain_nonce,
                        lock_token=lock_token,
                        lock_expires_at=lock_expires,
                        pending_nonces=[]
                    )
                    db.session.add(tracker)
                    db.session.commit()
                    logger.info(f"Created nonce tracker for {wallet_address} with nonce {chain_nonce}")
                    break
                
                # Check if lock is expired
                if tracker.lock_expires_at and tracker.lock_expires_at < datetime.utcnow():
                    # Lock expired, acquire it
                    logger.info(f"Acquiring expired lock for {wallet_address}")
                    tracker.lock_token = lock_token
                    tracker.lock_expires_at = lock_expires
                    db.session.commit()
                    break
                
                # Check if no lock
                if not tracker.lock_token:
                    # No lock, acquire it
                    logger.info(f"Acquiring lock for {wallet_address}")
                    tracker.lock_token = lock_token
                    tracker.lock_expires_at = lock_expires
                    db.session.commit()
                    break
                
                # Lock is held by someone else, wait and retry
                logger.debug(f"Lock held for {wallet_address}, attempt {attempt + 1}/{max_attempts}")
                db.session.rollback()
                time.sleep(wait_time)
                
            except Exception as e:
                logger.error(f"Error acquiring lock: {e}")
                db.session.rollback()
                time.sleep(wait_time)
        else:
            raise Exception(f"Failed to acquire nonce lock for {wallet_address} after {max_attempts} attempts")
        
        try:
            yield tracker
        finally:
            # Release lock
            try:
                tracker.lock_token = None
                tracker.lock_expires_at = None
                db.session.commit()
                logger.debug(f"Released lock for {wallet_address}")
            except Exception as e:
                logger.error(f"Error releasing lock: {e}")
                db.session.rollback()
    
    def allocate_nonce(self, wallet_address: str) -> int:
        """
        Allocate next nonce for transaction
        
        Args:
            wallet_address: Wallet address
        
        Returns:
            int: Allocated nonce
        
        Example:
            >>> nonce = nonce_manager.allocate_nonce(wallet_address)
            >>> print(f"Allocated nonce: {nonce}")
        """
        with self.nonce_lock(wallet_address) as tracker:
            # Get nonce from blockchain
            chain_nonce = self.w3.eth.get_transaction_count(wallet_address)
            
            # Use max of chain nonce and local nonce
            # This handles cases where transactions were sent outside our system
            nonce = max(chain_nonce, tracker.current_nonce)
            
            # Increment local nonce
            tracker.current_nonce = nonce + 1
            tracker.last_updated = datetime.utcnow()
            
            # Add to pending list
            if tracker.pending_nonces is None:
                tracker.pending_nonces = []
            tracker.pending_nonces.append(nonce)
            
            db.session.commit()
            
            logger.info(f"Allocated nonce {nonce} for {wallet_address} (chain: {chain_nonce}, local: {tracker.current_nonce - 1})")
            return nonce
    
    def release_nonce(self, wallet_address: str, nonce: int, success: bool):
        """
        Release nonce after transaction
        
        Args:
            wallet_address: Wallet address
            nonce: Nonce to release
            success: Whether transaction was successful
        
        Example:
            >>> nonce_manager.release_nonce(wallet_address, nonce, True)
        """
        try:
            tracker = NonceTracker.query.filter_by(wallet_address=wallet_address).first()
            if not tracker:
                logger.warning(f"No nonce tracker found for {wallet_address}")
                return
            
            # Remove from pending list
            if tracker.pending_nonces and nonce in tracker.pending_nonces:
                tracker.pending_nonces.remove(nonce)
                logger.debug(f"Removed nonce {nonce} from pending list for {wallet_address}")
            
            if not success:
                # Transaction failed, rollback nonce
                if nonce < tracker.current_nonce:
                    tracker.current_nonce = nonce
                    logger.warning(f"Rolled back nonce to {nonce} for {wallet_address} due to failed transaction")
            
            tracker.last_updated = datetime.utcnow()
            db.session.commit()
            
        except Exception as e:
            logger.error(f"Error releasing nonce: {e}")
            db.session.rollback()
    
    def sync_nonce(self, wallet_address: str) -> int:
        """
        Sync local nonce with blockchain
        
        Args:
            wallet_address: Wallet address
        
        Returns:
            int: Synced nonce
        
        Example:
            >>> synced_nonce = nonce_manager.sync_nonce(wallet_address)
        """
        try:
            chain_nonce = self.w3.eth.get_transaction_count(wallet_address)
            
            tracker = NonceTracker.query.filter_by(wallet_address=wallet_address).first()
            if tracker:
                old_nonce = tracker.current_nonce
                tracker.current_nonce = chain_nonce
                tracker.pending_nonces = []
                tracker.last_updated = datetime.utcnow()
                db.session.commit()
                
                logger.info(f"Synced nonce for {wallet_address}: {old_nonce} -> {chain_nonce}")
            else:
                # Create new tracker
                tracker = NonceTracker(
                    wallet_address=wallet_address,
                    current_nonce=chain_nonce,
                    pending_nonces=[]
                )
                db.session.add(tracker)
                db.session.commit()
                
                logger.info(f"Created nonce tracker for {wallet_address} with nonce {chain_nonce}")
            
            return chain_nonce
            
        except Exception as e:
            logger.error(f"Error syncing nonce: {e}")
            db.session.rollback()
            return 0
    
    def get_nonce_info(self, wallet_address: str) -> dict:
        """
        Get nonce information for wallet
        
        Args:
            wallet_address: Wallet address
        
        Returns:
            dict: Nonce information
        
        Example:
            >>> info = nonce_manager.get_nonce_info(wallet_address)
            >>> print(f"Current nonce: {info['local_nonce']}")
        """
        try:
            chain_nonce = self.w3.eth.get_transaction_count(wallet_address)
            
            tracker = NonceTracker.query.filter_by(wallet_address=wallet_address).first()
            
            if tracker:
                return {
                    'wallet_address': wallet_address,
                    'chain_nonce': chain_nonce,
                    'local_nonce': tracker.current_nonce,
                    'pending_nonces': tracker.pending_nonces or [],
                    'pending_count': len(tracker.pending_nonces) if tracker.pending_nonces else 0,
                    'is_synced': chain_nonce == tracker.current_nonce,
                    'is_locked': tracker.is_locked(),
                    'last_updated': tracker.last_updated.isoformat() if tracker.last_updated else None
                }
            else:
                return {
                    'wallet_address': wallet_address,
                    'chain_nonce': chain_nonce,
                    'local_nonce': None,
                    'pending_nonces': [],
                    'pending_count': 0,
                    'is_synced': False,
                    'is_locked': False,
                    'last_updated': None
                }
                
        except Exception as e:
            logger.error(f"Error getting nonce info: {e}")
            return {
                'wallet_address': wallet_address,
                'error': str(e)
            }
    
    def cleanup_expired_locks(self) -> int:
        """
        Cleanup expired locks
        
        Returns:
            int: Number of locks cleaned up
        
        Example:
            >>> count = nonce_manager.cleanup_expired_locks()
            >>> print(f"Cleaned up {count} expired locks")
        """
        try:
            now = datetime.utcnow()
            expired_trackers = NonceTracker.query.filter(
                NonceTracker.lock_expires_at < now,
                NonceTracker.lock_token.isnot(None)
            ).all()
            
            count = 0
            for tracker in expired_trackers:
                tracker.lock_token = None
                tracker.lock_expires_at = None
                count += 1
            
            if count > 0:
                db.session.commit()
                logger.info(f"Cleaned up {count} expired nonce locks")
            
            return count
            
        except Exception as e:
            logger.error(f"Error cleaning up expired locks: {e}")
            db.session.rollback()
            return 0
    
    def reset_nonce(self, wallet_address: str) -> int:
        """
        Reset nonce to blockchain value (emergency use only)
        
        Args:
            wallet_address: Wallet address
        
        Returns:
            int: Reset nonce value
        
        Warning:
            This should only be used in emergency situations as it may
            cause pending transactions to fail.
        """
        try:
            chain_nonce = self.w3.eth.get_transaction_count(wallet_address)
            
            tracker = NonceTracker.query.filter_by(wallet_address=wallet_address).first()
            if tracker:
                tracker.current_nonce = chain_nonce
                tracker.pending_nonces = []
                tracker.lock_token = None
                tracker.lock_expires_at = None
                tracker.last_updated = datetime.utcnow()
                db.session.commit()
                
                logger.warning(f"RESET nonce for {wallet_address} to {chain_nonce}")
            
            return chain_nonce
            
        except Exception as e:
            logger.error(f"Error resetting nonce: {e}")
            db.session.rollback()
            return 0


# Helper function to create nonce manager
def create_nonce_manager(w3: Web3) -> NonceManager:
    """
    Create nonce manager instance
    
    Args:
        w3: Web3 instance
    
    Returns:
        NonceManager: Nonce manager instance
    """
    return NonceManager(w3)


# Export
__all__ = ['NonceManager', 'create_nonce_manager']
