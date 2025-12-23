/**
 * Chat Service
 * 
 * Handles chat and messaging functionality.
 * 
 * @author Manus AI
 * @date 2024-11-13
 */

import { api } from './api';
import { websocketService } from './websocket';
import { Chat, Message, APIResponse, PaginatedResponse } from '@/types';

class ChatService {
  /**
   * Initialize chat service (setup WebSocket listeners)
   */
  initialize(): void {
    // WebSocket event listeners will be set up by chat store
  }

  /**
   * Get all chats
   */
  async getChats(page: number = 1, pageSize: number = 20): Promise<APIResponse<PaginatedResponse<Chat>>> {
    return await api.get(`/chats?page=${page}&page_size=${pageSize}`);
  }

  /**
   * Get chat by ID
   */
  async getChat(chatId: string): Promise<APIResponse<Chat>> {
    return await api.get(`/chats/${chatId}`);
  }

  /**
   * Create new direct chat
   */
  async createDirectChat(userId: string): Promise<APIResponse<Chat>> {
    return await api.post('/chats/direct', { user_id: userId });
  }

  /**
   * Create new group chat
   */
  async createGroupChat(data: {
    name: string;
    participants: string[];
    avatar?: string;
  }): Promise<APIResponse<Chat>> {
    return await api.post('/chats/group', data);
  }

  /**
   * Update group chat
   */
  async updateGroupChat(
    chatId: string,
    updates: { name?: string; avatar?: string }
  ): Promise<APIResponse<Chat>> {
    return await api.put(`/chats/${chatId}`, updates);
  }

  /**
   * Add participants to group chat
   */
  async addParticipants(
    chatId: string,
    userIds: string[]
  ): Promise<APIResponse<Chat>> {
    return await api.post(`/chats/${chatId}/participants`, { user_ids: userIds });
  }

  /**
   * Remove participant from group chat
   */
  async removeParticipant(
    chatId: string,
    userId: string
  ): Promise<APIResponse<Chat>> {
    return await api.delete(`/chats/${chatId}/participants/${userId}`);
  }

  /**
   * Leave group chat
   */
  async leaveChat(chatId: string): Promise<APIResponse> {
    return await api.post(`/chats/${chatId}/leave`);
  }

  /**
   * Delete chat
   */
  async deleteChat(chatId: string): Promise<APIResponse> {
    return await api.delete(`/chats/${chatId}`);
  }

  /**
   * Get messages for a chat
   */
  async getMessages(
    chatId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<APIResponse<PaginatedResponse<Message>>> {
    return await api.get(`/chats/${chatId}/messages?page=${page}&page_size=${pageSize}`);
  }

  /**
   * Send text message
   */
  async sendMessage(chatId: string, content: string): Promise<APIResponse<Message>> {
    // Send via WebSocket for real-time delivery
    websocketService.send('message_send', {
      chat_id: chatId,
      type: 'text',
      content,
    });

    // Also call API for persistence
    return await api.post(`/chats/${chatId}/messages`, {
      type: 'text',
      content,
    });
  }

  /**
   * Send image message
   */
  async sendImage(chatId: string, file: FormData): Promise<APIResponse<Message>> {
    return await api.upload(`/chats/${chatId}/messages/image`, file);
  }

  /**
   * Send file message
   */
  async sendFile(chatId: string, file: FormData): Promise<APIResponse<Message>> {
    return await api.upload(`/chats/${chatId}/messages/file`, file);
  }

  /**
   * Mark message as read
   */
  async markAsRead(chatId: string, messageId: string): Promise<APIResponse> {
    websocketService.send('message_read', {
      chat_id: chatId,
      message_id: messageId,
    });

    return await api.post(`/chats/${chatId}/messages/${messageId}/read`);
  }

  /**
   * Mark all messages in chat as read
   */
  async markChatAsRead(chatId: string): Promise<APIResponse> {
    return await api.post(`/chats/${chatId}/read`);
  }

  /**
   * Delete message
   */
  async deleteMessage(chatId: string, messageId: string): Promise<APIResponse> {
    return await api.delete(`/chats/${chatId}/messages/${messageId}`);
  }

  /**
   * Search messages
   */
  async searchMessages(
    query: string,
    chatId?: string
  ): Promise<APIResponse<Message[]>> {
    const params = new URLSearchParams({ query });
    if (chatId) {
      params.append('chat_id', chatId);
    }
    return await api.get(`/messages/search?${params.toString()}`);
  }

  /**
   * Send typing indicator
   */
  sendTyping(chatId: string, isTyping: boolean): void {
    websocketService.send('typing', {
      chat_id: chatId,
      is_typing: isTyping,
    });
  }

  /**
   * Upload chat avatar
   */
  async uploadAvatar(chatId: string, file: FormData): Promise<APIResponse<{ url: string }>> {
    return await api.upload(`/chats/${chatId}/avatar`, file);
  }
}

export const chatService = new ChatService();
export default chatService;
