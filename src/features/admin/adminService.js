import api from '../../services/api';

export const getDashboardStats = () => api.get('/api/admin/dashboard/stats');
export const getDashboardCharts = () => api.get('/api/admin/dashboard/charts');

export const categoriesApi = {
  list: () => api.get('/api/admin/categories'),
  create: (data) => api.post('/api/admin/categories', data),
  update: (id, data) => api.put(`/api/admin/categories/${id}`, data),
  remove: (id) => api.delete(`/api/admin/categories/${id}`),
};

export const roomsApi = {
  list: () => api.get('/api/admin/rooms'),
  create: (data) => api.post('/api/admin/rooms', data),
  update: (id, data) => api.put(`/api/admin/rooms/${id}`, data),
  remove: (id) => api.delete(`/api/admin/rooms/${id}`),
  uploadImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/api/admin/rooms/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const pricingApi = {
  list: () => api.get('/api/admin/pricing'),
  create: (data) => api.post('/api/admin/pricing', data),
  update: (id, data) => api.put(`/api/admin/pricing/${id}`, data),
  remove: (id) => api.delete(`/api/admin/pricing/${id}`),
};

export const customersApi = {
  list: () => api.get('/api/admin/customers'),
  update: (id, data) => api.put(`/api/admin/customers/${id}`, data),
};
export const availabilityApi = {
  list: (from, to) => api.get('/api/admin/availability', { params: { from, to } }),
};

export const roomBlocksApi = {
  list: (from, to) => api.get('/api/admin/room-blocks', { params: { from, to } }),
  create: (data) => api.post('/api/admin/room-blocks', data),
  remove: (id) => api.delete(`/api/admin/room-blocks/${id}`),
};

export const reservationsApi = {
  list: (status) => api.get('/api/admin/reservations', { params: status ? { status } : {} }),
  confirm: (id) => api.post(`/api/admin/reservations/${id}/confirm`),
  reject: (id, reason) => api.post(`/api/admin/reservations/${id}/reject`, { reason }),
};

export const hotelAdminApi = {
  get: () => api.get('/api/admin/hotel'),
  update: (data) => api.put('/api/admin/hotel', data),
  updateMap: (data) => api.put('/api/admin/map', data),
};

export const adminReviewsApi = {
  list: () => api.get('/api/admin/reviews'),
  update: (id, data) => api.put(`/api/admin/reviews/${id}`, data),
};

export const checkinApi = {
  list: () => api.get('/api/admin/check-in-out'),
  checkIn: (id, notes) => api.post(`/api/admin/reservations/${id}/check-in`, { notes }),
  checkOut: (id, data) => api.post(`/api/admin/reservations/${id}/check-out`, data),
};

export const adminMessagesApi = {
  list: (filter) => api.get('/api/admin/messages', { params: { filter } }),
  thread: (id) => api.get(`/api/admin/messages/${id}`),
  reply: (id, data) => api.post(`/api/admin/messages/${id}/reply`, data),
  setRead: (id, isRead) => api.put(`/api/admin/messages/${id}/read`, { is_read: isRead }),
};

export const staffApi = {
  list: () => api.get('/api/admin/staff'),
  create: (data) => api.post('/api/admin/staff', data),
  update: (id, data) => api.put(`/api/admin/staff/${id}`, data),
  resetPassword: (id, password) => api.put(`/api/admin/staff/${id}/password`, { password }),
};

export const serviceRequestsApi = {
  list: (status) => api.get('/api/admin/service-requests', { params: { status } }),
  confirm: (id) => api.post(`/api/admin/service-requests/${id}/confirm`),
  complete: (id) => api.post(`/api/admin/service-requests/${id}/complete`),
  billed: (id) => api.post(`/api/admin/service-requests/${id}/billed`),
};

export const serviceCatalogApi = {
  list: () => api.get('/api/admin/service-catalog'),
  create: (data) => api.post('/api/admin/service-catalog', data),
  update: (id, data) => api.put(`/api/admin/service-catalog/${id}`, data),
};