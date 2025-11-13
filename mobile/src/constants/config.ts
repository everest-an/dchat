/**
 * App Configuration Constants
 * 
 * Centralized configuration for the mobile app.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import Config from 'react-native-config';

export const API_CONFIG = {
  BASE_URL: Config.API_BASE_URL || 'https://api.dchat.pro',
  WS_URL: Config.WS_BASE_URL || 'wss://ws.dchat.pro',
  TIMEOUT: 30000, // 30 seconds
};

export const WEB3_CONFIG = {
  INFURA_PROJECT_ID: Config.INFURA_PROJECT_ID || '',
  WALLETCONNECT_PROJECT_ID: Config.WALLETCONNECT_PROJECT_ID || '',
  CHAIN_ID: 1, // Ethereum Mainnet
  CHAIN_NAME: 'Ethereum',
  RPC_URL: `https://mainnet.infura.io/v3/${Config.INFURA_PROJECT_ID}`,
};

export const APP_CONFIG = {
  ENV: Config.APP_ENV || 'production',
  ENABLE_LOGGING: Config.ENABLE_LOGGING === 'true',
  VERSION: '1.0.0',
  BUILD_NUMBER: '1',
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@dchat:auth_token',
  WALLET_ADDRESS: '@dchat:wallet_address',
  USER_PROFILE: '@dchat:user_profile',
  SETTINGS: '@dchat:settings',
  CHAT_CACHE: '@dchat:chat_cache',
};

export const SUPPORTED_TOKENS = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    address: null, // Native token
    icon: 'ethereum',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    icon: 'dollar-sign',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    icon: 'dollar-sign',
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    icon: 'dollar-sign',
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    icon: 'ethereum',
  },
];

// Theme colors (matching Web app - Tailwind + Radix UI style)
export const COLORS = {
  // Primary colors (Indigo - matching Web)
  primary: '#4F46E5',      // indigo-600
  primaryDark: '#3730A3',  // indigo-800
  primaryLight: '#818CF8', // indigo-400
  
  // Secondary colors (Emerald - matching Web)
  secondary: '#10B981',    // emerald-500
  secondaryDark: '#059669',  // emerald-600
  secondaryLight: '#34D399', // emerald-400
  
  // Accent colors (Amber - matching Web)
  accent: '#F59E0B',       // amber-500
  accentDark: '#D97706',   // amber-600
  accentLight: '#FCD34D',  // amber-300
  
  // Status colors
  success: '#10B981',      // emerald-500
  warning: '#F59E0B',      // amber-500
  error: '#EF4444',        // red-500
  info: '#3B82F6',         // blue-500
  
  // Neutral colors (Tailwind gray scale)
  black: '#000000',
  white: '#FFFFFF',
  gray1: '#F9FAFB',        // gray-50
  gray2: '#F3F4F6',        // gray-100
  gray3: '#E5E7EB',        // gray-200
  gray4: '#D1D5DB',        // gray-300
  gray5: '#9CA3AF',        // gray-400
  gray6: '#6B7280',        // gray-500
  gray7: '#4B5563',        // gray-600
  gray8: '#374151',        // gray-700
  gray9: '#1F2937',        // gray-800
  
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',  // gray-50
  backgroundTertiary: '#F3F4F6',   // gray-100
  surface: '#FFFFFF',
  surfaceHover: '#F9FAFB',
  
  // Text colors
  textPrimary: '#111827',  // gray-900
  textSecondary: '#6B7280', // gray-500
  textTertiary: '#9CA3AF',  // gray-400
  textPlaceholder: '#D1D5DB', // gray-300
  textDisabled: '#E5E7EB', // gray-200
  
  // Border colors
  border: '#E5E7EB',       // gray-200
  borderLight: '#F3F4F6',  // gray-100
  borderDark: '#D1D5DB',   // gray-300
  divider: '#F3F4F6',      // gray-100
  
  // Chat colors (matching Web @chatscope theme)
  messageSent: '#4F46E5',      // primary indigo
  messageReceived: '#F3F4F6',  // gray-100
  messageText: '#FFFFFF',
  messageTextReceived: '#111827', // gray-900
  
  // Avatar colors (matching Web ui-avatars)
  avatarIndigo: '#4F46E5',
  avatarEmerald: '#10B981',
  avatarAmber: '#F59E0B',
  avatarBlue: '#3B82F6',
  avatarRed: '#EF4444',
  avatarPurple: '#8B5CF6',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
};

export const SIZES = {
  // Font sizes
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,
  body: 16,
  bodySmall: 14,
  caption: 12,
  tiny: 10,
  
  // Spacing
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  
  // Border radius
  radiusXs: 4,
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusRound: 9999,
  
  // Icon sizes
  iconXs: 16,
  iconSm: 20,
  iconMd: 24,
  iconLg: 32,
  iconXl: 48,
};

export const ANIMATION = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};
