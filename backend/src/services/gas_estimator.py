"""
Gas Estimation Service

Provides dynamic gas estimation for Ethereum transactions with support
for both legacy and EIP-1559 (London hard fork) transactions.

Features:
- ERC-20 transfer gas estimation
- ETH transfer gas estimation
- EIP-1559 support (Type 2 transactions)
- Legacy gas pricing (Type 0 transactions)
- Multiple gas price strategies (fast, standard, slow)
- Gas cost calculation in ETH and USD

@author Manus AI
@date 2025-11-05
"""

from web3 import Web3
from typing import Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class GasEstimator:
    """
    Gas estimation service for Ethereum transactions
    
    Supports both legacy and EIP-1559 gas pricing.
    """
    
    def __init__(self, w3: Web3):
        """
        Initialize gas estimator
        
        Args:
            w3: Web3 instance
        """
        self.w3 = w3
    
    def estimate_eth_transfer_gas(self) -> int:
        """
        Estimate gas for ETH transfer
        
        Returns:
            int: Gas limit (always 21000 for simple ETH transfers)
        """
        return 21000
    
    def estimate_erc20_transfer_gas(self, contract, from_address: str, 
                                     to_address: str, amount: int) -> int:
        """
        Estimate gas for ERC-20 transfer
        
        Args:
            contract: Web3 contract instance
            from_address: Sender address
            to_address: Recipient address
            amount: Transfer amount in smallest unit
        
        Returns:
            int: Estimated gas limit with 20% buffer
        """
        try:
            # Estimate gas
            gas_estimate = contract.functions.transfer(
                Web3.toChecksumAddress(to_address),
                amount
            ).estimateGas({'from': from_address})
            
            # Add 20% buffer for safety
            gas_limit = int(gas_estimate * 1.2)
            
            logger.info(f"ERC-20 gas estimate: {gas_estimate}, with buffer: {gas_limit}")
            return gas_limit
            
        except Exception as e:
            logger.error(f"Gas estimation failed: {e}")
            # Fallback to safe default for ERC-20 transfers
            # Most ERC-20 transfers use 50k-100k gas
            return 100000
    
    def supports_eip1559(self) -> bool:
        """
        Check if network supports EIP-1559
        
        Returns:
            bool: True if EIP-1559 is supported
        """
        try:
            latest_block = self.w3.eth.get_block('latest')
            return 'baseFeePerGas' in latest_block
        except:
            return False
    
    def get_gas_price(self, strategy: str = 'standard') -> Dict:
        """
        Get gas price based on strategy
        
        Args:
            strategy: 'fast', 'standard', or 'slow'
        
        Returns:
            dict: Gas price parameters
                For EIP-1559: {'maxFeePerGas', 'maxPriorityFeePerGas', 'type': 2}
                For Legacy: {'gasPrice', 'type': 0}
        
        Example:
            >>> estimator.get_gas_price('fast')
            {
                'maxFeePerGas': 50000000000,
                'maxPriorityFeePerGas': 3000000000,
                'type': 2
            }
        """
        try:
            if self.supports_eip1559():
                return self._get_eip1559_gas_price(strategy)
            else:
                return self._get_legacy_gas_price(strategy)
        except Exception as e:
            logger.error(f"Failed to get gas price: {e}")
            # Fallback to safe default
            return {
                'gasPrice': self.w3.toWei(50, 'gwei'),
                'type': 0
            }
    
    def _get_eip1559_gas_price(self, strategy: str) -> Dict:
        """
        Get EIP-1559 gas price (Type 2 transaction)
        
        Args:
            strategy: 'fast', 'standard', or 'slow'
        
        Returns:
            dict: EIP-1559 gas parameters
        """
        try:
            # Get latest block
            latest_block = self.w3.eth.get_block('latest')
            base_fee = latest_block['baseFeePerGas']
            
            # Priority fee based on strategy
            # These values are in gwei
            priority_fees = {
                'fast': self.w3.toWei(3, 'gwei'),      # Fast: 3 gwei
                'standard': self.w3.toWei(2, 'gwei'),  # Standard: 2 gwei
                'slow': self.w3.toWei(1, 'gwei')       # Slow: 1 gwei
            }
            
            priority_fee = priority_fees.get(strategy, priority_fees['standard'])
            
            # Max fee = (base fee * 2) + priority fee
            # This ensures transaction will be included even if base fee doubles
            max_fee = (base_fee * 2) + priority_fee
            
            logger.info(f"EIP-1559 gas price ({strategy}):")
            logger.info(f"  Base Fee: {base_fee} wei ({self.w3.fromWei(base_fee, 'gwei')} gwei)")
            logger.info(f"  Priority Fee: {priority_fee} wei ({self.w3.fromWei(priority_fee, 'gwei')} gwei)")
            logger.info(f"  Max Fee: {max_fee} wei ({self.w3.fromWei(max_fee, 'gwei')} gwei)")
            
            return {
                'maxFeePerGas': max_fee,
                'maxPriorityFeePerGas': priority_fee,
                'type': 2  # EIP-1559 transaction
            }
            
        except Exception as e:
            logger.error(f"Failed to get EIP-1559 gas price: {e}")
            # Fallback to legacy
            return self._get_legacy_gas_price(strategy)
    
    def _get_legacy_gas_price(self, strategy: str) -> Dict:
        """
        Get legacy gas price (Type 0 transaction)
        
        Args:
            strategy: 'fast', 'standard', or 'slow'
        
        Returns:
            dict: Legacy gas parameters
        """
        try:
            # Get current gas price from network
            gas_price = self.w3.eth.gas_price
            
            # Adjust based on strategy
            multipliers = {
                'fast': 1.2,      # 20% higher
                'standard': 1.0,  # Current price
                'slow': 0.8       # 20% lower
            }
            
            multiplier = multipliers.get(strategy, 1.0)
            adjusted_price = int(gas_price * multiplier)
            
            logger.info(f"Legacy gas price ({strategy}): {adjusted_price} wei ({self.w3.fromWei(adjusted_price, 'gwei')} gwei)")
            
            return {
                'gasPrice': adjusted_price,
                'type': 0  # Legacy transaction
            }
            
        except Exception as e:
            logger.error(f"Failed to get legacy gas price: {e}")
            # Fallback to safe default (50 gwei)
            return {
                'gasPrice': self.w3.toWei(50, 'gwei'),
                'type': 0
            }
    
    def calculate_gas_cost(self, gas_limit: int, gas_price_params: Dict) -> Tuple[int, float]:
        """
        Calculate total gas cost
        
        Args:
            gas_limit: Gas limit
            gas_price_params: Gas price parameters from get_gas_price()
        
        Returns:
            tuple: (cost_wei, cost_eth)
        
        Example:
            >>> gas_params = estimator.get_gas_price('standard')
            >>> cost_wei, cost_eth = estimator.calculate_gas_cost(21000, gas_params)
            >>> print(f"Cost: {cost_eth} ETH")
        """
        if gas_price_params['type'] == 2:
            # EIP-1559: use maxFeePerGas for worst case
            cost_wei = gas_limit * gas_price_params['maxFeePerGas']
        else:
            # Legacy: use gasPrice
            cost_wei = gas_limit * gas_price_params['gasPrice']
        
        cost_eth = float(self.w3.fromWei(cost_wei, 'ether'))
        
        return cost_wei, cost_eth
    
    def estimate_total_cost(self, gas_limit: int, strategy: str = 'standard') -> Dict:
        """
        Estimate total transaction cost
        
        Args:
            gas_limit: Gas limit
            strategy: Gas price strategy
        
        Returns:
            dict: Cost breakdown
        
        Example:
            >>> cost = estimator.estimate_total_cost(21000, 'fast')
            >>> print(f"Total cost: {cost['eth']} ETH")
        """
        gas_price_params = self.get_gas_price(strategy)
        cost_wei, cost_eth = self.calculate_gas_cost(gas_limit, gas_price_params)
        
        return {
            'gas_limit': gas_limit,
            'gas_price_params': gas_price_params,
            'cost_wei': cost_wei,
            'cost_eth': cost_eth,
            'cost_gwei': float(self.w3.fromWei(cost_wei, 'gwei')),
            'strategy': strategy,
            'transaction_type': 'EIP-1559' if gas_price_params['type'] == 2 else 'Legacy'
        }
    
    def get_optimal_strategy(self, urgency: str = 'normal') -> str:
        """
        Get optimal gas strategy based on urgency
        
        Args:
            urgency: 'urgent', 'normal', or 'low'
        
        Returns:
            str: Recommended strategy ('fast', 'standard', or 'slow')
        """
        mapping = {
            'urgent': 'fast',
            'normal': 'standard',
            'low': 'slow'
        }
        
        return mapping.get(urgency, 'standard')
    
    def validate_gas_price(self, gas_price_params: Dict) -> bool:
        """
        Validate gas price parameters
        
        Args:
            gas_price_params: Gas price parameters
        
        Returns:
            bool: True if valid
        """
        if gas_price_params['type'] == 2:
            # EIP-1559
            required_keys = ['maxFeePerGas', 'maxPriorityFeePerGas']
            return all(key in gas_price_params for key in required_keys)
        else:
            # Legacy
            return 'gasPrice' in gas_price_params
    
    def get_gas_price_in_gwei(self, gas_price_params: Dict) -> float:
        """
        Get gas price in gwei for display
        
        Args:
            gas_price_params: Gas price parameters
        
        Returns:
            float: Gas price in gwei
        """
        if gas_price_params['type'] == 2:
            # EIP-1559: use maxFeePerGas
            return float(self.w3.fromWei(gas_price_params['maxFeePerGas'], 'gwei'))
        else:
            # Legacy: use gasPrice
            return float(self.w3.fromWei(gas_price_params['gasPrice'], 'gwei'))


# Helper function to create gas estimator
def create_gas_estimator(w3: Web3) -> GasEstimator:
    """
    Create gas estimator instance
    
    Args:
        w3: Web3 instance
    
    Returns:
        GasEstimator: Gas estimator instance
    """
    return GasEstimator(w3)


# Export
__all__ = ['GasEstimator', 'create_gas_estimator']
