/**
 * Formatting Utilities
 * 
 * Helper functions for formatting data.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import { formatDistance, format as formatDate } from 'date-fns';
import { ethers } from 'ethers';

/**
 * Format wallet address (0x1234...5678)
 */
export const formatAddress = (address: string, chars: number = 4): string => {
  if (!address) return '';
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

/**
 * Format token amount
 */
export const formatTokenAmount = (
  amount: string | number,
  decimals: number = 18,
  maxDecimals: number = 4
): string => {
  try {
    const value = ethers.formatUnits(amount.toString(), decimals);
    const num = parseFloat(value);
    
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    
    return num.toFixed(Math.min(maxDecimals, decimals));
  } catch (error) {
    console.error('Failed to format token amount:', error);
    return '0';
  }
};

/**
 * Format USD value
 */
export const formatUSD = (value: number): string => {
  if (value === 0) return '$0.00';
  if (value < 0.01) return '< $0.01';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format large numbers (1.2K, 1.5M, etc.)
 */
export const formatNumber = (num: number): string => {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  return `${(num / 1000000000).toFixed(1)}B`;
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * Format timestamp to relative time (2 hours ago, etc.)
 */
export const formatRelativeTime = (timestamp: string | Date): string => {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatDistance(date, new Date(), { addSuffix: true });
  } catch (error) {
    console.error('Failed to format relative time:', error);
    return '';
  }
};

/**
 * Format timestamp to date string
 */
export const formatDateTime = (
  timestamp: string | Date,
  formatString: string = 'MMM d, yyyy h:mm a'
): string => {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatDate(date, formatString);
  } catch (error) {
    console.error('Failed to format date time:', error);
    return '';
  }
};

/**
 * Format message timestamp
 */
export const formatMessageTime = (timestamp: string | Date): string => {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    
    // Today
    if (formatDate(date, 'yyyy-MM-dd') === formatDate(now, 'yyyy-MM-dd')) {
      return formatDate(date, 'h:mm a');
    }
    
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (formatDate(date, 'yyyy-MM-dd') === formatDate(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    }
    
    // This year
    if (date.getFullYear() === now.getFullYear()) {
      return formatDate(date, 'MMM d');
    }
    
    // Other years
    return formatDate(date, 'MMM d, yyyy');
  } catch (error) {
    console.error('Failed to format message time:', error);
    return '';
  }
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  return phone;
};

/**
 * Parse token amount to wei
 */
export const parseTokenAmount = (
  amount: string,
  decimals: number = 18
): string => {
  try {
    return ethers.parseUnits(amount, decimals).toString();
  } catch (error) {
    console.error('Failed to parse token amount:', error);
    return '0';
  }
};
