"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCheckins, getLatestCheckin } from "@/lib/api/checkins";
import { getMe } from "@/lib/api/user";
import { cacheUserSession, readCachedUserSession } from "@/lib/userSession";
import { getIntegrationStatus } from "@/lib/api/integrations";
import { syncMood } from "@/lib/api/mood";
import {
  getFriendRequests,
  getFriends,
  getPendingRequests,
} from "@/lib/api/friends";
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
  friends: ["friends"] as const,
  friendRequests: ["friends", "requests"] as const,
  pendingFriendRequests: ["friends", "pending"] as const,
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
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
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
  const friendsQuery = useQuery({
    queryKey: queryKeys.friends,
    queryFn: getFriends,
    enabled,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
    ...sharedQueryOptions,
  });
  const requestsQuery = useQuery({
    queryKey: queryKeys.friendRequests,
    queryFn: getFriendRequests,
    enabled,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
    ...sharedQueryOptions,
  });
  const pendingQuery = useQuery({
    queryKey: queryKeys.pendingFriendRequests,
    queryFn: getPendingRequests,
    enabled,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
    ...sharedQueryOptions,
  });

  return {
    friends: friendsQuery.data ?? [],
    requests: requestsQuery.data ?? [],
    pending: pendingQuery.data ?? [],
    isPending:
      friendsQuery.isPending || requestsQuery.isPending || pendingQuery.isPending,
    isFetching:
      friendsQuery.isFetching || requestsQuery.isFetching || pendingQuery.isFetching,
    refetch: () =>
      Promise.all([
        friendsQuery.refetch(),
        requestsQuery.refetch(),
        pendingQuery.refetch(),
      ]),
  };
}

export function usePrefetchAppData(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    void queryClient.prefetchQuery({
      queryKey: queryKeys.me,
      queryFn: async () => {
        const res = await getMe();
        if (!res.user) throw new Error("User not found");
        cacheUserSession(res.user);
        return res.user;
      },
      staleTime: 5 * 60 * 1000,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.integrations,
      queryFn: getIntegrationStatus,
      staleTime: 30 * 1000,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.moodSync,
      queryFn: syncMood,
      staleTime: 15 * 1000,
    });

    // Warm secondary tabs after Today loads — one at a time to avoid server pile-up.
    const timer = window.setTimeout(async () => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.forecast,
        queryFn: getForecast,
        staleTime: 20 * 60 * 1000,
      });
      await queryClient.prefetchQuery({
        queryKey: queryKeys.personality,
        queryFn: getPersonality,
        staleTime: 10 * 60 * 1000,
      });
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: queryKeys.friends,
          queryFn: getFriends,
          staleTime: 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.friendRequests,
          queryFn: getFriendRequests,
          staleTime: 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.pendingFriendRequests,
          queryFn: getPendingRequests,
          staleTime: 60 * 1000,
        }),
      ]);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [enabled, queryClient]);
}

export function useInvalidateFriends() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.friends });
    void queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests });
    void queryClient.invalidateQueries({ queryKey: queryKeys.pendingFriendRequests });
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
    void Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.friends,
        queryFn: getFriends,
        staleTime: 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.friendRequests,
        queryFn: getFriendRequests,
        staleTime: 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.pendingFriendRequests,
        queryFn: getPendingRequests,
        staleTime: 60 * 1000,
      }),
    ]);
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
