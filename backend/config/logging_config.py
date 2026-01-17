"""
Logging Configuration
Centralized logging setup for production monitoring
"""

import logging
import logging.handlers
import os
import sys
from datetime import datetime
from typing import Optional
import json


class JSONFormatter(logging.Formatter):
    """
    Custom JSON formatter for structured logging
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        if hasattr(record, 'duration_ms'):
            log_data['duration_ms'] = record.duration_ms
        
        return json.dumps(log_data)


def setup_logging(
    app_name: str = 'dchat',
    log_level: str = None,
    log_dir: str = None,
    enable_json: bool = False
) -> None:
    """
    Setup application logging
    
    Args:
        app_name: Application name for log files
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: Directory for log files
        enable_json: Enable JSON formatted logs
    """
    # Get log level from environment or default to INFO
    if log_level is None:
        log_level = os.getenv('LOG_LEVEL', 'INFO')
    
    # Get log directory from environment or default
    if log_dir is None:
        log_dir = os.getenv('LOG_DIR', '/var/log/dchat')
    
    # Create log directory if it doesn't exist
    os.makedirs(log_dir, exist_ok=True)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Remove existing handlers
    root_logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    if enable_json:
        console_handler.setFormatter(JSONFormatter())
    else:
        console_format = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(console_format)
    
    root_logger.addHandler(console_handler)
    
    # File handler for general logs
    general_log_file = os.path.join(log_dir, f'{app_name}.log')
    file_handler = logging.handlers.RotatingFileHandler(
        general_log_file,
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=10
    )
    file_handler.setLevel(logging.DEBUG)
    
    if enable_json:
        file_handler.setFormatter(JSONFormatter())
    else:
        file_format = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(module)s:%(funcName)s:%(lineno)d - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_format)
    
    root_logger.addHandler(file_handler)
    
    # Error file handler
    error_log_file = os.path.join(log_dir, f'{app_name}_error.log')
    error_handler = logging.handlers.RotatingFileHandler(
        error_log_file,
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=10
    )
    error_handler.setLevel(logging.ERROR)
    
    if enable_json:
        error_handler.setFormatter(JSONFormatter())
    else:
        error_handler.setFormatter(file_format)
    
    root_logger.addHandler(error_handler)
    
    # Access log handler (for API requests)
    access_log_file = os.path.join(log_dir, f'{app_name}_access.log')
    access_handler = logging.handlers.RotatingFileHandler(
        access_log_file,
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=10
    )
    access_handler.setLevel(logging.INFO)
    
    if enable_json:
        access_handler.setFormatter(JSONFormatter())
    else:
        access_handler.setFormatter(file_format)
    
    # Create access logger
    access_logger = logging.getLogger('dchat.access')
    access_logger.addHandler(access_handler)
    access_logger.propagate = False
    
    logging.info(f"Logging initialized - Level: {log_level}, Dir: {log_dir}, JSON: {enable_json}")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance
    
    Args:
        name: Logger name
        
    Returns:
        Logger instance
    """
    return logging.getLogger(f'dchat.{name}')


# Performance monitoring logger
perf_logger = logging.getLogger('dchat.performance')

# Security logger
security_logger = logging.getLogger('dchat.security')

# Business logic logger
business_logger = logging.getLogger('dchat.business')
