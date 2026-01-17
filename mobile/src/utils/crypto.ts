/**
 * Cryptography Utilities
 * 
 * Helper functions for encryption and key management.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import { ethers } from 'ethers';
import * as Keychain from 'react-native-keychain';

/**
 * Generate random mnemonic phrase
 */
export const generateMnemonic = (): string => {
  const wallet = ethers.Wallet.createRandom();
  return wallet.mnemonic?.phrase || '';
};

/**
 * Create wallet from mnemonic
 */
export const createWalletFromMnemonic = (mnemonic: string): ethers.Wallet => {
  return ethers.Wallet.fromPhrase(mnemonic);
};

/**
 * Create wallet from private key
 */
export const createWalletFromPrivateKey = (privateKey: string): ethers.Wallet => {
  return new ethers.Wallet(privateKey);
};

/**
 * Sign message with wallet
 */
export const signMessage = async (
  wallet: ethers.Wallet,
  message: string
): Promise<string> => {
  return await wallet.signMessage(message);
};

/**
 * Verify signature
 */
export const verifySignature = (
  message: string,
  signature: string,
  address: string
): boolean => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
};

/**
 * Store private key securely in Keychain
 */
export const storePrivateKey = async (
  address: string,
  privateKey: string
): Promise<void> => {
  try {
    await Keychain.setGenericPassword(address, privateKey, {
      service: 'dchat.wallet',
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (error) {
    console.error('Failed to store private key:', error);
    throw error;
  }
};

/**
 * Retrieve private key from Keychain
 */
export const retrievePrivateKey = async (
  address: string
): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'dchat.wallet',
    });
    
    if (credentials && credentials.username === address) {
      return credentials.password;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to retrieve private key:', error);
    return null;
  }
};

/**
 * Delete private key from Keychain
 */
export const deletePrivateKey = async (): Promise<void> => {
  try {
    await Keychain.resetGenericPassword({
      service: 'dchat.wallet',
    });
  } catch (error) {
    console.error('Failed to delete private key:', error);
    throw error;
  }
};

/**
 * Generate random bytes
 */
export const generateRandomBytes = (length: number): string => {
  return ethers.hexlify(ethers.randomBytes(length));
};

/**
 * Hash data using keccak256
 */
export const hashData = (data: string): string => {
  return ethers.keccak256(ethers.toUtf8Bytes(data));
};

/**
 * Encrypt data (simple AES encryption)
 */
export const encryptData = async (
  data: string,
  password: string
): Promise<string> => {
  try {
    // Use ethers' encryption utilities
    const wallet = ethers.Wallet.createRandom();
    const encrypted = await wallet.encrypt(password);
    
    // Store data in encrypted wallet JSON
    const walletData = JSON.parse(encrypted);
    walletData.userData = data;
    
    return JSON.stringify(walletData);
  } catch (error) {
    console.error('Failed to encrypt data:', error);
    throw error;
  }
};

/**
 * Decrypt data
 */
export const decryptData = async (
  encryptedData: string,
  password: string
): Promise<string> => {
  try {
    const walletData = JSON.parse(encryptedData);
    const userData = walletData.userData;
    
    // Verify password by decrypting wallet
    await ethers.Wallet.fromEncryptedJson(encryptedData, password);
    
    return userData;
  } catch (error) {
    console.error('Failed to decrypt data:', error);
    throw error;
  }
};

/**
 * Generate authentication challenge
 */
export const generateAuthChallenge = (): string => {
  const timestamp = Date.now();
  const nonce = generateRandomBytes(16);
  return `Sign this message to authenticate with Dchat.\n\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
};

/**
 * Derive address from public key
 */
export const deriveAddress = (publicKey: string): string => {
  return ethers.computeAddress(publicKey);
};
