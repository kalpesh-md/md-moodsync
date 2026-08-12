"use client";

import React, { useEffect, useState } from "react";
import TodayScreen from "@/screens/TodayScreen";
import ForecastScreen from "@/screens/ForecastScreen";
import FriendsScreen from "@/screens/FriendsScreen";
import InsightsScreen from "@/screens/InsightsScreen";
import RecsScreen from "@/screens/RecsScreen";
import CheckInModal from "@/components/CheckInModal";
import NavBar from "@/components/NavBar";
import TopBar from "@/components/TopBar";
import Login from "@/components/Login";
import { getMe } from "@/lib/api/user";
import type { User } from "@/lib/api/user";
import { createCheckin, getCheckins, getLatestCheckin } from "@/lib/api/checkins";
import type { Checkin } from "@/lib/api/checkins";
import { Loader2 } from "lucide-react";

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

export default function MoodSyncApp() {
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
      alert("Check-in failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUser(null);
  };

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
    setAuthReady(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "spotify") {
      alert("Spotify connected");
      window.history.replaceState({}, "", "/");
    }
    if (params.get("connected") === "googlefit") {
      alert("Google Fit connected");
      window.history.replaceState({}, "", "/");
    }
  }, []);

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
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        user={user}
        onCheckIn={() => setCheckInOpen(true)}
        onLogout={handleLogout}
      />
      <div className="flex w-full flex-1">
        <NavBar active={activeScreen} onChange={setActiveScreen} />
        <main className="min-w-0 flex-1 px-4 py-5 pb-24 md:px-8 md:pb-8">
          {screens[activeScreen]}
        </main>
      </div>
      <CheckInModal
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        onSave={handleCheckinSave}
        checkins={checkins}
      />
    </div>
  );
}
