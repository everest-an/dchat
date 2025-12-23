/**
 * Web3 Subscription Service
 * 
 * This service handles interactions with the SubscriptionManager smart contract
 * and provides methods for subscription management with crypto payments.
 * 
 * Features:
 * - Subscribe with ETH, USDT, or USDC
 * - Get subscription status and pricing
 * - Mint NFT membership cards
 * - Sync subscription data with backend
 * 
 * @author Manus AI
 * @date 2025-11-05
 */

import { ethers } from 'ethers'

// Contract addresses (Sepolia testnet)
const SUBSCRIPTION_MANAGER_ADDRESS = '0x5d154C1A6DE2B10aFcCd139A4aBa3bbCfd8A31c8'

// ERC-20 token addresses (Sepolia)
const PAYMENT_TOKENS = {
  ETH: '0x0000000000000000000000000000000000000000',
  USDT: '0x...', // TODO: Add Sepolia USDT address
  USDC: '0x...'  // TODO: Add Sepolia USDC address
}

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 0,
  PRO: 1,
  ENTERPRISE: 2
}

// Subscription periods
export const SUBSCRIPTION_PERIODS = {
  MONTHLY: 0,
  YEARLY: 1
}

// Minimal ABI for SubscriptionManager contract
const SUBSCRIPTION_MANAGER_ABI = [
  // Subscribe function
  {
    "inputs": [
      {"internalType": "uint8", "name": "tier", "type": "uint8"},
      {"internalType": "uint8", "name": "duration", "type": "uint8"},
      {"internalType": "address", "name": "paymentToken", "type": "address"},
      {"internalType": "bool", "name": "autoRenew", "type": "bool"}
    ],
    "name": "subscribe",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  // Get user subscription
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
  // Get user tier
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserTier",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Check if subscription is active
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "isSubscriptionActive",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Get pricing
  {
    "inputs": [{"internalType": "uint8", "name": "tier", "type": "uint8"}],
    "name": "pricing",
    "outputs": [
      {"internalType": "uint256", "name": "monthlyPrice", "type": "uint256"},
      {"internalType": "uint256", "name": "yearlyPrice", "type": "uint256"},
      {"internalType": "uint256", "name": "nftPrice", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Cancel subscription
  {
    "inputs": [],
    "name": "cancelSubscription",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Renew subscription
  {
    "inputs": [{"internalType": "uint256", "name": "subscriptionId", "type": "uint256"}],
    "name": "renewSubscription",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  // Mint NFT membership
  {
    "inputs": [
      {"internalType": "uint8", "name": "tier", "type": "uint8"},
      {"internalType": "address", "name": "paymentToken", "type": "address"}
    ],
    "name": "mintNFTMembership",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
]

// ERC-20 token ABI (for approve function)
const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
]

class Web3SubscriptionService {
  constructor() {
    this.provider = null
    this.signer = null
    this.subscriptionContract = null
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
      
      // Initialize subscription contract
      this.subscriptionContract = new ethers.Contract(
        SUBSCRIPTION_MANAGER_ADDRESS,
        SUBSCRIPTION_MANAGER_ABI,
        this.signer
      )
      
      console.log('✅ Web3SubscriptionService initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Web3SubscriptionService:', error)
      return false
    }
  }

  /**
   * Get pricing for a subscription tier
   * @param {number} tier - Subscription tier (0=FREE, 1=PRO, 2=ENTERPRISE)
   * @returns {Object} Pricing information
   */
  async getPricing(tier) {
    try {
      const pricing = await this.subscriptionContract.pricing(tier)
      
      return {
        monthlyPrice: pricing.monthlyPrice.toString(),
        yearlyPrice: pricing.yearlyPrice.toString(),
        nftPrice: pricing.nftPrice.toString(),
        monthlyPriceEth: ethers.utils.formatEther(pricing.monthlyPrice),
        yearlyPriceEth: ethers.utils.formatEther(pricing.yearlyPrice),
        nftPriceEth: ethers.utils.formatEther(pricing.nftPrice)
      }
    } catch (error) {
      console.error('Error getting pricing:', error)
      throw error
    }
  }

  /**
   * Get user's subscription information
   * @param {string} userAddress - User's wallet address
   * @returns {Object} Subscription information
   */
  async getUserSubscription(userAddress) {
    try {
      const subscription = await this.subscriptionContract.getUserSubscription(userAddress)
      
      // Check if subscription exists (id > 0)
      if (subscription.id.toNumber() === 0) {
        return null
      }
      
      return {
        id: subscription.id.toNumber(),
        user: subscription.user,
        tier: subscription.tier,
        duration: subscription.duration,
        status: subscription.status,
        startTime: new Date(subscription.startTime.toNumber() * 1000),
        endTime: new Date(subscription.endTime.toNumber() * 1000),
        amount: subscription.amount.toString(),
        paymentToken: subscription.paymentToken,
        autoRenew: subscription.autoRenew,
        createdAt: new Date(subscription.createdAt.toNumber() * 1000)
      }
    } catch (error) {
      console.error('Error getting user subscription:', error)
      throw error
    }
  }

  /**
   * Get user's subscription tier
   * @param {string} userAddress - User's wallet address
   * @returns {number} Subscription tier
   */
  async getUserTier(userAddress) {
    try {
      const tier = await this.subscriptionContract.getUserTier(userAddress)
      return tier
    } catch (error) {
      console.error('Error getting user tier:', error)
      return SUBSCRIPTION_TIERS.FREE
    }
  }

  /**
   * Check if user has an active subscription
   * @param {string} userAddress - User's wallet address
   * @returns {boolean} True if subscription is active
   */
  async isSubscriptionActive(userAddress) {
    try {
      return await this.subscriptionContract.isSubscriptionActive(userAddress)
    } catch (error) {
      console.error('Error checking subscription status:', error)
      return false
    }
  }

  /**
   * Subscribe to a tier with crypto payment
   * @param {number} tier - Subscription tier
   * @param {number} period - Subscription period (0=MONTHLY, 1=YEARLY)
   * @param {string} paymentToken - Payment token ('ETH', 'USDT', 'USDC')
   * @param {boolean} autoRenew - Enable auto-renewal
   * @param {Function} onProgress - Progress callback
   * @returns {Object} Transaction receipt and subscription data
   */
  async subscribe(tier, period, paymentToken = 'ETH', autoRenew = false, onProgress = null) {
    try {
      // Step 1: Get pricing
      onProgress?.({ step: 1, message: 'Getting pricing...' })
      const pricing = await this.getPricing(tier)
      const price = period === SUBSCRIPTION_PERIODS.MONTHLY 
        ? pricing.monthlyPrice 
        : pricing.yearlyPrice
      
      // Step 2: Prepare payment
      onProgress?.({ step: 2, message: 'Preparing payment...' })
      const tokenAddress = PAYMENT_TOKENS[paymentToken]
      
      // Step 3: If ERC-20 token, approve spending
      if (paymentToken !== 'ETH') {
        onProgress?.({ step: 3, message: `Approving ${paymentToken} spending...` })
        await this.approveTokenSpending(tokenAddress, price)
      }
      
      // Step 4: Subscribe
      onProgress?.({ step: 4, message: 'Subscribing...' })
      const tx = await this.subscriptionContract.subscribe(
        tier,
        period,
        tokenAddress,
        autoRenew,
        {
          value: paymentToken === 'ETH' ? price : 0,
          gasLimit: 300000
        }
      )
      
      // Step 5: Wait for confirmation
      onProgress?.({ step: 5, message: 'Waiting for confirmation...' })
      const receipt = await tx.wait()
      
      // Step 6: Sync with backend
      onProgress?.({ step: 6, message: 'Syncing with backend...' })
      await this.syncSubscriptionToBackend(receipt.transactionHash, tier, period, paymentToken)
      
      onProgress?.({ step: 7, message: 'Subscription successful!' })
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      }
    } catch (error) {
      console.error('Error subscribing:', error)
      throw error
    }
  }

  /**
   * Approve ERC-20 token spending
   * @param {string} tokenAddress - Token contract address
   * @param {string} amount - Amount to approve (in wei)
   */
  async approveTokenSpending(tokenAddress, amount) {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.signer
      )
      
      // Check current allowance
      const userAddress = await this.signer.getAddress()
      const currentAllowance = await tokenContract.allowance(
        userAddress,
        SUBSCRIPTION_MANAGER_ADDRESS
      )
      
      // If allowance is sufficient, skip approval
      if (currentAllowance.gte(amount)) {
        console.log('✅ Token allowance already sufficient')
        return
      }
      
      // Approve spending
      const tx = await tokenContract.approve(SUBSCRIPTION_MANAGER_ADDRESS, amount)
      await tx.wait()
      
      console.log('✅ Token spending approved')
    } catch (error) {
      console.error('Error approving token spending:', error)
      throw error
    }
  }

  /**
   * Cancel subscription
   * @returns {Object} Transaction receipt
   */
  async cancelSubscription() {
    try {
      const tx = await this.subscriptionContract.cancelSubscription()
      const receipt = await tx.wait()
      
      return {
        success: true,
        transactionHash: receipt.transactionHash
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      throw error
    }
  }

  /**
   * Renew subscription
   * @param {number} subscriptionId - Subscription ID to renew
   * @param {Function} onProgress - Progress callback
   * @returns {Object} Transaction receipt
   */
  async renewSubscription(subscriptionId, onProgress = null) {
    try {
      // Get current subscription
      const userAddress = await this.signer.getAddress()
      const subscription = await this.getUserSubscription(userAddress)
      
      if (!subscription) {
        throw new Error('No subscription found')
      }
      
      // Get pricing
      onProgress?.({ step: 1, message: 'Getting pricing...' })
      const pricing = await this.getPricing(subscription.tier)
      const price = subscription.duration === SUBSCRIPTION_PERIODS.MONTHLY
        ? pricing.monthlyPrice
        : pricing.yearlyPrice
      
      // Renew
      onProgress?.({ step: 2, message: 'Renewing subscription...' })
      const tx = await this.subscriptionContract.renewSubscription(
        subscriptionId,
        {
          value: subscription.paymentToken === PAYMENT_TOKENS.ETH ? price : 0,
          gasLimit: 300000
        }
      )
      
      // Wait for confirmation
      onProgress?.({ step: 3, message: 'Waiting for confirmation...' })
      const receipt = await tx.wait()
      
      // Sync with backend
      onProgress?.({ step: 4, message: 'Syncing with backend...' })
      await this.syncRenewalToBackend(receipt.transactionHash)
      
      return {
        success: true,
        transactionHash: receipt.transactionHash
      }
    } catch (error) {
      console.error('Error renewing subscription:', error)
      throw error
    }
  }

  /**
   * Mint NFT membership card
   * @param {number} tier - Subscription tier
   * @param {string} paymentToken - Payment token
   * @param {Function} onProgress - Progress callback
   * @returns {Object} Transaction receipt
   */
  async mintNFTMembership(tier, paymentToken = 'ETH', onProgress = null) {
    try {
      // Get pricing
      onProgress?.({ step: 1, message: 'Getting NFT pricing...' })
      const pricing = await this.getPricing(tier)
      const price = pricing.nftPrice
      
      // Prepare payment
      onProgress?.({ step: 2, message: 'Preparing payment...' })
      const tokenAddress = PAYMENT_TOKENS[paymentToken]
      
      // If ERC-20, approve spending
      if (paymentToken !== 'ETH') {
        onProgress?.({ step: 3, message: `Approving ${paymentToken} spending...` })
        await this.approveTokenSpending(tokenAddress, price)
      }
      
      // Mint NFT
      onProgress?.({ step: 4, message: 'Minting NFT membership...' })
      const tx = await this.subscriptionContract.mintNFTMembership(
        tier,
        tokenAddress,
        {
          value: paymentToken === 'ETH' ? price : 0,
          gasLimit: 300000
        }
      )
      
      // Wait for confirmation
      onProgress?.({ step: 5, message: 'Waiting for confirmation...' })
      const receipt = await tx.wait()
      
      onProgress?.({ step: 6, message: 'NFT membership minted!' })
      
      return {
        success: true,
        transactionHash: receipt.transactionHash
      }
    } catch (error) {
      console.error('Error minting NFT membership:', error)
      throw error
    }
  }

  /**
   * Sync subscription to backend
   * @param {string} transactionHash - Transaction hash
   * @param {number} tier - Subscription tier
   * @param {number} period - Subscription period
   * @param {string} paymentToken - Payment token
   */
  async syncSubscriptionToBackend(transactionHash, tier, period, paymentToken) {
    try {
      const response = await fetch(`${this.backendUrl}/api/subscriptions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
          'X-User-Address': await this.signer.getAddress()
        },
        body: JSON.stringify({
          tier: Object.keys(SUBSCRIPTION_TIERS)[tier],
          period: Object.keys(SUBSCRIPTION_PERIODS)[period],
          paymentToken,
          transactionHash
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to sync subscription to backend')
      }
      
      const data = await response.json()
      console.log('✅ Subscription synced to backend:', data)
      return data
    } catch (error) {
      console.error('Error syncing subscription to backend:', error)
      // Don't throw error - subscription is still valid on blockchain
    }
  }

  /**
   * Sync renewal to backend
   * @param {string} transactionHash - Transaction hash
   */
  async syncRenewalToBackend(transactionHash) {
    try {
      const response = await fetch(`${this.backendUrl}/api/subscriptions/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
          'X-User-Address': await this.signer.getAddress()
        },
        body: JSON.stringify({
          transactionHash
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to sync renewal to backend')
      }
      
      const data = await response.json()
      console.log('✅ Renewal synced to backend:', data)
      return data
    } catch (error) {
      console.error('Error syncing renewal to backend:', error)
    }
  }

  /**
   * Get subscription plans from backend
   * @returns {Array} Subscription plans
   */
  async getSubscriptionPlans() {
    try {
      const response = await fetch(`${this.backendUrl}/api/subscriptions/plans`)
      
      if (!response.ok) {
        throw new Error('Failed to get subscription plans')
      }
      
      const data = await response.json()
      return data.plans
    } catch (error) {
      console.error('Error getting subscription plans:', error)
      throw error
    }
  }
}

// Export singleton instance
export const web3SubscriptionService = new Web3SubscriptionService()
export default web3SubscriptionService
