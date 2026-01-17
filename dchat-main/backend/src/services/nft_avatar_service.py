"""
NFT Avatar Service

This module provides services for interacting with the NFTAvatarManager
smart contract and managing NFT avatar data.

Author: Manus AI
Date: 2025-11-05
"""

import os
from web3 import Web3
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from ..models.subscription import NFTAvatar, NFTStandard, db


class NFTAvatarService:
    """
    Service for managing NFT avatars via smart contract
    """
    
    def __init__(self):
        """Initialize Web3 connection and contract"""
        # Connect to Web3 provider
        provider_url = os.getenv('WEB3_PROVIDER_URL', 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY')
        self.w3 = Web3(Web3.HTTPProvider(provider_url))
        
        # Contract address
        self.nft_avatar_contract_address = os.getenv(
            'CONTRACT_NFT_AVATAR_MANAGER',
            '0xF91E0E6afF5A93831F67838539245a44Ca384187'
        )
        
        # Load contract ABI
        self.nft_avatar_abi = self._load_nft_avatar_abi()
        
        # Initialize contract
        self.nft_avatar_contract = self.w3.eth.contract(
            address=self.nft_avatar_contract_address,
            abi=self.nft_avatar_abi
        )
    
    def _load_nft_avatar_abi(self) -> List[Dict]:
        """
        Load NFTAvatarManager contract ABI
        
        Returns:
            Contract ABI as list of dictionaries
        """
        # In production, load from file or environment
        # For now, return minimal ABI for key functions
        return [
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "getUserAvatar",
                "outputs": [
                    {"internalType": "address", "name": "contractAddress", "type": "address"},
                    {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
                    {"internalType": "uint8", "name": "standard", "type": "uint8"},
                    {"internalType": "uint256", "name": "setAt", "type": "uint256"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "verifyAvatarOwnership",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "getUserAvatarHistory",
                "outputs": [
                    {
                        "components": [
                            {"internalType": "address", "name": "contractAddress", "type": "address"},
                            {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
                            {"internalType": "uint8", "name": "standard", "type": "uint8"},
                            {"internalType": "uint256", "name": "setAt", "type": "uint256"}
                        ],
                        "internalType": "struct NFTAvatarManager.NFTAvatar[]",
                        "name": "",
                        "type": "tuple[]"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ]
    
    def get_user_avatar(self, user_address: str) -> Optional[Dict]:
        """
        Get user's current NFT avatar from blockchain
        
        Args:
            user_address: User's wallet address
            
        Returns:
            Avatar data dictionary or None if no avatar set
        """
        try:
            # Call smart contract
            result = self.nft_avatar_contract.functions.getUserAvatar(
                Web3.to_checksum_address(user_address)
            ).call()
            
            contract_address, token_id, standard, set_at = result
            
            # Return None if no avatar set
            if contract_address == '0x0000000000000000000000000000000000000000':
                return None
            
            # Map standard enum
            standard_map = {0: 'ERC721', 1: 'ERC1155'}
            
            return {
                'contractAddress': contract_address,
                'tokenId': str(token_id),
                'standard': standard_map.get(standard, 'ERC721'),
                'setAt': datetime.fromtimestamp(set_at)
            }
            
        except Exception as e:
            print(f"Error getting user avatar: {e}")
            return None
    
    def verify_avatar_ownership(self, user_address: str) -> bool:
        """
        Verify if user still owns their NFT avatar
        
        Args:
            user_address: User's wallet address
            
        Returns:
            True if user owns the avatar, False otherwise
        """
        try:
            return self.nft_avatar_contract.functions.verifyAvatarOwnership(
                Web3.to_checksum_address(user_address)
            ).call()
        except Exception as e:
            print(f"Error verifying avatar ownership: {e}")
            return False
    
    def get_user_avatar_history(self, user_address: str) -> List[Dict]:
        """
        Get user's avatar history from blockchain
        
        Args:
            user_address: User's wallet address
            
        Returns:
            List of avatar data dictionaries
        """
        try:
            # Call smart contract
            results = self.nft_avatar_contract.functions.getUserAvatarHistory(
                Web3.to_checksum_address(user_address)
            ).call()
            
            # Map standard enum
            standard_map = {0: 'ERC721', 1: 'ERC1155'}
            
            avatars = []
            for contract_address, token_id, standard, set_at in results:
                avatars.append({
                    'contractAddress': contract_address,
                    'tokenId': str(token_id),
                    'standard': standard_map.get(standard, 'ERC721'),
                    'setAt': datetime.fromtimestamp(set_at)
                })
            
            return avatars
            
        except Exception as e:
            print(f"Error getting avatar history: {e}")
            return []
    
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
    
    def sync_avatar_to_db(self, user_address: str, tx_hash: str) -> Optional[NFTAvatar]:
        """
        Sync avatar data from blockchain to database
        
        Args:
            user_address: User's wallet address
            tx_hash: Transaction hash
            
        Returns:
            NFTAvatar object or None if failed
        """
        try:
            # Get avatar from blockchain
            avatar_data = self.get_user_avatar(user_address)
            if not avatar_data:
                return None
            
            # Mark all previous avatars as not current
            NFTAvatar.query.filter_by(
                user_address=user_address.lower(),
                is_current=True
            ).update({'is_current': False})
            
            # Check if this avatar already exists
            existing_avatar = NFTAvatar.query.filter_by(
                user_address=user_address.lower(),
                contract_address=avatar_data['contractAddress'].lower(),
                token_id=avatar_data['tokenId']
            ).first()
            
            if existing_avatar:
                # Update existing avatar
                existing_avatar.is_current = True
                existing_avatar.is_valid = True
                existing_avatar.set_at = avatar_data['setAt']
                existing_avatar.transaction_hash = tx_hash
                existing_avatar.updated_at = datetime.utcnow()
                db.session.commit()
                return existing_avatar
            else:
                # Create new avatar
                new_avatar = NFTAvatar(
                    user_address=user_address.lower(),
                    contract_address=avatar_data['contractAddress'].lower(),
                    token_id=avatar_data['tokenId'],
                    standard=NFTStandard[avatar_data['standard']],
                    is_current=True,
                    is_valid=True,
                    transaction_hash=tx_hash,
                    set_at=avatar_data['setAt']
                )
                db.session.add(new_avatar)
                db.session.commit()
                return new_avatar
                
        except Exception as e:
            print(f"Error syncing avatar to DB: {e}")
            db.session.rollback()
            return None
    
    def get_user_avatar_from_db(self, user_address: str) -> Optional[Dict]:
        """
        Get user's current avatar from database
        
        Args:
            user_address: User's wallet address
            
        Returns:
            Avatar dictionary or None
        """
        try:
            avatar = NFTAvatar.query.filter_by(
                user_address=user_address.lower(),
                is_current=True
            ).first()
            
            if avatar:
                # Verify ownership on blockchain
                is_valid = self.verify_avatar_ownership(user_address)
                if avatar.is_valid != is_valid:
                    avatar.is_valid = is_valid
                    db.session.commit()
                
                return avatar.to_dict()
            
            return None
            
        except Exception as e:
            print(f"Error getting avatar from DB: {e}")
            return None
    
    def get_user_avatar_history_from_db(self, user_address: str) -> List[Dict]:
        """
        Get user's avatar history from database
        
        Args:
            user_address: User's wallet address
            
        Returns:
            List of avatar dictionaries
        """
        try:
            avatars = NFTAvatar.query.filter_by(
                user_address=user_address.lower()
            ).order_by(NFTAvatar.set_at.desc()).all()
            
            return [avatar.to_dict() for avatar in avatars]
            
        except Exception as e:
            print(f"Error getting avatar history from DB: {e}")
            return []


# Singleton instance
nft_avatar_service = NFTAvatarService()
