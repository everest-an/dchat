"""
Cache Management System

Implements caching strategies:
- In-memory caching with TTL
- Redis integration
- Cache invalidation
- Performance monitoring

Author: Manus AI
Date: 2024-11-16
"""

from typing import Any, Optional, Dict, Callable
from datetime import datetime, timedelta
import json
import logging
import hashlib
from functools import wraps
import asyncio

logger = logging.getLogger(__name__)


class CacheEntry:
    """Cache entry with TTL"""
    
    def __init__(self, value: Any, ttl_seconds: int = 3600):
        self.value = value
        self.created_at = datetime.utcnow()
        self.ttl_seconds = ttl_seconds
        self.access_count = 0
        self.last_accessed_at = datetime.utcnow()
    
    def is_expired(self) -> bool:
        """Check if entry is expired"""
        age = (datetime.utcnow() - self.created_at).total_seconds()
        return age > self.ttl_seconds
    
    def access(self) -> Any:
        """Access value and update metrics"""
        self.access_count += 1
        self.last_accessed_at = datetime.utcnow()
        return self.value


class InMemoryCache:
    """Simple in-memory cache with TTL"""
    
    def __init__(self, max_size: int = 10000):
        self.cache: Dict[str, CacheEntry] = {}
        self.max_size = max_size
        self.hits = 0
        self.misses = 0
    
    def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        """Set cache value"""
        # Evict if cache is full
        if len(self.cache) >= self.max_size:
            self._evict_lru()
        
        self.cache[key] = CacheEntry(value, ttl_seconds)
        logger.debug(f"Cache SET: {key}")
    
    def get(self, key: str) -> Optional[Any]:
        """Get cache value"""
        if key not in self.cache:
            self.misses += 1
            return None
        
        entry = self.cache[key]
        
        # Check expiration
        if entry.is_expired():
            del self.cache[key]
            self.misses += 1
            logger.debug(f"Cache MISS (expired): {key}")
            return None
        
        self.hits += 1
        logger.debug(f"Cache HIT: {key}")
        return entry.access()
    
    def delete(self, key: str) -> None:
        """Delete cache entry"""
        if key in self.cache:
            del self.cache[key]
            logger.debug(f"Cache DELETE: {key}")
    
    def clear(self) -> None:
        """Clear all cache"""
        self.cache.clear()
        logger.info("Cache cleared")
    
    def _evict_lru(self) -> None:
        """Evict least recently used entry"""
        if not self.cache:
            return
        
        # Find LRU entry
        lru_key = min(
            self.cache.keys(),
            key=lambda k: self.cache[k].last_accessed_at
        )
        
        del self.cache[lru_key]
        logger.debug(f"Cache evicted (LRU): {lru_key}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.hits + self.misses
        hit_rate = self.hits / total_requests if total_requests > 0 else 0
        
        return {
            'size': len(self.cache),
            'max_size': self.max_size,
            'hits': self.hits,
            'misses': self.misses,
            'total_requests': total_requests,
            'hit_rate': hit_rate
        }


class RedisCache:
    """Redis cache wrapper"""
    
    def __init__(self, redis_url: str = 'redis://localhost:6379'):
        self.redis_url = redis_url
        self.redis_client = None
        self.hits = 0
        self.misses = 0
    
    async def connect(self) -> None:
        """Connect to Redis"""
        try:
            import redis.asyncio as redis
            self.redis_client = await redis.from_url(self.redis_url)
            logger.info(f"Connected to Redis: {self.redis_url}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
    
    async def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        """Set cache value in Redis"""
        if not self.redis_client:
            return
        
        try:
            # Serialize value
            serialized = json.dumps(value)
            await self.redis_client.setex(key, ttl_seconds, serialized)
            logger.debug(f"Redis SET: {key}")
        except Exception as e:
            logger.error(f"Redis SET error: {str(e)}")
    
    async def get(self, key: str) -> Optional[Any]:
        """Get cache value from Redis"""
        if not self.redis_client:
            return None
        
        try:
            value = await self.redis_client.get(key)
            
            if value is None:
                self.misses += 1
                logger.debug(f"Redis MISS: {key}")
                return None
            
            self.hits += 1
            logger.debug(f"Redis HIT: {key}")
            return json.loads(value)
        except Exception as e:
            logger.error(f"Redis GET error: {str(e)}")
            return None
    
    async def delete(self, key: str) -> None:
        """Delete cache entry from Redis"""
        if not self.redis_client:
            return
        
        try:
            await self.redis_client.delete(key)
            logger.debug(f"Redis DELETE: {key}")
        except Exception as e:
            logger.error(f"Redis DELETE error: {str(e)}")
    
    async def clear(self) -> None:
        """Clear all cache in Redis"""
        if not self.redis_client:
            return
        
        try:
            await self.redis_client.flushdb()
            logger.info("Redis cache cleared")
        except Exception as e:
            logger.error(f"Redis CLEAR error: {str(e)}")


class CacheManager:
    """Unified cache manager"""
    
    def __init__(self, use_redis: bool = False, redis_url: Optional[str] = None):
        self.use_redis = use_redis
        self.memory_cache = InMemoryCache()
        self.redis_cache = None
        
        if use_redis and redis_url:
            self.redis_cache = RedisCache(redis_url)
    
    async def initialize(self) -> None:
        """Initialize cache manager"""
        if self.redis_cache:
            await self.redis_cache.connect()
    
    async def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        """Set cache value"""
        # Always set in memory cache
        self.memory_cache.set(key, value, ttl_seconds)
        
        # Also set in Redis if available
        if self.redis_cache:
            await self.redis_cache.set(key, value, ttl_seconds)
    
    async def get(self, key: str) -> Optional[Any]:
        """Get cache value"""
        # Try memory cache first
        value = self.memory_cache.get(key)
        if value is not None:
            return value
        
        # Try Redis if available
        if self.redis_cache:
            value = await self.redis_cache.get(key)
            if value is not None:
                # Update memory cache
                self.memory_cache.set(key, value)
                return value
        
        return None
    
    async def delete(self, key: str) -> None:
        """Delete cache entry"""
        self.memory_cache.delete(key)
        
        if self.redis_cache:
            await self.redis_cache.delete(key)
    
    async def clear(self) -> None:
        """Clear all cache"""
        self.memory_cache.clear()
        
        if self.redis_cache:
            await self.redis_cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        stats = {
            'memory_cache': self.memory_cache.get_stats(),
            'redis_enabled': bool(self.redis_cache)
        }
        
        if self.redis_cache:
            stats['redis_cache'] = {
                'hits': self.redis_cache.hits,
                'misses': self.redis_cache.misses
            }
        
        return stats


class CacheDecorator:
    """Decorator for caching function results"""
    
    def __init__(self, cache_manager: CacheManager, ttl_seconds: int = 3600):
        self.cache_manager = cache_manager
        self.ttl_seconds = ttl_seconds
    
    def _generate_key(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """Generate cache key from function and arguments"""
        key_data = f"{func_name}:{str(args)}:{str(kwargs)}"
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        return f"cache:{func_name}:{key_hash}"
    
    def __call__(self, func: Callable) -> Callable:
        """Decorate function"""
        if asyncio.iscoroutinefunction(func):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                cache_key = self._generate_key(func.__name__, args, kwargs)
                
                # Try to get from cache
                cached_value = await self.cache_manager.get(cache_key)
                if cached_value is not None:
                    logger.debug(f"Cache hit for {func.__name__}")
                    return cached_value
                
                # Call function
                result = await func(*args, **kwargs)
                
                # Store in cache
                await self.cache_manager.set(cache_key, result, self.ttl_seconds)
                
                return result
            
            return async_wrapper
        else:
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                cache_key = self._generate_key(func.__name__, args, kwargs)
                
                # Try to get from cache
                cached_value = self.cache_manager.memory_cache.get(cache_key)
                if cached_value is not None:
                    logger.debug(f"Cache hit for {func.__name__}")
                    return cached_value
                
                # Call function
                result = func(*args, **kwargs)
                
                # Store in cache
                self.cache_manager.memory_cache.set(cache_key, result, self.ttl_seconds)
                
                return result
            
            return sync_wrapper


# Global cache manager instance
cache_manager = CacheManager()


# Cache key patterns
class CacheKeys:
    """Cache key patterns"""
    
    @staticmethod
    def user(user_id: int) -> str:
        return f"user:{user_id}"
    
    @staticmethod
    def red_packet(packet_id: str) -> str:
        return f"red_packet:{packet_id}"
    
    @staticmethod
    def transaction(tx_hash: str) -> str:
        return f"transaction:{tx_hash}"
    
    @staticmethod
    def call_session(session_id: str) -> str:
        return f"call_session:{session_id}"
    
    @staticmethod
    def subscription(user_id: int) -> str:
        return f"subscription:{user_id}"
    
    @staticmethod
    def user_packets(user_id: int, page: int = 1) -> str:
        return f"user_packets:{user_id}:page:{page}"
    
    @staticmethod
    def user_transactions(user_id: int, page: int = 1) -> str:
        return f"user_transactions:{user_id}:page:{page}"
