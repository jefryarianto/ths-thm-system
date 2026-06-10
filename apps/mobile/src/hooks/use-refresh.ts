import { useState, useCallback, useRef } from 'react';

/**
 * Shared hook for pull-to-refresh pattern.
 * Uses `useRef` to keep the refetch function stable,
 * so `onRefresh` doesn't change on every render.
 */
export function useRefresh(refetch: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchRef.current();
    setRefreshing(false);
  }, []);

  return { refreshing, onRefresh };
}
