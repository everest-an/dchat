/**
 * Wallet Store
 * 
 * Manages wallet and cryptocurrency state using Zustand.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import { create } from 'zustand';
import { TokenBalance, Transaction, Transfer } from '@/types';
import { walletService } from '@/services/wallet';

interface WalletState {
  // State
  address: string | null;
  balances: TokenBalance[];
  transactions: Transaction[];
  pendingTransfers: Transfer[];
  isLoading: boolean;
  
  // Actions
  initialize: (address: string) => Promise<void>;
  createWallet: () => Promise<{ address: string; mnemonic: string }>;
  importWallet: (mnemonic: string) => Promise<string>;
  loadBalances: () => Promise<void>;
  loadTransactions: () => Promise<void>;
  loadPendingTransfers: () => Promise<void>;
  sendETH: (to: string, amount: string) => Promise<string>;
  sendToken: (tokenAddress: string, to: string, amount: string, decimals: number) => Promise<string>;
  createTransfer: (recipientId: string, amount: string, token: string, message?: string) => Promise<void>;
  claimTransfer: (transferId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  // Initial state
  address: null,
  balances: [],
  transactions: [],
  pendingTransfers: [],
  isLoading: false,
  
  // Initialize wallet
  initialize: async (address: string) => {
    try {
      set({ address, isLoading: true });
      
      await walletService.initialize(address);
      await get().loadBalances();
      await get().loadTransactions();
      await get().loadPendingTransfers();
      
      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  // Create new wallet
  createWallet: async () => {
    try {
      set({ isLoading: true });
      
      const { address, mnemonic } = await walletService.createWallet();
      
      set({ address, isLoading: false });
      
      return { address, mnemonic };
    } catch (error) {
      console.error('Failed to create wallet:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  // Import wallet from mnemonic
  importWallet: async (mnemonic: string) => {
    try {
      set({ isLoading: true });
      
      const address = await walletService.importFromMnemonic(mnemonic);
      
      set({ address, isLoading: false });
      await get().loadBalances();
      await get().loadTransactions();
      
      return address;
    } catch (error) {
      console.error('Failed to import wallet:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  // Load token balances
  loadBalances: async () => {
    try {
      const { address } = get();
      if (!address) return;
      
      const balances = await walletService.getAllBalances(address);
      set({ balances });
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  },
  
  // Load transaction history
  loadTransactions: async () => {
    try {
      const { address } = get();
      if (!address) return;
      
      const response = await walletService.getTransactions(address);
      if (response.success && response.data) {
        set({ transactions: response.data });
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  },
  
  // Load pending transfers
  loadPendingTransfers: async () => {
    try {
      const response = await walletService.getPendingTransfers();
      if (response.success && response.data) {
        set({ pendingTransfers: response.data });
      }
    } catch (error) {
      console.error('Failed to load pending transfers:', error);
    }
  },
  
  // Send ETH
  sendETH: async (to: string, amount: string) => {
    try {
      set({ isLoading: true });
      
      const txHash = await walletService.sendETH(to, amount);
      
      // Refresh balances and transactions
      await get().refresh();
      
      set({ isLoading: false });
      return txHash;
    } catch (error) {
      console.error('Failed to send ETH:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  // Send token
  sendToken: async (tokenAddress: string, to: string, amount: string, decimals: number) => {
    try {
      set({ isLoading: true });
      
      const txHash = await walletService.sendToken(tokenAddress, to, amount, decimals);
      
      // Refresh balances and transactions
      await get().refresh();
      
      set({ isLoading: false });
      return txHash;
    } catch (error) {
      console.error('Failed to send token:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  // Create in-chat transfer
  createTransfer: async (recipientId: string, amount: string, token: string, message?: string) => {
    try {
      set({ isLoading: true });
      
      await walletService.createTransfer({
        recipient_id: recipientId,
        amount,
        token,
        message,
      });
      
      // Refresh balances
      await get().loadBalances();
      
      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to create transfer:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  // Claim transfer
  claimTransfer: async (transferId: string) => {
    try {
      set({ isLoading: true });
      
      await walletService.claimTransfer(transferId);
      
      // Refresh balances and pending transfers
      await get().loadBalances();
      await get().loadPendingTransfers();
      
      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to claim transfer:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  // Refresh all wallet data
  refresh: async () => {
    await Promise.all([
      get().loadBalances(),
      get().loadTransactions(),
      get().loadPendingTransfers(),
    ]);
  },
}));
