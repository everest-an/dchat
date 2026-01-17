"""
Web3 Integration Tests

Tests for Web3 authentication, smart contract interactions, and blockchain operations.

Author: Manus AI
Date: 2024-11-05
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3
import time


class TestWeb3Authentication:
    """Tests for Web3 signature-based authentication."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.w3 = Web3()
        self.account = Account.create()
        self.address = self.account.address
        self.private_key = self.account.key
    
    def test_nonce_generation(self, client):
        """Test nonce generation for authentication."""
        response = client.post('/api/auth/nonce', json={
            'address': self.address
        })
        
        assert response.status_code == 200
        data = response.json
        assert 'nonce' in data
        assert 'timestamp' in data
        assert len(data['nonce']) > 0
    
    def test_nonce_uniqueness(self, client):
        """Test that nonces are unique."""
        response1 = client.post('/api/auth/nonce', json={
            'address': self.address
        })
        response2 = client.post('/api/auth/nonce', json={
            'address': self.address
        })
        
        nonce1 = response1.json['nonce']
        nonce2 = response2.json['nonce']
        
        assert nonce1 != nonce2
    
    def test_signature_verification_success(self, client):
        """Test successful signature verification."""
        # Get nonce
        nonce_response = client.post('/api/auth/nonce', json={
            'address': self.address
        })
        nonce = nonce_response.json['nonce']
        timestamp = nonce_response.json['timestamp']
        
        # Create and sign message
        message = f"Sign this message to authenticate with dchat.pro\n\nNonce: {nonce}\nTimestamp: {timestamp}"
        message_hash = encode_defunct(text=message)
        signed_message = self.w3.eth.account.sign_message(
            message_hash,
            private_key=self.private_key
        )
        
        # Verify signature
        response = client.post('/api/auth/verify-signature', json={
            'address': self.address,
            'signature': signed_message.signature.hex(),
            'nonce': nonce
        })
        
        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert 'token' in data
        assert 'user' in data
    
    def test_signature_verification_wrong_address(self, client):
        """Test signature verification with wrong address."""
        # Get nonce
        nonce_response = client.post('/api/auth/nonce', json={
            'address': self.address
        })
        nonce = nonce_response.json['nonce']
        timestamp = nonce_response.json['timestamp']
        
        # Sign with correct account
        message = f"Sign this message to authenticate with dchat.pro\n\nNonce: {nonce}\nTimestamp: {timestamp}"
        message_hash = encode_defunct(text=message)
        signed_message = self.w3.eth.account.sign_message(
            message_hash,
            private_key=self.private_key
        )
        
        # Try to verify with different address
        wrong_address = Account.create().address
        response = client.post('/api/auth/verify-signature', json={
            'address': wrong_address,
            'signature': signed_message.signature.hex(),
            'nonce': nonce
        })
        
        assert response.status_code == 401
        assert response.json['success'] is False
    
    def test_signature_verification_expired_nonce(self, client):
        """Test signature verification with expired nonce."""
        # Get nonce
        nonce_response = client.post('/api/auth/nonce', json={
            'address': self.address
        })
        nonce = nonce_response.json['nonce']
        timestamp = nonce_response.json['timestamp']
        
        # Wait for nonce to expire (5 minutes + buffer)
        # In testing, we can mock the time
        with patch('time.time', return_value=time.time() + 301):
            # Sign message
            message = f"Sign this message to authenticate with dchat.pro\n\nNonce: {nonce}\nTimestamp: {timestamp}"
            message_hash = encode_defunct(text=message)
            signed_message = self.w3.eth.account.sign_message(
                message_hash,
                private_key=self.private_key
            )
            
            # Try to verify with expired nonce
            response = client.post('/api/auth/verify-signature', json={
                'address': self.address,
                'signature': signed_message.signature.hex(),
                'nonce': nonce
            })
            
            assert response.status_code == 401
            assert 'expired' in response.json['error'].lower()
    
    def test_signature_verification_reused_nonce(self, client):
        """Test that nonces cannot be reused (replay attack prevention)."""
        # Get nonce and authenticate once
        nonce_response = client.post('/api/auth/nonce', json={
            'address': self.address
        })
        nonce = nonce_response.json['nonce']
        timestamp = nonce_response.json['timestamp']
        
        message = f"Sign this message to authenticate with dchat.pro\n\nNonce: {nonce}\nTimestamp: {timestamp}"
        message_hash = encode_defunct(text=message)
        signed_message = self.w3.eth.account.sign_message(
            message_hash,
            private_key=self.private_key
        )
        
        # First verification should succeed
        response1 = client.post('/api/auth/verify-signature', json={
            'address': self.address,
            'signature': signed_message.signature.hex(),
            'nonce': nonce
        })
        assert response1.status_code == 200
        
        # Second verification with same nonce should fail
        response2 = client.post('/api/auth/verify-signature', json={
            'address': self.address,
            'signature': signed_message.signature.hex(),
            'nonce': nonce
        })
        assert response2.status_code == 401


