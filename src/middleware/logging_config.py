"""
Structured Logging Configuration

Provides comprehensive logging with:
- Structured JSON logging
- Multiple log levels
- Log rotation
- Performance metrics logging
- Request/Response logging
- Error tracking

Author: Manus AI
Date: 2024-11-16
"""

import logging
import logging.handlers
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import os
from pathlib import Path


class JSONFormatter(logging.Formatter):
    """Custom formatter for JSON structured logs"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': self.formatException(record.exc_info)
            }
        
        # Add extra fields if present
        if hasattr(record, 'extra_data'):
            log_data['extra'] = record.extra_data
        
        return json.dumps(log_data, default=str)


class StructuredLogger:
    """Wrapper for structured logging"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
    
    def info(self, message: str, **kwargs):
        """Log info message with extra data"""
        extra = logging.LogRecord(
            name=self.logger.name,
            level=logging.INFO,
            pathname='',
            lineno=0,
            msg=message,
            args=(),
            exc_info=None
        )
        extra.extra_data = kwargs
        self.logger.info(message, extra=extra)
    
    def warning(self, message: str, **kwargs):
        """Log warning message with extra data"""
        extra = logging.LogRecord(
            name=self.logger.name,
            level=logging.WARNING,
            pathname='',
            lineno=0,
            msg=message,
            args=(),
            exc_info=None
        )
        extra.extra_data = kwargs
        self.logger.warning(message, extra=extra)
    
    def error(self, message: str, **kwargs):
        """Log error message with extra data"""
        extra = logging.LogRecord(
            name=self.logger.name,
            level=logging.ERROR,
            pathname='',
            lineno=0,
            msg=message,
            args=(),
            exc_info=None
        )
        extra.extra_data = kwargs
        self.logger.error(message, extra=extra)
    
    def debug(self, message: str, **kwargs):
        """Log debug message with extra data"""
        extra = logging.LogRecord(
            name=self.logger.name,
            level=logging.DEBUG,
            pathname='',
            lineno=0,
            msg=message,
            args=(),
            exc_info=None
        )
        extra.extra_data = kwargs
        self.logger.debug(message, extra=extra)


