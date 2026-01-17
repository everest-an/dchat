"""
Monitoring Middleware
Track API performance, errors, and usage metrics
"""

import time
import logging
from functools import wraps
from flask import request, g
from typing import Callable
import uuid

# Loggers
access_logger = logging.getLogger('dchat.access')
perf_logger = logging.getLogger('dchat.performance')
security_logger = logging.getLogger('dchat.security')


def request_monitoring(app):
    """
    Add request monitoring to Flask app
    
    Args:
        app: Flask application instance
    """
    
    @app.before_request
    def before_request():
        """Track request start time and generate request ID"""
        g.request_id = str(uuid.uuid4())
        g.start_time = time.time()
        
        # Log incoming request
        access_logger.info(
            f"Request started",
            extra={
                'request_id': g.request_id,
                'method': request.method,
                'path': request.path,
                'remote_addr': request.remote_addr,
                'user_agent': request.headers.get('User-Agent', 'Unknown')
            }
        )
    
    @app.after_request
    def after_request(response):
        """Log request completion and performance"""
        if hasattr(g, 'start_time'):
            duration_ms = (time.time() - g.start_time) * 1000
            
            # Log request completion
            access_logger.info(
                f"Request completed",
                extra={
                    'request_id': g.request_id,
                    'method': request.method,
                    'path': request.path,
                    'status_code': response.status_code,
                    'duration_ms': round(duration_ms, 2)
                }
            )
            
            # Log slow requests
            if duration_ms > 1000:  # Slower than 1 second
                perf_logger.warning(
                    f"Slow request detected",
                    extra={
                        'request_id': g.request_id,
                        'method': request.method,
                        'path': request.path,
                        'duration_ms': round(duration_ms, 2)
                    }
                )
            
            # Add performance headers
            response.headers['X-Request-ID'] = g.request_id
            response.headers['X-Response-Time'] = f"{duration_ms:.2f}ms"
        
        return response
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        """Log unhandled exceptions"""
        logging.error(
            f"Unhandled exception: {str(error)}",
            exc_info=True,
            extra={
                'request_id': getattr(g, 'request_id', 'unknown'),
                'method': request.method,
                'path': request.path
            }
        )
        
        return {'error': 'Internal server error', 'request_id': getattr(g, 'request_id', 'unknown')}, 500


def track_performance(operation_name: str):
    """
    Decorator to track function performance
    
    Args:
        operation_name: Name of the operation being tracked
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                
                perf_logger.info(
                    f"Operation completed: {operation_name}",
                    extra={
                        'operation': operation_name,
                        'duration_ms': round(duration_ms, 2),
                        'status': 'success'
                    }
                )
                
                return result
                
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                
                perf_logger.error(
                    f"Operation failed: {operation_name}",
                    exc_info=True,
                    extra={
                        'operation': operation_name,
                        'duration_ms': round(duration_ms, 2),
                        'status': 'error',
                        'error': str(e)
                    }
                )
                
                raise
        
        return wrapper
    return decorator


def log_security_event(event_type: str, details: dict):
    """
    Log security-related events
    
    Args:
        event_type: Type of security event
        details: Event details
    """
    security_logger.warning(
        f"Security event: {event_type}",
        extra={
            'event_type': event_type,
            'request_id': getattr(g, 'request_id', 'unknown'),
            'remote_addr': request.remote_addr if request else 'unknown',
            **details
        }
    )


class MetricsCollector:
    """
    Collect and track application metrics
    """
    
    def __init__(self):
        self.metrics = {
            'requests_total': 0,
            'requests_by_status': {},
            'requests_by_endpoint': {},
            'errors_total': 0,
            'slow_requests': 0
        }
    
    def increment_request(self, endpoint: str, status_code: int, duration_ms: float):
        """Track request metrics"""
        self.metrics['requests_total'] += 1
        
        # Track by status code
        if status_code not in self.metrics['requests_by_status']:
            self.metrics['requests_by_status'][status_code] = 0
        self.metrics['requests_by_status'][status_code] += 1
        
        # Track by endpoint
        if endpoint not in self.metrics['requests_by_endpoint']:
            self.metrics['requests_by_endpoint'][endpoint] = {
                'count': 0,
                'total_duration': 0,
                'avg_duration': 0
            }
        
        endpoint_metrics = self.metrics['requests_by_endpoint'][endpoint]
        endpoint_metrics['count'] += 1
        endpoint_metrics['total_duration'] += duration_ms
        endpoint_metrics['avg_duration'] = endpoint_metrics['total_duration'] / endpoint_metrics['count']
        
        # Track errors
        if status_code >= 500:
            self.metrics['errors_total'] += 1
        
        # Track slow requests
        if duration_ms > 1000:
            self.metrics['slow_requests'] += 1
    
    def get_metrics(self) -> dict:
        """Get current metrics"""
        return self.metrics
    
    def reset_metrics(self):
        """Reset all metrics"""
        self.__init__()


# Global metrics collector
metrics_collector = MetricsCollector()
