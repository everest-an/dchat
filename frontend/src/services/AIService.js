/**
 * AI Service
 * Provides AI-powered chat features: summarize, suggest replies, translate, draft.
 */
import api from './apiClient'
import { API_ENDPOINTS } from '../config/api.config'

const AIService = {
  /**
   * Summarize a set of messages.
   * @param {number[]} messageIds - Array of message IDs to summarize
   * @returns {Promise<string>} Summary text
   */
  async summarize(messageIds) {
    const res = await api.post(API_ENDPOINTS.AI.SUMMARIZE, { message_ids: messageIds })
    return res.data?.summary || res.summary
  },

  /**
   * Get reply suggestions based on recent messages.
   * @param {number[]} messageIds - Array of recent message IDs
   * @returns {Promise<string[]>} Array of suggested replies
   */
  async suggestReply(messageIds) {
    const res = await api.post(API_ENDPOINTS.AI.SUGGEST_REPLY, { message_ids: messageIds })
    const raw = res.data?.suggestions || res.suggestions
    // The backend returns a JSON string array — try to parse it.
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw)
      } catch {
        return [raw]
      }
    }
    return raw
  },

  /**
   * Translate text to a target language.
   * @param {string} text - Text to translate
   * @param {string} targetLang - Target language (e.g., "English", "Chinese", "Spanish")
   * @returns {Promise<string>} Translated text
   */
  async translate(text, targetLang) {
    const res = await api.post(API_ENDPOINTS.AI.TRANSLATE, { text, target_lang: targetLang })
    return res.data?.translation || res.translation
  },

  /**
   * Generate a message draft from a brief description.
   * @param {string} prompt - Brief description of what to write
   * @returns {Promise<string>} Draft message
   */
  async draft(prompt) {
    const res = await api.post(API_ENDPOINTS.AI.DRAFT, { prompt })
    return res.data?.draft || res.draft
  },
}

export default AIService
