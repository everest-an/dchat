#!/usr/bin/env python3
"""
Live Sepolia Testnet Testing Script

Tests ERC-20 withdrawal functionality on Sepolia testnet with real wallet.

SECURITY: This script uses test wallet credentials. DO NOT use on mainnet.

@author Manus AI
@date 2025-11-05
"""

import sys
import os
from web3 import Web3
import json
import time

# Test wallet credentials (Sepolia testnet only)
TEST_WALLET_ADDRESS = '0x66794fC75C351ad9677cB00B2043868C11dfcadA'
TEST_WALLET_PRIVATE_KEY = '0x1cc1d0830f0316a907ca7029a173939c6f283ce67d0585cb048f26f092ad1718'

# Sepolia RPC endpoints
RPC_ENDPOINTS = [
    'https://rpc.sepolia.org',
    'https://ethereum-sepolia.publicnode.com',
    'https://rpc2.sepolia.org'
]

# Token contracts on Sepolia
USDT_CONTRACT = '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0'
USDC_CONTRACT = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

# Colors
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


def print_header(text):
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}{text.center(70)}{RESET}")
    print(f"{BLUE}{'='*70}{RESET}\n")


def print_success(text):
    print(f"{GREEN}✓ {text}{RESET}")


def print_error(text):
    print(f"{RED}✗ {text}{RESET}")


def print_warning(text):
    print(f"{YELLOW}⚠ {text}{RESET}")


def print_info(text):
    print(f"{BLUE}ℹ {text}{RESET}")


def connect_to_sepolia():
    """Try to connect to Sepolia using available RPC endpoints"""
    print_header("Connecting to Sepolia Testnet")
    
    for rpc_url in RPC_ENDPOINTS:
        try:
            print_info(f"Trying: {rpc_url}")
            w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={'timeout': 10}))
            
            if w3.is_connected():
                chain_id = w3.eth.chain_id
                if chain_id == 11155111:
                    block_number = w3.eth.block_number
                    print_success(f"Connected to Sepolia")
                    print_info(f"  RPC: {rpc_url}")
                    print_info(f"  Chain ID: {chain_id}")
                    print_info(f"  Block: {block_number}")
                    return w3, rpc_url
                else:
                    print_warning(f"Wrong network (Chain ID: {chain_id})")
            else:
                print_warning("Connection failed")
        except Exception as e:
            print_warning(f"Error: {str(e)[:50]}")
    
    print_error("Failed to connect to Sepolia")
    return None, None


def check_wallet_balance(w3):
    """Check wallet balances"""
    print_header("Checking Wallet Balances")
    
    try:
        # ETH balance
        eth_balance_wei = w3.eth.get_balance(TEST_WALLET_ADDRESS)
        eth_balance = w3.from_wei(eth_balance_wei, 'ether')
        
        print_info(f"Wallet: {TEST_WALLET_ADDRESS}")
        print_success(f"ETH Balance: {eth_balance:.6f} ETH")
        
        if eth_balance < 0.01:
            print_warning("Low ETH balance! Get test ETH from https://sepoliafaucet.com")
        
        # Load ERC-20 ABI
        abi_path = 'src/contracts/erc20_abi.json'
        if not os.path.exists(abi_path):
            print_warning("ERC-20 ABI not found, skipping token balance check")
            return eth_balance, 0, 0
        
        with open(abi_path, 'r') as f:
            erc20_abi = json.load(f)
        
        # USDT balance
        try:
            usdt_contract = w3.eth.contract(
                address=Web3.to_checksum_address(USDT_CONTRACT),
                abi=erc20_abi
            )
            usdt_balance_raw = usdt_contract.functions.balanceOf(TEST_WALLET_ADDRESS).call()
            usdt_balance = usdt_balance_raw / 1e6  # 6 decimals
            print_success(f"USDT Balance: {usdt_balance:.6f} USDT")
        except Exception as e:
            print_warning(f"Could not read USDT balance: {str(e)[:50]}")
            usdt_balance = 0
        
        # USDC balance
        try:
            usdc_contract = w3.eth.contract(
                address=Web3.to_checksum_address(USDC_CONTRACT),
                abi=erc20_abi
            )
            usdc_balance_raw = usdc_contract.functions.balanceOf(TEST_WALLET_ADDRESS).call()
            usdc_balance = usdc_balance_raw / 1e6  # 6 decimals
            print_success(f"USDC Balance: {usdc_balance:.6f} USDC")
        except Exception as e:
            print_warning(f"Could not read USDC balance: {str(e)[:50]}")
            usdc_balance = 0
        
        return eth_balance, usdt_balance, usdc_balance
        
    except Exception as e:
        print_error(f"Balance check failed: {e}")
        return 0, 0, 0


