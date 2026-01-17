/**
 * API Configuration for Go Backend
 * This file contains all API endpoints and WebSocket configuration
 */

// Determine environment
const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';

// API Base URLs
export const API_CONFIG = {
  // REST API Base URL
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || (isProduction ? 'https://dchat.pro/api' : 'http://44.211.79.69/api'),
  
  // WebSocket URL (native WebSocket, not Socket.IO)
  WS_URL: import.meta.env.VITE_WS_URL || (isProduction ? 'wss://dchat.pro/ws' : 'ws://44.211.79.69/ws'),
  
  // Request timeout
  TIMEOUT: 30000,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

// API Endpoints for Go Backend
export const API_ENDPOINTS = {
  // Health Check
  HEALTH: '/health',
  
  // Authentication
  AUTH: {
    NONCE: '/auth/nonce',
    WALLET_LOGIN: '/auth/wallet-login',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
  },
  
  // User
  USER: {
    ME: '/user/me',
    PROFILE: '/user/profile',
    UPDATE: '/user/update',
  },
  
  // Messages
  MESSAGES: {
    SEND: '/messages',
    GET: (userId) => `/messages/${userId}`,
    CONVERSATIONS: '/conversations',
    MARK_READ: (senderId) => `/messages/read/${senderId}`,
  },
  
  // Groups (if implemented)
  GROUPS: {
    CREATE: '/groups',
    LIST: '/groups',
    GET: (id) => `/groups/${id}`,
    MESSAGES: (id) => `/groups/${id}/messages`,
  },
};

export default API_CONFIG;
