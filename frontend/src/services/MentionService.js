/**
 * MentionService.js
 *
 * API client for @mention operations.
 */

import api from './apiClient'

class MentionService {
  /**
   * Get unread @mentions for the current user.
   * @param {{ page?: number, page_size?: number }} params
   * @returns {Promise<Object>} Paginated mentions
   */
  async getUnreadMentions(params = {}) {
    const qs = new URLSearchParams(params).toString()
    const url = `/api/mentions/unread${qs ? `?${qs}` : ''}`
    return await api.get(url)
  }

  /**
   * Get the count of unread @mentions.
   * @returns {Promise<number>}
   */
  async getUnreadCount() {
    const res = await api.get('/api/mentions/unread/count')
    return res.data?.count ?? 0
  }

  /**
   * Mark a single mention as read.
   * @param {number} mentionId
   */
  async markRead(mentionId) {
    await api.put(`/api/mentions/${mentionId}/read`)
  }

  /**
   * Mark all unread mentions as read.
   */
  async markAllRead() {
    await api.put('/api/mentions/read-all')
  }
}

export default new MentionService()
