import axios from 'axios';
import { clearCache as clearViewCache } from '../lib/cache';

let accessToken = null;
const responseCache = new Map();
const RESPONSE_CACHE_TTL = 30_000;
const RESPONSE_CACHE_LIMIT = 100;

const configuredApiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// Production requests stay same-origin and use the Vercel /api and /uploads rewrites.
export const API_BASE_URL = import.meta.env.PROD ? '' : configuredApiBaseUrl;

function clearResponseCache() {
  responseCache.clear();
}

export function clearApiCache() {
  clearResponseCache();
  clearViewCache();
}

export function setAccessToken(token) {
  if (accessToken !== token) {
    clearApiCache();
  }
  accessToken = token;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

function responseCacheTtl(config) {
  if (config.cache === false || config.method?.toLowerCase() !== 'get') return 0;

  const url = (config.url || '').split('?')[0];
  if (
    /\/api\/(public\/availability|public\/search|admin\/availability)(\/|$)/.test(url) ||
    /\/api\/customer\/reservations\/\d+\/(payments|services)$/.test(url) ||
    /\/api\/customer\/messages\/unread-count$/.test(url)
  ) {
    return 0;
  }

  return Number.isFinite(config.cacheTtl)
    ? Math.max(0, config.cacheTtl)
    : RESPONSE_CACHE_TTL;
}

const defaultAdapter = axios.getAdapter(api.defaults.adapter);
api.defaults.adapter = async (config) => {
  const ttl = responseCacheTtl(config);
  const key = ttl > 0
    ? `${accessToken || 'anonymous'}:${api.getUri(config)}`
    : null;
  const cached = key ? responseCache.get(key) : null;

  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.response, config, request: null };
  }
  if (cached) responseCache.delete(key);

  const response = await defaultAdapter(config);
  const cacheControl = response.headers?.get?.('cache-control')
    || response.headers?.['cache-control']
    || '';

  if (
    key &&
    response.status === 200 &&
    (!/no-store/i.test(cacheControl) || config.cache === 'memory')
  ) {
    responseCache.set(key, {
      response: {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      },
      expiresAt: Date.now() + ttl,
    });

    while (responseCache.size > RESPONSE_CACHE_LIMIT) {
      responseCache.delete(responseCache.keys().next().value);
    }
  }

  return response;
};

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
  (response) => {
    if (response.config.method?.toLowerCase() !== 'get') {
      clearApiCache();
    }
    return response;
  },
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

// Full URL for a backend path such as /uploads/rooms/photo.jpg.
// An empty VITE_API_URL leaves the path relative for the local proxy or Vercel rewrite.
export function apiUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}