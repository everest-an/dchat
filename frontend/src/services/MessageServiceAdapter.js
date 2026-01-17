/**
 * Message Service Adapter for Go Backend
 * Handles message operations with the Go backend API
 */

import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';
import { authServiceAdapter } from './AuthServiceAdapter';

class MessageServiceAdapter {
  /**
   * Get conversations list
   * @returns {Promise<Array>} List of conversations
   */
  async getConversations() {
    try {
      const token = authServiceAdapter.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_CONFIG.API_BASE_URL}${API_ENDPOINTS.MESSAGES.CONVERSATIONS}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get conversations');
      }

      const data = await response.json();
      return data.conversations || [];
    } catch (error) {
      console.error('Get conversations error:', error);
      throw error;
    }
  }

  /**
   * Get messages with a specific user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} List of messages
   */
  async getMessages(userId) {
    try {
      const token = authServiceAdapter.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_CONFIG.API_BASE_URL}${API_ENDPOINTS.MESSAGES.GET(userId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get messages');
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Get messages error:', error);
      throw error;
    }
  }

  /**
   * Send a message
   * @param {number} receiverId - Receiver user ID
   * @param {string} content - Message content
   * @param {boolean} encrypted - Whether the message is encrypted
   * @returns {Promise<Object>} Sent message
   */
  async sendMessage(receiverId, content, encrypted = false) {
    try {
      const token = authServiceAdapter.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_CONFIG.API_BASE_URL}${API_ENDPOINTS.MESSAGES.SEND}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_id: receiverId,
          content: content,
          encrypted: encrypted,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   * @param {number} senderId - Sender user ID
   * @returns {Promise<void>}
   */
  async markAsRead(senderId) {
    try {
      const token = authServiceAdapter.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_CONFIG.API_BASE_URL}${API_ENDPOINTS.MESSAGES.MARK_READ(senderId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark messages as read');
      }
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const messageServiceAdapter = new MessageServiceAdapter();
export default messageServiceAdapter;
