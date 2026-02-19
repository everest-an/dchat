import apiClient from './apiClient'
import { API_ENDPOINTS } from '../config/api.config'

const MatchingService = {
  getRecommendations: (params) => apiClient.get(API_ENDPOINTS.MATCHING.RECOMMENDATIONS, { params }),
  recordFeedback: (data) => apiClient.post(API_ENDPOINTS.MATCHING.FEEDBACK, data),
}

export default MatchingService
