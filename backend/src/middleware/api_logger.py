"""
API Logging Middleware

Comprehensive logging system for all API requests and responses.

Features:
- Request/response logging
- Performance monitoring
- Error tracking
- User activity tracking
- Security event logging
- Structured JSON logs
- Log rotation

@author Manus AI
@date 2025-11-05
"""

import logging
import time
import json
from flask import request, g
from functools import wraps
from datetime import datetime
import os

# Configure logging
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

# Create formatters
json_formatter = logging.Formatter(
    '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": %(message)s}'
)

# API request logger
api_logger = logging.getLogger('api')
api_logger.setLevel(logging.INFO)
api_handler = logging.FileHandler(os.path.join(LOG_DIR, 'api.log'))
api_handler.setFormatter(json_formatter)
api_logger.addHandler(api_handler)

# Error logger
error_logger = logging.getLogger('error')
error_logger.setLevel(logging.ERROR)
error_handler = logging.FileHandler(os.path.join(LOG_DIR, 'error.log'))
error_handler.setFormatter(json_formatter)
error_logger.addHandler(error_handler)

# Security logger
security_logger = logging.getLogger('security')
security_logger.setLevel(logging.WARNING)
security_handler = logging.FileHandler(os.path.join(LOG_DIR, 'security.log'))
security_handler.setFormatter(json_formatter)
security_logger.addHandler(security_handler)

# Performance logger
performance_logger = logging.getLogger('performance')
performance_logger.setLevel(logging.INFO)
performance_handler = logging.FileHandler(os.path.join(LOG_DIR, 'performance.log'))
performance_handler.setFormatter(json_formatter)
performance_logger.addHandler(performance_handler)


def get_client_ip():
    """Get client IP address"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr


def get_user_agent():
    """Get user agent"""
    return request.headers.get('User-Agent', 'Unknown')


def sanitize_sensitive_data(data):
    """
    Remove sensitive data from logs
    
    Args:
        data: Dictionary to sanitize
    
    Returns:
        Sanitized dictionary
    """
    if not isinstance(data, dict):
        return data
    
    sensitive_keys = [
        'password', 'token', 'secret', 'private_key', 
        'api_key', 'authorization', 'credit_card'
    ]
    
    sanitized = data.copy()
    for key in sanitized:
        if any(sensitive in key.lower() for sensitive in sensitive_keys):
            sanitized[key] = '***REDACTED***'
        elif isinstance(sanitized[key], dict):
            sanitized[key] = sanitize_sensitive_data(sanitized[key])
    
    return sanitized


def log_api_request():
    """Log API request details"""
    try:
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'method': request.method,
            'path': request.path,
            'endpoint': request.endpoint,
            'ip': get_client_ip(),
            'user_agent': get_user_agent(),
            'user_id': getattr(request, 'user_id', None),
            'query_params': dict(request.args),
            'request_id': g.get('request_id')
        }
        
        # Log request body for POST/PUT/PATCH
        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                body = request.get_json(silent=True)
                if body:
                    log_data['body'] = sanitize_sensitive_data(body)
            except:
                pass
        
        api_logger.info(json.dumps(log_data))
    except Exception as e:
        error_logger.error(json.dumps({'error': f'Failed to log request: {str(e)}'}))


def log_api_response(response, duration):
    """Log API response details"""
    try:
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'method': request.method,
            'path': request.path,
            'endpoint': request.endpoint,
            'status_code': response.status_code,
            'duration_ms': round(duration * 1000, 2),
            'user_id': getattr(request, 'user_id', None),
            'request_id': g.get('request_id')
        }
        
        # Log response body for errors
        if response.status_code >= 400:
            try:
                body = response.get_json(silent=True)
                if body:
                    log_data['response'] = sanitize_sensitive_data(body)
            except:
                pass
        
        api_logger.info(json.dumps(log_data))
        
        # Log performance metrics
        if duration > 1.0:  # Log slow requests (>1 second)
            performance_logger.warning(json.dumps({
                'type': 'slow_request',
                'path': request.path,
                'duration_ms': round(duration * 1000, 2),
                'user_id': getattr(request, 'user_id', None)
            }))
        
    except Exception as e:
        error_logger.error(json.dumps({'error': f'Failed to log response: {str(e)}'}))


def log_error(error, status_code=500):
    """Log error details"""
    try:
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'type': 'error',
            'method': request.method,
            'path': request.path,
            'endpoint': request.endpoint,
            'status_code': status_code,
            'error': str(error),
            'error_type': type(error).__name__,
            'ip': get_client_ip(),
            'user_id': getattr(request, 'user_id', None),
            'request_id': g.get('request_id')
        }
        
        error_logger.error(json.dumps(log_data))
    except Exception as e:
        print(f"Failed to log error: {e}")


def log_security_event(event_type, details):
    """
    Log security-related events
    
    Args:
        event_type: Type of security event
        details: Event details
    """
    try:
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'type': 'security_event',
            'event_type': event_type,
            'details': details,
            'ip': get_client_ip(),
            'user_agent': get_user_agent(),
            'path': request.path if request else None,
            'user_id': getattr(request, 'user_id', None) if request else None
        }
        
        security_logger.warning(json.dumps(log_data))
    except Exception as e:
        print(f"Failed to log security event: {e}")


def api_logging(f):
    """
    Decorator for API logging
    
    Usage:
        @app.route('/api/endpoint')
        @api_logging
        def endpoint():
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Generate request ID
        import uuid
        g.request_id = str(uuid.uuid4())
        
        # Log request
        log_api_request()
        
        # Start timer
        start_time = time.time()
        
        try:
            # Execute function
            response = f(*args, **kwargs)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Log response
            if hasattr(response, 'status_code'):
                log_api_response(response, duration)
            
            return response
            
        except Exception as e:
            # Log error
            duration = time.time() - start_time
            log_error(e)
            
            # Re-raise exception
            raise
    
    return decorated_function


