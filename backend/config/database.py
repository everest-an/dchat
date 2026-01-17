"""
Database configuration for production environment
Supports PostgreSQL with connection pooling
"""
import os
from urllib.parse import urlparse

class DatabaseConfig:
    """Database configuration class"""
    
    @staticmethod
    def get_database_uri():
        """
        Get database URI from environment variables
        Supports both SQLite (development) and PostgreSQL (production)
        """
        env = os.environ.get('ENVIRONMENT', 'development')
        
        if env == 'production':
            # Production: Use PostgreSQL
            database_url = os.environ.get('DATABASE_URL')
            if not database_url:
                raise ValueError("DATABASE_URL environment variable is required in production")
            
            # Handle Heroku postgres:// URL (convert to postgresql://)
            if database_url.startswith('postgres://'):
                database_url = database_url.replace('postgres://', 'postgresql://', 1)
            
            return database_url
        else:
            # Development: Use SQLite
            base_dir = os.path.dirname(os.path.dirname(__file__))
            db_path = os.path.join(base_dir, 'database', 'app.db')
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            return f'sqlite:///{db_path}'
    
    @staticmethod
    def get_pool_config():
        """
        Get database connection pool configuration
        """
        env = os.environ.get('ENVIRONMENT', 'development')
        
        if env == 'production':
            return {
                'pool_size': int(os.environ.get('DB_POOL_SIZE', '10')),
                'max_overflow': int(os.environ.get('DB_MAX_OVERFLOW', '20')),
                'pool_timeout': int(os.environ.get('DB_POOL_TIMEOUT', '30')),
                'pool_recycle': int(os.environ.get('DB_POOL_RECYCLE', '3600')),
                'pool_pre_ping': True,  # Verify connections before using
            }
        else:
            return {
                'pool_size': 5,
                'max_overflow': 10,
                'pool_timeout': 30,
                'pool_recycle': 3600,
            }
    
    @staticmethod
    def get_engine_options():
        """
        Get SQLAlchemy engine options
        """
        return {
            'echo': os.environ.get('DEBUG', 'False') == 'True',
            'future': True,  # Use SQLAlchemy 2.0 style
        }
