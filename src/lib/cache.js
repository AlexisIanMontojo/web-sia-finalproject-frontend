import { useCallback, useEffect, useState } from 'react';

const DEFAULT_TTL_MS = 15_000;
const CACHE_DB_NAME = 'hotel-reservation-cache';
const CACHE_DB_VERSION = 1;
const CACHE_STORE = 'public-data';

const cache = new Map();
const cacheUpdatedAt = new Map();
const inFlight = new Map();
const keyRevisions = new Map();
let cacheEpoch = 0;
let databasePromise = null;
let cacheScope = null;

const cacheChannel = typeof BroadcastChannel === 'undefined'
  ? null
  : new BroadcastChannel('hotel-reservation-cache');

if (cacheChannel && typeof window !== 'undefined') {
  cacheChannel.onmessage = () => window.dispatchEvent(new Event('cache:changed'));
}

function persistentKeyFor(key) {
  if (key.startsWith('public:')) return key;
  return cacheScope ? `private:${cacheScope}:${key}` : null;
}

function shouldPersist(key, persist) {
  return persist === true || (persist !== false && Boolean(persistentKeyFor(key)));
}

function revisionFor(key) {
  return keyRevisions.get(key) || 0;
}

function updateCache(key, data, updatedAt = Date.now()) {
  const previous = cache.get(key);
  const unchanged = previous !== undefined
    && JSON.stringify(previous) === JSON.stringify(data);
  const current = unchanged ? previous : data;
  cache.set(key, current);
  cacheUpdatedAt.set(key, updatedAt);
  return current;
}

function isFresh(key, ttlMs) {
  return cache.has(key) && Date.now() - (cacheUpdatedAt.get(key) || 0) < ttlMs;
}

function openCacheDatabase() {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(CACHE_STORE)) {
          request.result.createObjectStore(CACHE_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open browser cache.'));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function readPersistent(key) {
  const persistentKey = persistentKeyFor(key);
  if (!persistentKey) return null;

  try {
    const database = await openCacheDatabase();
    if (!database) return null;

    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(CACHE_STORE, 'readonly');
      const request = transaction.objectStore(CACHE_STORE).get(persistentKey);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Could not read browser cache.'));
    });
  } catch (error) {
    console.warn('Persistent cache read failed; loading fresh data instead.', error);
    return null;
  }
}

async function writePersistent(key, data, updatedAt, stillCurrent) {
  const persistentKey = persistentKeyFor(key);
  if (!persistentKey) return;

  try {
    const database = await openCacheDatabase();
    if (!database || !stillCurrent()) return;

    await new Promise((resolve, reject) => {
      const transaction = database.transaction(CACHE_STORE, 'readwrite');
      transaction.objectStore(CACHE_STORE).put({ key: persistentKey, data, updatedAt });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Could not write browser cache.'));
      transaction.onabort = () => reject(transaction.error || new Error('Browser cache write was aborted.'));
    });
  } catch (error) {
    console.warn('Persistent cache write failed; in-memory caching remains available.', error);
  }
}

async function deletePersistent(key) {
  const persistentKey = persistentKeyFor(key);
  if (!persistentKey) return;

  try {
    const database = await openCacheDatabase();
    if (!database) return;

    await new Promise((resolve, reject) => {
      const transaction = database.transaction(CACHE_STORE, 'readwrite');
      transaction.objectStore(CACHE_STORE).delete(persistentKey);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Could not delete browser cache.'));
      transaction.onabort = () => reject(transaction.error || new Error('Browser cache deletion was aborted.'));
    });
  } catch (error) {
    console.warn('Persistent cache invalidation failed.', error);
  }
}

async function clearPersistent() {
  try {
    const database = await openCacheDatabase();
    if (!database) return;

    await new Promise((resolve, reject) => {
      const transaction = database.transaction(CACHE_STORE, 'readwrite');
      transaction.objectStore(CACHE_STORE).clear();
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Could not clear browser cache.'));
      transaction.onabort = () => reject(transaction.error || new Error('Browser cache clear was aborted.'));
    });
  } catch (error) {
    console.warn('Persistent cache clearing failed.', error);
  }
}

function isCurrent(key, epoch, revision) {
  return cacheEpoch === epoch && revisionFor(key) === revision;
}

function fetchAndCache(key, fetcher) {
  if (inFlight.has(key)) return inFlight.get(key);

  const epoch = cacheEpoch;
  const revision = revisionFor(key);
  let request;
  request = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      if (isCurrent(key, epoch, revision)) {
        return updateCache(key, data);
      }
      return data;
    })
    .finally(() => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

export function invalidate(key) {
  keyRevisions.set(key, revisionFor(key) + 1);
  cache.delete(key);
  cacheUpdatedAt.delete(key);
  inFlight.delete(key);
  void deletePersistent(key);
}

export function clearCache() {
  cacheEpoch += 1;
  cache.clear();
  cacheUpdatedAt.clear();
  keyRevisions.clear();
  inFlight.clear();
  void clearPersistent();
}

export function clearMemoryCache() {
  cacheEpoch += 1;
  cache.clear();
  cacheUpdatedAt.clear();
  keyRevisions.clear();
  inFlight.clear();
}

export function setCacheScope(scope) {
  const nextScope = scope == null ? null : String(scope);
  if (cacheScope !== nextScope) {
    cacheScope = nextScope;
    clearMemoryCache();
  }
}

export function publishCacheChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cache:changed'));
  }
  cacheChannel?.postMessage({ changedAt: Date.now() });
}

