"""
Multi-Token Support API Routes

Provides endpoints for managing supported tokens and token prices:
- Get supported tokens
- Get token price
- Get token balance
- Swap tokens

@author Manus AI
@date 2025-11-16
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os
from datetime import datetime
import requests
from ..middleware.auth import require_auth

tokens_bp = Blueprint('tokens', __name__)

# Supported tokens configuration
SUPPORTED_TOKENS = {
    'ETH': {
        'name': 'Ethereum',
        'symbol': 'ETH',
        'decimals': 18,
        'chain': 'ethereum',
        'coingecko_id': 'ethereum',
        'logo': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'
    },
    'USDT': {
        'name': 'Tether USD',
        'symbol': 'USDT',
        'decimals': 6,
        'chain': 'ethereum',
        'coingecko_id': 'tether',
        'logo': 'https://assets.coingecko.com/coins/images/325/large/Tether.png'
    },
    'USDC': {
        'name': 'USD Coin',
        'symbol': 'USDC',
        'decimals': 6,
        'chain': 'ethereum',
        'coingecko_id': 'usd-coin',
        'logo': 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png'
    },
    'DOT': {
        'name': 'Polkadot',
        'symbol': 'DOT',
        'decimals': 10,
        'chain': 'polkadot',
        'coingecko_id': 'polkadot',
        'logo': 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png'
    },
    'BTC': {
        'name': 'Bitcoin',
        'symbol': 'BTC',
        'decimals': 8,
        'chain': 'bitcoin',
        'coingecko_id': 'bitcoin',
        'logo': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
    },
    'MATIC': {
        'name': 'Polygon',
        'symbol': 'MATIC',
        'decimals': 18,
        'chain': 'polygon',
        'coingecko_id': 'matic-network',
        'logo': 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png'
    },
    'SOL': {
        'name': 'Solana',
        'symbol': 'SOL',
        'decimals': 9,
        'chain': 'solana',
        'coingecko_id': 'solana',
        'logo': 'https://assets.coingecko.com/coins/images/4128/large/solana.png'
    },
    'AVAX': {
        'name': 'Avalanche',
        'symbol': 'AVAX',
        'decimals': 18,
        'chain': 'avalanche',
        'coingecko_id': 'avalanche-2',
        'logo': 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png'
    }
}

# ============================================================================
# TOKENS - GET SUPPORTED TOKENS
# ============================================================================

@tokens_bp.route('/api/tokens', methods=['GET'])
def get_supported_tokens():
    """Get list of supported tokens"""
    try:
        tokens = []
        for symbol, config in SUPPORTED_TOKENS.items():
            tokens.append({
                'symbol': symbol,
                'name': config['name'],
                'decimals': config['decimals'],
                'chain': config['chain'],
                'logo': config['logo']
            })
        
        return jsonify({
            'success': True,
            'tokens': tokens
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# TOKENS - GET TOKEN PRICE
# ============================================================================

@tokens_bp.route('/api/tokens/<symbol>/price', methods=['GET'])
def get_token_price(symbol):
    """Get token price from CoinGecko"""
    try:
        symbol = symbol.upper()
        if symbol not in SUPPORTED_TOKENS:
            return jsonify({'error': f'Token {symbol} not supported'}), 404
        
        coingecko_id = SUPPORTED_TOKENS[symbol]['coingecko_id']
        
        # Get price from CoinGecko API
        url = f'https://api.coingecko.com/api/v3/simple/price'
        params = {
            'ids': coingecko_id,
            'vs_currencies': 'usd,eur,gbp,cny',
            'include_market_cap': 'true',
            'include_24hr_vol': 'true',
            'include_24hr_change': 'true'
        }
        
        response = requests.get(url, params=params, timeout=10)
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch token price'}), 500
        
        data = response.json()
        price_data = data.get(coingecko_id, {})
        
        return jsonify({
            'success': True,
            'symbol': symbol,
            'prices': price_data,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# TOKENS - GET TOKEN PRICES (MULTIPLE)
# ============================================================================

@tokens_bp.route('/api/tokens/prices', methods=['GET'])
def get_token_prices():
    """Get prices for multiple tokens"""
    try:
        symbols = request.args.get('symbols', '').split(',')
        symbols = [s.upper().strip() for s in symbols if s.strip()]
        
        if not symbols:
            return jsonify({'error': 'No symbols provided'}), 400
        
        # Filter to supported tokens
        valid_symbols = [s for s in symbols if s in SUPPORTED_TOKENS]
        if not valid_symbols:
            return jsonify({'error': 'No valid symbols provided'}), 400
        
        coingecko_ids = [SUPPORTED_TOKENS[s]['coingecko_id'] for s in valid_symbols]
        
        # Get prices from CoinGecko API
        url = f'https://api.coingecko.com/api/v3/simple/price'
        params = {
            'ids': ','.join(coingecko_ids),
            'vs_currencies': 'usd,eur,gbp,cny',
            'include_market_cap': 'true',
            'include_24hr_vol': 'true',
            'include_24hr_change': 'true'
        }
        
        response = requests.get(url, params=params, timeout=10)
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch token prices'}), 500
        
        data = response.json()
        prices = {}
        for symbol in valid_symbols:
            coingecko_id = SUPPORTED_TOKENS[symbol]['coingecko_id']
            prices[symbol] = data.get(coingecko_id, {})
        
        return jsonify({
            'success': True,
            'prices': prices,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# TOKENS - GET TOKEN BALANCE
# ============================================================================

@tokens_bp.route('/api/tokens/<symbol>/balance', methods=['GET'])
@require_auth
def get_token_balance(symbol):
    """Get user's token balance (from custodial wallet)"""
    try:
        symbol = symbol.upper()
        if symbol not in SUPPORTED_TOKENS:
            return jsonify({'error': f'Token {symbol} not supported'}), 404
        
        # This would typically query the custodial wallet service
        # For now, we return a placeholder
        return jsonify({
            'success': True,
            'symbol': symbol,
            'balance': 0,
            'message': 'Balance query requires custodial wallet integration'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# TOKENS - SWAP TOKENS (PLACEHOLDER)
# ============================================================================

@tokens_bp.route('/api/tokens/swap', methods=['POST'])
@require_auth
def swap_tokens():
    """Swap one token for another (requires DEX integration)"""
    try:
        data = request.json
        
        from_symbol = data.get('from_symbol', '').upper()
        to_symbol = data.get('to_symbol', '').upper()
        amount = data.get('amount')
        
        if from_symbol not in SUPPORTED_TOKENS or to_symbol not in SUPPORTED_TOKENS:
            return jsonify({'error': 'Invalid token symbols'}), 400
        
        if not amount or float(amount) <= 0:
            return jsonify({'error': 'Invalid amount'}), 400
        
        # This would require integration with a DEX (Uniswap, 1inch, etc.)
        return jsonify({
            'success': False,
            'error': 'Token swap requires DEX integration',
            'message': 'This feature is not yet implemented'
        }), 501
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# TOKENS - GET TOKEN INFO
# ============================================================================

@tokens_bp.route('/api/tokens/<symbol>/info', methods=['GET'])
def get_token_info(symbol):
    """Get detailed information about a token"""
    try:
        symbol = symbol.upper()
        if symbol not in SUPPORTED_TOKENS:
            return jsonify({'error': f'Token {symbol} not supported'}), 404
        
        token_info = SUPPORTED_TOKENS[symbol]
        
        return jsonify({
            'success': True,
            'token': {
                'symbol': symbol,
                'name': token_info['name'],
                'decimals': token_info['decimals'],
                'chain': token_info['chain'],
                'logo': token_info['logo']
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
