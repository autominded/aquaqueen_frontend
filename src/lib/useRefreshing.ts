import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Pull-to-refresh always does a full refetch of every currently-active
// query (every query with a mounted observer somewhere in the app), not
// just the ones the current screen happens to read — a screen-scoped list
// is easy to under-specify (miss a query a component further down the tree
// depends on) and then "refresh" silently leaves stale data on screen.
export function useRefreshing() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  return { refreshing, onRefresh };
}