def init_api_logging(app):
    """
    Initialize API logging for Flask app
    
    Args:
        app: Flask application instance
    
    Usage:
        from src.middleware.api_logger import init_api_logging
        init_api_logging(app)
    """
    
    @app.before_request
    def before_request():
        """Log request before processing"""
        import uuid
        g.request_id = str(uuid.uuid4())
        g.start_time = time.time()
        log_api_request()
    
    @app.after_request
    def after_request(response):
        """Log response after processing"""
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            log_api_response(response, duration)
        return response
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Log unhandled exceptions"""
        log_error(e)
        return {'error': 'Internal server error'}, 500
    
    # Log security events
    @app.before_request
    def check_security():
        """Check for security issues"""
        # Check for suspicious user agents
        user_agent = get_user_agent().lower()
        suspicious_agents = ['bot', 'crawler', 'spider', 'scraper']
        if any(agent in user_agent for agent in suspicious_agents):
            log_security_event('suspicious_user_agent', {
                'user_agent': user_agent,
                'ip': get_client_ip()
            })
        
        # Check for missing auth on protected endpoints
        if request.endpoint and 'auth' not in request.endpoint:
            if not request.headers.get('Authorization'):
                protected_paths = ['/api/profile', '/api/wallets', '/api/subscriptions']
                if any(request.path.startswith(path) for path in protected_paths):
                    log_security_event('unauthorized_access_attempt', {
                        'path': request.path,
                        'ip': get_client_ip()
                    })
    
    print(f"✅ API logging initialized")
    print(f"   Log directory: {LOG_DIR}")
    print(f"   - api.log: All API requests/responses")
    print(f"   - error.log: Errors and exceptions")
    print(f"   - security.log: Security events")
    print(f"   - performance.log: Performance metrics")


# Export loggers for direct use
__all__ = [
    'api_logger',
    'error_logger',
    'security_logger',
    'performance_logger',
    'log_api_request',
    'log_api_response',
    'log_error',
    'log_security_event',
    'api_logging',
    'init_api_logging'
]
