import { useCallback, useEffect, useState } from 'react';

// Lives in memory for the whole session, so it survives page navigation.
const cache = new Map();

export function invalidate(key) {
  cache.delete(key);
}

/**
 * Returns cached data immediately (if any), then refreshes it in the background.
 * `fetcher` must be a stable function defined outside the component.
 */
export function useCachedFetch(key, fetcher) {
  const [data, setDataState] = useState(() => (cache.has(key) ? cache.get(key) : null));
  const [loading, setLoading] = useState(!cache.has(key));
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const fresh = await fetcher();
      cache.set(key, fresh);
      setDataState(fresh);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Update the list in place after a save or delete, without a reload.
  const setData = useCallback(
    (updater) => {
      setDataState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        cache.set(key, next);
        return next;
      });
    },
    [key]
  );

  return { data, loading, error, refresh, setData };
}