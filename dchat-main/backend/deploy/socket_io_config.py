"""
Socket.IO Server Configuration
Production-ready configuration for AWS EC2 deployment
"""

import os
from typing import List

class SocketIOConfig:
    """Socket.IO server configuration"""
    
    # Server settings
    HOST = os.getenv('SOCKET_HOST', '0.0.0.0')
    PORT = int(os.getenv('SOCKET_PORT', 8001))
    
    # CORS settings
    CORS_ALLOWED_ORIGINS = os.getenv(
        'CORS_ALLOWED_ORIGINS',
        'https://dchat.pro,https://www.dchat.pro,http://localhost:5173,http://localhost:3000'
    ).split(',')
    
    # Socket.IO settings
    PING_TIMEOUT = int(os.getenv('PING_TIMEOUT', 60))  # seconds
    PING_INTERVAL = int(os.getenv('PING_INTERVAL', 25))  # seconds
    MAX_HTTP_BUFFER_SIZE = int(os.getenv('MAX_HTTP_BUFFER_SIZE', 1000000))  # 1MB
    
    # Session settings
    SESSION_TIMEOUT = int(os.getenv('SESSION_TIMEOUT', 3600))  # 1 hour
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    # Redis settings (for scaling to multiple instances)
    REDIS_ENABLED = os.getenv('REDIS_ENABLED', 'false').lower() == 'true'
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
    REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '')
    
    # Security
    REQUIRE_AUTH = os.getenv('REQUIRE_AUTH', 'true').lower() == 'true'
    JWT_SECRET = os.getenv('JWT_SECRET', 'change-me-in-production')
    
    # Rate limiting
    RATE_LIMIT_ENABLED = os.getenv('RATE_LIMIT_ENABLED', 'true').lower() == 'true'
    RATE_LIMIT_MESSAGES_PER_MINUTE = int(os.getenv('RATE_LIMIT_MESSAGES_PER_MINUTE', 60))
    
    @classmethod
    def get_cors_origins(cls) -> List[str]:
        """Get list of allowed CORS origins"""
        return [origin.strip() for origin in cls.CORS_ALLOWED_ORIGINS]
    
    @classmethod
    def validate(cls):
        """Validate configuration"""
        if cls.REQUIRE_AUTH and cls.JWT_SECRET == 'change-me-in-production':
            raise ValueError("JWT_SECRET must be set in production")
        
        if not cls.CORS_ALLOWED_ORIGINS:
            raise ValueError("CORS_ALLOWED_ORIGINS must be set")
        
        return True

# Validate configuration on import
SocketIOConfig.validate()
