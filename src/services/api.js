import axios from 'axios';

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshInFlight = null;

export function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = api
      .post('/api/auth/refresh', {
        refresh_token: sessionStorage.getItem('refresh_token'),
      })
      .then(({ data }) => {
        const tokens = data.tokens ?? data;
        setAccessToken(tokens.access_token);
        if (tokens.refresh_token) {
          sessionStorage.setItem('refresh_token', tokens.refresh_token);
        }
        return tokens;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const url = original?.url || '';

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !url.startsWith('/api/auth/')
    ) {
      original._retry = true;

      try {
        const tokens = await refreshSession();
        original.headers.Authorization = `Bearer ${tokens.access_token}`;
        return api(original);
      } catch {
        setAccessToken(null);
        sessionStorage.removeItem('refresh_token');
        window.dispatchEvent(new Event('auth:expired'));
      }
    }

    return Promise.reject(error);
  }
);

export default api;