/**
 * App Initialization
 * 
 * Handles app startup initialization tasks.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import { Platform } from 'react-native';
import { storage } from './storage';
import { STORAGE_KEYS, APP_CONFIG } from '@/constants/config';

/**
 * Initialize app on startup
 */
export const initializeApp = async (): Promise<void> => {
  try {
    console.log('🚀 Initializing Dchat Mobile...');
    
    // Log environment
    console.log(`📱 Platform: ${Platform.OS} ${Platform.Version}`);
    console.log(`🔧 Environment: ${APP_CONFIG.ENV}`);
    console.log(`📦 Version: ${APP_CONFIG.VERSION}`);
    
    // Initialize storage
    await initializeStorage();
    
    // Check first launch
    const isFirstLaunch = await checkFirstLaunch();
    if (isFirstLaunch) {
      console.log('👋 First launch detected');
      await handleFirstLaunch();
    }
    
    // Initialize services
    await initializeServices();
    
    console.log('✅ App initialization complete');
  } catch (error) {
    console.error('❌ App initialization failed:', error);
    throw error;
  }
};

/**
 * Initialize storage
 */
const initializeStorage = async (): Promise<void> => {
  try {
    // Verify storage is working
    await storage.set('_test', 'test');
    const test = await storage.get('_test');
    
    if (test !== 'test') {
      throw new Error('Storage verification failed');
    }
    
    await storage.remove('_test');
    console.log('✅ Storage initialized');
  } catch (error) {
    console.error('❌ Storage initialization failed:', error);
    throw error;
  }
};

/**
 * Check if this is the first app launch
 */
const checkFirstLaunch = async (): Promise<boolean> => {
  const hasLaunched = await storage.get('_has_launched');
  return !hasLaunched;
};

/**
 * Handle first app launch
 */
const handleFirstLaunch = async (): Promise<void> => {
  try {
    // Set default settings
    const defaultSettings = {
      theme: 'light',
      language: 'en',
      notifications: {
        enabled: true,
        sound: true,
        vibration: true,
      },
      privacy: {
        readReceipts: true,
        lastSeen: true,
        profilePhoto: 'everyone',
      },
      security: {
        biometricEnabled: false,
        pinEnabled: false,
        autoLockTimeout: 5,
      },
    };
    
    await storage.set(STORAGE_KEYS.SETTINGS, JSON.stringify(defaultSettings));
    await storage.set('_has_launched', 'true');
    
    console.log('✅ First launch setup complete');
  } catch (error) {
    console.error('❌ First launch setup failed:', error);
    throw error;
  }
};

/**
 * Initialize services
 */
const initializeServices = async (): Promise<void> => {
  try {
    // Services will be initialized here
    // For now, just log
    console.log('✅ Services initialized');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    throw error;
  }
};

/**
 * Clean up old data
 */
export const cleanupOldData = async (): Promise<void> => {
  try {
    // Remove old cache data (older than 30 days)
    const cacheData = await storage.get(STORAGE_KEYS.CHAT_CACHE);
    
    if (cacheData) {
      const cache = JSON.parse(cacheData);
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      
      const cleanedCache = Object.keys(cache).reduce((acc, key) => {
        if (cache[key].timestamp > thirtyDaysAgo) {
          acc[key] = cache[key];
        }
        return acc;
      }, {} as Record<string, any>);
      
      await storage.set(STORAGE_KEYS.CHAT_CACHE, JSON.stringify(cleanedCache));
      console.log('✅ Old data cleaned up');
    }
  } catch (error) {
    console.error('❌ Data cleanup failed:', error);
  }
};

/**
 * Reset app to initial state
 */
export const resetApp = async (): Promise<void> => {
  try {
    console.log('🔄 Resetting app...');
    
    // Clear all storage except first launch flag
    const allKeys = await storage.getAllKeys();
    const keysToRemove = allKeys.filter(key => key !== '_has_launched');
    
    for (const key of keysToRemove) {
      await storage.remove(key);
    }
    
    console.log('✅ App reset complete');
  } catch (error) {
    console.error('❌ App reset failed:', error);
    throw error;
  }
};
