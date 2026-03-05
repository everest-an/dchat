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
    UPDATE_ME: '/api/user/me',
    PROFILE: '/api/users/profile',
    UPDATE: '/api/users/update',
  },
  PROFILE: {
    SKILLS: '/api/profile/skills',
    SKILL: (id) => `/api/profile/skills/${id}`,
    PROJECTS: '/api/profile/projects',
    PROJECT: (id) => `/api/profile/projects/${id}`,
    RESOURCES: '/api/profile/resources',
    RESOURCE: (id) => `/api/profile/resources/${id}`,
    SEEKING: '/api/profile/seeking',
    SEEKING_ITEM: (id) => `/api/profile/seeking/${id}`,
    BUSINESS: '/api/profile/business',
  },
  FRIENDS: {
    LIST: '/api/friends',
    REMOVE: (id) => `/api/friends/${id}`,
    SEARCH: '/api/friends/search',
    SEND_REQUEST: '/api/friends/request',
    SEND_REQUEST_BY_WALLET: '/api/friends/request-by-wallet',
    REQUESTS: '/api/friends/requests',
    ACCEPT: (id) => `/api/friends/requests/${id}/accept`,
    REJECT: (id) => `/api/friends/requests/${id}/reject`,
    INVITE: '/api/account/invite-friend',
  },
  MESSAGES: {
    CONVERSATIONS: '/api/messages/conversations',
    GET: (userId) => `/api/messages/${userId}`,
    SEND: '/api/messages/send',
    FORWARD: '/api/messages/forward',
    MARK_READ: (senderId) => `/api/messages/${senderId}/read`,
  },
  GROUPS: {
    CREATE: '/api/groups',
    LIST: '/api/groups',
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
  AI: {
    SUMMARIZE: '/api/ai/summarize',
    SUGGEST_REPLY: '/api/ai/suggest-reply',
    TRANSLATE: '/api/ai/translate',
    DRAFT: '/api/ai/draft',
  },
  TICKETS: {
    CREATE: '/api/tickets',
    LIST: '/api/tickets',
    GET: (id) => `/api/tickets/${id}`,
    REPLY: (id) => `/api/tickets/${id}/reply`,
    UPDATE_STATUS: (id) => `/api/tickets/${id}/status`,
  },
  TASKS: {
    CREATE: '/api/tasks',
    LIST: '/api/tasks',
    GET: (id) => `/api/tasks/${id}`,
    UPDATE: (id) => `/api/tasks/${id}`,
    DELETE: (id) => `/api/tasks/${id}`,
  },
  CALENDAR: {
    EVENTS: '/api/calendar/events',
    EVENT: (id) => `/api/calendar/events/${id}`,
    RESPOND: (id) => `/api/calendar/events/${id}/respond`,
  },
  DAO: {
    PROPOSALS: '/api/dao/proposals',
    PROPOSAL: (id) => `/api/dao/proposals/${id}`,
    VOTE: (id) => `/api/dao/proposals/${id}/vote`,
    TREASURY: '/api/dao/treasury',
  },
  CRM: {
    CONTACTS: '/api/crm/contacts',
    CONTACT: (id) => `/api/crm/contacts/${id}`,
    DEALS: '/api/crm/deals',
    DEAL: (id) => `/api/crm/deals/${id}`,
    ACTIVITIES: '/api/crm/activities',
  },
  SSO: {
    PROVIDERS: '/api/sso/providers',
    PROVIDER_BY_DOMAIN: (domain) => `/api/sso/providers/domain/${domain}`,
    INITIATE: '/api/sso/initiate',
    CALLBACK_OIDC: '/api/sso/callback/oidc',
  },
  GDPR: {
    EXPORT: '/api/gdpr/export',
    DELETE_ACCOUNT: '/api/gdpr/delete-account',
  },
  MATCHING: {
    RECOMMENDATIONS: '/api/matching/recommendations',
    FEEDBACK: '/api/matching/feedback',
  },
  MENTIONS: {
    UNREAD: '/api/mentions/unread',
    UNREAD_COUNT: '/api/mentions/unread/count',
    MARK_READ: (id) => `/api/mentions/${id}/read`,
    MARK_ALL_READ: '/api/mentions/read-all',
  },
  MEETINGS: {
    CREATE: '/api/meetings',
    LIST: '/api/meetings',
    GET: (id) => `/api/meetings/${id}`,
    END: (id) => `/api/meetings/${id}/end`,
    TRANSCRIBE: (id) => `/api/meetings/${id}/transcribe`,
    SUMMARIZE: (id) => `/api/meetings/${id}/summarize`,
  },
  BOTS: {
    LIST: '/api/bots',
    CREATE: '/api/bots',
    GET: (id) => `/api/bots/${id}`,
    UPDATE: (id) => `/api/bots/${id}`,
    DELETE: (id) => `/api/bots/${id}`,
    REGENERATE_TOKEN: (id) => `/api/bots/${id}/regenerate-token`,
    EVENTS: (id) => `/api/bots/${id}/events`,
  },
  HEALTH: '/health',
}

export default API_CONFIG
