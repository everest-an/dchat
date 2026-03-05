import apiClient from './apiClient'
import { API_ENDPOINTS } from '../config/api.config'

/**
 * ProfileService handles user profile sub-resource API calls.
 * Each sub-resource (skills, projects, resources, seeking, business)
 * has full CRUD support.
 */
const ProfileService = {
  // ─── User Profile ───────────────────────────────────────────
  /** Update the authenticated user's core profile fields. */
  updateMe: (data) => apiClient.put(API_ENDPOINTS.USER.UPDATE_ME, data),

  // ─── Skills ─────────────────────────────────────────────────
  listSkills: () => apiClient.get(API_ENDPOINTS.PROFILE.SKILLS),
  createSkill: (data) => apiClient.post(API_ENDPOINTS.PROFILE.SKILLS, data),
  updateSkill: (id, data) => apiClient.put(API_ENDPOINTS.PROFILE.SKILL(id), data),
  deleteSkill: (id) => apiClient.delete(API_ENDPOINTS.PROFILE.SKILL(id)),

  // ─── Projects ───────────────────────────────────────────────
  listProjects: () => apiClient.get(API_ENDPOINTS.PROFILE.PROJECTS),
  createProject: (data) => apiClient.post(API_ENDPOINTS.PROFILE.PROJECTS, data),
  updateProject: (id, data) => apiClient.put(API_ENDPOINTS.PROFILE.PROJECT(id), data),
  deleteProject: (id) => apiClient.delete(API_ENDPOINTS.PROFILE.PROJECT(id)),

  // ─── Resources ──────────────────────────────────────────────
  listResources: () => apiClient.get(API_ENDPOINTS.PROFILE.RESOURCES),
  createResource: (data) => apiClient.post(API_ENDPOINTS.PROFILE.RESOURCES, data),
  updateResource: (id, data) => apiClient.put(API_ENDPOINTS.PROFILE.RESOURCE(id), data),
  deleteResource: (id) => apiClient.delete(API_ENDPOINTS.PROFILE.RESOURCE(id)),

  // ─── Seeking ────────────────────────────────────────────────
  listSeeking: () => apiClient.get(API_ENDPOINTS.PROFILE.SEEKING),
  createSeeking: (data) => apiClient.post(API_ENDPOINTS.PROFILE.SEEKING, data),
  updateSeeking: (id, data) => apiClient.put(API_ENDPOINTS.PROFILE.SEEKING_ITEM(id), data),
  deleteSeeking: (id) => apiClient.delete(API_ENDPOINTS.PROFILE.SEEKING_ITEM(id)),

  // ─── Business Info ──────────────────────────────────────────
  getBusiness: () => apiClient.get(API_ENDPOINTS.PROFILE.BUSINESS),
  upsertBusiness: (data) => apiClient.put(API_ENDPOINTS.PROFILE.BUSINESS, data),
}

export default ProfileService
