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