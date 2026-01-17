"""
ERC-20 Withdrawal Tests

Comprehensive tests for ERC-20 token withdrawal functionality.

Test Coverage:
- USDT withdrawal
- USDC withdrawal
- Gas estimation
- Nonce management
- Error handling
- Concurrent transactions

@author Manus AI
@date 2025-11-05
"""

import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from web3 import Web3
from src.services.custodial_wallet_service import CustodialWalletService
from src.models.custodial_wallet import CustodialWallet, db
from src.config.token_contracts import get_token_contract_address


class TestERC20Withdrawal:
    """Test ERC-20 withdrawal functionality"""
    
    @pytest.fixture
    def mock_wallet(self):
        """Create mock custodial wallet"""
        wallet = Mock(spec=CustodialWallet)
        wallet.id = 1
        wallet.user_id = 1
        wallet.wallet_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        wallet.balance_eth = Web3.toWei(1, 'ether')
        wallet.balance_usdt = 1000000  # 1 USDT (6 decimals)
        wallet.balance_usdc = 2000000  # 2 USDC (6 decimals)
        wallet.daily_withdrawn = 0
        wallet.daily_limit_usd = 10000
        wallet.can_withdraw = Mock(return_value=(True, "OK"))
        return wallet
    
    @pytest.fixture
    def mock_w3(self):
        """Create mock Web3 instance"""
        w3 = Mock(spec=Web3)
        w3.eth = Mock()
        w3.eth.get_transaction_count = Mock(return_value=5)
        w3.eth.gas_price = Web3.toWei(50, 'gwei')
        w3.eth.chain_id = 11155111  # Sepolia
        w3.eth.send_raw_transaction = Mock(return_value=b'\x12\x34\x56')
        w3.eth.get_block = Mock(return_value={'baseFeePerGas': Web3.toWei(30, 'gwei')})
        w3.toWei = Web3.toWei
        w3.fromWei = Web3.fromWei
        w3.toChecksumAddress = Web3.toChecksumAddress
        return w3
    
    def test_usdt_withdrawal_success(self, mock_wallet, mock_w3):
        """Test successful USDT withdrawal"""
        # Arrange
        to_address = '0x123456789abcdef123456789abcdef123456789a'
        amount = 500000  # 0.5 USDT
        
        with patch('src.services.custodial_wallet_service.w3', mock_w3):
            with patch('src.services.custodial_wallet_service.CustodialWalletService.decrypt_private_key') as mock_decrypt:
                mock_decrypt.return_value = '0x' + '1' * 64
                
                with patch('src.services.custodial_wallet_service.db.session'):
                    # Act
                    success, message, tx_hash = CustodialWalletService.withdraw(
                        wallet=mock_wallet,
                        token='USDT',
                        amount=amount,
                        to_address=to_address,
                        amount_usd=0.5
                    )
        
        # Assert
        assert success is True
        assert 'successful' in message.lower()
        assert tx_hash is not None
    
    def test_usdc_withdrawal_success(self, mock_wallet, mock_w3):
        """Test successful USDC withdrawal"""
        # Arrange
        to_address = '0x123456789abcdef123456789abcdef123456789a'
        amount = 1000000  # 1 USDC
        
        with patch('src.services.custodial_wallet_service.w3', mock_w3):
            with patch('src.services.custodial_wallet_service.CustodialWalletService.decrypt_private_key') as mock_decrypt:
                mock_decrypt.return_value = '0x' + '1' * 64
                
                with patch('src.services.custodial_wallet_service.db.session'):
                    # Act
                    success, message, tx_hash = CustodialWalletService.withdraw(
                        wallet=mock_wallet,
                        token='USDC',
                        amount=amount,
                        to_address=to_address,
                        amount_usd=1.0
                    )
        
        # Assert
        assert success is True
        assert 'successful' in message.lower()
        assert tx_hash is not None
    
    def test_insufficient_balance(self, mock_wallet):
        """Test withdrawal with insufficient balance"""
        # Arrange
        mock_wallet.balance_usdt = 100000  # 0.1 USDT
        to_address = '0x123456789abcdef123456789abcdef123456789a'
        amount = 1000000  # 1 USDT (more than balance)
        
        # Act
        success, message, tx_hash = CustodialWalletService.withdraw(
            wallet=mock_wallet,
            token='USDT',
            amount=amount,
            to_address=to_address,
            amount_usd=1.0
        )
        
        # Assert
        assert success is False
        assert 'insufficient' in message.lower()
        assert tx_hash is None
    
    def test_withdrawal_limit_exceeded(self, mock_wallet):
        """Test withdrawal exceeding daily limit"""
        # Arrange
        mock_wallet.can_withdraw = Mock(return_value=(False, "Daily limit exceeded"))
        to_address = '0x123456789abcdef123456789abcdef123456789a'
        amount = 1000000
        
        # Act
        success, message, tx_hash = CustodialWalletService.withdraw(
            wallet=mock_wallet,
            token='USDT',
            amount=amount,
            to_address=to_address,
            amount_usd=10001.0  # Exceeds daily limit
        )
        
        # Assert
        assert success is False
        assert 'limit' in message.lower()
        assert tx_hash is None
    
    def test_invalid_token(self, mock_wallet):
        """Test withdrawal with unsupported token"""
        # Arrange
        to_address = '0x123456789abcdef123456789abcdef123456789a'
        amount = 1000000
        
        # Act
        success, message, tx_hash = CustodialWalletService.withdraw(
            wallet=mock_wallet,
            token='INVALID',
            amount=amount,
            to_address=to_address,
            amount_usd=1.0
        )
        
        # Assert
        assert success is False
        assert 'unsupported' in message.lower()
        assert tx_hash is None
    
    def test_gas_estimation(self, mock_w3):
        """Test gas estimation for ERC-20 transfer"""
        from src.services.gas_estimator import GasEstimator
        
        # Arrange
        estimator = GasEstimator(mock_w3)
        
        # Mock contract
        mock_contract = Mock()
        mock_contract.functions.transfer = Mock(return_value=Mock(
            estimateGas=Mock(return_value=65000)
        ))
        
        # Act
        gas_limit = estimator.estimate_erc20_transfer_gas(
            contract=mock_contract,
            from_address='0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            to_address='0x123456789abcdef123456789abcdef123456789a',
            amount=1000000
        )
        
        # Assert
        assert gas_limit == 78000  # 65000 * 1.2
    
    def test_eip1559_gas_price(self, mock_w3):
        """Test EIP-1559 gas price calculation"""
        from src.services.gas_estimator import GasEstimator
        
        # Arrange
        estimator = GasEstimator(mock_w3)
        
        # Act
        gas_params = estimator.get_gas_price('standard')
        
        # Assert
        assert 'maxFeePerGas' in gas_params
        assert 'maxPriorityFeePerGas' in gas_params
        assert gas_params['type'] == 2
    
    def test_nonce_allocation(self, mock_w3):
        """Test nonce allocation"""
        from src.services.nonce_manager import NonceManager
        from src.models.nonce_tracker import NonceTracker
        
        # Arrange
        manager = NonceManager(mock_w3)
        wallet_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        
        with patch('src.services.nonce_manager.NonceTracker.query') as mock_query:
            mock_tracker = Mock(spec=NonceTracker)
            mock_tracker.current_nonce = 5
            mock_tracker.pending_nonces = []
            mock_tracker.lock_token = None
            mock_tracker.lock_expires_at = None
            mock_query.filter_by.return_value.with_for_update.return_value.first.return_value = mock_tracker
            
            with patch('src.services.nonce_manager.db.session'):
                # Act
                nonce = manager.allocate_nonce(wallet_address)
        
        # Assert
        assert nonce == 5
        assert mock_tracker.current_nonce == 6
    
    def test_nonce_release_success(self):
        """Test nonce release after successful transaction"""
        from src.services.nonce_manager import NonceManager
        from src.models.nonce_tracker import NonceTracker
        
        # Arrange
        mock_w3 = Mock()
        manager = NonceManager(mock_w3)
        wallet_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        nonce = 5
        
        with patch('src.services.nonce_manager.NonceTracker.query') as mock_query:
            mock_tracker = Mock(spec=NonceTracker)
            mock_tracker.pending_nonces = [5, 6]
            mock_tracker.current_nonce = 7
            mock_query.filter_by.return_value.first.return_value = mock_tracker
            
            with patch('src.services.nonce_manager.db.session'):
                # Act
                manager.release_nonce(wallet_address, nonce, success=True)
        
        # Assert
        assert 5 not in mock_tracker.pending_nonces
        assert mock_tracker.current_nonce == 7  # Should not change on success
    
    def test_nonce_release_failure(self):
        """Test nonce release after failed transaction"""
        from src.services.nonce_manager import NonceManager
        from src.models.nonce_tracker import NonceTracker
        
        # Arrange
        mock_w3 = Mock()
        manager = NonceManager(mock_w3)
        wallet_address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
        nonce = 5
        
        with patch('src.services.nonce_manager.NonceTracker.query') as mock_query:
            mock_tracker = Mock(spec=NonceTracker)
            mock_tracker.pending_nonces = [5, 6]
            mock_tracker.current_nonce = 7
            mock_query.filter_by.return_value.first.return_value = mock_tracker
            
            with patch('src.services.nonce_manager.db.session'):
                # Act
                manager.release_nonce(wallet_address, nonce, success=False)
        
        # Assert
        assert 5 not in mock_tracker.pending_nonces
        assert mock_tracker.current_nonce == 5  # Should rollback on failure
    
    def test_token_contract_address(self):
        """Test token contract address retrieval"""
        # Act
        usdt_address = get_token_contract_address('USDT', 'sepolia')
        usdc_address = get_token_contract_address('USDC', 'sepolia')
        
        # Assert
        assert usdt_address == '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0'
        assert usdc_address == '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
    
    def test_concurrent_withdrawals(self, mock_wallet, mock_w3):
        """Test concurrent withdrawals use different nonces"""
        from src.services.nonce_manager import NonceManager
        
        # Arrange
        manager = NonceManager(mock_w3)
        wallet_address = mock_wallet.wallet_address
        
        nonces = []
        
        # Simulate concurrent nonce allocations
        with patch('src.services.nonce_manager.NonceTracker.query') as mock_query:
            with patch('src.services.nonce_manager.db.session'):
                for i in range(5):
                    mock_tracker = Mock()
                    mock_tracker.current_nonce = i
                    mock_tracker.pending_nonces = []
                    mock_tracker.lock_token = None
                    mock_tracker.lock_expires_at = None
                    mock_query.filter_by.return_value.with_for_update.return_value.first.return_value = mock_tracker
                    
                    nonce = manager.allocate_nonce(wallet_address)
                    nonces.append(nonce)
        
        # Assert - all nonces should be unique
        assert len(nonces) == len(set(nonces))


class TestGasEstimator:
    """Test gas estimation functionality"""
    
    def test_eth_transfer_gas(self):
        """Test ETH transfer gas estimation"""
        from src.services.gas_estimator import GasEstimator
        
        mock_w3 = Mock()
        estimator = GasEstimator(mock_w3)
        
        gas = estimator.estimate_eth_transfer_gas()
        assert gas == 21000
    
    def test_gas_cost_calculation(self):
        """Test gas cost calculation"""
        from src.services.gas_estimator import GasEstimator
        
        mock_w3 = Mock()
        mock_w3.fromWei = Web3.fromWei
        estimator = GasEstimator(mock_w3)
        
        gas_params = {
            'gasPrice': Web3.toWei(50, 'gwei'),
            'type': 0
        }
        
        cost_wei, cost_eth = estimator.calculate_gas_cost(21000, gas_params)
        
        assert cost_wei == 21000 * Web3.toWei(50, 'gwei')
        assert cost_eth == 0.00105  # 21000 * 50 gwei


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
