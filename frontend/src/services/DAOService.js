import apiClient from './apiClient'
import { API_ENDPOINTS } from '../config/api.config'

const DAOService = {
  createProposal: (data) => apiClient.post(API_ENDPOINTS.DAO.PROPOSALS, data),
  listProposals: (params) => apiClient.get(API_ENDPOINTS.DAO.PROPOSALS, { params }),
  getProposal: (id) => apiClient.get(API_ENDPOINTS.DAO.PROPOSAL(id)),
  castVote: (id, data) => apiClient.post(API_ENDPOINTS.DAO.VOTE(id), data),
  getTreasury: (params) => apiClient.get(API_ENDPOINTS.DAO.TREASURY, { params }),
}

export default DAOService
