"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Moon,
  Music2,
  Activity,
  Sun,
  UserRound,
} from "lucide-react";
import { connectGoogleFit } from "@/lib/api/googlefit";
import { connectSpotify } from "@/lib/api/spotify";
import type { User } from "@/lib/api/user";
import { Button } from "@/components/ui/button";
import { useMoodScaleUrl } from "@/lib/useMoodScaleUrl";

interface TopBarProps {
  onCheckIn: () => void;
  user: User | null;
}

export default function TopBar({ onCheckIn, user }: TopBarProps) {
  const [isDark, setIsDark] = useState(false);
  const moodscaleUrl = useMoodScaleUrl();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const dark = savedTheme === "dark";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const displayName = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
    : user?.email?.split("@")[0] || "You";

  return (
    <div className="flex w-full items-center gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <a
          href={`${moodscaleUrl}/dashboard`}
          className="flex shrink-0 items-center"
          title="Back to MoodScale"
        >
          <Image
            src="/images/moodscale_logo1.png"
            alt="MoodScale"
            width={120}
            height={30}
            className="h-7 w-auto"
            priority
          />
        </a>
        <span className="hidden h-6 w-px bg-line sm:block dark:bg-slate-700" />
        <span className="hidden text-sm font-semibold text-navy sm:block dark:text-slate-100">
          MoodSync
        </span>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-[#F4F6FA] hover:text-navy dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <Button variant="outline" size="sm" onClick={connectSpotify} className="gap-1.5">
          <Music2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Spotify</span>
        </Button>
        <Button variant="outline" size="sm" onClick={connectGoogleFit} className="gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Fit</span>
        </Button>
        <Button size="sm" onClick={onCheckIn}>
          Check in
        </Button>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <a href={`${moodscaleUrl}/dashboard`}>
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">MoodScale</span>
          </a>
        </Button>
        {(user?.username || user?.email) && (
          <span className="hidden h-9 items-center gap-1.5 rounded-full bg-[#E9EEF5] px-3 text-xs font-semibold text-navy sm:inline-flex dark:bg-slate-800 dark:text-slate-200">
            <UserRound className="h-3.5 w-3.5" />
            {displayName}
          </span>
        )}
      </div>
    </div>
  );
}
