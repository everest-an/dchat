/**
 * Chat Store
 * 
 * Manages chat and messaging state using Zustand.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import { create } from 'zustand';
import { Chat, Message } from '@/types';
import { chatService } from '@/services/chat';
import { websocketService } from '@/services/websocket';

interface ChatState {
  // State
  chats: Chat[];
  messages: Record<string, Message[]>;
  currentChatId: string | null;
  isLoading: boolean;
  typingUsers: Record<string, Set<string>>;
  
  // Actions
  initialize: () => void;
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  markAsRead: (chatId: string, messageId: string) => Promise<void>;
  setCurrentChat: (chatId: string | null) => void;
  createDirectChat: (userId: string) => Promise<Chat | null>;
  createGroupChat: (name: string, participants: string[]) => Promise<Chat | null>;
  deleteChat: (chatId: string) => Promise<void>;
  
  // WebSocket handlers
  handleNewMessage: (message: Message) => void;
  handleMessageRead: (data: { chatId: string; messageId: string; userId: string }) => void;
  handleTyping: (data: { chatId: string; userId: string; isTyping: boolean }) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  chats: [],
  messages: {},
  currentChatId: null,
  isLoading: false,
  typingUsers: {},
  
  // Initialize WebSocket listeners
  initialize: () => {
    websocketService.on('message_new', (data) => {
      get().handleNewMessage(data.message);
    });
    
    websocketService.on('message_read', (data) => {
      get().handleMessageRead(data);
    });
    
    websocketService.on('typing', (data) => {
      get().handleTyping(data);
    });
  },
  
  // Load all chats
  loadChats: async () => {
    try {
      set({ isLoading: true });
      
      const response = await chatService.getChats();
      if (response.success && response.data) {
        set({ chats: response.data.items, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      set({ isLoading: false });
    }
  },
  
  // Load messages for a chat
  loadMessages: async (chatId: string) => {
    try {
      set({ isLoading: true });
      
      const response = await chatService.getMessages(chatId);
      if (response.success && response.data) {
        set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: response.data!.items,
          },
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      set({ isLoading: false });
    }
  },
  
  // Send message
  sendMessage: async (chatId: string, content: string) => {
    try {
      const response = await chatService.sendMessage(chatId, content);
      if (response.success && response.data) {
        // Message will be added via WebSocket event
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },
  
  // Mark message as read
  markAsRead: async (chatId: string, messageId: string) => {
    try {
      await chatService.markAsRead(chatId, messageId);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },
  
  // Set current chat
  setCurrentChat: (chatId: string | null) => {
    set({ currentChatId: chatId });
    
    if (chatId && !get().messages[chatId]) {
      get().loadMessages(chatId);
    }
  },
  
  // Create direct chat
  createDirectChat: async (userId: string) => {
    try {
      const response = await chatService.createDirectChat(userId);
      if (response.success && response.data) {
        const newChat = response.data;
        set((state) => ({
          chats: [newChat, ...state.chats],
        }));
        return newChat;
      }
      return null;
    } catch (error) {
      console.error('Failed to create direct chat:', error);
      return null;
    }
  },
  
  // Create group chat
  createGroupChat: async (name: string, participants: string[]) => {
    try {
      const response = await chatService.createGroupChat({ name, participants });
      if (response.success && response.data) {
        const newChat = response.data;
        set((state) => ({
          chats: [newChat, ...state.chats],
        }));
        return newChat;
      }
      return null;
    } catch (error) {
      console.error('Failed to create group chat:', error);
      return null;
    }
  },
  
  // Delete chat
  deleteChat: async (chatId: string) => {
    try {
      await chatService.deleteChat(chatId);
      set((state) => ({
        chats: state.chats.filter((chat) => chat.id !== chatId),
        messages: Object.fromEntries(
          Object.entries(state.messages).filter(([id]) => id !== chatId)
        ),
      }));
    } catch (error) {
      console.error('Failed to delete chat:', error);
      throw error;
    }
  },
  
  // Handle new message from WebSocket
  handleNewMessage: (message: Message) => {
    set((state) => {
      const chatMessages = state.messages[message.chatId] || [];
      
      // Check if message already exists
      if (chatMessages.some((m) => m.id === message.id)) {
        return state;
      }
      
      // Add message
      const updatedMessages = {
        ...state.messages,
        [message.chatId]: [...chatMessages, message],
      };
      
      // Update chat's last message
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === message.chatId) {
          return {
            ...chat,
            lastMessage: message,
            unreadCount: chat.id === state.currentChatId ? 0 : chat.unreadCount + 1,
            updatedAt: message.createdAt,
          };
        }
        return chat;
      });
      
      return {
        messages: updatedMessages,
        chats: updatedChats,
      };
    });
  },
  
  // Handle message read from WebSocket
  handleMessageRead: (data) => {
    set((state) => {
      const chatMessages = state.messages[data.chatId];
      if (!chatMessages) return state;
      
      const updatedMessages = {
        ...state.messages,
        [data.chatId]: chatMessages.map((msg) => {
          if (msg.id === data.messageId) {
            return { ...msg, status: 'read' as const };
          }
          return msg;
        }),
      };
      
      return { messages: updatedMessages };
    });
  },
  
  // Handle typing indicator from WebSocket
  handleTyping: (data) => {
    set((state) => {
      const chatTypingUsers = state.typingUsers[data.chatId] || new Set();
      
      if (data.isTyping) {
        chatTypingUsers.add(data.userId);
      } else {
        chatTypingUsers.delete(data.userId);
      }
      
      return {
        typingUsers: {
          ...state.typingUsers,
          [data.chatId]: chatTypingUsers,
        },
      };
    });
  },
}));