def setup_logging(
    log_level: str = 'INFO',
    log_dir: str = 'logs',
    enable_console: bool = True,
    enable_file: bool = True
) -> None:
    """
    Setup logging configuration
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_dir: Directory for log files
        enable_console: Enable console logging
        enable_file: Enable file logging
    """
    # Create log directory if it doesn't exist
    if enable_file:
        Path(log_dir).mkdir(parents=True, exist_ok=True)
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # JSON formatter
    json_formatter = JSONFormatter()
    
    # Console handler
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(getattr(logging, log_level.upper()))
        console_handler.setFormatter(json_formatter)
        root_logger.addHandler(console_handler)
    
    # File handler with rotation
    if enable_file:
        file_handler = logging.handlers.RotatingFileHandler(
            filename=os.path.join(log_dir, 'dchat.log'),
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=10
        )
        file_handler.setLevel(getattr(logging, log_level.upper()))
        file_handler.setFormatter(json_formatter)
        root_logger.addHandler(file_handler)
    
    # Error file handler
    if enable_file:
        error_handler = logging.handlers.RotatingFileHandler(
            filename=os.path.join(log_dir, 'dchat_error.log'),
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=10
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(json_formatter)
        root_logger.addHandler(error_handler)
    
    # Request/Response handler
    if enable_file:
        request_handler = logging.handlers.RotatingFileHandler(
            filename=os.path.join(log_dir, 'dchat_requests.log'),
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=10
        )
        request_handler.setLevel(logging.INFO)
        request_handler.setFormatter(json_formatter)
        request_logger = logging.getLogger('requests')
        request_logger.addHandler(request_handler)


class RequestLogger:
    """Middleware for logging HTTP requests and responses"""
    
    def __init__(self):
        self.logger = logging.getLogger('requests')
    
    async def log_request(
        self,
        method: str,
        path: str,
        query_params: Optional[Dict] = None,
        user_id: Optional[int] = None
    ) -> None:
        """Log incoming request"""
        self.logger.info(
            f"Request: {method} {path}",
            method=method,
            path=path,
            query_params=query_params,
            user_id=user_id,
            timestamp=datetime.utcnow().isoformat()
        )
    
    async def log_response(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        user_id: Optional[int] = None
    ) -> None:
        """Log outgoing response"""
        self.logger.info(
            f"Response: {method} {path} {status_code}",
            method=method,
            path=path,
            status_code=status_code,
            duration_ms=duration_ms,
            user_id=user_id,
            timestamp=datetime.utcnow().isoformat()
        )
    
    async def log_error(
        self,
        method: str,
        path: str,
        status_code: int,
        error_message: str,
        user_id: Optional[int] = None
    ) -> None:
        """Log request error"""
        self.logger.error(
            f"Error: {method} {path} {status_code}",
            method=method,
            path=path,
            status_code=status_code,
            error_message=error_message,
            user_id=user_id,
            timestamp=datetime.utcnow().isoformat()
        )


class PerformanceLogger:
    """Logger for performance metrics"""
    
    def __init__(self):
        self.logger = logging.getLogger('performance')
    
    def log_database_query(
        self,
        query: str,
        duration_ms: float,
        rows_affected: int = 0
    ) -> None:
        """Log database query performance"""
        self.logger.info(
            f"Database query executed",
            query=query[:100],  # First 100 chars
            duration_ms=duration_ms,
            rows_affected=rows_affected,
            timestamp=datetime.utcnow().isoformat()
        )
    
    def log_api_call(
        self,
        endpoint: str,
        method: str,
        duration_ms: float,
        status_code: int
    ) -> None:
        """Log API call performance"""
        self.logger.info(
            f"API call completed",
            endpoint=endpoint,
            method=method,
            duration_ms=duration_ms,
            status_code=status_code,
            timestamp=datetime.utcnow().isoformat()
        )
    
    def log_external_api_call(
        self,
        service: str,
        endpoint: str,
        duration_ms: float,
        status_code: int
    ) -> None:
        """Log external API call performance"""
        self.logger.info(
            f"External API call completed",
            service=service,
            endpoint=endpoint,
            duration_ms=duration_ms,
            status_code=status_code,
            timestamp=datetime.utcnow().isoformat()
        )


class BusinessLogger:
    """Logger for business events"""
    
    def __init__(self):
        self.logger = logging.getLogger('business')
    
    def log_red_packet_created(
        self,
        packet_id: str,
        sender_id: int,
        amount: int,
        packet_count: int
    ) -> None:
        """Log red packet creation"""
        self.logger.info(
            f"Red packet created",
            packet_id=packet_id,
            sender_id=sender_id,
            amount=amount,
            packet_count=packet_count,
            timestamp=datetime.utcnow().isoformat()
        )
    
    def log_red_packet_claimed(
        self,
        packet_id: str,
        recipient_id: int,
        claim_amount: int
    ) -> None:
        """Log red packet claim"""
        self.logger.info(
            f"Red packet claimed",
            packet_id=packet_id,
            recipient_id=recipient_id,
            claim_amount=claim_amount,
            timestamp=datetime.utcnow().isoformat()
        )
    
    def log_transaction(
        self,
        tx_hash: str,
        sender_id: int,
        recipient_id: int,
        amount: int,
        status: str
    ) -> None:
        """Log transaction"""
        self.logger.info(
            f"Transaction recorded",
            tx_hash=tx_hash,
            sender_id=sender_id,
            recipient_id=recipient_id,
            amount=amount,
            status=status,
            timestamp=datetime.utcnow().isoformat()
        )
    
    def log_payment_received(
        self,
        user_id: int,
        amount: int,
        token: str
    ) -> None:
        """Log payment received"""
        self.logger.info(
            f"Payment received",
            user_id=user_id,
            amount=amount,
            token=token,
            timestamp=datetime.utcnow().isoformat()
        )


# Global logger instances
request_logger = RequestLogger()
performance_logger = PerformanceLogger()
business_logger = BusinessLogger()


def get_logger(name: str) -> logging.Logger:
    """Get logger instance"""
    return logging.getLogger(name)
