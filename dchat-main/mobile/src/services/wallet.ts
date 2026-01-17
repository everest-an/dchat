/**
 * Wallet Service
 * 
 * Handles cryptocurrency wallet operations.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import { ethers } from 'ethers';
import { api } from './api';
import { Wallet, TokenBalance, Transaction, Transfer, Token, APIResponse } from '@/types';
import { WEB3_CONFIG, SUPPORTED_TOKENS } from '@/constants/config';
import { createWalletFromPrivateKey, storePrivateKey, retrievePrivateKey } from '@/utils/crypto';

class WalletService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(WEB3_CONFIG.RPC_URL);
  }

  /**
   * Initialize wallet from stored private key
   */
  async initialize(address: string): Promise<void> {
    try {
      const privateKey = await retrievePrivateKey(address);
      if (privateKey) {
        this.wallet = createWalletFromPrivateKey(privateKey).connect(this.provider);
        console.log('✅ Wallet initialized');
      }
    } catch (error) {
      console.error('❌ Failed to initialize wallet:', error);
    }
  }

  /**
   * Create new wallet
   */
  async createWallet(): Promise<{ address: string; mnemonic: string }> {
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    const mnemonic = wallet.mnemonic?.phrase || '';

    // Store private key securely
    await storePrivateKey(address, wallet.privateKey);

    // Connect to provider
    this.wallet = wallet.connect(this.provider);

    return { address, mnemonic };
  }

  /**
   * Import wallet from mnemonic
   */
  async importFromMnemonic(mnemonic: string): Promise<string> {
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    const address = wallet.address;

    // Store private key securely
    await storePrivateKey(address, wallet.privateKey);

    // Connect to provider
    this.wallet = wallet.connect(this.provider);

    return address;
  }

  /**
   * Import wallet from private key
   */
  async importFromPrivateKey(privateKey: string): Promise<string> {
    const wallet = createWalletFromPrivateKey(privateKey);
    const address = wallet.address;

    // Store private key securely
    await storePrivateKey(address, privateKey);

    // Connect to provider
    this.wallet = wallet.connect(this.provider);

    return address;
  }

  /**
   * Get wallet balance
   */
  async getBalance(address: string): Promise<APIResponse<Wallet>> {
    return await api.get(`/wallet/${address}`);
  }

  /**
   * Get token balance
   */
  async getTokenBalance(address: string, tokenAddress: string): Promise<string> {
    try {
      if (!tokenAddress) {
        // Native ETH balance
        const balance = await this.provider.getBalance(address);
        return balance.toString();
      }

      // ERC20 token balance
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );

      const balance = await tokenContract.balanceOf(address);
      return balance.toString();
    } catch (error) {
      console.error('❌ Failed to get token balance:', error);
      return '0';
    }
  }

  /**
   * Get all token balances
   */
  async getAllBalances(address: string): Promise<TokenBalance[]> {
    const balances: TokenBalance[] = [];

    for (const token of SUPPORTED_TOKENS) {
      try {
        const balance = await this.getTokenBalance(address, token.address || '');
        const balanceFormatted = ethers.formatUnits(balance, token.decimals);

        balances.push({
          token,
          balance,
          balanceFormatted,
        });
      } catch (error) {
        console.error(`Failed to get balance for ${token.symbol}:`, error);
      }
    }

    return balances;
  }

  /**
   * Send ETH
   */
  async sendETH(to: string, amount: string): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      const tx = await this.wallet.sendTransaction({
        to,
        value: ethers.parseEther(amount),
      });

      console.log('📤 Transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ Transaction confirmed:', tx.hash);

      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to send ETH:', error);
      throw error;
    }
  }

  /**
   * Send ERC20 token
   */
  async sendToken(
    tokenAddress: string,
    to: string,
    amount: string,
    decimals: number
  ): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function transfer(address to, uint256 amount) returns (bool)',
          'function decimals() view returns (uint8)',
        ],
        this.wallet
      );

      const amountWei = ethers.parseUnits(amount, decimals);
      const tx = await tokenContract.transfer(to, amountWei);

      console.log('📤 Token transfer sent:', tx.hash);
      await tx.wait();
      console.log('✅ Token transfer confirmed:', tx.hash);

      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to send token:', error);
      throw error;
    }
  }

  /**
   * Estimate gas for ETH transfer
   */
  async estimateGasETH(to: string, amount: string): Promise<string> {
    try {
      const gasLimit = await this.provider.estimateGas({
        to,
        value: ethers.parseEther(amount),
      });

      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCost = gasLimit * gasPrice;

      return ethers.formatEther(gasCost);
    } catch (error) {
      console.error('❌ Failed to estimate gas:', error);
      return '0';
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(address: string): Promise<APIResponse<Transaction[]>> {
    return await api.get(`/wallet/${address}/transactions`);
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(hash: string): Promise<Transaction | null> {
    try {
      const tx = await this.provider.getTransaction(hash);
      const receipt = await this.provider.getTransactionReceipt(hash);

      if (!tx || !receipt) {
        return null;
      }

      return {
        id: hash,
        hash,
        from: tx.from,
        to: tx.to || '',
        value: tx.value.toString(),
        token: SUPPORTED_TOKENS[0], // ETH
        type: 'send',
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        timestamp: new Date().toISOString(),
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      console.error('❌ Failed to get transaction:', error);
      return null;
    }
  }

  /**
   * Create in-chat transfer
   */
  async createTransfer(data: {
    recipient_id: string;
    amount: string;
    token: string;
    message?: string;
  }): Promise<APIResponse<Transfer>> {
    return await api.post('/transfers', data);
  }

  /**
   * Claim transfer
   */
  async claimTransfer(transferId: string): Promise<APIResponse<Transfer>> {
    return await api.post(`/transfers/${transferId}/claim`);
  }

  /**
   * Get pending transfers
   */
  async getPendingTransfers(): Promise<APIResponse<Transfer[]>> {
    return await api.get('/transfers/pending');
  }

  /**
   * Export private key (use with caution)
   */
  async exportPrivateKey(address: string): Promise<string | null> {
    return await retrievePrivateKey(address);
  }
}

export const walletService = new WalletService();
export default walletService;
