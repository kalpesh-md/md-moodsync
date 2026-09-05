"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import TodayScreen from "@/screens/TodayScreen";
import ForecastScreen from "@/screens/ForecastScreen";
import FriendsScreen from "@/screens/FriendsScreen";
import InsightsScreen from "@/screens/InsightsScreen";
import RecsScreen from "@/screens/RecsScreen";
import CheckInModal from "@/components/CheckInModal";
import NavBar from "@/components/NavBar";
import TopBar from "@/components/TopBar";
import Login from "@/components/Login";
import { NoticeProvider, useNotice } from "@/components/notice-provider";
import { QueryProvider } from "@/components/query-provider";
import { createCheckin } from "@/lib/api/checkins";
import type { Checkin } from "@/lib/api/checkins";
import { BrandLoader } from "@/components/Loaders";
import {
  useCheckins,
  useInvalidateCheckins,
  useLatestCheckin,
  usePrefetchAppData,
  queryKeys,
} from "@/lib/hooks/queries";
import { useQueryClient } from "@tanstack/react-query";

type ScreenId = "today" | "forecast" | "friends" | "insights" | "recs";

const SCREEN_IDS: ScreenId[] = [
  "today",
  "forecast",
  "friends",
  "insights",
  "recs",
];

function getStartOfWeek(date = new Date()): Date {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  start.setHours(0, 0, 0, 0);
  return start;
}

function mapCheckinsToWeek(checkins: Checkin[]): boolean[] {
  const week = [false, false, false, false, false, false, false];
  const startOfWeek = getStartOfWeek();

  checkins.forEach((c) => {
    const checkinDate = new Date(c.created_at);
    if (checkinDate >= startOfWeek) {
      const day = checkinDate.getDay();
      const idx = day === 0 ? 6 : day - 1;
      week[idx] = true;
    }
  });
  return week;
}

function shouldPromptCheckIn(latestCheckin: Checkin | null): boolean {
  if (!latestCheckin) return true;
  const lastDate = new Date(latestCheckin.created_at);
  const today = new Date();
  return lastDate.toDateString() !== today.toDateString();
}

function MoodSyncShell() {
  const notice = useNotice();
  const queryClient = useQueryClient();
  const invalidateCheckins = useInvalidateCheckins();
  const [activeScreen, setActiveScreen] = useState<ScreenId>("today");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInPrompted, setCheckInPrompted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const shownConnectNotice = useRef(false);

  const { data: checkinsList = [] } = useCheckins(isLoggedIn);
  const { data: latestCheckin = null } = useLatestCheckin(isLoggedIn);

  usePrefetchAppData(isLoggedIn);

  const checkins = useMemo(
    () => mapCheckinsToWeek(checkinsList),
    [checkinsList],
  );

  const screens: Record<ScreenId, React.ReactNode> = {
    today: <TodayScreen checkins={checkins} latest={latestCheckin} />,
    forecast: <ForecastScreen />,
    friends: <FriendsScreen />,
    insights: <InsightsScreen />,
    recs: <RecsScreen />,
  };

  const handleCheckinSave = async (
    moods: string[],
    note: string,
    shareWithFriends: boolean,
  ) => {
    try {
      await createCheckin({ moods, note, shareWithFriends });
      setCheckInOpen(false);
      invalidateCheckins();
      notice.success(
        "Check-in saved",
        moods.length > 1
          ? `Logged ${moods.join(", ")} for today.`
          : `Logged ${moods[0]} for today.`,
      );
    } catch (err) {
      console.error(err);
      notice.error(
        "Check-in failed",
        err instanceof Error ? err.message : "Please try again in a moment.",
      );
      throw err;
    }
  };

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (shownConnectNotice.current) return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    if (connected === "spotify") {
      shownConnectNotice.current = true;
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.moodSync });
      void queryClient.invalidateQueries({ queryKey: queryKeys.recs });
      notice.success(
        "Spotify connected",
        "Your listening will now feed into your mood score.",
      );
      window.history.replaceState({}, "", "/");
    }
    if (connected === "googlefit") {
      shownConnectNotice.current = true;
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.moodSync });
      notice.success(
        "Google Fit connected",
        "Sleep and steps will now sync into your snapshot.",
      );
      window.history.replaceState({}, "", "/");
    }
  }, [notice]);

  useEffect(() => {
    if (!isLoggedIn || checkInPrompted) return;
    if (latestCheckin !== undefined && shouldPromptCheckIn(latestCheckin)) {
      setCheckInOpen(true);
      setCheckInPrompted(true);
    }
  }, [isLoggedIn, latestCheckin, checkInPrompted]);

  if (!authReady) {
    return <BrandLoader message="Loading MoodSync…" />;
  }

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="ms-canvas relative flex h-dvh flex-col overflow-hidden">
      <header className="z-30 shrink-0 border-b border-ms-line bg-ms-card/80 px-4 py-3 backdrop-blur-md md:px-6 md:py-4">
        <TopBar onCheckIn={() => setCheckInOpen(true)} />
      </header>

      <div className="flex min-h-0 flex-1 gap-5 overflow-hidden px-4 pb-20 md:gap-6 md:px-6 md:pb-6">
        <aside className="hidden h-full w-[236px] shrink-0 md:block">
          <NavBar variant="desktop" active={activeScreen} onChange={setActiveScreen} />
        </aside>
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="py-5 md:py-6">
            {SCREEN_IDS.map((id) => (
              <div key={id} className={activeScreen === id ? "block" : "hidden"}>
                {screens[id]}
              </div>
            ))}
          </div>
        </main>
      </div>
      <NavBar variant="mobile" active={activeScreen} onChange={setActiveScreen} />

      <CheckInModal
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        onSave={handleCheckinSave}
        checkins={checkins}
      />
    </div>
  );
}

export default function MoodSyncApp() {
  return (
    <QueryProvider>
      <NoticeProvider>
        <MoodSyncShell />
      </NoticeProvider>
    </QueryProvider>
  );
}
