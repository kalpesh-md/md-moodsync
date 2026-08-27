"use client";

import React, { useEffect, useRef, useState } from "react";
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
import { getMe } from "@/lib/api/user";
import type { User } from "@/lib/api/user";
import { createCheckin, getCheckins, getLatestCheckin } from "@/lib/api/checkins";
import type { Checkin } from "@/lib/api/checkins";
import { BrandLoader } from "@/components/Loaders";

const CHECKIN_PROMPT_GAP_HOURS = 6;

type ScreenId = "today" | "forecast" | "friends" | "insights" | "recs";

function mapCheckinsToWeek(checkins: Checkin[]): boolean[] {
  const week = [false, false, false, false, false, false, false];
  checkins.forEach((c) => {
    const day = new Date(c.created_at).getDay();
    const idx = day === 0 ? 6 : day - 1;
    week[idx] = true;
  });
  return week;
}

function shouldPromptCheckIn(latestCheckin: Checkin | null): boolean {
  if (!latestCheckin) return true;
  const hoursSinceLast =
    (Date.now() - new Date(latestCheckin.created_at).getTime()) / 3600000;
  return hoursSinceLast >= CHECKIN_PROMPT_GAP_HOURS;
}

function MoodSyncShell() {
  const notice = useNotice();
  const [activeScreen, setActiveScreen] = useState<ScreenId>("today");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkins, setCheckins] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [latestCheckin, setLatestCheckin] = useState<Checkin | null>(null);
  const shownConnectNotice = useRef(false);

  const screens: Record<ScreenId, React.ReactNode> = {
    today: <TodayScreen checkins={checkins} latest={latestCheckin} />,
    forecast: <ForecastScreen />,
    friends: <FriendsScreen />,
    insights: <InsightsScreen checkins={checkins} />,
    recs: <RecsScreen />,
  };

  const handleCheckinSave = async (
    mood: string,
    note: string,
    shareWithFriends: boolean,
  ) => {
    try {
      await createCheckin({ mood, note, shareWithFriends });
      const data = await getCheckins();
      setCheckins(mapCheckinsToWeek(data.checkins));
      const latest = await getLatestCheckin();
      setLatestCheckin(latest.checkin);
      setCheckInOpen(false);
    } catch (err) {
      console.error(err);
      notice.error("Check-in failed", "Please try again in a moment.");
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
      notice.success(
        "Spotify connected",
        "Your listening will now feed into your mood score.",
      );
      window.history.replaceState({}, "", "/");
    }
    if (connected === "googlefit") {
      shownConnectNotice.current = true;
      notice.success(
        "Google Fit connected",
        "Sleep and steps will now sync into your snapshot.",
      );
      window.history.replaceState({}, "", "/");
    }
  }, [notice]);

  useEffect(() => {
    if (!isLoggedIn) return;

    getMe()
      .then((data) => setUser(data.user))
      .catch((err) => console.error("Failed to load user:", err));

    getCheckins()
      .then((data) => setCheckins(mapCheckinsToWeek(data.checkins)))
      .catch((err) => console.error("Failed to load checkins:", err));

    getLatestCheckin()
      .then((data) => {
        setLatestCheckin(data.checkin);
        if (shouldPromptCheckIn(data.checkin)) setCheckInOpen(true);
      })
      .catch((err) => console.error("Failed to load latest checkin:", err));
  }, [isLoggedIn]);

  if (!authReady) {
    return <BrandLoader message="Loading MoodSync…" />;
  }

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="ms-canvas relative min-h-dvh">
      <header className="sticky top-0 z-30 bg-[#F7F8FA]/70 px-4 py-3 backdrop-blur-sm md:px-6 md:py-4 dark:bg-gray-900/70">
        <TopBar user={user} onCheckIn={() => setCheckInOpen(true)} />
      </header>

      <div className="flex items-start gap-5 px-4 pb-24 md:gap-6 md:px-6 md:pb-12">
        <aside className="sticky top-[80px] z-20 hidden h-[calc(100dvh-104px)] w-[236px] shrink-0 md:block">
          <NavBar variant="desktop" active={activeScreen} onChange={setActiveScreen} />
        </aside>
        <main className="min-h-[calc(100dvh-96px)] min-w-0 flex-1">
          {screens[activeScreen]}
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
    <NoticeProvider>
      <MoodSyncShell />
    </NoticeProvider>
  );
}
