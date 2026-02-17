/**
 * API Configuration
 * 
 * Centralized API configuration. All URLs are derived from environment variables.
 * This file re-exports values needed by legacy service adapters.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const API_CONFIG = {
  API_BASE_URL,
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || API_BASE_URL,
  TIMEOUT: 30000,
}

export const API_ENDPOINTS = {
  AUTH: {
    NONCE: '/api/auth/nonce',
    WALLET_LOGIN: '/api/auth/wallet-login',
    SEND_CODE: '/api/auth/send-code',
    VERIFY_LOGIN: '/api/auth/verify-login',
    REFRESH: '/api/auth/refresh',
  },
  USER: {
    ME: '/api/auth/me',
    PROFILE: '/api/users/profile',
    UPDATE: '/api/users/update',
  },
  MESSAGES: {
    CONVERSATIONS: '/api/messages/conversations',
    GET: (userId) => `/api/messages/${userId}`,
    SEND: '/api/messages/send',
    MARK_READ: (senderId) => `/api/messages/${senderId}/read`,
  },
  GROUPS: {
    CREATE: '/api/groups/create',
    LIST: '/api/groups/list',
    GET: (id) => `/api/groups/${id}`,
    MESSAGES: (id) => `/api/groups/${id}/messages`,
    SEND_MESSAGE: (id) => `/api/groups/${id}/messages`,
    ADD_MEMBER: (id) => `/api/groups/${id}/members`,
    REMOVE_MEMBER: (id, memberId) => `/api/groups/${id}/members/${memberId}`,
  },
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    MARK_READ: (id) => `/api/notifications/${id}/read`,
    MARK_ALL_READ: '/api/notifications/read-all',
  },
  PUSH: {
    REGISTER: '/api/push-notifications/register-token',
    UNREGISTER: '/api/push-notifications/unregister-token',
  },
  PUBLIC_KEYS: {
    REGISTER: '/api/public-keys/register',
    GET: (address) => `/api/public-keys/address/${address.toLowerCase()}`,
    BATCH: '/api/public-keys/batch',
    ROTATE: '/api/public-keys/rotate',
  },
  AVATARS: {
    SET_NFT: '/api/avatars/nft/set',
    GET_NFT: (address) => `/api/avatars/nft/${address}`,
  },
  PAYMENTS: {
    CREATE_INTENT: '/api/payments/create-intent',
    CREATE_CHECKOUT: '/api/payments/create-checkout',
    CREATE_ESCROW: '/api/payments/create-escrow',
    RELEASE_ESCROW: '/api/payments/release-escrow',
    RECORD: '/api/payments/record-transaction',
    HISTORY: (address) => `/api/payments/history/${address}`,
  },
  LINKEDIN: {
    AUTH: '/api/auth/linkedin',
    PROFILE: '/api/auth/linkedin/profile',
    CONNECTIONS: '/api/auth/linkedin/connections',
    SHARE: '/api/auth/linkedin/share',
    DISCONNECT: '/api/auth/linkedin/disconnect',
    STATUS: '/api/auth/linkedin/status',
  },
  HEALTH: '/health',
}

export default API_CONFIG
