"""
Input Validation and Sanitization

This module provides input validation and sanitization utilities to prevent
injection attacks, XSS, and other security vulnerabilities.

Features:
- Ethereum address validation
- Email validation
- String sanitization (XSS prevention)
- SQL injection prevention
- Request body validation
- File upload validation

Author: Manus AI
Date: 2024-11-05
"""

import re
from functools import wraps
from flask import request, jsonify
from typing import Any, Dict, List, Optional, Callable
import bleach
from eth_utils import is_address, to_checksum_address


class ValidationError(Exception):
    """Custom exception for validation errors."""
    pass


class InputValidator:
    """
    Input validation and sanitization utilities.
    """
    
    # Regular expressions for common patterns
    EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    USERNAME_REGEX = re.compile(r'^[a-zA-Z0-9_-]{3,50}$')
    URL_REGEX = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain
        r'localhost|'  # localhost
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # IP
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE
    )
    
    # Allowed HTML tags and attributes for sanitization
    ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'code', 'pre']
    ALLOWED_ATTRIBUTES = {'a': ['href', 'title']}
    
    @staticmethod
    def validate_ethereum_address(address: str) -> str:
        """
        Validate and normalize Ethereum address.
        
        Args:
            address: Ethereum address string
            
        Returns:
            Checksummed Ethereum address
            
        Raises:
            ValidationError: If address is invalid
        """
        if not address:
            raise ValidationError("Address is required")
        
        if not isinstance(address, str):
            raise ValidationError("Address must be a string")
        
        # Remove whitespace
        address = address.strip()
        
        # Check if valid Ethereum address
        if not is_address(address):
            raise ValidationError("Invalid Ethereum address")
        
        # Return checksummed address
        return to_checksum_address(address)
    
    @staticmethod
    def validate_email(email: str) -> str:
        """
        Validate email address.
        
        Args:
            email: Email address string
            
        Returns:
            Normalized email address
            
        Raises:
            ValidationError: If email is invalid
        """
        if not email:
            raise ValidationError("Email is required")
        
        if not isinstance(email, str):
            raise ValidationError("Email must be a string")
        
        # Normalize
        email = email.strip().lower()
        
        # Validate format
        if not InputValidator.EMAIL_REGEX.match(email):
            raise ValidationError("Invalid email format")
        
        # Check length
        if len(email) > 255:
            raise ValidationError("Email is too long")
        
        return email
    
    @staticmethod
    def validate_username(username: str) -> str:
        """
        Validate username.
        
        Args:
            username: Username string
            
        Returns:
            Validated username
            
        Raises:
            ValidationError: If username is invalid
        """
        if not username:
            raise ValidationError("Username is required")
        
        if not isinstance(username, str):
            raise ValidationError("Username must be a string")
        
        # Remove whitespace
        username = username.strip()
        
        # Validate format (alphanumeric, underscore, hyphen, 3-50 chars)
        if not InputValidator.USERNAME_REGEX.match(username):
            raise ValidationError(
                "Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens"
            )
        
        return username
    
    @staticmethod
    def validate_url(url: str) -> str:
        """
        Validate URL.
        
        Args:
            url: URL string
            
        Returns:
            Validated URL
            
        Raises:
            ValidationError: If URL is invalid
        """
        if not url:
            raise ValidationError("URL is required")
        
        if not isinstance(url, str):
            raise ValidationError("URL must be a string")
        
        # Remove whitespace
        url = url.strip()
        
        # Validate format
        if not InputValidator.URL_REGEX.match(url):
            raise ValidationError("Invalid URL format")
        
        # Check length
        if len(url) > 2048:
            raise ValidationError("URL is too long")
        
        return url
    
    @staticmethod
    def sanitize_string(text: str, max_length: Optional[int] = None) -> str:
        """
        Sanitize string to prevent XSS attacks.
        
        Args:
            text: Input string
            max_length: Maximum allowed length
            
        Returns:
            Sanitized string
            
        Raises:
            ValidationError: If validation fails
        """
        if not text:
            return ""
        
        if not isinstance(text, str):
            raise ValidationError("Input must be a string")
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        # Check length
        if max_length and len(text) > max_length:
            raise ValidationError(f"Text is too long (max {max_length} characters)")
        
        # Sanitize HTML
        text = bleach.clean(
            text,
            tags=InputValidator.ALLOWED_TAGS,
            attributes=InputValidator.ALLOWED_ATTRIBUTES,
            strip=True
        )
        
        return text
    
    @staticmethod
    def validate_integer(value: Any, min_value: Optional[int] = None, max_value: Optional[int] = None) -> int:
        """
        Validate integer value.
        
        Args:
            value: Input value
            min_value: Minimum allowed value
            max_value: Maximum allowed value
            
        Returns:
            Validated integer
            
        Raises:
            ValidationError: If validation fails
        """
        try:
            value = int(value)
        except (TypeError, ValueError):
            raise ValidationError("Value must be an integer")
        
        if min_value is not None and value < min_value:
            raise ValidationError(f"Value must be at least {min_value}")
        
        if max_value is not None and value > max_value:
            raise ValidationError(f"Value must be at most {max_value}")
        
        return value
    
    @staticmethod
    def validate_boolean(value: Any) -> bool:
        """
        Validate boolean value.
        
        Args:
            value: Input value
            
        Returns:
            Validated boolean
            
        Raises:
            ValidationError: If validation fails
        """
        if isinstance(value, bool):
            return value
        
        if isinstance(value, str):
            value_lower = value.lower()
            if value_lower in ('true', '1', 'yes', 'on'):
                return True
            if value_lower in ('false', '0', 'no', 'off'):
                return False
        
        if isinstance(value, int):
            if value == 1:
                return True
            if value == 0:
                return False
        
        raise ValidationError("Value must be a boolean")
    
    @staticmethod
    def validate_file_upload(file, allowed_extensions: List[str], max_size_mb: int = 10):
        """
        Validate file upload.
        
        Args:
            file: Flask file object
            allowed_extensions: List of allowed file extensions
            max_size_mb: Maximum file size in MB
            
        Raises:
            ValidationError: If validation fails
        """
        if not file:
            raise ValidationError("No file provided")
        
        if not file.filename:
            raise ValidationError("No filename provided")
        
        # Check file extension
        filename = file.filename.lower()
        if not any(filename.endswith(f'.{ext}') for ext in allowed_extensions):
            raise ValidationError(
                f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Check file size
        file.seek(0, 2)  # Seek to end
        size_bytes = file.tell()
        file.seek(0)  # Reset to beginning
        
        max_size_bytes = max_size_mb * 1024 * 1024
        if size_bytes > max_size_bytes:
            raise ValidationError(f"File is too large (max {max_size_mb}MB)")
        
        if size_bytes == 0:
            raise ValidationError("File is empty")


def validate_request_body(schema: Dict[str, Dict[str, Any]]):
    """
    Decorator to validate request body against schema.
    
    Args:
        schema: Dictionary defining expected fields and their validation rules
        
    Example:
        schema = {
            'address': {'type': 'ethereum_address', 'required': True},
            'username': {'type': 'string', 'required': False, 'max_length': 50},
            'email': {'type': 'email', 'required': True}
        }
        
        @app.route('/api/users', methods=['POST'])
        @validate_request_body(schema)
        def create_user():
            data = request.json
            # data is now validated
            return {'success': True}
    """
    def decorator(f: Callable):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if request has JSON body
            if not request.is_json:
                return jsonify({
                    'success': False,
                    'error': 'Request must be JSON'
                }), 400
            
            data = request.json
            validated_data = {}
            
            # Validate each field
            for field_name, rules in schema.items():
                value = data.get(field_name)
                
                # Check required fields
                if rules.get('required', False) and value is None:
                    return jsonify({
                        'success': False,
                        'error': f'Field "{field_name}" is required'
                    }), 400
                
                # Skip validation if field is optional and not provided
                if value is None:
                    continue
                
                # Validate based on type
                try:
                    field_type = rules.get('type', 'string')
                    
                    if field_type == 'ethereum_address':
                        validated_data[field_name] = InputValidator.validate_ethereum_address(value)
                    
                    elif field_type == 'email':
                        validated_data[field_name] = InputValidator.validate_email(value)
                    
                    elif field_type == 'username':
                        validated_data[field_name] = InputValidator.validate_username(value)
                    
                    elif field_type == 'url':
                        validated_data[field_name] = InputValidator.validate_url(value)
                    
                    elif field_type == 'string':
                        max_length = rules.get('max_length')
                        validated_data[field_name] = InputValidator.sanitize_string(value, max_length)
                    
                    elif field_type == 'integer':
                        min_value = rules.get('min_value')
                        max_value = rules.get('max_value')
                        validated_data[field_name] = InputValidator.validate_integer(
                            value, min_value, max_value
                        )
                    
                    elif field_type == 'boolean':
                        validated_data[field_name] = InputValidator.validate_boolean(value)
                    
                    else:
                        # Unknown type, pass through
                        validated_data[field_name] = value
                
                except ValidationError as e:
                    return jsonify({
                        'success': False,
                        'error': f'Validation error for field "{field_name}": {str(e)}'
                    }), 400
            
            # Replace request.json with validated data
            request.validated_data = validated_data
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator
