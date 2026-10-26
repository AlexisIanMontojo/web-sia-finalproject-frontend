import api from '../../services/api';

export const register = (data) => api.post('/api/auth/register', data);
export const login = (data) => api.post('/api/auth/login', data);
export const logout = (refreshToken) =>
  api.post('/api/auth/logout', { refresh_token: refreshToken });
export const getMe = () => api.get('/api/auth/me');