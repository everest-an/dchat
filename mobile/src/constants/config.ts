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

export const COLORS = {
  // Primary colors
  primary: '#007AFF',
  primaryDark: '#0051D5',
  primaryLight: '#4DA3FF',
  
  // Secondary colors
  secondary: '#5856D6',
  secondaryDark: '#3634A3',
  secondaryLight: '#8E8CD8',
  
  // Status colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',
  
  // Neutral colors
  black: '#000000',
  white: '#FFFFFF',
  gray1: '#1C1C1E',
  gray2: '#3A3A3C',
  gray3: '#48484A',
  gray4: '#636366',
  gray5: '#8E8E93',
  gray6: '#C7C7CC',
  gray7: '#E5E5EA',
  gray8: '#F2F2F7',
  
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F2F2F7',
  backgroundTertiary: '#FFFFFF',
  
  // Text colors
  textPrimary: '#000000',
  textSecondary: '#3A3A3C',
  textTertiary: '#8E8E93',
  textPlaceholder: '#C7C7CC',
  
  // Border colors
  border: '#E5E5EA',
  borderLight: '#F2F2F7',
  
  // Chat colors
  messageSent: '#007AFF',
  messageReceived: '#E5E5EA',
  messageText: '#FFFFFF',
  messageTextReceived: '#000000',
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
