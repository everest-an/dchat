"""
Redis Configuration and Service
Provides Redis connection and caching utilities
"""

import redis
import os
import json
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)


class RedisService:
    """
    Redis service for caching and session management
    """
    
    def __init__(self):
        """Initialize Redis connection"""
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        self.redis_client = None
        self.connect()
    
    def connect(self):
        """Connect to Redis server"""
        try:
            # Parse Redis URL
            self.redis_client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            
            # Test connection
            self.redis_client.ping()
            logger.info(f"✅ Connected to Redis: {self.redis_url}")
            
        except redis.ConnectionError as e:
            logger.error(f"❌ Failed to connect to Redis: {e}")
            logger.warning("⚠️  Running without Redis caching")
            self.redis_client = None
        except Exception as e:
            logger.error(f"❌ Redis error: {e}")
            self.redis_client = None
    
    def is_available(self) -> bool:
        """Check if Redis is available"""
        return self.redis_client is not None
    
    # ============= Basic Operations =============
    
    def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """
        Set a key-value pair
        
        Args:
            key: Cache key
            value: Value to store (will be JSON serialized if not string)
            expire: Expiration time in seconds (optional)
        
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            return False
        
        try:
            # Serialize non-string values
            if not isinstance(value, str):
                value = json.dumps(value)
            
            if expire:
                self.redis_client.setex(key, expire, value)
            else:
                self.redis_client.set(key, value)
            
            return True
        except Exception as e:
            logger.error(f"Redis SET error: {e}")
            return False
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get value by key
        
        Args:
            key: Cache key
            default: Default value if key not found
        
        Returns:
            Cached value or default
        """
        if not self.is_available():
            return default
        
        try:
            value = self.redis_client.get(key)
            
            if value is None:
                return default
            
            # Try to deserialize JSON
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except Exception as e:
            logger.error(f"Redis GET error: {e}")
            return default
    
    def delete(self, *keys: str) -> int:
        """
        Delete one or more keys
        
        Args:
            keys: Keys to delete
        
        Returns:
            Number of keys deleted
        """
        if not self.is_available():
            return 0
        
        try:
            return self.redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"Redis DELETE error: {e}")
            return 0
    
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        if not self.is_available():
            return False
        
        try:
            return self.redis_client.exists(key) > 0
        except Exception as e:
            logger.error(f"Redis EXISTS error: {e}")
            return False
    
    def expire(self, key: str, seconds: int) -> bool:
        """Set expiration time for a key"""
        if not self.is_available():
            return False
        
        try:
            return self.redis_client.expire(key, seconds)
        except Exception as e:
            logger.error(f"Redis EXPIRE error: {e}")
            return False
    
    # ============= Session Management =============
    
    def set_session(self, session_id: str, user_data: dict, expire: int = 3600) -> bool:
        """
        Store user session
        
        Args:
            session_id: Session ID
            user_data: User data to store
            expire: Session expiration in seconds (default 1 hour)
        
        Returns:
            True if successful
        """
        key = f"session:{session_id}"
        return self.set(key, user_data, expire)
    
    def get_session(self, session_id: str) -> Optional[dict]:
        """Get user session data"""
        key = f"session:{session_id}"
        return self.get(key)
    
    def delete_session(self, session_id: str) -> int:
        """Delete user session"""
        key = f"session:{session_id}"
        return self.delete(key)
    
    # ============= Online Users =============
    
    def add_online_user(self, user_id: str, expire: int = 300) -> bool:
        """
        Mark user as online
        
        Args:
            user_id: User ID
            expire: Expiration time in seconds (default 5 minutes)
        
        Returns:
            True if successful
        """
        key = f"online:{user_id}"
        return self.set(key, "1", expire)
    
    def remove_online_user(self, user_id: str) -> int:
        """Mark user as offline"""
        key = f"online:{user_id}"
        return self.delete(key)
    
    def is_user_online(self, user_id: str) -> bool:
        """Check if user is online"""
        key = f"online:{user_id}"
        return self.exists(key)
    
    def get_online_users(self, pattern: str = "online:*") -> list:
        """
        Get list of online users
        
        Args:
            pattern: Key pattern to match
        
        Returns:
            List of online user IDs
        """
        if not self.is_available():
            return []
        
        try:
            keys = self.redis_client.keys(pattern)
            # Extract user IDs from keys
            return [key.replace("online:", "") for key in keys]
        except Exception as e:
            logger.error(f"Redis KEYS error: {e}")
            return []
    
    # ============= Rate Limiting =============
    
    def check_rate_limit(self, key: str, limit: int, window: int) -> bool:
        """
        Check rate limit using sliding window
        
        Args:
            key: Rate limit key (e.g., "rate:user:123")
            limit: Maximum number of requests
            window: Time window in seconds
        
        Returns:
            True if within limit, False if exceeded
        """
        if not self.is_available():
            return True  # Allow if Redis unavailable
        
        try:
            current = self.redis_client.incr(key)
            
            if current == 1:
                # First request, set expiration
                self.redis_client.expire(key, window)
            
            return current <= limit
        except Exception as e:
            logger.error(f"Redis rate limit error: {e}")
            return True  # Allow on error
    
    # ============= Caching =============
    
    def cache_user(self, user_id: str, user_data: dict, expire: int = 600) -> bool:
        """
        Cache user data
        
        Args:
            user_id: User ID
            user_data: User data to cache
            expire: Cache expiration in seconds (default 10 minutes)
        
        Returns:
            True if successful
        """
        key = f"user:{user_id}"
        return self.set(key, user_data, expire)
    
    def get_cached_user(self, user_id: str) -> Optional[dict]:
        """Get cached user data"""
        key = f"user:{user_id}"
        return self.get(key)
    
    def cache_group(self, group_id: str, group_data: dict, expire: int = 600) -> bool:
        """Cache group data"""
        key = f"group:{group_id}"
        return self.set(key, group_data, expire)
    
    def get_cached_group(self, group_id: str) -> Optional[dict]:
        """Get cached group data"""
        key = f"group:{group_id}"
        return self.get(key)
    
    # ============= Nonce Management =============
    
    def store_nonce(self, address: str, nonce: str, expire: int = 300) -> bool:
        """
        Store authentication nonce
        
        Args:
            address: Wallet address
            nonce: Nonce string
            expire: Expiration time in seconds (default 5 minutes)
        
        Returns:
            True if successful
        """
        key = f"nonce:{address}"
        return self.set(key, nonce, expire)
    
    def get_nonce(self, address: str) -> Optional[str]:
        """Get authentication nonce"""
        key = f"nonce:{address}"
        return self.get(key)
    
    def delete_nonce(self, address: str) -> int:
        """Delete authentication nonce"""
        key = f"nonce:{address}"
        return self.delete(key)
    
    # ============= Cleanup =============
    
    def flush_all(self) -> bool:
        """
        Flush all Redis data (use with caution!)
        
        Returns:
            True if successful
        """
        if not self.is_available():
            return False
        
        try:
            self.redis_client.flushall()
            logger.warning("⚠️  Redis database flushed!")
            return True
        except Exception as e:
            logger.error(f"Redis FLUSHALL error: {e}")
            return False


# Global Redis service instance
redis_service = RedisService()
