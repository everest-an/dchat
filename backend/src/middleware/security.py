"""
Security Middleware

This module provides security middleware for Flask applications including
CORS configuration, security headers, and request validation.

Features:
- CORS configuration
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Request origin validation
- IP filtering
- User-Agent validation

Author: Manus AI
Date: 2024-11-05
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps
from typing import List, Optional
import os


class SecurityConfig:
    """
    Security configuration and middleware.
    """
    
    # Allowed origins for CORS
    ALLOWED_ORIGINS = [
        'https://dchat.pro',
        'https://www.dchat.pro',
        'https://staging.dchat.pro',
        'http://localhost:3000',
        'http://localhost:5173',  # Vite dev server
    ]
    
    # Content Security Policy
    CSP_POLICY = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https:', 'blob:'],
        'connect-src': [
            "'self'",
            'https://api.dchat.pro',
            'https://staging-api.dchat.pro',
            'wss://api.dchat.pro',
            'wss://staging-api.dchat.pro',
            'https://eth-sepolia.g.alchemy.com',
            'https://sepolia.etherscan.io',
            'https://gateway.pinata.cloud',
        ],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
    }
    
    @staticmethod
    def init_app(app: Flask):
        """
        Initialize security middleware for Flask app.
        
        Args:
            app: Flask application instance
        """
        # Configure CORS
        CORS(
            app,
            origins=SecurityConfig.ALLOWED_ORIGINS,
            methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
            expose_headers=['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
            supports_credentials=True,
            max_age=3600
        )
        
        # Add security headers to all responses
        @app.after_request
        def add_security_headers(response):
            """Add security headers to response."""
            
            # Content Security Policy
            csp_parts = []
            for directive, sources in SecurityConfig.CSP_POLICY.items():
                csp_parts.append(f"{directive} {' '.join(sources)}")
            response.headers['Content-Security-Policy'] = '; '.join(csp_parts)
            
            # Strict Transport Security (HSTS)
            # Only in production with HTTPS
            if not app.debug and request.is_secure:
                response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
            
            # X-Frame-Options (prevent clickjacking)
            response.headers['X-Frame-Options'] = 'DENY'
            
            # X-Content-Type-Options (prevent MIME sniffing)
            response.headers['X-Content-Type-Options'] = 'nosniff'
            
            # X-XSS-Protection (legacy, but still useful)
            response.headers['X-XSS-Protection'] = '1; mode=block'
            
            # Referrer Policy
            response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
            
            # Permissions Policy (formerly Feature-Policy)
            response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
            
            # Remove server header
            response.headers.pop('Server', None)
            
            # Add custom server header (optional)
            # response.headers['X-Powered-By'] = 'dchat.pro'
            
            return response
        
        # Add request validation
        @app.before_request
        def validate_request():
            """Validate incoming requests."""
            
            # Skip validation for OPTIONS requests (CORS preflight)
            if request.method == 'OPTIONS':
                return None
            
            # Validate origin for non-GET requests
            if request.method != 'GET':
                origin = request.headers.get('Origin')
                if origin and origin not in SecurityConfig.ALLOWED_ORIGINS:
                    # Allow localhost in development
                    if not app.debug or not origin.startswith('http://localhost'):
                        return jsonify({
                            'success': False,
                            'error': 'Invalid origin'
                        }), 403
            
            # Validate Content-Type for POST/PUT requests
            if request.method in ['POST', 'PUT']:
                content_type = request.headers.get('Content-Type', '')
                if not content_type.startswith('application/json'):
                    # Allow multipart/form-data for file uploads
                    if not content_type.startswith('multipart/form-data'):
                        return jsonify({
                            'success': False,
                            'error': 'Content-Type must be application/json'
                        }), 400
            
            return None


def require_https(f):
    """
    Decorator to require HTTPS for endpoint.
    
    Example:
        @app.route('/api/sensitive')
        @require_https
        def sensitive_endpoint():
            return {'data': 'secret'}
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_secure and not request.headers.get('X-Forwarded-Proto') == 'https':
            # Allow HTTP in development
            if os.getenv('FLASK_ENV') != 'development':
                return jsonify({
                    'success': False,
                    'error': 'HTTPS required'
                }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function


def require_origin(allowed_origins: List[str]):
    """
    Decorator to require specific origin.
    
    Args:
        allowed_origins: List of allowed origins
        
    Example:
        @app.route('/api/admin')
        @require_origin(['https://admin.dchat.pro'])
        def admin_endpoint():
            return {'data': 'admin'}
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            origin = request.headers.get('Origin')
            
            if not origin or origin not in allowed_origins:
                return jsonify({
                    'success': False,
                    'error': 'Invalid origin'
                }), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def ip_whitelist(allowed_ips: List[str]):
    """
    Decorator to whitelist IP addresses.
    
    Args:
        allowed_ips: List of allowed IP addresses
        
    Example:
        @app.route('/api/internal')
        @ip_whitelist(['10.0.0.1', '192.168.1.1'])
        def internal_endpoint():
            return {'data': 'internal'}
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client IP
            ip = request.headers.get('X-Forwarded-For', request.remote_addr)
            if ip:
                # Take first IP if multiple (proxy chain)
                ip = ip.split(',')[0].strip()
            
            if ip not in allowed_ips:
                return jsonify({
                    'success': False,
                    'error': 'Access denied'
                }), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def validate_user_agent(f):
    """
    Decorator to validate User-Agent header.
    Blocks requests with suspicious or missing User-Agent.
    
    Example:
        @app.route('/api/data')
        @validate_user_agent
        def get_data():
            return {'data': []}
    """
    # Suspicious User-Agent patterns
    SUSPICIOUS_PATTERNS = [
        'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
        'python-requests', 'go-http-client', 'java/', 'scrapy'
    ]
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_agent = request.headers.get('User-Agent', '').lower()
        
        # Block empty User-Agent
        if not user_agent:
            return jsonify({
                'success': False,
                'error': 'User-Agent required'
            }), 400
        
        # Block suspicious User-Agents
        for pattern in SUSPICIOUS_PATTERNS:
            if pattern in user_agent:
                return jsonify({
                    'success': False,
                    'error': 'Invalid User-Agent'
                }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function
