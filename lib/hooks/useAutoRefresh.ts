import { useEffect, useRef, useCallback } from "react";

interface UseAutoRefreshOptions {
  interval?: number; // in milliseconds
  enabled?: boolean;
  onRefresh: () => Promise<void> | void;
}

export function useAutoRefresh({
  interval = 15000, // 15 seconds default
  enabled = true,
  onRefresh,
}: UseAutoRefreshOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshing = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshing.current) return;

    try {
      isRefreshing.current = true;
      await onRefresh();
    } catch (error) {
      console.error("Auto-refresh error:", error);
    } finally {
      isRefreshing.current = false;
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial refresh
    refresh();

    // Set up interval
    intervalRef.current = setInterval(refresh, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, refresh]);

  return { refresh };
}
