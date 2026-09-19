"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCheckins, getLatestCheckin } from "@/lib/api/checkins";
import { getMe } from "@/lib/api/user";
import { cacheUserSession, readCachedUserSession } from "@/lib/userSession";
import { getIntegrationStatus } from "@/lib/api/integrations";
import { syncMood } from "@/lib/api/mood";
import { getFriendsSummary } from "@/lib/api/friends";
import { consumePostOAuthReturn } from "@/lib/api/sessionFlags";
import { getRecs } from "@/lib/api/recs";
import { getForecast } from "@/lib/api/forecast";
import { getPersonality } from "@/lib/api/insights";

export const queryKeys = {
  me: ["me"] as const,
  checkins: ["checkins"] as const,
  latestCheckin: ["checkins", "latest"] as const,
  integrations: ["integrations"] as const,
  moodSync: ["mood", "sync"] as const,
  recs: ["recs"] as const,
  forecast: ["forecast"] as const,
  personality: ["insights", "personality"] as const,
  friendsSummary: ["friends", "summary"] as const,
};

const sharedQueryOptions = {
  refetchOnWindowFocus: false,
  refetchOnMount: false,
} as const;

export function useMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const res = await getMe();
      if (!res.user) throw new Error("User not found");
      cacheUserSession(res.user);
      return res.user;
    },
    enabled,
    placeholderData: (prev) => prev ?? readCachedUserSession(),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useCheckins(enabled = true) {
  return useQuery({
    queryKey: queryKeys.checkins,
    queryFn: getCheckins,
    enabled,
    select: (data) => data.checkins,
    staleTime: 30 * 1000,
    ...sharedQueryOptions,
  });
}

export function useLatestCheckin(enabled = true) {
  return useQuery({
    queryKey: queryKeys.latestCheckin,
    queryFn: getLatestCheckin,
    enabled,
    select: (data) => data.checkin,
    staleTime: 30 * 1000,
    ...sharedQueryOptions,
  });
}

export function useIntegrationStatus(enabled = true) {
  return useQuery({
    queryKey: queryKeys.integrations,
    queryFn: getIntegrationStatus,
    enabled,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useMoodSync(enabled = true) {
  return useQuery({
    queryKey: queryKeys.moodSync,
    queryFn: syncMood,
    enabled,
    refetchInterval: enabled ? 60 * 1000 : false,
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
}

/** Delay mood sync so lightweight routes (me, friends) load first. */
export function useDeferredMoodSync(enabled = true, delayMs = 4000) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [enabled, delayMs]);

  return useMoodSync(enabled && ready);
}

export function useRecs(enabled = true) {
  return useQuery({
    queryKey: queryKeys.recs,
    queryFn: getRecs,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    placeholderData: (prev) => prev,
    ...sharedQueryOptions,
  });
}

export function usePersonality(enabled = true) {
  return useQuery({
    queryKey: queryKeys.personality,
    queryFn: getPersonality,
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    placeholderData: (prev) => prev,
    ...sharedQueryOptions,
  });
}

export function useForecast(enabled = true) {
  return useQuery({
    queryKey: queryKeys.forecast,
    queryFn: getForecast,
    enabled,
    staleTime: 20 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 8000),
    placeholderData: (prev) => prev,
    ...sharedQueryOptions,
  });
}

export function useFriendsData(enabled = true) {
  const summaryQuery = useQuery({
    queryKey: queryKeys.friendsSummary,
    queryFn: getFriendsSummary,
    enabled,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
    ...sharedQueryOptions,
  });

  return {
    friends: summaryQuery.data?.friends ?? [],
    requests: summaryQuery.data?.requests ?? [],
    pending: summaryQuery.data?.pending ?? [],
    isPending: summaryQuery.isPending,
    isFetching: summaryQuery.isFetching,
    isError: summaryQuery.isError,
    refetch: () => summaryQuery.refetch(),
  };
}

export function usePrefetchAppData(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const afterOAuth = consumePostOAuthReturn();

    async function bootstrap() {
      if (afterOAuth || cancelled) return;

      try {
        await new Promise((resolve) => window.setTimeout(resolve, 6000));
        if (cancelled) return;

        await queryClient.prefetchQuery({
          queryKey: queryKeys.forecast,
          queryFn: getForecast,
          staleTime: 20 * 60 * 1000,
        });
        if (cancelled) return;

        await queryClient.prefetchQuery({
          queryKey: queryKeys.personality,
          queryFn: getPersonality,
          staleTime: 10 * 60 * 1000,
        });
        if (cancelled) return;

        await queryClient.prefetchQuery({
          queryKey: queryKeys.friendsSummary,
          queryFn: getFriendsSummary,
          staleTime: 60 * 1000,
        });
      } catch {
        /* screens refetch on demand */
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [enabled, queryClient]);
}

export function useInvalidateFriends() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.friendsSummary });
  };
}

export function prefetchScreenData(
  queryClient: ReturnType<typeof useQueryClient>,
  screen: "forecast" | "insights" | "friends" | "recs",
) {
  if (screen === "forecast") {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.forecast,
      queryFn: getForecast,
      staleTime: 20 * 60 * 1000,
    });
    return;
  }
  if (screen === "insights") {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.personality,
      queryFn: getPersonality,
      staleTime: 10 * 60 * 1000,
    });
    return;
  }
  if (screen === "friends") {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.friendsSummary,
      queryFn: getFriendsSummary,
      staleTime: 60 * 1000,
    });
    return;
  }
  if (screen === "recs") {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.recs,
      queryFn: getRecs,
      staleTime: 5 * 60 * 1000,
    });
  }
}

export function useInvalidateCheckins() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.checkins });
    void queryClient.invalidateQueries({ queryKey: queryKeys.latestCheckin });
    // Refresh mood score in background — don't block check-in save UI.
    void queryClient.invalidateQueries({ queryKey: queryKeys.moodSync });
    void queryClient.invalidateQueries({ queryKey: queryKeys.recs });
    void queryClient.invalidateQueries({ queryKey: queryKeys.personality });
  };
}
