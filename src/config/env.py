"""
Environment Configuration Loader
Loads and validates environment variables for the application
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Application configuration from environment variables"""
    
    # Server Configuration
    PORT: int = int(os.getenv('PORT', '8000'))
    HOST: str = os.getenv('HOST', '0.0.0.0')
    NODE_ENV: str = os.getenv('NODE_ENV', 'development')
    
    # Database Configuration
    DB_HOST: str = os.getenv('DB_HOST', 'localhost')
    DB_PORT: int = int(os.getenv('DB_PORT', '5432'))
    DB_USER: str = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD: str = os.getenv('DB_PASSWORD', '')
    DB_NAME: str = os.getenv('DB_NAME', 'dchat')
    
    @property
    def DATABASE_URL(self) -> str:
        """Construct database URL from components"""
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    # JWT Configuration
    JWT_SECRET: str = os.getenv('JWT_SECRET', 'change-this-secret-key')
    JWT_ALGORITHM: str = 'HS256'
    JWT_EXPIRATION_HOURS: int = 24 * 7  # 7 days
    
    # Pinata IPFS Configuration
    PINATA_API_KEY: Optional[str] = os.getenv('PINATA_API_KEY')
    PINATA_SECRET_API_KEY: Optional[str] = os.getenv('PINATA_SECRET_API_KEY')
    PINATA_JWT: Optional[str] = os.getenv('PINATA_JWT')
    PINATA_GATEWAY_URL: str = os.getenv('PINATA_GATEWAY_URL', 'https://gateway.pinata.cloud/ipfs/')
    
    # Redis Configuration
    REDIS_URL: str = os.getenv('REDIS_URL', 'redis://localhost:6379')
    REDIS_PASSWORD: Optional[str] = os.getenv('REDIS_PASSWORD')
    
    # Web3 Configuration
    WEB3_PROVIDER_URL: Optional[str] = os.getenv('WEB3_PROVIDER_URL')
    CONTRACT_ADDRESS: Optional[str] = os.getenv('CONTRACT_ADDRESS')
    
    # CORS Configuration
    FRONTEND_URL: str = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    CORS_ORIGINS: list = os.getenv('CORS_ORIGINS', FRONTEND_URL).split(',')
    
    # Socket.IO Configuration
    SOCKET_IO_PORT: int = int(os.getenv('SOCKET_IO_PORT', '3002'))
    SOCKET_IO_CORS_ORIGIN: str = os.getenv('SOCKET_IO_CORS_ORIGIN', FRONTEND_URL)
    
    # Email Configuration
    EMAIL_SERVICE: str = os.getenv('EMAIL_SERVICE', 'gmail')
    EMAIL_USER: Optional[str] = os.getenv('EMAIL_USER')
    EMAIL_PASSWORD: Optional[str] = os.getenv('EMAIL_PASSWORD')
    
    # SMS Configuration (Aliyun)
    ALIYUN_ACCESS_KEY_ID: Optional[str] = os.getenv('ALIYUN_ACCESS_KEY_ID')
    ALIYUN_ACCESS_KEY_SECRET: Optional[str] = os.getenv('ALIYUN_ACCESS_KEY_SECRET')
    ALIYUN_SMS_SIGN_NAME: Optional[str] = os.getenv('ALIYUN_SMS_SIGN_NAME')
    ALIYUN_SMS_TEMPLATE_CODE: Optional[str] = os.getenv('ALIYUN_SMS_TEMPLATE_CODE')
    
    def validate(self) -> list[str]:
        """Validate required configuration"""
        errors = []
        
        if self.JWT_SECRET == 'change-this-secret-key':
            errors.append("JWT_SECRET must be changed in production")
        
        if not self.DB_PASSWORD:
            errors.append("DB_PASSWORD is required")
        
        if not self.PINATA_JWT and not (self.PINATA_API_KEY and self.PINATA_SECRET_API_KEY):
            errors.append("Pinata credentials are required (either JWT or API Key + Secret)")
        
        return errors

# Global config instance
config = Config()

# Validate configuration on import
if config.NODE_ENV == 'production':
    validation_errors = config.validate()
    if validation_errors:
        raise ValueError(f"Configuration errors: {', '.join(validation_errors)}")