class TestSmartContractInteractions:
    """Tests for smart contract interactions."""
    
    @pytest.fixture
    def mock_web3(self):
        """Mock Web3 instance."""
        with patch('web3.Web3') as mock:
            yield mock
    
    def test_group_creation(self, client, auth_headers, mock_web3):
        """Test group creation via smart contract."""
        response = client.post(
            '/api/web3/groups/create',
            json={
                'name': 'Test Group',
                'description': 'Test Description',
                'is_public': True
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]
        data = response.json
        assert 'group_id' in data
        assert 'transaction_hash' in data
    
    def test_group_payment(self, client, auth_headers, mock_web3):
        """Test group payment creation."""
        response = client.post(
            '/api/web3/payments/group-collection',
            json={
                'group_id': 1,
                'amount': '1000000000000000000',  # 1 ETH in wei
                'description': 'Test payment'
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]
        data = response.json
        assert 'payment_id' in data
        assert 'transaction_hash' in data
    
    def test_red_packet_creation(self, client, auth_headers, mock_web3):
        """Test red packet creation."""
        response = client.post(
            '/api/web3/payments/redpacket/random',
            json={
                'group_id': 1,
                'total_amount': '1000000000000000000',  # 1 ETH
                'num_packets': 10,
                'message': 'Happy New Year!'
            },
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]
        data = response.json
        assert 'packet_id' in data
        assert 'transaction_hash' in data


class TestInputValidation:
    """Tests for input validation."""
    
    def test_ethereum_address_validation(self):
        """Test Ethereum address validation."""
        from src.middleware.input_validation import InputValidator
        
        # Valid address
        valid_address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        result = InputValidator.validate_ethereum_address(valid_address)
        assert result.startswith('0x')
        assert len(result) == 42
        
        # Invalid addresses
        with pytest.raises(Exception):
            InputValidator.validate_ethereum_address("invalid")
        
        with pytest.raises(Exception):
            InputValidator.validate_ethereum_address("0x123")  # Too short
    
    def test_string_sanitization(self):
        """Test XSS prevention in string sanitization."""
        from src.middleware.input_validation import InputValidator
        
        # XSS attempt
        malicious_input = '<script>alert("XSS")</script>Hello'
        sanitized = InputValidator.sanitize_string(malicious_input)
        assert '<script>' not in sanitized
        assert 'Hello' in sanitized
        
        # SQL injection attempt
        sql_injection = "'; DROP TABLE users; --"
        sanitized = InputValidator.sanitize_string(sql_injection)
        # Should be escaped or removed
        assert sanitized != sql_injection


class TestRateLimiting:
    """Tests for rate limiting."""
    
    def test_rate_limit_enforcement(self, client):
        """Test that rate limits are enforced."""
        # Make requests up to the limit
        for i in range(10):
            response = client.post('/api/auth/nonce', json={
                'address': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
            })
            if i < 10:
                assert response.status_code == 200
        
        # Next request should be rate limited
        response = client.post('/api/auth/nonce', json={
            'address': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        })
        assert response.status_code == 429
        assert 'rate limit' in response.json['error'].lower()
    
    def test_rate_limit_headers(self, client):
        """Test that rate limit headers are present."""
        response = client.post('/api/auth/nonce', json={
            'address': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        })
        
        assert 'X-RateLimit-Limit' in response.headers
        assert 'X-RateLimit-Remaining' in response.headers
        assert 'X-RateLimit-Reset' in response.headers


# Fixtures

@pytest.fixture
def client():
    """Create test client."""
    from src.main import app
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def auth_headers():
    """Create authentication headers with JWT token."""
    # In real tests, generate a valid JWT token
    return {
        'Authorization': 'Bearer test_token'
    }
