/**
 * Authentication Store
 * 
 * Manages authentication state using Zustand.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import { create } from 'zustand';
import { User } from '@/types';
import { authService } from '@/services/auth';
import { storage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants/config';

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  login: (walletAddress: string, signature: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  
  // Initialize auth state from storage
  initialize: async () => {
    try {
      const token = await storage.get(STORAGE_KEYS.AUTH_TOKEN);
      const userProfile = await storage.get(STORAGE_KEYS.USER_PROFILE);
      
      if (token && userProfile) {
        set({
          isAuthenticated: true,
          token,
          user: JSON.parse(userProfile),
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isLoading: false });
    }
  },
  
  // Login with wallet
  login: async (walletAddress: string, signature: string) => {
    try {
      set({ isLoading: true });
      
      const response = await authService.login(walletAddress, signature);
      const { token, user } = response.data;
      
      // Save to storage
      await storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
      await storage.set(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
      await storage.set(STORAGE_KEYS.WALLET_ADDRESS, walletAddress);
      
      set({
        isAuthenticated: true,
        token,
        user,
        isLoading: false,
      });
    } catch (error) {
      console.error('Login failed:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  // Logout
  logout: async () => {
    try {
      // Clear storage
      await storage.remove(STORAGE_KEYS.AUTH_TOKEN);
      await storage.remove(STORAGE_KEYS.USER_PROFILE);
      await storage.remove(STORAGE_KEYS.WALLET_ADDRESS);
      
      // Reset state
      set({
        isAuthenticated: false,
        token: null,
        user: null,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  },
  
  // Update user profile
  updateUser: async (updates: Partial<User>) => {
    try {
      const currentUser = get().user;
      if (!currentUser) {
        throw new Error('No user logged in');
      }
      
      const updatedUser = { ...currentUser, ...updates };
      
      // Update backend
      await authService.updateProfile(updatedUser);
      
      // Update storage
      await storage.set(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedUser));
      
      // Update state
      set({ user: updatedUser });
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  },
  
  // Set token (for manual token updates)
  setToken: (token: string) => {
    set({ token });
    storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
  },
}));
