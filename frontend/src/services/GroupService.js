/**
 * GroupService.js
 *
 * Manages group CRUD operations via the backend REST API.
 * Replaces the previous IPFS/localStorage implementation.
 */

import api from './apiClient'

class GroupService {
  // ── Group CRUD ──────────────────────────────────────────────

  /**
   * Create a new group.
   * @param {{ name: string, description?: string, avatar_url?: string, max_members?: number, is_public?: boolean, require_approval?: boolean, member_ids?: number[] }} data
   * @returns {Promise<Object>} Created group
   */
  async createGroup(data) {
    const res = await api.post('/api/groups', data)
    return res.data
  }

  /**
   * Get all groups the current user belongs to.
   * @returns {Promise<Object[]>}
   */
  async getMyGroups() {
    const res = await api.get('/api/groups')
    return res.data ?? []
  }

  /**
   * Get a single group by ID.
   * @param {number} groupId
   * @returns {Promise<Object>}
   */
  async getGroup(groupId) {
    const res = await api.get(`/api/groups/${groupId}`)
    return res.data
  }

  /**
   * Update group info (name, description, avatar, settings).
   * @param {number} groupId
   * @param {Object} updates
   * @returns {Promise<Object>} Updated group
   */
  async updateGroup(groupId, updates) {
    const res = await api.put(`/api/groups/${groupId}`, updates)
    return res.data
  }

  /**
   * Delete (disband) a group. Owner only.
   * @param {number} groupId
   * @returns {Promise<void>}
   */
  async deleteGroup(groupId) {
    await api.delete(`/api/groups/${groupId}`)
  }

  // ── Members ─────────────────────────────────────────────────

  /**
   * Add a member to the group.
   * @param {number} groupId
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  async addMember(groupId, userId) {
    const res = await api.post(`/api/groups/${groupId}/members`, { user_id: userId })
    return res.data
  }

  /**
   * Remove a member from the group.
   * @param {number} groupId
   * @param {number} userId
   * @returns {Promise<void>}
   */
  async removeMember(groupId, userId) {
    await api.delete(`/api/groups/${groupId}/members/${userId}`)
  }

  /**
   * Set a member's role (admin / member).
   * @param {number} groupId
   * @param {number} userId
   * @param {string} role - "admin" or "member"
   * @returns {Promise<Object>}
   */
  async setMemberRole(groupId, userId, role) {
    const res = await api.put(`/api/groups/${groupId}/members/${userId}/role`, { role })
    return res.data
  }

  /**
   * Mute or unmute a member.
   * @param {number} groupId
   * @param {number} userId
   * @param {{ muted: boolean, duration_minutes?: number }} data
   * @returns {Promise<Object>}
   */
  async muteMember(groupId, userId, data) {
    const res = await api.put(`/api/groups/${groupId}/members/${userId}/mute`, data)
    return res.data
  }

  // ── Announcements ───────────────────────────────────────────

  /**
   * Create a group announcement.
   * @param {number} groupId
   * @param {{ content: string, is_pinned?: boolean }} data
   * @returns {Promise<Object>}
   */
  async createAnnouncement(groupId, data) {
    const res = await api.post(`/api/groups/${groupId}/announcements`, data)
    return res.data
  }

  /**
   * Get group announcements.
   * @param {number} groupId
   * @param {{ page?: number, page_size?: number }} params
   * @returns {Promise<Object>} Paginated announcements
   */
  async getAnnouncements(groupId, params = {}) {
    const qs = new URLSearchParams(params).toString()
    const url = `/api/groups/${groupId}/announcements${qs ? `?${qs}` : ''}`
    const res = await api.get(url)
    return res
  }

  // ── Join Requests ───────────────────────────────────────────

  /**
   * Submit a join request for a group.
   * @param {number} groupId
   * @param {{ message?: string }} data
   * @returns {Promise<Object>}
   */
  async createJoinRequest(groupId, data = {}) {
    const res = await api.post(`/api/groups/${groupId}/join-request`, data)
    return res.data
  }

  /**
   * Get pending join requests for a group (admin/owner).
   * @param {number} groupId
   * @param {{ page?: number, page_size?: number }} params
   * @returns {Promise<Object>} Paginated requests
   */
  async getJoinRequests(groupId, params = {}) {
    const qs = new URLSearchParams(params).toString()
    const url = `/api/groups/${groupId}/join-requests${qs ? `?${qs}` : ''}`
    const res = await api.get(url)
    return res
  }

  /**
   * Review (approve/reject) a join request.
   * @param {number} groupId
   * @param {number} requestId
   * @param {{ status: "approved" | "rejected" }} data
   * @returns {Promise<Object>}
   */
  async reviewJoinRequest(groupId, requestId, data) {
    const res = await api.put(`/api/groups/${groupId}/join-requests/${requestId}`, data)
    return res.data
  }

  // ── Group Messages ──────────────────────────────────────────

  /**
   * Get message history for a group.
   * @param {number} groupId
   * @param {{ page?: number, page_size?: number }} params
   * @returns {Promise<Object>} Paginated messages
   */
  async getMessages(groupId, params = {}) {
    const qs = new URLSearchParams(params).toString()
    const url = `/api/groups/${groupId}/messages${qs ? `?${qs}` : ''}`
    const res = await api.get(url)
    return res
  }

  /**
   * Send a message to a group.
   * @param {number} groupId
   * @param {{ content: string, message_type?: string, encrypted?: boolean }} data
   * @returns {Promise<Object>} Created message
   */
  async sendMessage(groupId, data) {
    const res = await api.post(`/api/groups/${groupId}/messages`, data)
    return res.data
  }
}

// Export singleton instance
export default new GroupService()
