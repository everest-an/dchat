/**
 * Authentication Service
 * 
 * Handles user authentication and profile management.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import { api } from './api';
import { User, UserProfile, APIResponse } from '@/types';
import { generateAuthChallenge, signMessage, createWalletFromPrivateKey } from '@/utils/crypto';

class AuthService {
  /**
   * Login with wallet signature
   */
  async login(
    walletAddress: string,
    signature: string
  ): Promise<APIResponse<{ token: string; user: User }>> {
    return await api.post('/auth/login', {
      wallet_address: walletAddress,
      signature,
    });
  }

  /**
   * Login with wallet (generate challenge and sign)
   */
  async loginWithWallet(privateKey: string): Promise<APIResponse<{ token: string; user: User }>> {
    try {
      // Create wallet from private key
      const wallet = createWalletFromPrivateKey(privateKey);
      const address = wallet.address;

      // Generate challenge
      const challenge = generateAuthChallenge();

      // Sign challenge
      const signature = await signMessage(wallet, challenge);

      // Login with signature
      return await this.login(address, signature);
    } catch (error: any) {
      return {
        success: false,
        error: 'Login failed',
        message: error.message,
      };
    }
  }

  /**
   * Register new user
   */
  async register(data: {
    wallet_address: string;
    name: string;
    email?: string;
    linkedin_url?: string;
  }): Promise<APIResponse<User>> {
    return await api.post('/auth/register', data);
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<APIResponse<UserProfile>> {
    return await api.get('/auth/profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<APIResponse<User>> {
    return await api.put('/auth/profile', updates);
  }

  /**
   * Upload profile avatar
   */
  async uploadAvatar(file: FormData): Promise<APIResponse<{ url: string }>> {
    return await api.upload('/auth/avatar', file);
  }

  /**
   * Logout
   */
  async logout(): Promise<APIResponse> {
    return await api.post('/auth/logout');
  }

  /**
   * Verify authentication token
   */
  async verifyToken(): Promise<APIResponse<{ valid: boolean }>> {
    return await api.get('/auth/verify');
  }

  /**
   * Request password reset (for email-based accounts)
   */
  async requestPasswordReset(email: string): Promise<APIResponse> {
    return await api.post('/auth/password-reset/request', { email });
  }

  /**
   * Reset password
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<APIResponse> {
    return await api.post('/auth/password-reset/confirm', {
      token,
      password: newPassword,
    });
  }

  /**
   * Link LinkedIn account
   */
  async linkLinkedIn(code: string): Promise<APIResponse<User>> {
    return await api.post('/auth/linkedin/link', { code });
  }

  /**
   * Unlink LinkedIn account
   */
  async unlinkLinkedIn(): Promise<APIResponse> {
    return await api.post('/auth/linkedin/unlink');
  }
}

export const authService = new AuthService();
export default authService;
