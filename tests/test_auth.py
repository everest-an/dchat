"""
Unit Tests for Authentication Module
Tests Web3 signature verification and JWT token generation
"""

import pytest
import json
from unittest.mock import Mock, patch
from src.routes.auth import auth_bp
from src.models.user import User, db
from web3 import Web3


@pytest.fixture
def client():
    """Create test client"""
    from src.main import app
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
        with app.app_context():
            db.drop_all()


@pytest.fixture
def mock_redis():
    """Mock Redis service"""
    with patch('src.routes.auth.redis_service') as mock:
        yield mock


class TestAuthenticationFlow:
    """Test complete authentication flow"""
    
    def test_get_nonce_success(self, client, mock_redis):
        """Test nonce generation"""
        # Arrange
        test_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        mock_redis.set.return_value = True
        
        # Act
        response = client.get(f'/api/auth/nonce?address={test_address}')
        data = json.loads(response.data)
        
        # Assert
        assert response.status_code == 200
        assert data['success'] is True
        assert 'nonce' in data
        assert 'timestamp' in data
        assert 'message' in data
        assert len(data['nonce']) == 32  # 16 bytes in hex
        
        # Verify Redis was called
        mock_redis.set.assert_called_once()
    
    def test_get_nonce_invalid_address(self, client):
        """Test nonce generation with invalid address"""
        # Arrange
        invalid_address = 'not-an-address'
        
        # Act
        response = client.get(f'/api/auth/nonce?address={invalid_address}')
        data = json.loads(response.data)
        
        # Assert
        assert response.status_code == 400
        assert data['success'] is False
        assert 'invalid' in data['error'].lower()
    
    def test_get_nonce_missing_address(self, client):
        """Test nonce generation without address"""
        # Act
        response = client.get('/api/auth/nonce')
        data = json.loads(response.data)
        
        # Assert
        assert response.status_code == 400
        assert data['success'] is False
    
    def test_verify_signature_success(self, client, mock_redis):
        """Test signature verification"""
        # Arrange
        test_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        test_nonce = 'test_nonce_123'
        test_timestamp = 1234567890
        
        # Mock Redis to return nonce data
        mock_redis.get.return_value = {
            'nonce': test_nonce,
            'timestamp': test_timestamp
        }
        mock_redis.delete.return_value = 1
        
        # Mock Web3 signature verification
        with patch('src.routes.auth.Web3') as mock_web3:
            mock_w3 = Mock()
            mock_web3.return_value = mock_w3
            mock_w3.eth.account.recover_message.return_value = test_address
            
            # Act
            response = client.post('/api/auth/connect-wallet', json={
                'wallet_address': test_address,
                'signature': '0xabcdef...'
            })
            data = json.loads(response.data)
            
            # Assert
            assert response.status_code == 200
            assert data['success'] is True
            assert 'token' in data
            assert 'user' in data
            assert data['user']['wallet_address'] == test_address
    
    def test_verify_signature_nonce_not_found(self, client, mock_redis):
        """Test signature verification with missing nonce"""
        # Arrange
        test_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        mock_redis.get.return_value = None
        
        # Act
        response = client.post('/api/auth/connect-wallet', json={
            'wallet_address': test_address,
            'signature': '0xabcdef...'
        })
        data = json.loads(response.data)
        
        # Assert
        assert response.status_code == 401
        assert data['success'] is False
        assert 'nonce' in data['error'].lower()
    
    def test_verify_signature_invalid_signature(self, client, mock_redis):
        """Test signature verification with wrong signature"""
        # Arrange
        test_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        wrong_address = '0x123456789abcdef123456789abcdef123456789a'
        
        mock_redis.get.return_value = {
            'nonce': 'test_nonce',
            'timestamp': 1234567890
        }
        
        # Mock Web3 to return different address
        with patch('src.routes.auth.Web3') as mock_web3:
            mock_w3 = Mock()
            mock_web3.return_value = mock_w3
            mock_w3.eth.account.recover_message.return_value = wrong_address
            
            # Act
            response = client.post('/api/auth/connect-wallet', json={
                'wallet_address': test_address,
                'signature': '0xwrongsignature'
            })
            data = json.loads(response.data)
            
            # Assert
            assert response.status_code == 401
            assert data['success'] is False
            assert 'verification failed' in data['error'].lower()


