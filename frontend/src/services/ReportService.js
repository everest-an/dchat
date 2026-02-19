/**
 * Report Service
 *
 * Handles user reporting and content moderation API calls.
 */

import api from './apiClient'

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam', description: 'Unsolicited or repetitive content' },
  { value: 'harassment', label: 'Harassment', description: 'Abusive or threatening behavior' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Offensive or explicit material' },
  { value: 'fraud', label: 'Fraud / Scam', description: 'Deceptive or fraudulent activity' },
  { value: 'other', label: 'Other', description: 'Other reason not listed above' },
]

class ReportService {
  /**
   * Submit a report
   * @param {Object} params
   * @param {number} params.reported_user_id - ID of the user being reported
   * @param {number} [params.reported_message_id] - ID of the message being reported
   * @param {string} params.reason - Report reason
   * @param {string} [params.description] - Additional details
   * @returns {Promise<Object>} Created report
   */
  async createReport({ reported_user_id, reported_message_id, reason, description }) {
    const body = { reported_user_id, reason }
    if (reported_message_id) body.reported_message_id = reported_message_id
    if (description) body.description = description

    const res = await api.post('/api/reports', body)
    return res.data
  }

  /**
   * Get reports submitted by the current user
   * @param {number} [page=1]
   * @param {number} [pageSize=20]
   * @returns {Promise<Object>} Paginated reports
   */
  async getMyReports(page = 1, pageSize = 20) {
    const res = await api.get(`/api/reports/mine?page=${page}&page_size=${pageSize}`)
    return res.data
  }

  /**
   * Get available report reasons
   * @returns {Array<Object>}
   */
  getReasons() {
    return REPORT_REASONS
  }
}

export default new ReportService()
