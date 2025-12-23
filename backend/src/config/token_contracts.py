"""
ERC-20 Token Contract Configuration

Manages token contract addresses and metadata for different networks.

Supported Networks:
- Ethereum Mainnet
- Sepolia Testnet
- Goerli Testnet

Supported Tokens:
- USDT (Tether USD)
- USDC (USD Coin)

@author Manus AI
@date 2025-11-05
"""

import os
from typing import Dict, Optional

# Token contract addresses by network
TOKEN_CONTRACTS = {
    'mainnet': {
        'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    },
    'sepolia': {
        'USDT': '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
        'USDC': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
    },
    'goerli': {
        'USDT': '0x509Ee0d083DdF8AC028f2a56731412edD63223B9',
        'USDC': '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'
    }
}

# Token decimals
TOKEN_DECIMALS = {
    'USDT': 6,
    'USDC': 6,
    'DAI': 18,
    'ETH': 18
}

# Token names
TOKEN_NAMES = {
    'USDT': 'Tether USD',
    'USDC': 'USD Coin',
    'DAI': 'Dai Stablecoin',
    'ETH': 'Ethereum'
}

# Token symbols
TOKEN_SYMBOLS = {
    'USDT': 'USDT',
    'USDC': 'USDC',
    'DAI': 'DAI',
    'ETH': 'ETH'
}

# Supported tokens by network
SUPPORTED_TOKENS = {
    'mainnet': ['USDT', 'USDC', 'DAI'],
    'sepolia': ['USDT', 'USDC'],
    'goerli': ['USDT', 'USDC']
}


def get_network() -> str:
    """
    Get current network from environment
    
    Returns:
        str: Network name (mainnet, sepolia, goerli)
    """
    network = os.getenv('ETHEREUM_NETWORK', 'sepolia').lower()
    
    if network not in TOKEN_CONTRACTS:
        raise ValueError(f"Unsupported network: {network}")
    
    return network


def get_token_contract_address(token: str, network: Optional[str] = None) -> str:
    """
    Get token contract address for network
    
    Args:
        token: Token symbol (USDT, USDC, etc.)
        network: Network name (optional, defaults to env)
    
    Returns:
        str: Contract address
    
    Raises:
        ValueError: If token or network is unsupported
    
    Example:
        >>> get_token_contract_address('USDT', 'sepolia')
        '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0'
    """
    if network is None:
        network = get_network()
    
    if network not in TOKEN_CONTRACTS:
        raise ValueError(f"Unsupported network: {network}")
    
    token = token.upper()
    if token not in TOKEN_CONTRACTS[network]:
        raise ValueError(f"Token {token} not supported on {network}")
    
    return TOKEN_CONTRACTS[network][token]


def get_token_decimals(token: str) -> int:
    """
    Get token decimals
    
    Args:
        token: Token symbol
    
    Returns:
        int: Number of decimals
    
    Example:
        >>> get_token_decimals('USDT')
        6
    """
    token = token.upper()
    return TOKEN_DECIMALS.get(token, 18)


def get_token_name(token: str) -> str:
    """
    Get token full name
    
    Args:
        token: Token symbol
    
    Returns:
        str: Token name
    
    Example:
        >>> get_token_name('USDT')
        'Tether USD'
    """
    token = token.upper()
    return TOKEN_NAMES.get(token, token)


def get_token_symbol(token: str) -> str:
    """
    Get token symbol (normalized)
    
    Args:
        token: Token symbol
    
    Returns:
        str: Normalized token symbol
    
    Example:
        >>> get_token_symbol('usdt')
        'USDT'
    """
    token = token.upper()
    return TOKEN_SYMBOLS.get(token, token)


def is_token_supported(token: str, network: Optional[str] = None) -> bool:
    """
    Check if token is supported on network
    
    Args:
        token: Token symbol
        network: Network name (optional, defaults to env)
    
    Returns:
        bool: True if supported
    
    Example:
        >>> is_token_supported('USDT', 'sepolia')
        True
    """
    if network is None:
        network = get_network()
    
    token = token.upper()
    return token in SUPPORTED_TOKENS.get(network, [])


def get_supported_tokens(network: Optional[str] = None) -> list:
    """
    Get list of supported tokens for network
    
    Args:
        network: Network name (optional, defaults to env)
    
    Returns:
        list: List of supported token symbols
    
    Example:
        >>> get_supported_tokens('sepolia')
        ['USDT', 'USDC']
    """
    if network is None:
        network = get_network()
    
    return SUPPORTED_TOKENS.get(network, [])


def get_token_info(token: str, network: Optional[str] = None) -> Dict:
    """
    Get complete token information
    
    Args:
        token: Token symbol
        network: Network name (optional, defaults to env)
    
    Returns:
        dict: Token information
    
    Example:
        >>> get_token_info('USDT', 'sepolia')
        {
            'symbol': 'USDT',
            'name': 'Tether USD',
            'decimals': 6,
            'contract_address': '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
            'network': 'sepolia'
        }
    """
    if network is None:
        network = get_network()
    
    token = token.upper()
    
    return {
        'symbol': get_token_symbol(token),
        'name': get_token_name(token),
        'decimals': get_token_decimals(token),
        'contract_address': get_token_contract_address(token, network),
        'network': network,
        'is_supported': is_token_supported(token, network)
    }


def format_token_amount(amount: int, token: str) -> float:
    """
    Convert token amount from smallest unit to decimal
    
    Args:
        amount: Amount in smallest unit (e.g., wei)
        token: Token symbol
    
    Returns:
        float: Amount in decimal format
    
    Example:
        >>> format_token_amount(1000000, 'USDT')
        1.0
    """
    decimals = get_token_decimals(token)
    return amount / (10 ** decimals)


def parse_token_amount(amount: float, token: str) -> int:
    """
    Convert token amount from decimal to smallest unit
    
    Args:
        amount: Amount in decimal format
        token: Token symbol
    
    Returns:
        int: Amount in smallest unit
    
    Example:
        >>> parse_token_amount(1.0, 'USDT')
        1000000
    """
    decimals = get_token_decimals(token)
    return int(amount * (10 ** decimals))


# Export all functions
__all__ = [
    'get_network',
    'get_token_contract_address',
    'get_token_decimals',
    'get_token_name',
    'get_token_symbol',
    'is_token_supported',
    'get_supported_tokens',
    'get_token_info',
    'format_token_amount',
    'parse_token_amount',
    'TOKEN_CONTRACTS',
    'TOKEN_DECIMALS',
    'TOKEN_NAMES',
    'SUPPORTED_TOKENS'
]
