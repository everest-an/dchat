"""
Custodial Wallet Service

Manages platform-hosted wallets with enhanced security and lower fees.
Implements Binance-style wallet management for streaming payments.

Features:
- Wallet creation and management
- Deposit/withdrawal handling
- Balance tracking
- Transaction history
- Security controls

@author Manus AI
@date 2025-11-05
"""

import os
import logging
import json
from web3 import Web3
from cryptography.fernet import Fernet
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from src.models.custodial_wallet import CustodialWallet, CustodialTransaction, db
from src.config.token_contracts import get_token_contract_address, get_token_decimals
from src.services.gas_estimator import GasEstimator
from src.services.nonce_manager import NonceManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
WEB3_PROVIDER_URL = os.getenv('WEB3_PROVIDER_URL', 'https://sepolia.infura.io/v3/YOUR_KEY')
ENCRYPTION_KEY = os.getenv('WALLET_ENCRYPTION_KEY', Fernet.generate_key())

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URL))

# Initialize encryption
cipher = Fernet(ENCRYPTION_KEY)

# Initialize gas estimator
gas_estimator = GasEstimator(w3)

# Initialize nonce manager
nonce_manager = NonceManager(w3)


class CustodialWalletService:
    """
    Custodial Wallet Service
    
    Manages platform-hosted wallets for users who choose custodial option.
    """
    
    @staticmethod
    def create_wallet(user_id: int) -> Optional[CustodialWallet]:
        """
        Create a new custodial wallet for user
        
        Args:
            user_id: User ID
        
        Returns:
            CustodialWallet: Created wallet or None if failed
        """
        try:
            # Check if user already has a custodial wallet
            existing = CustodialWallet.query.filter_by(user_id=user_id).first()
            if existing:
                logger.warning(f"User {user_id} already has a custodial wallet")
                return existing
            
            # Generate new wallet
            account = w3.eth.account.create()
            
            # Encrypt private key
            encrypted_key = cipher.encrypt(account.key.hex().encode())
            
            # Create wallet record
            wallet = CustodialWallet(
                user_id=user_id,
                wallet_address=account.address,
                encrypted_private_key=encrypted_key.decode(),
                encryption_method='Fernet-AES-128',
                is_active=True,
                is_verified=False
            )
            
            db.session.add(wallet)
            db.session.commit()
            
            logger.info(f"Created custodial wallet {wallet.wallet_address} for user {user_id}")
            return wallet
            
        except Exception as e:
            logger.error(f"Failed to create custodial wallet for user {user_id}: {e}")
            db.session.rollback()
            return None
    
    @staticmethod
    def get_wallet(user_id: int) -> Optional[CustodialWallet]:
        """
        Get user's custodial wallet
        
        Args:
            user_id: User ID
        
        Returns:
            CustodialWallet: Wallet or None if not found
        """
        return CustodialWallet.query.filter_by(user_id=user_id).first()
    
    @staticmethod
    def get_wallet_by_address(address: str) -> Optional[CustodialWallet]:
        """
        Get wallet by address
        
        Args:
            address: Wallet address
        
        Returns:
            CustodialWallet: Wallet or None if not found
        """
        return CustodialWallet.query.filter_by(wallet_address=address).first()
    
    @staticmethod
    def decrypt_private_key(wallet: CustodialWallet) -> str:
        """
        Decrypt wallet private key (internal use only)
        
        Args:
            wallet: Custodial wallet
        
        Returns:
            str: Decrypted private key
        """
        try:
            encrypted_key = wallet.encrypted_private_key.encode()
            decrypted = cipher.decrypt(encrypted_key)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Failed to decrypt private key for wallet {wallet.id}: {e}")
            raise
    
    @staticmethod
    def deposit(wallet: CustodialWallet, token: str, amount: int, from_address: str, 
                tx_hash: str) -> Optional[CustodialTransaction]:
        """
        Process deposit to custodial wallet
        
        Args:
            wallet: Custodial wallet
            token: Token symbol (ETH, USDT, USDC)
            amount: Amount in smallest unit (wei, etc.)
            from_address: Source address
            tx_hash: Transaction hash
        
        Returns:
            CustodialTransaction: Transaction record or None if failed
        """
        try:
            # Update wallet balance
            if token == 'ETH':
                wallet.balance_eth += amount
            elif token == 'USDT':
                wallet.balance_usdt += amount
            elif token == 'USDC':
                wallet.balance_usdc += amount
            else:
                raise ValueError(f"Unsupported token: {token}")
            
            wallet.last_transaction_at = datetime.utcnow()
            
            # Create transaction record
            transaction = CustodialTransaction(
                wallet_id=wallet.id,
                transaction_type='deposit',
                token=token,
                amount=amount,
                from_address=from_address,
                to_address=wallet.wallet_address,
                transaction_hash=tx_hash,
                status='confirmed'
            )
            
            db.session.add(transaction)
            db.session.commit()
            
            logger.info(f"Deposited {amount} {token} to wallet {wallet.wallet_address}")
            return transaction
            
        except Exception as e:
            logger.error(f"Failed to process deposit: {e}")
            db.session.rollback()
            return None
    
    @staticmethod
    def withdraw(wallet: CustodialWallet, token: str, amount: int, to_address: str,
                 amount_usd: float = 0.0) -> Tuple[bool, str, Optional[str]]:
        """
        Process withdrawal from custodial wallet
        
        Args:
            wallet: Custodial wallet
            token: Token symbol (ETH, USDT, USDC)
            amount: Amount in smallest unit (wei, etc.)
            to_address: Destination address
            amount_usd: USD value for limit checking
        
        Returns:
            tuple: (success, message, tx_hash)
        """
        try:
            # Check withdrawal limits
            can_withdraw, reason = wallet.can_withdraw(amount_usd)
            if not can_withdraw:
                return False, reason, None
            
            # Check balance
            if token == 'ETH':
                if wallet.balance_eth < amount:
                    return False, "Insufficient ETH balance", None
            elif token == 'USDT':
                if wallet.balance_usdt < amount:
                    return False, "Insufficient USDT balance", None
            elif token == 'USDC':
                if wallet.balance_usdc < amount:
                    return False, "Insufficient USDC balance", None
            else:
                return False, f"Unsupported token: {token}", None
            
            # Decrypt private key
            private_key = CustodialWalletService.decrypt_private_key(wallet)
            
            # Allocate nonce using nonce manager
            nonce = nonce_manager.allocate_nonce(wallet.wallet_address)
            
            if token == 'ETH':
                # ETH transfer
                tx = {
                    'nonce': nonce,
                    'to': to_address,
                    'value': amount,
                    'gas': 21000,
                    'gasPrice': w3.eth.gas_price,
                    'chainId': w3.eth.chain_id
                }
                
                # Sign transaction
                signed_tx = w3.eth.account.sign_transaction(tx, private_key)
                
                # Send transaction
                tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
                tx_hash_hex = tx_hash.hex()
                
            else:
                # ERC-20 token transfer (USDT/USDC)
                tx_hash_hex = CustodialWalletService._withdraw_erc20(
                    wallet=wallet,
                    token=token,
                    amount=amount,
                    to_address=to_address,
                    private_key=private_key,
                    nonce=nonce
                )
                
                if not tx_hash_hex:
                    return False, f"Failed to send {token} transaction", None
            
            # Update wallet balance
            if token == 'ETH':
                wallet.balance_eth -= amount
            elif token == 'USDT':
                wallet.balance_usdt -= amount
            elif token == 'USDC':
                wallet.balance_usdc -= amount
            
            wallet.daily_withdrawn += amount_usd
            wallet.last_transaction_at = datetime.utcnow()
            
            # Create transaction record
            transaction = CustodialTransaction(
                wallet_id=wallet.id,
                transaction_type='withdrawal',
                token=token,
                amount=amount,
                amount_usd=amount_usd,
                from_address=wallet.wallet_address,
                to_address=to_address,
                transaction_hash=tx_hash_hex,
                status='pending'
            )
            
            db.session.add(transaction)
            db.session.commit()
            
            # Release nonce (success)
            nonce_manager.release_nonce(wallet.wallet_address, nonce, True)
            
            logger.info(f"Withdrew {amount} {token} from wallet {wallet.wallet_address} to {to_address}")
            return True, "Withdrawal successful", tx_hash_hex
            
        except Exception as e:
            logger.error(f"Failed to process withdrawal: {e}")
            db.session.rollback()
            
            # Release nonce (failure) - rollback nonce
            try:
                nonce_manager.release_nonce(wallet.wallet_address, nonce, False)
            except:
                pass
            
            return False, str(e), None
    
    @staticmethod
    def transfer(from_wallet: CustodialWallet, to_address: str, token: str, amount: int) -> Tuple[bool, str, Optional[str]]:
        """
        Transfer funds between custodial wallets (internal transfer, no gas fees)
        
        Args:
            from_wallet: Source wallet
            to_address: Destination wallet address
            token: Token symbol
            amount: Amount in smallest unit
        
        Returns:
            tuple: (success, message, tx_id)
        """
        try:
            # Check if destination is also a custodial wallet
            to_wallet = CustodialWalletService.get_wallet_by_address(to_address)
            
            if to_wallet:
                # Internal transfer (no blockchain transaction needed)
                # Check balance
                if token == 'ETH':
                    if from_wallet.balance_eth < amount:
                        return False, "Insufficient ETH balance", None
                    from_wallet.balance_eth -= amount
                    to_wallet.balance_eth += amount
                elif token == 'USDT':
                    if from_wallet.balance_usdt < amount:
                        return False, "Insufficient USDT balance", None
                    from_wallet.balance_usdt -= amount
                    to_wallet.balance_usdt += amount
                elif token == 'USDC':
                    if from_wallet.balance_usdc < amount:
                        return False, "Insufficient USDC balance", None
                    from_wallet.balance_usdc -= amount
                    to_wallet.balance_usdc += amount
                else:
                    return False, f"Unsupported token: {token}", None
                
                # Create transaction records
                tx_id = f"internal_{datetime.utcnow().timestamp()}"
                
                tx_from = CustodialTransaction(
                    wallet_id=from_wallet.id,
                    transaction_type='transfer',
                    token=token,
                    amount=amount,
                    from_address=from_wallet.wallet_address,
                    to_address=to_address,
                    transaction_hash=tx_id,
                    status='confirmed',
                    description='Internal transfer'
                )
                
                tx_to = CustodialTransaction(
                    wallet_id=to_wallet.id,
                    transaction_type='transfer',
                    token=token,
                    amount=amount,
                    from_address=from_wallet.wallet_address,
                    to_address=to_address,
                    transaction_hash=tx_id,
                    status='confirmed',
                    description='Internal transfer'
                )
                
                db.session.add(tx_from)
                db.session.add(tx_to)
                db.session.commit()
                
                logger.info(f"Internal transfer: {amount} {token} from {from_wallet.wallet_address} to {to_address}")
                return True, "Internal transfer successful (no gas fees)", tx_id
            else:
                # External transfer (requires blockchain transaction)
                return CustodialWalletService.withdraw(from_wallet, token, amount, to_address)
                
        except Exception as e:
            logger.error(f"Failed to process transfer: {e}")
            db.session.rollback()
            return False, str(e), None
    
    @staticmethod
    def get_transaction_history(wallet: CustodialWallet, limit: int = 50) -> List[Dict]:
        """
        Get wallet transaction history
        
        Args:
            wallet: Custodial wallet
            limit: Maximum number of transactions to return
        
        Returns:
            list: Transaction history
        """
        transactions = CustodialTransaction.query.filter_by(
            wallet_id=wallet.id
        ).order_by(
            CustodialTransaction.created_at.desc()
        ).limit(limit).all()
        
        return [tx.to_dict() for tx in transactions]
    
    @staticmethod
    def sync_balance(wallet: CustodialWallet) -> bool:
        """
        Sync wallet balance with blockchain
        
        Args:
            wallet: Custodial wallet
        
        Returns:
            bool: Success status
        """
        try:
            # Get on-chain balance
            balance_wei = w3.eth.get_balance(wallet.wallet_address)
            
            # Update wallet balance
            wallet.balance_eth = balance_wei
            wallet.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f"Synced balance for wallet {wallet.wallet_address}: {balance_wei} wei")
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync balance for wallet {wallet.id}: {e}")
            return False
    
    @staticmethod
    def _withdraw_erc20(wallet: CustodialWallet, token: str, amount: int, 
                        to_address: str, private_key: str, nonce: int) -> Optional[str]:
        """
        Internal method to withdraw ERC-20 tokens
        
        Args:
            wallet: Custodial wallet
            token: Token symbol (USDT, USDC)
            amount: Amount in smallest unit
            to_address: Destination address
            private_key: Decrypted private key
            nonce: Transaction nonce
        
        Returns:
            str: Transaction hash or None if failed
        """
        try:
            # Load ERC-20 ABI
            abi_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'contracts',
                'erc20_abi.json'
            )
            
            with open(abi_path, 'r') as f:
                erc20_abi = json.load(f)
            
            # Get token contract address
            contract_address = get_token_contract_address(token)
            
            # Create contract instance
            contract = w3.eth.contract(
                address=Web3.toChecksumAddress(contract_address),
                abi=erc20_abi
            )
            
            # Build transfer transaction
            transfer_function = contract.functions.transfer(
                Web3.toChecksumAddress(to_address),
                amount
            )
            
            # Estimate gas using gas estimator
            gas_limit = gas_estimator.estimate_erc20_transfer_gas(
                contract=contract,
                from_address=wallet.wallet_address,
                to_address=to_address,
                amount=amount
            )
            
            # Get gas price (use standard strategy)
            gas_price_params = gas_estimator.get_gas_price('standard')
            
            # Build transaction with appropriate gas parameters
            tx_params = {
                'from': wallet.wallet_address,
                'nonce': nonce,
                'gas': gas_limit,
                'chainId': w3.eth.chain_id
            }
            
            # Add gas price parameters based on transaction type
            if gas_price_params['type'] == 2:
                # EIP-1559
                tx_params['maxFeePerGas'] = gas_price_params['maxFeePerGas']
                tx_params['maxPriorityFeePerGas'] = gas_price_params['maxPriorityFeePerGas']
            else:
                # Legacy
                tx_params['gasPrice'] = gas_price_params['gasPrice']
            
            tx = transfer_function.buildTransaction(tx_params)
            
            # Sign transaction
            signed_tx = w3.eth.account.sign_transaction(tx, private_key)
            
            # Send transaction
            tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            tx_hash_hex = tx_hash.hex()
            
            logger.info(f"Sent {token} withdrawal: {tx_hash_hex}")
            logger.info(f"  From: {wallet.wallet_address}")
            logger.info(f"  To: {to_address}")
            logger.info(f"  Amount: {amount}")
            logger.info(f"  Gas: {gas_limit}")
            logger.info(f"  Gas Price: {gas_price}")
            
            return tx_hash_hex
            
        except Exception as e:
            logger.error(f"Failed to send ERC-20 transaction: {e}")
            logger.error(f"  Token: {token}")
            logger.error(f"  Amount: {amount}")
            logger.error(f"  To: {to_address}")
            return None
    
    @staticmethod
    def _load_erc20_abi() -> list:
        """
        Load ERC-20 ABI from file
        
        Returns:
            list: ERC-20 ABI
        """
        abi_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'contracts',
            'erc20_abi.json'
        )
        
        with open(abi_path, 'r') as f:
            return json.load(f)
    
    @staticmethod
    def get_erc20_balance(wallet_address: str, token: str) -> int:
        """
        Get ERC-20 token balance from blockchain
        
        Args:
            wallet_address: Wallet address
            token: Token symbol (USDT, USDC)
        
        Returns:
            int: Token balance in smallest unit
        """
        try:
            # Load ABI and get contract
            erc20_abi = CustodialWalletService._load_erc20_abi()
            contract_address = get_token_contract_address(token)
            
            contract = w3.eth.contract(
                address=Web3.toChecksumAddress(contract_address),
                abi=erc20_abi
            )
            
            # Get balance
            balance = contract.functions.balanceOf(
                Web3.toChecksumAddress(wallet_address)
            ).call()
            
            return balance
            
        except Exception as e:
            logger.error(f"Failed to get {token} balance for {wallet_address}: {e}")
            return 0
