import api from './apiClient'

const TaskService = {
  create: (data) => api.post('/api/tasks', data),
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/api/tasks${query ? '?' + query : ''}`)
  },
  get: (id) => api.get(`/api/tasks/${id}`),
  update: (id, data) => api.put(`/api/tasks/${id}`, data),
  delete: (id) => api.delete(`/api/tasks/${id}`),
}

export default TaskService
