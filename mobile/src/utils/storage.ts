/**
 * Storage Utility
 * 
 * Wrapper for MMKV storage with fallback to AsyncStorage.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import { MMKV } from 'react-native-mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize MMKV
let mmkv: MMKV | null = null;

try {
  mmkv = new MMKV();
} catch (error) {
  console.warn('MMKV not available, falling back to AsyncStorage');
}

class Storage {
  /**
   * Get value from storage
   */
  async get(key: string): Promise<string | null> {
    try {
      if (mmkv) {
        return mmkv.getString(key) || null;
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to get ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in storage
   */
  async set(key: string, value: string): Promise<void> {
    try {
      if (mmkv) {
        mmkv.set(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`Failed to set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove value from storage
   */
  async remove(key: string): Promise<void> {
    try {
      if (mmkv) {
        mmkv.delete(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    try {
      if (mmkv) {
        mmkv.clearAll();
      } else {
        await AsyncStorage.clear();
      }
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }

  /**
   * Get all keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      if (mmkv) {
        return mmkv.getAllKeys();
      }
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Failed to get all keys:', error);
      return [];
    }
  }

  /**
   * Get multiple values
   */
  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    try {
      const result: Record<string, string | null> = {};
      
      if (mmkv) {
        keys.forEach(key => {
          result[key] = mmkv!.getString(key) || null;
        });
      } else {
        const values = await AsyncStorage.multiGet(keys);
        values.forEach(([key, value]) => {
          result[key] = value;
        });
      }
      
      return result;
    } catch (error) {
      console.error('Failed to get multiple values:', error);
      return {};
    }
  }

  /**
   * Set multiple values
   */
  async multiSet(keyValuePairs: Array<[string, string]>): Promise<void> {
    try {
      if (mmkv) {
        keyValuePairs.forEach(([key, value]) => {
          mmkv!.set(key, value);
        });
      } else {
        await AsyncStorage.multiSet(keyValuePairs);
      }
    } catch (error) {
      console.error('Failed to set multiple values:', error);
      throw error;
    }
  }
}

export const storage = new Storage();
