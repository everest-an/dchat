/**
 * TypeScript Type Definitions
 * 
 * Centralized type definitions for the mobile app.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

// User types
export interface User {
  id: string;
  walletAddress: string;
  name: string;
  bio?: string;
  avatar?: string;
  email?: string;
  linkedinUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  projects: Project[];
  skills: Skill[];
  resources: Resource[];
  opportunities: Opportunity[];
}

// Project types
export interface Project {
  id: string;
  title: string;
  description: string;
  url?: string;
  image?: string;
  tags: string[];
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
}

export interface Resource {
  id: string;
  type: 'service' | 'product' | 'expertise';
  title: string;
  description: string;
  price?: number;
  currency?: string;
}

export interface Opportunity {
  id: string;
  type: 'job' | 'project' | 'collaboration';
  title: string;
  description: string;
  budget?: number;
  currency?: string;
}

// Chat types
export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: 'text' | 'image' | 'file' | 'transfer';
  content: string;
  metadata?: MessageMetadata;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface MessageMetadata {
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  imageUrl?: string;
  transferId?: string;
  transferAmount?: string;
  transferToken?: string;
}

// Wallet types
export interface Wallet {
  address: string;
  balance: TokenBalance[];
  transactions: Transaction[];
}

export interface TokenBalance {
  token: Token;
  balance: string;
  balanceFormatted: string;
  valueUSD?: number;
}

export interface Token {
  symbol: string;
  name: string;
  decimals: number;
  address: string | null;
  icon: string;
}

export interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  token: Token;
  type: 'send' | 'receive' | 'transfer';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  blockNumber?: number;
  gasUsed?: string;
  gasFee?: string;
}

// Transfer types
export interface Transfer {
  id: string;
  senderId: string;
  recipientId: string;
  amount: string;
  token: string;
  message?: string;
  status: 'pending' | 'claimed' | 'expired' | 'refunded';
  txHash?: string;
  createdAt: string;
  expiresAt: string;
  claimedAt?: string;
}

// Call types
export interface Call {
  id: string;
  type: 'audio' | 'video';
  callerId: string;
  participants: string[];
  status: 'ringing' | 'active' | 'ended' | 'rejected';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
}

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  ConnectWallet: undefined;
  CreateProfile: undefined;
};

export type MainTabParamList = {
  Chats: undefined;
  Contacts: undefined;
  Wallet: undefined;
  Profile: undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatDetail: { chatId: string };
  NewChat: undefined;
  GroupInfo: { chatId: string };
};

export type WalletStackParamList = {
  WalletHome: undefined;
  Send: { token?: Token };
  Receive: undefined;
  TransactionDetail: { transactionId: string };
  TokenDetail: { token: Token };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Projects: undefined;
  AddProject: undefined;
  EditProject: { projectId: string };
};

// API types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

// Storage types
export interface StorageData {
  authToken?: string;
  walletAddress?: string;
  userProfile?: UserProfile;
  settings?: AppSettings;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'zh';
  notifications: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
  };
  privacy: {
    readReceipts: boolean;
    lastSeen: boolean;
    profilePhoto: 'everyone' | 'contacts' | 'nobody';
  };
  security: {
    biometricEnabled: boolean;
    pinEnabled: boolean;
    autoLockTimeout: number; // minutes
  };
}