class TestTokenVerification:
    """Test JWT token verification"""
    
    def test_verify_token_success(self, client):
        """Test valid token verification"""
        # Arrange
        # First create a user and get token
        with patch('src.routes.auth.redis_service') as mock_redis, \
             patch('src.routes.auth.Web3') as mock_web3:
            
            test_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
            
            mock_redis.get.return_value = {'nonce': 'test', 'timestamp': 1234567890}
            mock_redis.delete.return_value = 1
            
            mock_w3 = Mock()
            mock_web3.return_value = mock_w3
            mock_w3.eth.account.recover_message.return_value = test_address
            
            # Get token
            response = client.post('/api/auth/connect-wallet', json={
                'wallet_address': test_address,
                'signature': '0xabcdef...'
            })
            data = json.loads(response.data)
            token = data['token']
            
            # Act - Verify token
            response = client.post('/api/auth/verify-token', headers={
                'Authorization': f'Bearer {token}'
            })
            data = json.loads(response.data)
            
            # Assert
            assert response.status_code == 200
            assert data['success'] is True
            assert 'user' in data
    
    def test_verify_token_missing(self, client):
        """Test token verification without token"""
        # Act
        response = client.post('/api/auth/verify-token')
        data = json.loads(response.data)
        
        # Assert
        assert response.status_code == 401
        assert data['success'] is False
    
    def test_verify_token_invalid(self, client):
        """Test token verification with invalid token"""
        # Act
        response = client.post('/api/auth/verify-token', headers={
            'Authorization': 'Bearer invalid_token_here'
        })
        data = json.loads(response.data)
        
        # Assert
        assert response.status_code == 401
        assert data['success'] is False


class TestPublicKeyManagement:
    """Test public key registration and retrieval"""
    
    def test_register_public_key_success(self, client):
        """Test public key registration"""
        # Arrange
        # Create user and get token first
        with patch('src.routes.auth.redis_service') as mock_redis, \
             patch('src.routes.auth.Web3') as mock_web3:
            
            test_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
            test_public_key = 'test_public_key_base64_encoded'
            
            mock_redis.get.return_value = {'nonce': 'test', 'timestamp': 1234567890}
            mock_redis.delete.return_value = 1
            
            mock_w3 = Mock()
            mock_web3.return_value = mock_w3
            mock_w3.eth.account.recover_message.return_value = test_address
            
            # Get token
            response = client.post('/api/auth/connect-wallet', json={
                'wallet_address': test_address,
                'signature': '0xabcdef...'
            })
            token = json.loads(response.data)['token']
            
            # Act - Register public key
            response = client.post('/api/auth/register-public-key',
                headers={'Authorization': f'Bearer {token}'},
                json={'public_key': test_public_key}
            )
            data = json.loads(response.data)
            
            # Assert
            assert response.status_code == 200
            assert data['success'] is True
    
    def test_get_public_key_success(self, client):
        """Test public key retrieval"""
        # Arrange
        # Create user with public key
        with patch('src.routes.auth.redis_service') as mock_redis, \
             patch('src.routes.auth.Web3') as mock_web3:
            
            test_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
            test_public_key = 'test_public_key_base64'
            
            mock_redis.get.return_value = {'nonce': 'test', 'timestamp': 1234567890}
            mock_redis.delete.return_value = 1
            
            mock_w3 = Mock()
            mock_web3.return_value = mock_w3
            mock_w3.eth.account.recover_message.return_value = test_address
            
            # Create user and register key
            response = client.post('/api/auth/connect-wallet', json={
                'wallet_address': test_address,
                'signature': '0xabcdef...'
            })
            token = json.loads(response.data)['token']
            
            client.post('/api/auth/register-public-key',
                headers={'Authorization': f'Bearer {token}'},
                json={'public_key': test_public_key}
            )
            
            # Act - Get public key
            response = client.get(f'/api/auth/public-key/{test_address}')
            data = json.loads(response.data)
            
            # Assert
            assert response.status_code == 200
            assert data['success'] is True
            assert data['public_key'] == test_public_key


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
