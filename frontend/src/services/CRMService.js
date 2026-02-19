import apiClient from './apiClient'
import { API_ENDPOINTS } from '../config/api.config'

const CRMService = {
  // Contacts
  createContact: (data) => apiClient.post(API_ENDPOINTS.CRM.CONTACTS, data),
  listContacts: (params) => apiClient.get(API_ENDPOINTS.CRM.CONTACTS, { params }),
  getContact: (id) => apiClient.get(API_ENDPOINTS.CRM.CONTACT(id)),
  updateContact: (id, data) => apiClient.put(API_ENDPOINTS.CRM.CONTACT(id), data),
  deleteContact: (id) => apiClient.delete(API_ENDPOINTS.CRM.CONTACT(id)),

  // Deals
  createDeal: (data) => apiClient.post(API_ENDPOINTS.CRM.DEALS, data),
  listDeals: (params) => apiClient.get(API_ENDPOINTS.CRM.DEALS, { params }),
  updateDeal: (id, data) => apiClient.put(API_ENDPOINTS.CRM.DEAL(id), data),
  deleteDeal: (id) => apiClient.delete(API_ENDPOINTS.CRM.DEAL(id)),

  // Activities
  createActivity: (data) => apiClient.post(API_ENDPOINTS.CRM.ACTIVITIES, data),
  listActivities: (params) => apiClient.get(API_ENDPOINTS.CRM.ACTIVITIES, { params }),
}

export default CRMService
