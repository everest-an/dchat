"""
Subscription Service

This module provides services for interacting with the SubscriptionManager
smart contract and managing subscription data.

Author: Manus AI
Date: 2025-11-05
"""

import os
import json
from web3 import Web3
from web3.exceptions import ContractLogicError
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from ..models.subscription import (
    Subscription, SubscriptionTier, SubscriptionPeriod, 
    SubscriptionStatus, db
)


class SubscriptionService:
    """
    Service for managing subscriptions via smart contract
    """
    
    def __init__(self):
        """Initialize Web3 connection and contract"""
        # Connect to Web3 provider
        provider_url = os.getenv('WEB3_PROVIDER_URL', 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY')
        self.w3 = Web3(Web3.HTTPProvider(provider_url))
        
        # Contract addresses
        self.subscription_contract_address = os.getenv(
            'CONTRACT_SUBSCRIPTION_MANAGER',
            '0x5d154C1A6DE2B10aFcCd139A4aBa3bbCfd8A31c8'
        )
        
        # Load contract ABI
        self.subscription_abi = self._load_subscription_abi()
        
        # Initialize contract
        self.subscription_contract = self.w3.eth.contract(
            address=self.subscription_contract_address,
            abi=self.subscription_abi
        )
    
    def _load_subscription_abi(self) -> List[Dict]:
        """
        Load SubscriptionManager contract ABI
        
        Returns:
            Contract ABI as list of dictionaries
        """
        # In production, load from file or environment
        # For now, return minimal ABI for key functions
        return [
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "getUserSubscription",
                "outputs": [
                    {"internalType": "uint256", "name": "id", "type": "uint256"},
                    {"internalType": "address", "name": "user", "type": "address"},
                    {"internalType": "uint8", "name": "tier", "type": "uint8"},
                    {"internalType": "uint8", "name": "duration", "type": "uint8"},
                    {"internalType": "uint8", "name": "status", "type": "uint8"},
                    {"internalType": "uint256", "name": "startTime", "type": "uint256"},
                    {"internalType": "uint256", "name": "endTime", "type": "uint256"},
                    {"internalType": "uint256", "name": "amount", "type": "uint256"},
                    {"internalType": "address", "name": "paymentToken", "type": "address"},
                    {"internalType": "bool", "name": "autoRenew", "type": "bool"},
                    {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "getUserTier",
                "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "isSubscriptionActive",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {"internalType": "uint8", "name": "tier", "type": "uint8"}
                ],
                "name": "pricing",
                "outputs": [
                    {"internalType": "uint256", "name": "monthlyPrice", "type": "uint256"},
                    {"internalType": "uint256", "name": "yearlyPrice", "type": "uint256"},
                    {"internalType": "uint256", "name": "nftPrice", "type": "uint256"}
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ]
    
    def get_user_subscription(self, user_address: str) -> Optional[Dict]:
        """
        Get user's current subscription from blockchain
        
        Args:
            user_address: User's wallet address
            
        Returns:
            Subscription data dictionary or None if no subscription
        """
        try:
            # Call smart contract
            result = self.subscription_contract.functions.getUserSubscription(
                Web3.to_checksum_address(user_address)
            ).call()
            
            # Parse result
            subscription_id, user, tier, duration, status, start_time, end_time, \
                amount, payment_token, auto_renew, created_at = result
            
            # Return None if no subscription (ID = 0)
            if subscription_id == 0:
                return None
            
            # Map enum values
            tier_map = {0: 'FREE', 1: 'PRO', 2: 'ENTERPRISE'}
            duration_map = {0: 'MONTHLY', 1: 'YEARLY'}
            status_map = {0: 'ACTIVE', 1: 'EXPIRED', 2: 'CANCELLED', 3: 'REFUNDED'}
            
            return {
                'blockchainId': subscription_id,
                'userAddress': user,
                'tier': tier_map.get(tier, 'FREE'),
                'period': duration_map.get(duration, 'MONTHLY'),
                'status': status_map.get(status, 'EXPIRED'),
                'startTime': datetime.fromtimestamp(start_time),
                'endTime': datetime.fromtimestamp(end_time),
                'amount': str(amount),
                'paymentToken': payment_token if payment_token != '0x0000000000000000000000000000000000000000' else 'ETH',
                'autoRenew': auto_renew,
                'createdAt': datetime.fromtimestamp(created_at)
            }
            
        except Exception as e:
            print(f"Error getting user subscription: {e}")
            return None
    
    def get_user_tier(self, user_address: str) -> str:
        """
        Get user's subscription tier
        
        Args:
            user_address: User's wallet address
            
        Returns:
            Subscription tier (FREE, PRO, ENTERPRISE)
        """
        try:
            tier = self.subscription_contract.functions.getUserTier(
                Web3.to_checksum_address(user_address)
            ).call()
            
            tier_map = {0: 'FREE', 1: 'PRO', 2: 'ENTERPRISE'}
            return tier_map.get(tier, 'FREE')
            
        except Exception as e:
            print(f"Error getting user tier: {e}")
            return 'FREE'
    
    def is_subscription_active(self, user_address: str) -> bool:
        """
        Check if user has an active subscription
        
        Args:
            user_address: User's wallet address
            
        Returns:
            True if subscription is active, False otherwise
        """
        try:
            return self.subscription_contract.functions.isSubscriptionActive(
                Web3.to_checksum_address(user_address)
            ).call()
        except Exception as e:
            print(f"Error checking subscription status: {e}")
            return False
    
    def get_pricing(self, tier: str) -> Dict[str, str]:
        """
        Get pricing for a subscription tier
        
        Args:
            tier: Subscription tier (PRO or ENTERPRISE)
            
        Returns:
            Dictionary with monthly, yearly, and NFT prices
        """
        try:
            # Map tier to enum value
            tier_map = {'FREE': 0, 'PRO': 1, 'ENTERPRISE': 2}
            tier_value = tier_map.get(tier.upper(), 1)
            
            # Get pricing from contract
            monthly, yearly, nft = self.subscription_contract.functions.pricing(
                tier_value
            ).call()
            
            return {
                'monthlyPrice': str(monthly),
                'yearlyPrice': str(yearly),
                'nftPrice': str(nft),
                'monthlyPriceEth': self.w3.from_wei(monthly, 'ether'),
                'yearlyPriceEth': self.w3.from_wei(yearly, 'ether'),
                'nftPriceEth': self.w3.from_wei(nft, 'ether')
            }
            
        except Exception as e:
            print(f"Error getting pricing: {e}")
            return {
                'monthlyPrice': '0',
                'yearlyPrice': '0',
                'nftPrice': '0'
            }
    
    def verify_transaction(self, tx_hash: str) -> Tuple[bool, Optional[Dict]]:
        """
        Verify a transaction on the blockchain
        
        Args:
            tx_hash: Transaction hash
            
        Returns:
            Tuple of (success, receipt_data)
        """
        try:
            # Get transaction receipt
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            
            # Check if transaction was successful
            if receipt['status'] != 1:
                return False, None
            
            # Parse receipt data
            receipt_data = {
                'transactionHash': receipt['transactionHash'].hex(),
                'blockNumber': receipt['blockNumber'],
                'from': receipt['from'],
                'to': receipt['to'],
                'gasUsed': receipt['gasUsed'],
                'status': receipt['status']
            }
            
            return True, receipt_data
            
        except Exception as e:
            print(f"Error verifying transaction: {e}")
            return False, None
    
    def sync_subscription_to_db(self, user_address: str, tx_hash: str) -> Optional[Subscription]:
        """
        Sync subscription data from blockchain to database
        
        Args:
            user_address: User's wallet address
            tx_hash: Transaction hash
            
        Returns:
            Subscription object or None if failed
        """
        try:
            # Get subscription from blockchain
            sub_data = self.get_user_subscription(user_address)
            if not sub_data:
                return None
            
            # Check if subscription already exists in DB
            existing_sub = Subscription.query.filter_by(
                blockchain_id=sub_data['blockchainId']
            ).first()
            
            if existing_sub:
                # Update existing subscription
                existing_sub.status = SubscriptionStatus[sub_data['status']]
                existing_sub.end_time = sub_data['endTime']
                existing_sub.auto_renew = sub_data['autoRenew']
                existing_sub.updated_at = datetime.utcnow()
                db.session.commit()
                return existing_sub
            else:
                # Create new subscription
                new_sub = Subscription(
                    blockchain_id=sub_data['blockchainId'],
                    user_address=user_address.lower(),
                    tier=SubscriptionTier[sub_data['tier']],
                    period=SubscriptionPeriod[sub_data['period']],
                    status=SubscriptionStatus[sub_data['status']],
                    start_time=sub_data['startTime'],
                    end_time=sub_data['endTime'],
                    amount=sub_data['amount'],
                    payment_token=sub_data['paymentToken'],
                    transaction_hash=tx_hash,
                    auto_renew=sub_data['autoRenew']
                )
                db.session.add(new_sub)
                db.session.commit()
                return new_sub
                
        except Exception as e:
            print(f"Error syncing subscription to DB: {e}")
            db.session.rollback()
            return None
    
    def get_user_subscription_history(self, user_address: str) -> List[Dict]:
        """
        Get user's subscription history from database
        
        Args:
            user_address: User's wallet address
            
        Returns:
            List of subscription dictionaries
        """
        try:
            subscriptions = Subscription.query.filter_by(
                user_address=user_address.lower()
            ).order_by(Subscription.created_at.desc()).all()
            
            return [sub.to_dict() for sub in subscriptions]
            
        except Exception as e:
            print(f"Error getting subscription history: {e}")
            return []


# Singleton instance
subscription_service = SubscriptionService()
