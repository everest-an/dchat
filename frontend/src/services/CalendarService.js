import api from './apiClient'

const CalendarService = {
  createEvent: (data) => api.post('/api/calendar/events', data),
  getEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return api.get(`/api/calendar/events${query ? '?' + query : ''}`)
  },
  getEvent: (id) => api.get(`/api/calendar/events/${id}`),
  updateEvent: (id, data) => api.put(`/api/calendar/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/api/calendar/events/${id}`),
  respondToEvent: (id, status) => api.put(`/api/calendar/events/${id}/respond`, { status }),
}

export default CalendarService
