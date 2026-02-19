import apiClient from './apiClient'
import { API_ENDPOINTS } from '../config/api.config'

const BotService = {
  createBot: (data) => apiClient.post(API_ENDPOINTS.BOTS.CREATE, data),
  listBots: () => apiClient.get(API_ENDPOINTS.BOTS.LIST),
  getBot: (id) => apiClient.get(API_ENDPOINTS.BOTS.GET(id)),
  updateBot: (id, data) => apiClient.put(API_ENDPOINTS.BOTS.UPDATE(id), data),
  deleteBot: (id) => apiClient.delete(API_ENDPOINTS.BOTS.DELETE(id)),
  regenerateToken: (id) => apiClient.post(API_ENDPOINTS.BOTS.REGENERATE_TOKEN(id)),
  getBotEvents: (id) => apiClient.get(API_ENDPOINTS.BOTS.EVENTS(id)),
}

export default BotService
