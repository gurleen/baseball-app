import { applyPatch, type Operation } from "fast-json-patch";
import { useEffect, useRef, useState } from "react";

import { isAbortError } from "../api/errors";
import {
  getMlbGameFeed,
  getMlbGameFeedDiffPatch,
  type MlbGameFeedDiffPatchFallback,
  type MlbGameFeedQuery,
} from "../api/endpoints/gumbo";
import type { GumboFeed } from "../types/gumbo";

export interface UseGameDataQuery extends MlbGameFeedQuery {
  gameId: number | string;
  pollIntervalMs?: number;
}

export const DEFAULT_GAME_DATA_POLL_INTERVAL_MS = 3000;

export interface UseGameDataResult {
  data: GumboFeed | null;
  error: Error | null;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdatedAt: Date | null;
  refetch: () => Promise<void>;
}

export function useGameData(query: UseGameDataQuery): UseGameDataResult {
  const [data, setData] = useState<GumboFeed | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const dataRef = useRef<GumboFeed | null>(null);
  const pushUpdateIdRef = useRef(crypto.randomUUID());
  const queryKey = JSON.stringify(query);
  const pollIntervalMs = query.pollIntervalMs ?? DEFAULT_GAME_DATA_POLL_INTERVAL_MS;

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;
    let nextPollTimer: ReturnType<typeof setTimeout> | null = null;

    pushUpdateIdRef.current = crypto.randomUUID();

    function updateData(nextData: GumboFeed) {
      dataRef.current = nextData;
      setData(nextData);
      setLastUpdatedAt(new Date());
    }

    function normalizeFallbackData(nextData: MlbGameFeedDiffPatchFallback) {
      return {
        copyright: dataRef.current?.copyright ?? "",
        ...nextData,
      } satisfies GumboFeed;
    }

    function scheduleNextPoll() {
      if (!isMounted || pollIntervalMs <= 0) {
        return;
      }

      nextPollTimer = setTimeout(() => {
        void pollForDiffPatch();
      }, pollIntervalMs);
    }

    async function fetchFullFeed() {
      const shouldShowLoading = dataRef.current === null;

      setIsLoading(shouldShowLoading);
      setIsRefreshing(!shouldShowLoading);
      setError(null);

      try {
        const nextData = await getMlbGameFeed(query.gameId, {
          language: query.language,
          signal: controller.signal,
        });

        if (!isMounted) {
          return;
        }

        updateData(nextData);
      } catch (nextError) {
        if (!isMounted || isAbortError(nextError)) {
          return;
        }

        setError(nextError instanceof Error ? nextError : new Error("Unknown game data fetch error"));
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
          scheduleNextPoll();
        }
      }
    }

    async function pollForDiffPatch() {
      const currentData = dataRef.current;

      if (!currentData) {
        await fetchFullFeed();
        return;
      }

      setIsRefreshing(true);
      setError(null);

      try {
        const nextData = await getMlbGameFeedDiffPatch(query.gameId, {
          language: query.language,
          startTimecode: currentData.metaData.timeStamp,
          pushUpdateId: pushUpdateIdRef.current,
          signal: controller.signal,
        });

        if (!isMounted) {
          return;
        }

        if (Array.isArray(nextData)) {
          if (nextData.length > 0) {
            let patchedData = currentData;

            for (const entry of nextData) {
              patchedData = applyPatch(
                structuredClone(patchedData),
                entry.diff as readonly Operation[],
                false,
                true,
              ).newDocument as GumboFeed;
            }

            updateData(patchedData);
          } else {
            setLastUpdatedAt(new Date());
          }
        } else {
          updateData(normalizeFallbackData(nextData));
        }

        pushUpdateIdRef.current = crypto.randomUUID();
      } catch (nextError) {
        if (!isMounted || isAbortError(nextError)) {
          return;
        }

        setError(nextError instanceof Error ? nextError : new Error("Unknown game data refresh error"));
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
          scheduleNextPoll();
        }
      }
    }

    void fetchFullFeed();

    return () => {
      isMounted = false;
      controller.abort();

      if (nextPollTimer) {
        clearTimeout(nextPollTimer);
      }
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