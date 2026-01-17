"""
Logging Configuration
Provides structured logging for production environments
"""

import logging
import logging.handlers
import os
import sys
import json
from datetime import datetime
from typing import Any, Dict


class JSONFormatter(logging.Formatter):
    """
    Custom JSON formatter for structured logging
    Compatible with log aggregation tools (ELK, Datadog, CloudWatch)
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_data = {
            'timestamp': datetime.utcfromtimestamp(record.created).isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        if hasattr(record, 'ip_address'):
            log_data['ip_address'] = record.ip_address
        
        return json.dumps(log_data)


class ColoredFormatter(logging.Formatter):
    """
    Colored console formatter for development
    """
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
        'RESET': '\033[0m'        # Reset
    }
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record with colors"""
        color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset = self.COLORS['RESET']
        
        # Format timestamp
        timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')
        
        # Format message
        message = f"{color}[{record.levelname}]{reset} {timestamp} - {record.name} - {record.getMessage()}"
        
        # Add exception if present
        if record.exc_info:
            message += '\n' + self.formatException(record.exc_info)
        
        return message


def setup_logging(
    log_level: str = None,
    log_file: str = None,
    json_logs: bool = None
) -> None:
    """
    Setup logging configuration
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Path to log file (optional)
        json_logs: Use JSON format for logs (default: True in production)
    
    Environment Variables:
        LOG_LEVEL: Logging level (default: INFO)
        LOG_FILE: Path to log file (default: logs/dchat.log)
        JSON_LOGS: Use JSON format (default: true in production)
        ENVIRONMENT: Environment name (development, staging, production)
    """
    
    # Get configuration from environment
    if log_level is None:
        log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    
    if log_file is None:
        log_file = os.getenv('LOG_FILE', 'logs/dchat.log')
    
    if json_logs is None:
        environment = os.getenv('ENVIRONMENT', 'development')
        json_logs = environment in ('staging', 'production')
    
    # Create logs directory if it doesn't exist
    log_dir = os.path.dirname(log_file)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level))
    
    # Remove existing handlers
    root_logger.handlers = []
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level))
    
    if json_logs:
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(ColoredFormatter())
    
    root_logger.addHandler(console_handler)
    
    # File handler (rotating)
    if log_file:
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5,
            encoding='utf-8'
        )
        file_handler.setLevel(getattr(logging, log_level))
        file_handler.setFormatter(JSONFormatter() if json_logs else ColoredFormatter())
        root_logger.addHandler(file_handler)
    
    # Log startup message
    logger = logging.getLogger(__name__)
    logger.info(f"Logging initialized: level={log_level}, json={json_logs}, file={log_file}")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance
    
    Args:
        name: Logger name (usually __name__)
    
    Returns:
        Logger instance
    """
    return logging.getLogger(name)


class RequestLogger:
    """
    Middleware for logging HTTP requests
    """
    
    def __init__(self, app):
        """Initialize request logger"""
        self.app = app
        self.logger = get_logger('request')
    
    def __call__(self, environ, start_response):
        """Log HTTP request"""
        from flask import request, g
        import time
        import uuid
        
        # Generate request ID
        request_id = str(uuid.uuid4())
        g.request_id = request_id
        
        # Start timer
        start_time = time.time()
        
        # Log request
        self.logger.info(
            f"{request.method} {request.path}",
            extra={
                'request_id': request_id,
                'method': request.method,
                'path': request.path,
                'ip_address': request.remote_addr,
                'user_agent': request.user_agent.string
            }
        )
        
        # Call app
        def custom_start_response(status, headers, exc_info=None):
            # Log response
            duration = time.time() - start_time
            status_code = int(status.split()[0])
            
            log_level = logging.INFO
            if status_code >= 500:
                log_level = logging.ERROR
            elif status_code >= 400:
                log_level = logging.WARNING
            
            self.logger.log(
                log_level,
                f"{request.method} {request.path} - {status_code} ({duration:.3f}s)",
                extra={
                    'request_id': request_id,
                    'method': request.method,
                    'path': request.path,
                    'status_code': status_code,
                    'duration': duration,
                    'ip_address': request.remote_addr
                }
            )
            
            return start_response(status, headers, exc_info)
        
        return self.app(environ, custom_start_response)


class PerformanceLogger:
    """
    Decorator for logging function performance
    """
    
    def __init__(self, logger_name: str = None):
        """Initialize performance logger"""
        self.logger = get_logger(logger_name or 'performance')
    
    def __call__(self, func):
        """Decorate function"""
        import functools
        import time
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                self.logger.debug(
                    f"{func.__name__} completed in {duration:.3f}s",
                    extra={
                        'function': func.__name__,
                        'duration': duration,
                        'success': True
                    }
                )
                
                return result
            
            except Exception as e:
                duration = time.time() - start_time
                
                self.logger.error(
                    f"{func.__name__} failed after {duration:.3f}s: {str(e)}",
                    extra={
                        'function': func.__name__,
                        'duration': duration,
                        'success': False,
                        'error': str(e)
                    },
                    exc_info=True
                )
                
                raise
        
        return wrapper


# Sentry Integration (optional)
def setup_sentry(dsn: str = None) -> None:
    """
    Setup Sentry error tracking
    
    Args:
        dsn: Sentry DSN (optional, can use SENTRY_DSN env var)
    
    Environment Variables:
        SENTRY_DSN: Sentry DSN
        SENTRY_ENVIRONMENT: Environment name (development, staging, production)
        SENTRY_TRACES_SAMPLE_RATE: Traces sample rate (default: 0.1)
    """
    try:
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        
        if dsn is None:
            dsn = os.getenv('SENTRY_DSN')
        
        if not dsn:
            logging.getLogger(__name__).info("Sentry DSN not configured, skipping Sentry setup")
            return
        
        environment = os.getenv('SENTRY_ENVIRONMENT', 'development')
        traces_sample_rate = float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1'))
        
        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            traces_sample_rate=traces_sample_rate,
            integrations=[
                FlaskIntegration(),
                SqlalchemyIntegration()
            ],
            # Send PII (Personally Identifiable Information)
            send_default_pii=False,
            # Attach stack trace to messages
            attach_stacktrace=True
        )
        
        logging.getLogger(__name__).info(f"Sentry initialized: environment={environment}")
    
    except ImportError:
        logging.getLogger(__name__).warning("Sentry SDK not installed, skipping Sentry setup")
    except Exception as e:
        logging.getLogger(__name__).error(f"Failed to initialize Sentry: {e}")


# Initialize logging on module import
if __name__ != '__main__':
    setup_logging()