export async function prefetchCachedFetch(
  key,
  fetcher,
  { ttlMs = DEFAULT_TTL_MS, persist = false, staleWhileRevalidateMs = 0 } = {}
) {
  if (isFresh(key, ttlMs)) return cache.get(key);

  const epoch = cacheEpoch;
  const revision = revisionFor(key);
  const persistData = shouldPersist(key, persist);
  if (persistData && !cache.has(key)) {
    const saved = await readPersistent(key);
    if (
      isCurrent(key, epoch, revision) &&
      saved &&
      Date.now() - saved.updatedAt <= ttlMs + staleWhileRevalidateMs
    ) {
      updateCache(key, saved.data, saved.updatedAt);
      if (Date.now() - saved.updatedAt < ttlMs) return saved.data;
    }
  }

  const data = await fetchAndCache(key, fetcher);
  if (persistData) {
    const updatedAt = cacheUpdatedAt.get(key) || Date.now();
    void writePersistent(key, data, updatedAt, () => isCurrent(key, epoch, revision));
  }
  return data;
}

export function useCachedFetch(
  key,
  fetcher,
  {
    enabled = true,
    ttlMs = DEFAULT_TTL_MS,
    persist,
    staleWhileRevalidateMs = 0,
    pollIntervalMs = 15_000,
  } = {}
) {
  const persistData = shouldPersist(key, persist);
  const [state, setState] = useState(() => ({
    key,
    data: cache.has(key) ? cache.get(key) : null,
    loading: !cache.has(key),
    error: null,
  }));

  const refresh = useCallback(async () => {
    const epoch = cacheEpoch;
    const revision = revisionFor(key);
    setState((current) => {
      const data = current.key === key ? current.data : cache.has(key) ? cache.get(key) : null;
      return { key, data, loading: data == null, error: null };
    });

    try {
      const fresh = await fetchAndCache(key, fetcher);
      if (!isCurrent(key, epoch, revision)) return;

      const updatedAt = cacheUpdatedAt.get(key) || Date.now();
      setState({ key, data: fresh, loading: false, error: null });
      if (persistData) {
        void writePersistent(key, fresh, updatedAt, () => isCurrent(key, epoch, revision));
      }
    } catch (error) {
      if (!isCurrent(key, epoch, revision)) return;
      setState((current) => {
        const data = current.key === key ? current.data : cache.has(key) ? cache.get(key) : null;
        if (
          current.key === key
          && current.error?.message === error?.message
          && current.error?.response?.status === error?.response?.status
        ) {
          return current;
        }
        return { key, data, loading: false, error };
      });
    }
  }, [fetcher, key, persistData]);

  useEffect(() => {
    if (!enabled) return undefined;

    let active = true;
    const epoch = cacheEpoch;
    const revision = revisionFor(key);

    const load = async () => {
      let updatedAt = cacheUpdatedAt.get(key) || 0;
      if (!cache.has(key) && persistData) {
        const saved = await readPersistent(key);
        if (!active || !isCurrent(key, epoch, revision)) return;

        const keepSaved = saved && (
          !key.startsWith('public:')
          || Date.now() - saved.updatedAt <= ttlMs + staleWhileRevalidateMs
        );
        if (keepSaved) {
          updateCache(key, saved.data, saved.updatedAt);
          updatedAt = saved.updatedAt;
          setState({ key, data: saved.data, loading: false, error: null });
        } else if (saved) {
          void deletePersistent(key);
        }
      }

      if (!active || !isCurrent(key, epoch, revision)) return;
      if (cache.has(key) && Date.now() - updatedAt < ttlMs) return;
      refresh();
    };

    void load();
    return () => {
      active = false;
    };
  }, [enabled, key, persistData, refresh, staleWhileRevalidateMs, ttlMs]);

  useEffect(() => {
    if (!enabled) return undefined;

    const refreshWhenVisible = (force = false) => {
      if (
        document.visibilityState === 'visible'
        && (force || !isFresh(key, ttlMs))
      ) {
        refresh();
      }
    };
    const poll = pollIntervalMs > 0
      ? window.setInterval(() => refreshWhenVisible(), pollIntervalMs)
      : null;
    const refreshOnActivity = () => refreshWhenVisible(true);
    const refreshAfterChange = () => {
      invalidate(key);
      refreshWhenVisible(true);
    };

    window.addEventListener('focus', refreshOnActivity);
    document.addEventListener('visibilitychange', refreshOnActivity);
    window.addEventListener('cache:changed', refreshAfterChange);
    return () => {
      if (poll !== null) window.clearInterval(poll);
      window.removeEventListener('focus', refreshOnActivity);
      document.removeEventListener('visibilitychange', refreshOnActivity);
      window.removeEventListener('cache:changed', refreshAfterChange);
    };
  }, [enabled, key, pollIntervalMs, refresh, ttlMs]);

  const setData = useCallback((updater) => {
    keyRevisions.set(key, revisionFor(key) + 1);
    inFlight.delete(key);
    const revision = revisionFor(key);
    setState((current) => {
      const previous = current.key === key ? current.data : cache.has(key) ? cache.get(key) : null;
      const next = typeof updater === 'function' ? updater(previous) : updater;
      updateCache(key, next);
      if (persistData) {
        const epoch = cacheEpoch;
        void writePersistent(key, next, cacheUpdatedAt.get(key), () => isCurrent(key, epoch, revision));
      }
      return { key, data: next, loading: false, error: null };
    });
  }, [key, persistData]);

  const current = state.key === key ? state : {
    key,
    data: cache.has(key) ? cache.get(key) : null,
    loading: !cache.has(key),
    error: null,
  };

  return { data: current.data, loading: current.loading, error: current.error, refresh, setData };
}
