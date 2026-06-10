import { useState, useCallback } from 'react';

/**
 * Shared hook for pull-to-refresh pattern.
 * Eliminates duplicate `refreshing` + `onRefresh` boilerplate across screens.
 */
export function useRefresh(refetch: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return { refreshing, onRefresh };
}