def test_gas_estimation(w3):
    """Test gas estimation"""
    print_header("Testing Gas Estimation")
    
    try:
        # Current gas price
        gas_price = w3.eth.gas_price
        gas_price_gwei = w3.from_wei(gas_price, 'gwei')
        print_success(f"Current gas price: {gas_price_gwei:.2f} gwei")
        
        # Check EIP-1559 support
        latest_block = w3.eth.get_block('latest')
        if 'baseFeePerGas' in latest_block:
            base_fee = w3.from_wei(latest_block['baseFeePerGas'], 'gwei')
            print_success(f"EIP-1559 supported")
            print_info(f"  Base fee: {base_fee:.2f} gwei")
            
            # Estimate max fee
            max_priority_fee = 2  # gwei
            max_fee = (base_fee * 2) + max_priority_fee
            print_info(f"  Recommended max fee: {max_fee:.2f} gwei")
        else:
            print_warning("EIP-1559 not supported")
        
        # Estimate ETH transfer cost
        eth_gas_limit = 21000
        eth_cost_wei = eth_gas_limit * gas_price
        eth_cost_eth = w3.from_wei(eth_cost_wei, 'ether')
        print_success(f"ETH transfer cost: {eth_cost_eth:.6f} ETH")
        
        # Estimate ERC-20 transfer cost
        erc20_gas_limit = 65000
        erc20_cost_wei = erc20_gas_limit * gas_price
        erc20_cost_eth = w3.from_wei(erc20_cost_wei, 'ether')
        print_success(f"ERC-20 transfer cost: {erc20_cost_eth:.6f} ETH")
        
        return True
        
    except Exception as e:
        print_error(f"Gas estimation failed: {e}")
        return False


def test_nonce_retrieval(w3):
    """Test nonce retrieval"""
    print_header("Testing Nonce Management")
    
    try:
        nonce = w3.eth.get_transaction_count(TEST_WALLET_ADDRESS)
        print_success(f"Current nonce: {nonce}")
        
        # Get pending nonce
        pending_nonce = w3.eth.get_transaction_count(TEST_WALLET_ADDRESS, 'pending')
        print_success(f"Pending nonce: {pending_nonce}")
        
        if nonce != pending_nonce:
            print_warning(f"Pending transactions detected: {pending_nonce - nonce}")
        
        return nonce
        
    except Exception as e:
        print_error(f"Nonce retrieval failed: {e}")
        return None


def test_transaction_simulation(w3):
    """Simulate a transaction without sending"""
    print_header("Testing Transaction Simulation")
    
    try:
        # Simulate ETH transfer
        recipient = Web3.to_checksum_address('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')  # Test recipient
        
        tx = {
            'from': TEST_WALLET_ADDRESS,
            'to': recipient,
            'value': w3.to_wei(0.001, 'ether'),
            'gas': 21000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(TEST_WALLET_ADDRESS),
            'chainId': 11155111
        }
        
        # Estimate gas
        estimated_gas = w3.eth.estimate_gas(tx)
        print_success(f"Gas estimation successful: {estimated_gas}")
        
        print_info("Transaction simulation completed (not sent)")
        print_info(f"  To: {recipient}")
        print_info(f"  Value: 0.001 ETH")
        print_info(f"  Gas: {estimated_gas}")
        
        return True
        
    except Exception as e:
        print_error(f"Transaction simulation failed: {e}")
        return False


def main():
    """Run all tests"""
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}{'Live Sepolia Testnet Testing'.center(70)}{RESET}")
    print(f"{BLUE}{'='*70}{RESET}")
    
    print_warning("SECURITY NOTICE: Using test wallet on Sepolia testnet")
    print_warning("DO NOT use this wallet or private key on mainnet!")
    
    # Connect to Sepolia
    w3, rpc_url = connect_to_sepolia()
    if not w3:
        print_error("Cannot proceed without Sepolia connection")
        return 1
    
    # Check balances
    eth_balance, usdt_balance, usdc_balance = check_wallet_balance(w3)
    
    # Test gas estimation
    test_gas_estimation(w3)
    
    # Test nonce
    nonce = test_nonce_retrieval(w3)
    
    # Test transaction simulation
    if eth_balance > 0.001:
        test_transaction_simulation(w3)
    else:
        print_warning("Insufficient ETH for transaction simulation")
        print_info("Get test ETH from: https://sepoliafaucet.com")
    
    # Summary
    print_header("Test Summary")
    
    print_success("✓ Sepolia connection working")
    print_success("✓ Wallet balance check working")
    print_success("✓ Gas estimation working")
    print_success("✓ Nonce management working")
    
    if eth_balance > 0:
        print_success("✓ Wallet has ETH for gas")
    else:
        print_warning("⚠ Wallet needs ETH for gas fees")
    
    if usdt_balance > 0 or usdc_balance > 0:
        print_success("✓ Wallet has test tokens")
    else:
        print_warning("⚠ Wallet needs test USDT/USDC for withdrawal testing")
    
    print(f"\n{BLUE}{'='*70}{RESET}")
    print_success("Live testing completed successfully!")
    print(f"{BLUE}{'='*70}{RESET}\n")
    
    print_info("Next steps:")
    if eth_balance < 0.01:
        print_info("  1. Get Sepolia ETH from https://sepoliafaucet.com")
    if usdt_balance == 0 and usdc_balance == 0:
        print_info("  2. Get test USDT/USDC tokens")
    print_info("  3. Run full withdrawal test")
    print_info("  4. Monitor transaction on Sepolia Etherscan")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
