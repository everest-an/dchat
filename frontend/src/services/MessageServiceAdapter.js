/**
 * Message Service Adapter for Go Backend
 * Handles message operations with the Go backend API.
 * Uses the unified apiClient for all HTTP requests.
 */
import api from './apiClient'
import { API_ENDPOINTS } from '../config/api.config'
import { logError } from '../utils/errorHandler'

class MessageServiceAdapter {
  /**
   * Get conversations list
   * @returns {Promise<Array>} List of conversations
   */
  async getConversations() {
    try {
      const data = await api.get(API_ENDPOINTS.MESSAGES.CONVERSATIONS)
      return data.conversations || []
    } catch (error) {
      logError('MessageServiceAdapter.getConversations', error)
      throw error
    }
  }

  /**
   * Get messages with a specific user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} List of messages
   */
  async getMessages(userId) {
    try {
      const data = await api.get(API_ENDPOINTS.MESSAGES.GET(userId))
      return data.messages || []
    } catch (error) {
      logError('MessageServiceAdapter.getMessages', error)
      throw error
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
      const data = await api.post(API_ENDPOINTS.MESSAGES.SEND, {
        receiver_id: receiverId,
        content,
        encrypted,
      })
      return data.message
    } catch (error) {
      logError('MessageServiceAdapter.sendMessage', error)
      throw error
    }
  }

  /**
   * Mark messages as read
   * @param {number} senderId - Sender user ID
   * @returns {Promise<void>}
   */
  async markAsRead(senderId) {
    try {
      await api.put(API_ENDPOINTS.MESSAGES.MARK_READ(senderId))
    } catch (error) {
      logError('MessageServiceAdapter.markAsRead', error)
      throw error
    }
  }
}

// Export singleton instance
export const messageServiceAdapter = new MessageServiceAdapter()
export default messageServiceAdapter
