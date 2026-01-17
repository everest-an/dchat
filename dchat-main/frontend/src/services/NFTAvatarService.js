/**
 * NFT Avatar Service
 * 
 * This service handles interactions with the NFTAvatarManager smart contract
 * and provides methods for setting and managing NFT avatars.
 * 
 * Features:
 * - Set ERC-721 or ERC-1155 NFT as avatar
 * - Remove NFT avatar
 * - Get avatar history
 * - Verify NFT ownership
 * 
 * @author Manus AI
 * @date 2025-11-05
 */

import { ethers } from 'ethers'

// Contract address (Sepolia testnet)
const NFT_AVATAR_MANAGER_ADDRESS = '0xF91E0E6afF5A93831F67838539245a44Ca384187'

// NFT standards
export const NFT_STANDARDS = {
  ERC721: 0,
  ERC1155: 1
}

// Minimal ABI for NFTAvatarManager contract
const NFT_AVATAR_MANAGER_ABI = [
  // Set ERC-721 avatar
  {
    "inputs": [
      {"internalType": "address", "name": "nftContract", "type": "address"},
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "setAvatarERC721",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Set ERC-1155 avatar
  {
    "inputs": [
      {"internalType": "address", "name": "nftContract", "type": "address"},
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "setAvatarERC1155",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Remove avatar
  {
    "inputs": [],
    "name": "removeAvatar",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Get user avatar
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
  // Verify avatar ownership
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "verifyAvatarOwnership",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Get avatar history
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

// ERC-721 ABI (for checking ownership)
const ERC721_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
]

// ERC-1155 ABI (for checking ownership)
const ERC1155_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "account", "type": "address"},
      {"internalType": "uint256", "name": "id", "type": "uint256"}
    ],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
]

class NFTAvatarService {
  constructor() {
    this.provider = null
    this.signer = null
    this.nftAvatarContract = null
    this.backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000'
  }

  /**
   * Initialize the service with Web3 provider
   * @param {Object} provider - Ethereum provider (e.g., from MetaMask)
   */
  async initialize(provider) {
    try {
      this.provider = new ethers.providers.Web3Provider(provider)
      this.signer = this.provider.getSigner()
      
      // Initialize NFT avatar contract
      this.nftAvatarContract = new ethers.Contract(
        NFT_AVATAR_MANAGER_ADDRESS,
        NFT_AVATAR_MANAGER_ABI,
        this.signer
      )
      
      console.log('✅ NFTAvatarService initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize NFTAvatarService:', error)
      return false
    }
  }

  /**
   * Get user's NFT avatar
   * @param {string} userAddress - User's wallet address
   * @returns {Object|null} Avatar information or null if no avatar set
   */
  async getUserAvatar(userAddress) {
    try {
      const avatar = await this.nftAvatarContract.getUserAvatar(userAddress)
      
      // Check if avatar is set (contract address is not zero)
      if (avatar.contractAddress === '0x0000000000000000000000000000000000000000') {
        return null
      }
      
      return {
        contractAddress: avatar.contractAddress,
        tokenId: avatar.tokenId.toString(),
        standard: avatar.standard === NFT_STANDARDS.ERC721 ? 'ERC721' : 'ERC1155',
        setAt: new Date(avatar.setAt.toNumber() * 1000)
      }
    } catch (error) {
      console.error('Error getting user avatar:', error)
      return null
    }
  }

  /**
   * Verify if user still owns their NFT avatar
   * @param {string} userAddress - User's wallet address
   * @returns {boolean} True if user owns the avatar
   */
  async verifyAvatarOwnership(userAddress) {
    try {
      return await this.nftAvatarContract.verifyAvatarOwnership(userAddress)
    } catch (error) {
      console.error('Error verifying avatar ownership:', error)
      return false
    }
  }

  /**
   * Get user's avatar history
   * @param {string} userAddress - User's wallet address
   * @returns {Array} Array of avatar objects
   */
  async getUserAvatarHistory(userAddress) {
    try {
      const history = await this.nftAvatarContract.getUserAvatarHistory(userAddress)
      
      return history.map(avatar => ({
        contractAddress: avatar.contractAddress,
        tokenId: avatar.tokenId.toString(),
        standard: avatar.standard === NFT_STANDARDS.ERC721 ? 'ERC721' : 'ERC1155',
        setAt: new Date(avatar.setAt.toNumber() * 1000)
      }))
    } catch (error) {
      console.error('Error getting avatar history:', error)
      return []
    }
  }

  /**
   * Check if user owns an NFT
   * @param {string} nftContract - NFT contract address
   * @param {string} tokenId - Token ID
   * @param {string} standard - NFT standard ('ERC721' or 'ERC1155')
   * @param {string} userAddress - User's wallet address
   * @returns {boolean} True if user owns the NFT
   */
  async checkNFTOwnership(nftContract, tokenId, standard, userAddress) {
    try {
      if (standard === 'ERC721') {
        const contract = new ethers.Contract(nftContract, ERC721_ABI, this.provider)
        const owner = await contract.ownerOf(tokenId)
        return owner.toLowerCase() === userAddress.toLowerCase()
      } else if (standard === 'ERC1155') {
        const contract = new ethers.Contract(nftContract, ERC1155_ABI, this.provider)
        const balance = await contract.balanceOf(userAddress, tokenId)
        return balance.gt(0)
      }
      return false
    } catch (error) {
      console.error('Error checking NFT ownership:', error)
      return false
    }
  }

  /**
   * Set NFT as avatar
   * @param {string} nftContract - NFT contract address
   * @param {string} tokenId - Token ID
   * @param {string} standard - NFT standard ('ERC721' or 'ERC1155')
   * @param {Function} onProgress - Progress callback
   * @returns {Object} Transaction receipt
   */
  async setNFTAvatar(nftContract, tokenId, standard, onProgress = null) {
    try {
      const userAddress = await this.signer.getAddress()
      
      // Step 1: Verify ownership
      onProgress?.({ step: 1, message: 'Verifying NFT ownership...' })
      const ownsNFT = await this.checkNFTOwnership(nftContract, tokenId, standard, userAddress)
      if (!ownsNFT) {
        throw new Error('You do not own this NFT')
      }
      
      // Step 2: Set avatar on blockchain
      onProgress?.({ step: 2, message: 'Setting NFT avatar...' })
      let tx
      if (standard === 'ERC721') {
        tx = await this.nftAvatarContract.setAvatarERC721(nftContract, tokenId)
      } else if (standard === 'ERC1155') {
        tx = await this.nftAvatarContract.setAvatarERC1155(nftContract, tokenId)
      } else {
        throw new Error('Invalid NFT standard')
      }
      
      // Step 3: Wait for confirmation
      onProgress?.({ step: 3, message: 'Waiting for confirmation...' })
      const receipt = await tx.wait()
      
      // Step 4: Sync with backend
      onProgress?.({ step: 4, message: 'Syncing with backend...' })
      await this.syncAvatarToBackend(receipt.transactionHash, nftContract, tokenId, standard)
      
      onProgress?.({ step: 5, message: 'Avatar set successfully!' })
      
      return {
        success: true,
        transactionHash: receipt.transactionHash
      }
    } catch (error) {
      console.error('Error setting NFT avatar:', error)
      throw error
    }
  }

  /**
   * Remove NFT avatar
   * @returns {Object} Transaction receipt
   */
  async removeNFTAvatar() {
    try {
      const tx = await this.nftAvatarContract.removeAvatar()
      const receipt = await tx.wait()
      
      return {
        success: true,
        transactionHash: receipt.transactionHash
      }
    } catch (error) {
      console.error('Error removing NFT avatar:', error)
      throw error
    }
  }

  /**
   * Sync avatar to backend
   * @param {string} transactionHash - Transaction hash
   * @param {string} nftContract - NFT contract address
   * @param {string} tokenId - Token ID
   * @param {string} standard - NFT standard
   */
  async syncAvatarToBackend(transactionHash, nftContract, tokenId, standard) {
    try {
      const response = await fetch(`${this.backendUrl}/api/avatars/nft/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
          'X-User-Address': await this.signer.getAddress()
        },
        body: JSON.stringify({
          nftContract,
          tokenId,
          standard,
          transactionHash
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to sync avatar to backend')
      }
      
      const data = await response.json()
      console.log('✅ Avatar synced to backend:', data)
      return data
    } catch (error) {
      console.error('Error syncing avatar to backend:', error)
      // Don't throw error - avatar is still valid on blockchain
    }
  }

  /**
   * Get avatar from backend
   * @param {string} userAddress - User's wallet address
   * @returns {Object|null} Avatar information
   */
  async getAvatarFromBackend(userAddress) {
    try {
      const response = await fetch(`${this.backendUrl}/api/avatars/nft/${userAddress}`)
      
      if (!response.ok) {
        return null
      }
      
      const data = await response.json()
      return data.avatar
    } catch (error) {
      console.error('Error getting avatar from backend:', error)
      return null
    }
  }

  /**
   * Get user's NFTs from wallet
   * This is a placeholder - in production, you would use services like
   * Alchemy, Moralis, or OpenSea API to fetch user's NFTs
   * 
   * @param {string} userAddress - User's wallet address
   * @returns {Array} Array of NFT objects
   */
  async getUserNFTs(userAddress) {
    try {
      // TODO: Implement NFT fetching using Alchemy/Moralis API
      // For now, return empty array
      console.log('TODO: Implement getUserNFTs using Alchemy/Moralis API')
      return []
    } catch (error) {
      console.error('Error getting user NFTs:', error)
      return []
    }
  }

  /**
   * Get NFT metadata
   * @param {string} nftContract - NFT contract address
   * @param {string} tokenId - Token ID
   * @returns {Object} NFT metadata
   */
  async getNFTMetadata(nftContract, tokenId) {
    try {
      // TODO: Implement metadata fetching
      // For now, return placeholder
      return {
        name: `NFT #${tokenId}`,
        description: 'NFT Avatar',
        image: null
      }
    } catch (error) {
      console.error('Error getting NFT metadata:', error)
      return null
    }
  }
}

// Export singleton instance
export const nftAvatarService = new NFTAvatarService()
export default nftAvatarService
