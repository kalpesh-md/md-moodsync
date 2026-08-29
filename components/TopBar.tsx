"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  Moon,
  Music2,
  Activity,
  Sun,
  UserRound,
} from "lucide-react";
import { connectGoogleFit } from "@/lib/api/googlefit";
import { connectSpotify } from "@/lib/api/spotify";
import { getIntegrationStatus } from "@/lib/api/integrations";
import type { User } from "@/lib/api/user";
import { Button } from "@/components/ui/button";
import { useMoodScaleUrl } from "@/lib/useMoodScaleUrl";
import { formatUsername } from "@/lib/utils";

interface TopBarProps {
  onCheckIn: () => void;
  user: User | null;
}

export default function TopBar({ onCheckIn, user }: TopBarProps) {
  const [isDark, setIsDark] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [fitConnected, setFitConnected] = useState(false);
  const moodscaleUrl = useMoodScaleUrl();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const dark = savedTheme === "dark";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    getIntegrationStatus()
      .then((status) => {
        setSpotifyConnected(status.spotify.connected);
        setFitConnected(status.googleFit.connected);
      })
      .catch(() => {
        // Non-blocking — buttons fall back to connect state.
      });
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const displayName = formatUsername(user?.username, user?.email);

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
        <span className="text-sm font-bold tracking-tight text-navy dark:text-slate-100">
          <span className="bg-gradient-to-r from-navy to-[#378ADD] bg-clip-text text-transparent dark:from-sky-300 dark:to-blue-400">
            MoodSync
          </span>
        </span>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
        {(user?.username || user?.email) && (
          <span
            className="flex h-9 max-w-[120px] items-center gap-1.5 truncate rounded-full bg-gradient-to-r from-[#E9EEF5] to-[#dbeafe] px-2.5 text-xs font-semibold text-navy sm:max-w-none sm:px-3 dark:from-slate-800 dark:to-slate-700 dark:text-slate-200"
            title={displayName}
          >
            <UserRound className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{displayName}</span>
          </span>
        )}
        <button
          type="button"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-[#F4F6FA] hover:text-navy dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        {spotifyConnected ? (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          >
            <Check className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Spotify</span>
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={connectSpotify} className="gap-1.5">
            <Music2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Spotify</span>
          </Button>
        )}
        {fitConnected ? (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          >
            <Check className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fit</span>
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={connectGoogleFit} className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fit</span>
          </Button>
        )}
        <Button size="sm" onClick={onCheckIn} className="bg-gradient-to-r from-navy to-navy-mid shadow-sm">
          Check in
        </Button>
        <Button variant="outline" size="sm" asChild className="hidden gap-1.5 sm:inline-flex">
          <a href={`${moodscaleUrl}/dashboard`}>
            <ArrowLeft className="h-3.5 w-3.5" />
            MoodScale
          </a>
        </Button>
      </div>
    </div>
  );
}
