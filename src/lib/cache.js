import { useCallback, useEffect, useState } from 'react';

// Lives in memory for the whole session, so it survives page navigation.
const cache = new Map();

export function invalidate(key) {
  cache.delete(key);
}

export function clearCache() {
  cache.clear();
}

/**
 * Returns cached data immediately (if any), then refreshes it in the background.
 * `fetcher` must be a stable function defined outside the component.
 */
export function useCachedFetch(key, fetcher) {
  const [state, setState] = useState(() => ({
    key,
    data: cache.has(key) ? cache.get(key) : null,
    loading: !cache.has(key),
    error: null,
  }));

  const refresh = useCallback(async () => {
    setState((current) => {
      const data = current.key === key ? current.data : cache.has(key) ? cache.get(key) : null;
      return { key, data, loading: data == null, error: null };
    });

    try {
      const fresh = await fetcher();
      cache.set(key, fresh);
      setState({ key, data: fresh, loading: false, error: null });
    } catch (err) {
      setState((current) => {
        const data = current.key === key ? current.data : cache.has(key) ? cache.get(key) : null;
        return { key, data, loading: false, error: err };
      });
    }
  }, [key, fetcher]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) refresh();
    });

    return () => {
      active = false;
    };
  }, [refresh]);

  // Update the list in place after a save or delete, without a reload.
  const setData = useCallback((updater) => {
    setState((current) => {
      const previous = current.key === key ? current.data : cache.has(key) ? cache.get(key) : null;
      const next = typeof updater === 'function' ? updater(previous) : updater;
      cache.set(key, next);
      return { key, data: next, loading: false, error: null };
    });
  }, [key]);

  const current = state.key === key ? state : {
    key,
    data: cache.has(key) ? cache.get(key) : null,
    loading: !cache.has(key),
    error: null,
  };

  return { data: current.data, loading: current.loading, error: current.error, refresh, setData };
}