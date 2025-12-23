"""
Unit Tests for Custodial Wallet API

Tests wallet management operations:
- Wallet creation
- Balance management
- Deposits and withdrawals
- Internal transfers
- Transaction history

@author Manus AI
@date 2025-11-05
"""

import unittest
import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.main import app, db
from src.models.user import User
from src.models.custodial_wallet import CustodialWallet, CustodialTransaction
from src.services.custodial_wallet_service import CustodialWalletService
import jwt
from datetime import datetime, timedelta

class TestCustodialWalletAPI(unittest.TestCase):
    """Test cases for Custodial Wallet API"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test environment"""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        cls.client = app.test_client()
        
        with app.app_context():
            db.create_all()
    
    @classmethod
    def tearDownClass(cls):
        """Clean up test environment"""
        with app.app_context():
            db.drop_all()
    
    def setUp(self):
        """Set up test data before each test"""
        with app.app_context():
            # Create test user
            self.test_user = User(
                wallet_address='0x1234567890123456789012345678901234567890',
                username='testuser',
                email='test@example.com'
            )
            db.session.add(self.test_user)
            db.session.commit()
            
            # Generate JWT token
            self.token = jwt.encode(
                {
                    'user_id': self.test_user.id,
                    'wallet_address': self.test_user.wallet_address,
                    'exp': datetime.utcnow() + timedelta(hours=24)
                },
                app.config['SECRET_KEY'],
                algorithm='HS256'
            )
            
            self.headers = {
                'Authorization': f'Bearer {self.token}',
                'Content-Type': 'application/json'
            }
    
    def tearDown(self):
        """Clean up after each test"""
        with app.app_context():
            CustodialTransaction.query.delete()
            CustodialWallet.query.delete()
            User.query.delete()
            db.session.commit()
    
    # ========================================================================
    # WALLET CREATION TESTS
    # ========================================================================
    
    def test_create_custodial_wallet(self):
        """Test creating a new custodial wallet"""
        response = self.client.post(
            '/api/wallets/custodial/create',
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 201)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertIn('wallet', result)
        self.assertIn('wallet_address', result['wallet'])
        self.assertTrue(result['wallet']['is_active'])
    
    def test_create_duplicate_wallet(self):
        """Test creating duplicate wallet returns existing"""
        # Create first wallet
        self.client.post(
            '/api/wallets/custodial/create',
            headers=self.headers
        )
        
        # Try to create again
        response = self.client.post(
            '/api/wallets/custodial/create',
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 201)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
    
    def test_get_custodial_wallet(self):
        """Test getting custodial wallet"""
        # Create wallet first
        with app.app_context():
            wallet = CustodialWalletService.create_wallet(self.test_user.id)
        
        response = self.client.get(
            '/api/wallets/custodial/me',
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertIn('wallet', result)
    
    def test_get_nonexistent_wallet(self):
        """Test getting wallet that doesn't exist"""
        response = self.client.get(
            '/api/wallets/custodial/me',
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 404)
    
    # ========================================================================
    # DEPOSIT TESTS
    # ========================================================================
    
    def test_process_deposit(self):
        """Test processing a deposit"""
        # Create wallet first
        with app.app_context():
            wallet = CustodialWalletService.create_wallet(self.test_user.id)
        
        # Process deposit
        data = {
            'token': 'ETH',
            'amount': 1000000000000000000,  # 1 ETH in wei
            'from_address': '0xabcdef1234567890abcdef1234567890abcdef12',
            'tx_hash': '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        }
        
        response = self.client.post(
            '/api/wallets/custodial/deposit',
            data=json.dumps(data),
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertIn('transaction', result)
        self.assertEqual(result['transaction']['token'], 'ETH')
    
    def test_deposit_invalid_token(self):
        """Test deposit with invalid token"""
        # Create wallet first
        with app.app_context():
            wallet = CustodialWalletService.create_wallet(self.test_user.id)
        
        data = {
            'token': 'INVALID',
            'amount': 1000000,
            'from_address': '0xabcdef1234567890abcdef1234567890abcdef12',
            'tx_hash': '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        }
        
        response = self.client.post(
            '/api/wallets/custodial/deposit',
            data=json.dumps(data),
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 500)
    
    # ========================================================================
    # TRANSFER TESTS
    # ========================================================================
    
    def test_internal_transfer(self):
        """Test internal transfer between custodial wallets"""
        # Create two wallets
        with app.app_context():
            # Create first user and wallet
            wallet1 = CustodialWalletService.create_wallet(self.test_user.id)
            
            # Add balance to first wallet
            wallet1.balance_eth = 2000000000000000000  # 2 ETH
            db.session.commit()
            
            # Create second user and wallet
            user2 = User(
                wallet_address='0x9876543210987654321098765432109876543210',
                username='testuser2'
            )
            db.session.add(user2)
            db.session.commit()
            
            wallet2 = CustodialWalletService.create_wallet(user2.id)
            to_address = wallet2.wallet_address
        
        # Transfer
        data = {
            'to_address': to_address,
            'token': 'ETH',
            'amount': 1000000000000000000  # 1 ETH
        }
        
        response = self.client.post(
            '/api/wallets/custodial/transfer',
            data=json.dumps(data),
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertIn('Internal transfer', result['message'])
    
    def test_transfer_insufficient_balance(self):
        """Test transfer with insufficient balance"""
        # Create wallet with zero balance
        with app.app_context():
            wallet = CustodialWalletService.create_wallet(self.test_user.id)
        
        data = {
            'to_address': '0x9876543210987654321098765432109876543210',
            'token': 'ETH',
            'amount': 1000000000000000000  # 1 ETH
        }
        
        response = self.client.post(
            '/api/wallets/custodial/transfer',
            data=json.dumps(data),
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 400)
        result = json.loads(response.data)
        self.assertIn('Insufficient', result['error'])
    
    # ========================================================================
    # TRANSACTION HISTORY TESTS
    # ========================================================================
    
    def test_get_transaction_history(self):
        """Test getting transaction history"""
        # Create wallet and transactions
        with app.app_context():
            wallet = CustodialWalletService.create_wallet(self.test_user.id)
            
            # Create test transactions
            tx1 = CustodialTransaction(
                wallet_id=wallet.id,
                transaction_type='deposit',
                token='ETH',
                amount=1000000000000000000,
                status='confirmed'
            )
            tx2 = CustodialTransaction(
                wallet_id=wallet.id,
                transaction_type='withdrawal',
                token='ETH',
                amount=500000000000000000,
                status='confirmed'
            )
            db.session.add(tx1)
            db.session.add(tx2)
            db.session.commit()
        
        response = self.client.get(
            '/api/wallets/custodial/transactions',
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertEqual(len(result['transactions']), 2)
    
    def test_transaction_history_limit(self):
        """Test transaction history with limit"""
        # Create wallet and many transactions
        with app.app_context():
            wallet = CustodialWalletService.create_wallet(self.test_user.id)
            
            # Create 10 test transactions
            for i in range(10):
                tx = CustodialTransaction(
                    wallet_id=wallet.id,
                    transaction_type='deposit',
                    token='ETH',
                    amount=1000000000000000000,
                    status='confirmed'
                )
                db.session.add(tx)
            db.session.commit()
        
        response = self.client.get(
            '/api/wallets/custodial/transactions?limit=5',
            headers=self.headers
        )
        
        self.assertEqual(response.status_code, 200)
        result = json.loads(response.data)
        self.assertTrue(result['success'])
        self.assertEqual(len(result['transactions']), 5)
    
    # ========================================================================
    # AUTHENTICATION TESTS
    # ========================================================================
    
    def test_unauthorized_wallet_creation(self):
        """Test wallet creation without authentication"""
        response = self.client.post('/api/wallets/custodial/create')
        self.assertEqual(response.status_code, 401)
    
    def test_invalid_token_wallet_access(self):
        """Test wallet access with invalid token"""
        headers = {
            'Authorization': 'Bearer invalid_token',
            'Content-Type': 'application/json'
        }
        response = self.client.get('/api/wallets/custodial/me', headers=headers)
        self.assertEqual(response.status_code, 401)


if __name__ == '__main__':
    unittest.main()
