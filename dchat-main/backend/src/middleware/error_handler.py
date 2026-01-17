"""
Global error handler for Flask application
Provides consistent error responses and logging
"""
import logging
import traceback
from functools import wraps
from flask import jsonify, request
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from marshmallow import ValidationError as MarshmallowValidationError
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Base class for API errors"""
    status_code = 400
    
    def __init__(self, message, status_code=None, payload=None):
        super().__init__()
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload
    
    def to_dict(self):
        """Convert error to dictionary"""
        rv = dict(self.payload or ())
        rv['success'] = False
        rv['error'] = self.message
        return rv


class ValidationError(APIError):
    """Validation error"""
    status_code = 400


class AuthenticationError(APIError):
    """Authentication error"""
    status_code = 401


class AuthorizationError(APIError):
    """Authorization error"""
    status_code = 403


class NotFoundError(APIError):
    """Resource not found error"""
    status_code = 404


class ConflictError(APIError):
    """Resource conflict error"""
    status_code = 409


class RateLimitError(APIError):
    """Rate limit exceeded error"""
    status_code = 429


class ServerError(APIError):
    """Internal server error"""
    status_code = 500


def handle_api_error(error):
    """Handle APIError exceptions"""
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    
    # Log error
    if error.status_code >= 500:
        logger.error(f"API Error: {error.message}", extra={
            'status_code': error.status_code,
            'payload': error.payload,
            'path': request.path,
            'method': request.method,
        })
    
    return response


def handle_validation_error(error):
    """Handle Marshmallow validation errors"""
    logger.warning(f"Validation error: {error.messages}", extra={
        'path': request.path,
        'method': request.method,
        'data': request.get_json(silent=True),
    })
    
    return jsonify({
        'success': False,
        'error': 'Validation failed',
        'details': error.messages
    }), 400


def handle_sqlalchemy_error(error):
    """Handle SQLAlchemy database errors"""
    logger.error(f"Database error: {str(error)}", extra={
        'path': request.path,
        'method': request.method,
    })
    
    # Check for specific error types
    if isinstance(error, IntegrityError):
        return jsonify({
            'success': False,
            'error': 'Database integrity error',
            'message': 'The operation violates database constraints'
        }), 409
    
    return jsonify({
        'success': False,
        'error': 'Database error',
        'message': 'An error occurred while accessing the database'
    }), 500


def handle_http_exception(error):
    """Handle Werkzeug HTTP exceptions"""
    logger.warning(f"HTTP exception: {error.code} - {error.description}", extra={
        'path': request.path,
        'method': request.method,
    })
    
    return jsonify({
        'success': False,
        'error': error.name,
        'message': error.description
    }), error.code


def handle_generic_exception(error):
    """Handle unexpected exceptions"""
    logger.error(f"Unexpected error: {str(error)}", extra={
        'path': request.path,
        'method': request.method,
        'traceback': traceback.format_exc(),
    })
    
    # In production, don't expose internal error details
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500


def register_error_handlers(app):
    """Register all error handlers with Flask app"""
    app.register_error_handler(APIError, handle_api_error)
    app.register_error_handler(MarshmallowValidationError, handle_validation_error)
    app.register_error_handler(SQLAlchemyError, handle_sqlalchemy_error)
    app.register_error_handler(HTTPException, handle_http_exception)
    app.register_error_handler(Exception, handle_generic_exception)
    
    logger.info("Error handlers registered successfully")


def handle_errors(f):
    """
    Decorator to add error handling to route functions
    Usage:
        @app.route('/api/example')
        @handle_errors
        def example():
            # Your code here
            pass
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except APIError:
            # Re-raise API errors (they'll be handled by the error handler)
            raise
        except MarshmallowValidationError:
            # Re-raise validation errors
            raise
        except SQLAlchemyError:
            # Re-raise database errors
            raise
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            # Convert unexpected errors to ServerError
            logger.error(f"Unexpected error in {f.__name__}: {str(e)}", extra={
                'function': f.__name__,
                'args': args,
                'kwargs': kwargs,
                'traceback': traceback.format_exc(),
            })
            raise ServerError("An unexpected error occurred")
    
    return decorated_function


def validate_request_json(required_fields=None):
    """
    Decorator to validate JSON request data
    Usage:
        @app.route('/api/example', methods=['POST'])
        @validate_request_json(['name', 'email'])
        def example():
            data = request.json
            # data is guaranteed to have 'name' and 'email'
            pass
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if request has JSON
            if not request.is_json:
                raise ValidationError("Request must be JSON")
            
            data = request.get_json()
            
            # Check if data is a dictionary
            if not isinstance(data, dict):
                raise ValidationError("Request data must be a JSON object")
            
            # Check required fields
            if required_fields:
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    raise ValidationError(
                        f"Missing required fields: {', '.join(missing_fields)}",
                        payload={'missing_fields': missing_fields}
                    )
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator
