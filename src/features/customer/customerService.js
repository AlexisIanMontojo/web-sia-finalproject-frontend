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

export const changeRequestApi = {
  list: () => api.get('/api/customer/change-requests'),
  create: (reservationId, data) =>
    api.post(`/api/customer/reservations/${reservationId}/change-requests`, data),
};

export const inquiryApi = {
  list: () => api.get('/api/customer/inquiries'),
  create: (data) => api.post('/api/customer/inquiries', data),
};

export const passwordApi = {
  forgot: (email) => api.post('/api/auth/forgot-password', { email }),
  reset: (data) => api.post('/api/auth/reset-password', data),
};

export const catalogueApi = {
  rooms: (params) => api.get('/api/public/rooms', { params, cache: false }),
  room: (id, params) => api.get(`/api/public/rooms/${id}`, { params, cache: false }),
};

export const mapApi = {
  get: () => api.get('/api/public/map'),
};

export const reviewApi = {
  mine: () => api.get('/api/customer/reviews'),
  create: (data) => api.post('/api/customer/reviews', data),
};

export const testimonialApi = {
  list: () => api.get('/api/public/testimonials'),
};

export const fetchDefaultCatalogue = async () => {
  const { data } = await catalogueApi.rooms({ guests: 1 });
  return data;
};

export const fetchHotelPageData = async () => {
  const [info, mapRes] = await Promise.all([hotelApi.info(), mapApi.get()]);
  return {
    hotel: info.data.hotel,
    map: mapRes.data.configured ? mapRes.data.map : null,
  };
};

export const fetchTestimonials = async () => {
  const { data } = await testimonialApi.list();
  return { data: data.data, summary: data.summary };
};

export const messagesApi = {
  list: () => api.get('/api/customer/messages'),
  send: (data) => api.post('/api/customer/messages', data),
  reply: (id, message) => api.post(`/api/customer/messages/${id}/reply`, { message }),
  unreadCount: () => api.get('/api/customer/messages/unread-count'),
  markRead: () => api.put('/api/customer/messages/read'),
};

export const servicesApi = {
  catalog: () => api.get('/api/customer/services', { cache: 'memory' }),
  forReservation: (id, force = false) => api.get(
    `/api/customer/reservations/${id}/services`,
    { cache: force ? false : 'memory' }
  ),
  add: (id, data) => api.post(`/api/customer/reservations/${id}/services`, data),
  cancel: (id) => api.post(`/api/customer/reservation-services/${id}/cancel`),
};

export const paymentsApi = {
  list: (id, externalId = '', force = false) => api.get(
    `/api/customer/reservations/${id}/payments`,
    {
      params: externalId ? { external_id: externalId } : {},
      cache: force ? false : 'memory',
    }
  ),
  reservationPayment: (id, data) => api.post(`/api/customer/reservations/${id}/payment`, data),
  downpayment: (id) => api.post(`/api/customer/reservations/${id}/downpayment`),
};