import { useEffect, useState } from "react";

import { getSchedule, type ScheduleQuery } from "../api/endpoints/schedule";
import type { ScheduleResponse } from "../types/schedule";
import { isAbortError } from "../api/errors";

export interface UseScheduleResult {
  data: ScheduleResponse | null;
  error: Error | null;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdatedAt: Date | null;
  refetch: () => Promise<void>;
}

export function useSchedule(query: ScheduleQuery): UseScheduleResult {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function run() {
      const shouldShowLoading = data === null;

      setIsLoading(shouldShowLoading);
      setIsRefreshing(!shouldShowLoading);
      setError(null);

      try {
        const nextData = await getSchedule({
          ...query,
          signal: controller.signal,
        });

        if (!isMounted) {
          return;
        }

        setData(nextData);
        setLastUpdatedAt(new Date());
      } catch (nextError) {
        if (!isMounted || isAbortError(nextError)) {
          return;
        }

        setError(nextError instanceof Error ? nextError : new Error("Unknown schedule fetch error"));
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    void run();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [queryKey, refreshToken]);

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    lastUpdatedAt,
    refetch: async () => {
      setRefreshToken(current => current + 1);
    },
  };
}