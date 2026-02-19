/**
 * Ticket Service - API client for customer support tickets.
 */
import api from './apiClient'

const BASE = '/api/tickets'

const TicketService = {
  async create(data) {
    const res = await api.post(BASE, data)
    return res.data || res
  },

  async list(page = 1, pageSize = 20) {
    const res = await api.get(`${BASE}?page=${page}&page_size=${pageSize}`)
    return res.data || res
  },

  async get(id) {
    const res = await api.get(`${BASE}/${id}`)
    return res.data || res
  },

  async reply(id, content) {
    const res = await api.post(`${BASE}/${id}/reply`, { content })
    return res.data || res
  },

  async updateStatus(id, status) {
    const res = await api.put(`${BASE}/${id}/status`, { status })
    return res.data || res
  },
}

export default TicketService
