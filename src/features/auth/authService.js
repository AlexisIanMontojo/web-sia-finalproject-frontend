
import api from '../../services/api';

export function register(data) {
  return api.post('/api/auth/register', data);
}

export function login(data) {
  return api.post('/api/auth/login', data);
}
