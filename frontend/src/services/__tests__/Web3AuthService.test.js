/**
 * Web3AuthService Unit Tests
 * 
 * Tests for Web3 authentication service including wallet connection,
 * signature generation, and authentication flow.
 * 
 * Author: Manus AI
 * Date: 2024-11-05
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Web3AuthService from '../Web3AuthService';

// Mock ethers
vi.mock('ethers', () => ({
  BrowserProvider: vi.fn(),
  Contract: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Web3AuthService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
  });

  describe('connectWallet', () => {
    it('should connect to MetaMask successfully', async () => {
      // Mock window.ethereum
      global.window.ethereum = {
        request: vi.fn().mockResolvedValue(['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb']),
        on: vi.fn(),
      };

      const address = await Web3AuthService.connectWallet();

      expect(address).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
      expect(window.ethereum.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts',
      });
    });

    it('should throw error when MetaMask is not installed', async () => {
      // Remove window.ethereum
      global.window.ethereum = undefined;

      await expect(Web3AuthService.connectWallet()).rejects.toThrow(
        'MetaMask is not installed'
      );
    });

    it('should handle user rejection', async () => {
      global.window.ethereum = {
        request: vi.fn().mockRejectedValue(new Error('User rejected')),
        on: vi.fn(),
      };

      await expect(Web3AuthService.connectWallet()).rejects.toThrow();
    });
  });

  describe('authenticate', () => {
    beforeEach(() => {
      global.window.ethereum = {
        request: vi.fn(),
        on: vi.fn(),
      };
    });

    it('should complete authentication flow successfully', async () => {
      const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const mockNonce = 'test-nonce-123';
      const mockToken = 'jwt-token-123';

      // Mock wallet connection
      window.ethereum.request.mockResolvedValueOnce([mockAddress]);

      // Mock nonce request
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          nonce: mockNonce,
          timestamp: Date.now(),
        }),
      });

      // Mock signature
      window.ethereum.request.mockResolvedValueOnce('0xsignature123');

      // Mock signature verification
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          token: mockToken,
          user: {
            address: mockAddress,
          },
        }),
      });

      const result = await Web3AuthService.authenticate();

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockToken);
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', mockToken);
    });

    it('should handle nonce request failure', async () => {
      const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      // Mock wallet connection
      window.ethereum.request.mockResolvedValueOnce([mockAddress]);

      // Mock failed nonce request
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(Web3AuthService.authenticate()).rejects.toThrow();
    });

    it('should handle signature rejection', async () => {
      const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const mockNonce = 'test-nonce-123';

      // Mock wallet connection
      window.ethereum.request.mockResolvedValueOnce([mockAddress]);

      // Mock nonce request
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          nonce: mockNonce,
          timestamp: Date.now(),
        }),
      });

      // Mock signature rejection
      window.ethereum.request.mockRejectedValueOnce(
        new Error('User rejected signature')
      );

      await expect(Web3AuthService.authenticate()).rejects.toThrow();
    });
  });

  describe('signMessage', () => {
    it('should sign message with correct format', async () => {
      const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const mockNonce = 'test-nonce-123';
      const mockTimestamp = 1699123456789;
      const mockSignature = '0xsignature123';

      global.window.ethereum = {
        request: vi.fn().mockResolvedValue(mockSignature),
        on: vi.fn(),
      };

      const signature = await Web3AuthService.signMessage(
        mockAddress,
        mockNonce,
        mockTimestamp
      );

      expect(signature).toBe(mockSignature);
      expect(window.ethereum.request).toHaveBeenCalledWith({
        method: 'personal_sign',
        params: [
          expect.stringContaining(mockNonce),
          mockAddress,
        ],
      });
    });
  });

  describe('logout', () => {
    it('should clear authentication data', () => {
      Web3AuthService.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user_address');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorage.getItem.mockReturnValue('jwt-token-123');

      const result = Web3AuthService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when token does not exist', () => {
      localStorage.getItem.mockReturnValue(null);

      const result = Web3AuthService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('getAuthHeaders', () => {
    it('should return headers with token', () => {
      const mockToken = 'jwt-token-123';
      localStorage.getItem.mockReturnValue(mockToken);

      const headers = Web3AuthService.getAuthHeaders();

      expect(headers.Authorization).toBe(`Bearer ${mockToken}`);
    });

    it('should return empty headers when no token', () => {
      localStorage.getItem.mockReturnValue(null);

      const headers = Web3AuthService.getAuthHeaders();

      expect(headers.Authorization).toBeUndefined();
    });
  });
});
