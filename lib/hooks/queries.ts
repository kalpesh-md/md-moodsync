"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCheckins, getLatestCheckin } from "@/lib/api/checkins";
import { getMe } from "@/lib/api/user";
import { getIntegrationStatus } from "@/lib/api/integrations";
import { syncMood } from "@/lib/api/mood";
import { getRecs } from "@/lib/api/recs";
import { getForecast } from "@/lib/api/forecast";

export const queryKeys = {
  me: ["me"] as const,
  checkins: ["checkins"] as const,
  latestCheckin: ["checkins", "latest"] as const,
  integrations: ["integrations"] as const,
  moodSync: ["mood", "sync"] as const,
  recs: ["recs"] as const,
  forecast: ["forecast"] as const,
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
      return res.user;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    ...sharedQueryOptions,
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
    staleTime: 60 * 1000,
    ...sharedQueryOptions,
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
    ...sharedQueryOptions,
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

export function usePrefetchAppData(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    void queryClient.prefetchQuery({
      queryKey: queryKeys.forecast,
      queryFn: getForecast,
      staleTime: 20 * 60 * 1000,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.recs,
      queryFn: getRecs,
      staleTime: 5 * 60 * 1000,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.moodSync,
      queryFn: syncMood,
      staleTime: 15 * 1000,
    });
  }, [enabled, queryClient]);
}

export function useInvalidateCheckins() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.checkins });
    void queryClient.invalidateQueries({ queryKey: queryKeys.latestCheckin });
    // Refresh mood score in background — don't block check-in save UI.
    void queryClient.invalidateQueries({ queryKey: queryKeys.moodSync });
  };
}
