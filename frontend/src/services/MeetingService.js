/**
 * Meeting Service
 * API client for meeting recording, transcription, and summarization.
 */
import api from './apiClient'

const BASE = '/api/meetings'

const MeetingService = {
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

  async end(id) {
    const res = await api.put(`${BASE}/${id}/end`)
    return res.data || res
  },

  async updateTranscript(id, transcript, append = true) {
    const res = await api.put(`${BASE}/${id}/transcript`, { transcript, append })
    return res.data || res
  },

  async transcribeAudio(id, audioBlob, language = '') {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    if (language) formData.append('language', language)
    const res = await api.upload(`${BASE}/${id}/transcribe`, formData)
    return res.data || res
  },

  async summarize(id) {
    const res = await api.post(`${BASE}/${id}/summarize`)
    return res.data || res
  },
}

export default MeetingService
