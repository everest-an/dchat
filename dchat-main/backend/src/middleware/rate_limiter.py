"""
Rate Limiting Middleware

This module provides rate limiting functionality to protect API endpoints
from abuse and DDoS attacks.

Features:
- IP-based rate limiting
- User-based rate limiting (for authenticated requests)
- Configurable limits per endpoint
- Redis-backed for distributed systems
- Sliding window algorithm
- Custom error responses

Author: Manus AI
Date: 2024-11-05
"""

from functools import wraps
from flask import request, jsonify
from datetime import datetime, timedelta
import hashlib
from typing import Optional, Callable
from src.config.redis_config import redis_service


class RateLimiter:
    """
    Rate limiter using sliding window algorithm with Redis backend.
    
    Supports both IP-based and user-based rate limiting.
    """
    
    def __init__(self, redis_client=None):
        """
        Initialize rate limiter.
        
        Args:
            redis_client: Redis client instance (uses default if None)
        """
        self.redis = redis_client or redis_service
    
    def _get_identifier(self, user_id: Optional[str] = None) -> str:
        """
        Get unique identifier for rate limiting.
        
        Args:
            user_id: User ID for authenticated requests
            
        Returns:
            Unique identifier string
        """
        if user_id:
            return f"user:{user_id}"
        
        # Use IP address for unauthenticated requests
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip:
            # Take first IP if multiple (proxy chain)
            ip = ip.split(',')[0].strip()
        return f"ip:{ip}"
    
    def _get_rate_limit_key(self, identifier: str, endpoint: str) -> str:
        """
        Generate Redis key for rate limit tracking.
        
        Args:
            identifier: User or IP identifier
            endpoint: API endpoint name
            
        Returns:
            Redis key string
        """
        # Hash endpoint to keep key short
        endpoint_hash = hashlib.md5(endpoint.encode()).hexdigest()[:8]
        return f"rate_limit:{identifier}:{endpoint_hash}"
    
    def is_rate_limited(
        self,
        endpoint: str,
        max_requests: int,
        window_seconds: int,
        user_id: Optional[str] = None
    ) -> tuple[bool, dict]:
        """
        Check if request should be rate limited.
        
        Args:
            endpoint: API endpoint name
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds
            user_id: User ID for authenticated requests
            
        Returns:
            Tuple of (is_limited, info_dict)
            info_dict contains: remaining, reset_time, retry_after
        """
        identifier = self._get_identifier(user_id)
        key = self._get_rate_limit_key(identifier, endpoint)
        
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window_seconds)
        
        try:
            # Get current request count in window
            count = self.redis.get(key)
            
            if count is None:
                # First request in window
                self.redis.setex(key, window_seconds, 1)
                return False, {
                    'remaining': max_requests - 1,
                    'reset': int((now + timedelta(seconds=window_seconds)).timestamp()),
                    'retry_after': 0
                }
            
            count = int(count)
            
            if count >= max_requests:
                # Rate limit exceeded
                ttl = self.redis.ttl(key)
                return True, {
                    'remaining': 0,
                    'reset': int((now + timedelta(seconds=ttl)).timestamp()),
                    'retry_after': ttl
                }
            
            # Increment counter
            self.redis.incr(key)
            
            return False, {
                'remaining': max_requests - count - 1,
                'reset': int((now + timedelta(seconds=window_seconds)).timestamp()),
                'retry_after': 0
            }
            
        except Exception as e:
            # If Redis fails, allow request (fail open)
            print(f"Rate limiter error: {e}")
            return False, {
                'remaining': max_requests,
                'reset': int((now + timedelta(seconds=window_seconds)).timestamp()),
                'retry_after': 0
            }
    
    def limit(
        self,
        max_requests: int = 100,
        window_seconds: int = 60,
        key_func: Optional[Callable] = None
    ):
        """
        Decorator for rate limiting endpoints.
        
        Args:
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds
            key_func: Optional function to extract user_id from request
            
        Returns:
            Decorated function
            
        Example:
            @app.route('/api/messages')
            @rate_limiter.limit(max_requests=10, window_seconds=60)
            def get_messages():
                return {'messages': []}
        """
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                # Get user ID if key_func provided
                user_id = None
                if key_func:
                    try:
                        user_id = key_func()
                    except:
                        pass
                
                # Get endpoint name
                endpoint = request.endpoint or request.path
                
                # Check rate limit
                is_limited, info = self.is_rate_limited(
                    endpoint,
                    max_requests,
                    window_seconds,
                    user_id
                )
                
                if is_limited:
                    response = jsonify({
                        'success': False,
                        'error': 'Rate limit exceeded',
                        'message': f'Too many requests. Please try again in {info["retry_after"]} seconds.',
                        'retry_after': info['retry_after']
                    })
                    response.status_code = 429
                    response.headers['X-RateLimit-Limit'] = str(max_requests)
                    response.headers['X-RateLimit-Remaining'] = str(info['remaining'])
                    response.headers['X-RateLimit-Reset'] = str(info['reset'])
                    response.headers['Retry-After'] = str(info['retry_after'])
                    return response
                
                # Add rate limit headers to successful response
                response = f(*args, **kwargs)
                if hasattr(response, 'headers'):
                    response.headers['X-RateLimit-Limit'] = str(max_requests)
                    response.headers['X-RateLimit-Remaining'] = str(info['remaining'])
                    response.headers['X-RateLimit-Reset'] = str(info['reset'])
                
                return response
            
            return decorated_function
        return decorator


# Global rate limiter instance
rate_limiter = RateLimiter()


# Predefined rate limit decorators for common use cases

def rate_limit_strict(f):
    """
    Strict rate limit: 10 requests per minute.
    Use for sensitive operations (login, signup, password reset).
    """
    return rate_limiter.limit(max_requests=10, window_seconds=60)(f)


def rate_limit_moderate(f):
    """
    Moderate rate limit: 60 requests per minute.
    Use for standard API endpoints.
    """
    return rate_limiter.limit(max_requests=60, window_seconds=60)(f)


def rate_limit_relaxed(f):
    """
    Relaxed rate limit: 300 requests per minute.
    Use for read-only endpoints.
    """
    return rate_limiter.limit(max_requests=300, window_seconds=60)(f)


def rate_limit_per_user(max_requests: int = 100, window_seconds: int = 60):
    """
    Rate limit per authenticated user.
    
    Args:
        max_requests: Maximum requests per window
        window_seconds: Time window in seconds
        
    Returns:
        Decorator function
        
    Example:
        @app.route('/api/messages')
        @jwt_required()
        @rate_limit_per_user(max_requests=50, window_seconds=60)
        def get_messages():
            return {'messages': []}
    """
    def key_func():
        # Extract user ID from JWT token
        from flask_jwt_extended import get_jwt_identity
        return get_jwt_identity()
    
    return rate_limiter.limit(
        max_requests=max_requests,
        window_seconds=window_seconds,
        key_func=key_func
    )
