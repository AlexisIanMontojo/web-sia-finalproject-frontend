import api from '../../services/api';

export const hotelApi = {
  info: () => api.get('/api/public/hotel'),
};

export const searchApi = {
  search: (params) => api.get('/api/public/search', { params }),
  availability: (params) => api.get('/api/public/availability', { params }),
};

export const reservationsApi = {
  list: () => api.get('/api/customer/reservations'),
  create: (data) => api.post('/api/customer/reservations', data),
  cancel: (id, reason) => api.post(`/api/customer/reservations/${id}/cancel`, { reason }),
};

export const profileApi = {
  get: () => api.get('/api/customer/profile'),
  update: (data) => api.put('/api/customer/profile', data),
  changePassword: (data) => api.put('/api/customer/password', data),
};
