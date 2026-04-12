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
  displayDelayMs: number;
  isDisplayPaused: boolean;
  setDisplayDelayMs: (delayMs: number) => void;
  setIsDisplayPaused: (isPaused: boolean) => void;
  refetch: () => Promise<void>;
}

export function useGameData(query: UseGameDataQuery): UseGameDataResult {
  const [data, setData] = useState<GumboFeed | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [displayDelayMsState, setDisplayDelayMsState] = useState(0);
  const [isDisplayPausedState, setIsDisplayPausedState] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const liveDataRef = useRef<GumboFeed | null>(null);
  const queuedDisplaySnapshotsRef = useRef<Array<{ data: GumboFeed; receivedAt: number }>>([]);
  const displayUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayDelayMsRef = useRef(0);
  const isDisplayPausedRef = useRef(false);
  const pushUpdateIdRef = useRef(crypto.randomUUID());
  const queryKey = JSON.stringify(query);
  const pollIntervalMs = query.pollIntervalMs ?? DEFAULT_GAME_DATA_POLL_INTERVAL_MS;

  function clearScheduledDisplayUpdate() {
    if (displayUpdateTimerRef.current) {
      clearTimeout(displayUpdateTimerRef.current);
      displayUpdateTimerRef.current = null;
    }
  }

  function commitDisplayedData(nextData: GumboFeed) {
    setData(nextData);
    setLastUpdatedAt(new Date());
  }

  function scheduleNextDisplayUpdate() {
    clearScheduledDisplayUpdate();

    if (isDisplayPausedRef.current || queuedDisplaySnapshotsRef.current.length === 0) {
      return;
    }

    const nextSnapshot = queuedDisplaySnapshotsRef.current[0];
    if (!nextSnapshot) {
      return;
    }

    const nextVisibleAt = nextSnapshot.receivedAt + displayDelayMsRef.current;
    const timeoutMs = Math.max(0, nextVisibleAt - Date.now());

    displayUpdateTimerRef.current = setTimeout(() => {
      displayUpdateTimerRef.current = null;
      drainEligibleDisplaySnapshots();
    }, timeoutMs);
  }

  function drainEligibleDisplaySnapshots() {
    if (isDisplayPausedRef.current) {
      clearScheduledDisplayUpdate();
      return;
    }

    const cutoffTime = Date.now() - displayDelayMsRef.current;
    let nextVisibleData: GumboFeed | null = null;

    while (queuedDisplaySnapshotsRef.current[0] && queuedDisplaySnapshotsRef.current[0].receivedAt <= cutoffTime) {
      nextVisibleData = queuedDisplaySnapshotsRef.current.shift()?.data ?? null;
    }

    if (nextVisibleData) {
      commitDisplayedData(nextVisibleData);
    }

    scheduleNextDisplayUpdate();
  }

  function publishLiveUpdate(nextData: GumboFeed, options?: { displayImmediately?: boolean }) {
    liveDataRef.current = nextData;

    if (options?.displayImmediately) {
      queuedDisplaySnapshotsRef.current = [];
      clearScheduledDisplayUpdate();
      commitDisplayedData(nextData);
      return;
    }

    queuedDisplaySnapshotsRef.current.push({
      data: nextData,
      receivedAt: Date.now(),
    });

    drainEligibleDisplaySnapshots();
  }

  function setDisplayDelayMs(delayMs: number) {
    const normalizedDelayMs = Math.max(0, Math.round(delayMs));

    displayDelayMsRef.current = normalizedDelayMs;
    setDisplayDelayMsState(normalizedDelayMs);
    drainEligibleDisplaySnapshots();
  }

  function setIsDisplayPaused(isPaused: boolean) {
    isDisplayPausedRef.current = isPaused;
    setIsDisplayPausedState(isPaused);

    if (isPaused) {
      clearScheduledDisplayUpdate();
      return;
    }

    drainEligibleDisplaySnapshots();
  }

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;
    let nextPollTimer: ReturnType<typeof setTimeout> | null = null;

    pushUpdateIdRef.current = crypto.randomUUID();
    queuedDisplaySnapshotsRef.current = [];
    clearScheduledDisplayUpdate();

    function normalizeFallbackData(nextData: MlbGameFeedDiffPatchFallback) {
      return {
        copyright: liveDataRef.current?.copyright ?? "",
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
      const shouldShowLoading = liveDataRef.current === null;

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

        publishLiveUpdate(nextData, { displayImmediately: true });
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
      const currentData = liveDataRef.current;

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

            publishLiveUpdate(patchedData);
          } else {
            setLastUpdatedAt(new Date());
          }
        } else {
          publishLiveUpdate(normalizeFallbackData(nextData));
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
      clearScheduledDisplayUpdate();
      queuedDisplaySnapshotsRef.current = [];

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
    displayDelayMs: displayDelayMsState,
    isDisplayPaused: isDisplayPausedState,
    setDisplayDelayMs,
    setIsDisplayPaused,
    refetch: async () => {
      setRefreshToken(current => current + 1);
    },
  };
}