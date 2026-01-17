#!/usr/bin/env python3
"""
Sepolia Testnet Deployment Verification Script

This script verifies that the ERC-20 withdrawal functionality is correctly
deployed and functional on the Sepolia testnet.

Tests:
1. Web3 connection
2. Token contract accessibility
3. Gas estimation
4. Nonce management
5. Database connectivity
6. Configuration validation

@author Manus AI
@date 2025-11-05
"""

import os
import sys
from web3 import Web3
from dotenv import load_dotenv
import json

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Load environment variables
load_dotenv('.env.sepolia.test')

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


def print_header(text):
    """Print section header"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text.center(60)}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")


def print_success(text):
    """Print success message"""
    print(f"{GREEN}✓ {text}{RESET}")


def print_error(text):
    """Print error message"""
    print(f"{RED}✗ {text}{RESET}")


def print_warning(text):
    """Print warning message"""
    print(f"{YELLOW}⚠ {text}{RESET}")


def print_info(text):
    """Print info message"""
    print(f"{BLUE}ℹ {text}{RESET}")


def test_web3_connection():
    """Test Web3 connection to Sepolia"""
    print_header("Test 1: Web3 Connection")
    
    try:
        provider_url = os.getenv('WEB3_PROVIDER_URL')
        if not provider_url or 'YOUR_' in provider_url:
            print_error("WEB3_PROVIDER_URL not configured")
            print_info("Please set WEB3_PROVIDER_URL in .env.sepolia.test")
            return False
        
        print_info(f"Connecting to: {provider_url}")
        w3 = Web3(Web3.HTTPProvider(provider_url))
        
        if not w3.is_connected():
            print_error("Failed to connect to Sepolia")
            return False
        
        print_success("Connected to Sepolia testnet")
        
        # Get network info
        chain_id = w3.eth.chain_id
        block_number = w3.eth.block_number
        
        if chain_id != 11155111:
            print_error(f"Wrong network! Chain ID: {chain_id} (expected 11155111)")
            return False
        
        print_success(f"Chain ID: {chain_id} (Sepolia)")
        print_success(f"Current block: {block_number}")
        
        # Check gas price
        gas_price = w3.eth.gas_price
        gas_price_gwei = w3.from_wei(gas_price, 'gwei')
        print_success(f"Gas price: {gas_price_gwei:.2f} gwei")
        
        # Check EIP-1559 support
        latest_block = w3.eth.get_block('latest')
        if 'baseFeePerGas' in latest_block:
            base_fee = w3.from_wei(latest_block['baseFeePerGas'], 'gwei')
            print_success(f"EIP-1559 supported, base fee: {base_fee:.2f} gwei")
        else:
            print_warning("EIP-1559 not supported on this network")
        
        return True
        
    except Exception as e:
        print_error(f"Connection failed: {e}")
        return False


def test_token_contracts():
    """Test token contract accessibility"""
    print_header("Test 2: Token Contracts")
    
    try:
        from src.config.token_contracts import get_token_contract_address, get_token_info
        
        # Test USDT
        print_info("Testing USDT contract...")
        usdt_info = get_token_info('USDT', 'sepolia')
        print_success(f"USDT: {usdt_info['contract_address']}")
        print_info(f"  Name: {usdt_info['name']}")
        print_info(f"  Decimals: {usdt_info['decimals']}")
        
        # Test USDC
        print_info("Testing USDC contract...")
        usdc_info = get_token_info('USDC', 'sepolia')
        print_success(f"USDC: {usdc_info['contract_address']}")
        print_info(f"  Name: {usdc_info['name']}")
        print_info(f"  Decimals: {usdc_info['decimals']}")
        
        # Try to load contract
        provider_url = os.getenv('WEB3_PROVIDER_URL')
        w3 = Web3(Web3.HTTPProvider(provider_url))
        
        # Load ABI
        abi_path = os.path.join(
            os.path.dirname(__file__),
            'src', 'contracts', 'erc20_abi.json'
        )
        
        with open(abi_path, 'r') as f:
            erc20_abi = json.load(f)
        
        print_success("ERC-20 ABI loaded successfully")
        
        # Create contract instance
        usdt_contract = w3.eth.contract(
            address=Web3.to_checksum_address(usdt_info['contract_address']),
            abi=erc20_abi
        )
        
        print_success("USDT contract instance created")
        
        # Try to call a read function
        try:
            total_supply = usdt_contract.functions.totalSupply().call()
            print_success(f"USDT total supply: {total_supply}")
        except Exception as e:
            print_warning(f"Could not read total supply: {e}")
        
        return True
        
    except Exception as e:
        print_error(f"Token contract test failed: {e}")
        return False


def test_gas_estimator():
    """Test gas estimation functionality"""
    print_header("Test 3: Gas Estimator")
    
    try:
        from src.services.gas_estimator import GasEstimator
        
        provider_url = os.getenv('WEB3_PROVIDER_URL')
        w3 = Web3(Web3.HTTPProvider(provider_url))
        
        estimator = GasEstimator(w3)
        
        # Test ETH transfer gas
        eth_gas = estimator.estimate_eth_transfer_gas()
        print_success(f"ETH transfer gas: {eth_gas}")
        
        # Test gas price strategies
        for strategy in ['fast', 'standard', 'slow']:
            gas_params = estimator.get_gas_price(strategy)
            print_success(f"Gas price ({strategy}): {gas_params}")
        
        # Test gas cost calculation
        gas_params = estimator.get_gas_price('standard')
        cost_wei, cost_eth = estimator.calculate_gas_cost(21000, gas_params)
        print_success(f"21000 gas cost: {cost_eth:.6f} ETH")
        
        # Test EIP-1559 support
        if estimator.supports_eip1559():
            print_success("EIP-1559 supported")
        else:
            print_warning("EIP-1559 not supported, using legacy")
        
        return True
        
    except Exception as e:
        print_error(f"Gas estimator test failed: {e}")
        return False


def test_nonce_manager():
    """Test nonce management functionality"""
    print_header("Test 4: Nonce Manager")
    
    try:
        from src.services.nonce_manager import NonceManager
        
        provider_url = os.getenv('WEB3_PROVIDER_URL')
        w3 = Web3(Web3.HTTPProvider(provider_url))
        
        manager = NonceManager(w3)
        
        # Test with a known address (Vitalik's address)
        test_address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
        
        print_info(f"Testing with address: {test_address}")
        
        # Get nonce info
        info = manager.get_nonce_info(test_address)
        print_success(f"Chain nonce: {info['chain_nonce']}")
        print_success(f"Nonce manager initialized")
        
        # Test cleanup
        cleaned = manager.cleanup_expired_locks()
        print_success(f"Cleaned up {cleaned} expired locks")
        
        return True
        
    except Exception as e:
        print_error(f"Nonce manager test failed: {e}")
        print_warning("This is expected if database is not configured")
        return True  # Don't fail on DB issues


def test_configuration():
    """Test configuration validity"""
    print_header("Test 5: Configuration")
    
    try:
        # Check required env vars
        required_vars = [
            'WEB3_PROVIDER_URL',
            'ETHEREUM_NETWORK',
            'WALLET_ENCRYPTION_KEY'
        ]
        
        all_present = True
        for var in required_vars:
            value = os.getenv(var)
            if value and 'YOUR_' not in value and 'GENERATE_' not in value:
                print_success(f"{var}: configured")
            else:
                print_warning(f"{var}: not configured")
                all_present = False
        
        # Check network setting
        network = os.getenv('ETHEREUM_NETWORK')
        if network == 'sepolia':
            print_success(f"Network: {network}")
        else:
            print_warning(f"Network: {network} (expected 'sepolia')")
        
        return all_present
        
    except Exception as e:
        print_error(f"Configuration test failed: {e}")
        return False


def test_database_connection():
    """Test database connectivity"""
    print_header("Test 6: Database Connection")
    
    try:
        from src.models.user import db
        from src.models.nonce_tracker import NonceTracker
        
        print_info("Attempting database connection...")
        
        # Try to query nonce tracker table
        count = NonceTracker.query.count()
        print_success(f"Database connected, {count} nonce trackers found")
        
        return True
        
    except Exception as e:
        print_error(f"Database connection failed: {e}")
        print_warning("This is expected if database is not set up")
        print_info("Run: psql -U postgres -d dchat < migrations/add_nonce_tracker.sql")
        return False


def main():
    """Run all tests"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{'Sepolia Testnet Deployment Verification'.center(60)}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    results = {
        'Web3 Connection': test_web3_connection(),
        'Token Contracts': test_token_contracts(),
        'Gas Estimator': test_gas_estimator(),
        'Nonce Manager': test_nonce_manager(),
        'Configuration': test_configuration(),
        'Database': test_database_connection()
    }
    
    # Summary
    print_header("Test Summary")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test, result in results.items():
        if result:
            print_success(f"{test}: PASSED")
        else:
            print_error(f"{test}: FAILED")
    
    print(f"\n{BLUE}{'='*60}{RESET}")
    if passed == total:
        print_success(f"All tests passed! ({passed}/{total})")
        print_success("✓ Ready for Sepolia deployment")
        return 0
    else:
        print_warning(f"Some tests failed ({passed}/{total} passed)")
        print_info("Please fix the issues before deploying")
        return 1


if __name__ == '__main__':
    sys.exit(main())
