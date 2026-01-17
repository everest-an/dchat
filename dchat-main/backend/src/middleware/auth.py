"""
Enhanced authentication and authorization middleware
Provides JWT token validation and role-based access control
"""
import os
import jwt
import logging
from functools import wraps
from flask import request, g
from datetime import datetime, timedelta
from src.middleware.error_handler import AuthenticationError, AuthorizationError

logger = logging.getLogger(__name__)

# JWT configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'dchat-jwt-secret-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', '24'))


def generate_token(user_id, wallet_address, additional_claims=None):
    """
    Generate a JWT token for a user
    
    Args:
        user_id: User's database ID
        wallet_address: User's wallet address
        additional_claims: Optional additional claims to include in token
    
    Returns:
        JWT token string
    """
    payload = {
        'user_id': user_id,
        'wallet_address': wallet_address.lower(),
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    
    if additional_claims:
        payload.update(additional_claims)
    
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    logger.info(f"Generated token for user {user_id}", extra={
        'user_id': user_id,
        'wallet_address': wallet_address,
    })
    
    return token


def decode_token(token):
    """
    Decode and validate a JWT token
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded token payload
    
    Raises:
        AuthenticationError: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise AuthenticationError(f"Invalid token: {str(e)}")


def get_token_from_request():
    """
    Extract JWT token from request headers
    
    Returns:
        Token string or None
    """
    # Check Authorization header
    auth_header = request.headers.get('Authorization')
    if auth_header:
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            return parts[1]
    
    # Check query parameter (for WebSocket connections)
    token = request.args.get('token')
    if token:
        return token
    
    return None


def require_auth(f):
    """
    Decorator to require authentication for a route
    
    Usage:
        @app.route('/api/protected')
        @require_auth
        def protected_route():
            user_id = g.user_id
            wallet_address = g.wallet_address
            # Your code here
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_request()
        
        if not token:
            raise AuthenticationError("No authentication token provided")
        
        try:
            payload = decode_token(token)
            
            # Store user info in Flask's g object
            g.user_id = payload.get('user_id')
            g.wallet_address = payload.get('wallet_address')
            g.token_payload = payload
            
            logger.debug(f"Authenticated user {g.user_id}", extra={
                'user_id': g.user_id,
                'wallet_address': g.wallet_address,
                'path': request.path,
            })
            
        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}", extra={
                'path': request.path,
                'method': request.method,
            })
            raise AuthenticationError("Authentication failed")
        
        return f(*args, **kwargs)
    
    return decorated_function


def require_role(required_role):
    """
    Decorator to require a specific role for a route
    
    Usage:
        @app.route('/api/admin')
        @require_auth
        @require_role('admin')
        def admin_route():
            # Your code here
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'token_payload'):
                raise AuthenticationError("Authentication required")
            
            user_role = g.token_payload.get('role', 'user')
            
            if user_role != required_role:
                logger.warning(f"Authorization failed: user {g.user_id} attempted to access {required_role} route", extra={
                    'user_id': g.user_id,
                    'user_role': user_role,
                    'required_role': required_role,
                    'path': request.path,
                })
                raise AuthorizationError(f"This endpoint requires {required_role} role")
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_self_or_admin(user_id_param='user_id'):
    """
    Decorator to require that the user is accessing their own resource or is an admin
    
    Usage:
        @app.route('/api/users/<int:user_id>')
        @require_auth
        @require_self_or_admin('user_id')
        def get_user(user_id):
            # User can only access their own data unless they're admin
            pass
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'user_id'):
                raise AuthenticationError("Authentication required")
            
            # Get the user_id from route parameters
            target_user_id = kwargs.get(user_id_param)
            
            # Check if user is accessing their own resource
            if g.user_id == target_user_id:
                return f(*args, **kwargs)
            
            # Check if user is admin
            user_role = g.token_payload.get('role', 'user')
            if user_role == 'admin':
                return f(*args, **kwargs)
            
            logger.warning(f"Authorization failed: user {g.user_id} attempted to access user {target_user_id}", extra={
                'user_id': g.user_id,
                'target_user_id': target_user_id,
                'path': request.path,
            })
            raise AuthorizationError("You can only access your own resources")
        
        return decorated_function
    return decorator


def optional_auth(f):
    """
    Decorator for routes that work with or without authentication
    If authenticated, user info is available in g.user_id and g.wallet_address
    
    Usage:
        @app.route('/api/public')
        @optional_auth
        def public_route():
            if hasattr(g, 'user_id'):
                # User is authenticated
                pass
            else:
                # User is not authenticated
                pass
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_request()
        
        if token:
            try:
                payload = decode_token(token)
                g.user_id = payload.get('user_id')
                g.wallet_address = payload.get('wallet_address')
                g.token_payload = payload
            except AuthenticationError:
                # Token is invalid, but that's okay for optional auth
                pass
        
        return f(*args, **kwargs)
    
    return decorated_function
