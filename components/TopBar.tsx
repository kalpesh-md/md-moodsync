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
} from "lucide-react";
import { connectGoogleFit } from "@/lib/api/googlefit";
import { connectSpotify } from "@/lib/api/spotify";
import { Button } from "@/components/ui/button";
import { useMoodScaleUrl } from "@/lib/useMoodScaleUrl";
import { getCopyableUsername } from "@/lib/utils";
import { useIntegrationStatus, useMe } from "@/lib/hooks/queries";
import UsernameBadge from "@/components/UsernameBadge";

interface TopBarProps {
  onCheckIn: () => void;
}

export default function TopBar({ onCheckIn }: TopBarProps) {
  const [isDark, setIsDark] = useState(false);
  const { data: user } = useMe();
  const { data: integrations } = useIntegrationStatus(!!user);
  const spotifyConnected = integrations?.spotify.connected ?? false;
  const fitConnected = integrations?.googleFit.connected ?? false;
  const moodscaleUrl = useMoodScaleUrl();
  const copyableUsername = getCopyableUsername(user?.username, user?.email);

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

  return (
    <div className="flex w-full items-center gap-2 sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
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
        <span className="hidden h-6 w-px shrink-0 bg-line sm:block dark:bg-slate-700" />
        <span className="hidden shrink-0 text-sm font-bold tracking-tight text-navy sm:block dark:text-slate-100">
          <span className="bg-gradient-to-r from-navy to-[#378ADD] bg-clip-text text-transparent dark:from-sky-300 dark:to-blue-400">
            MoodSync
          </span>
        </span>
        {copyableUsername ? (
          <UsernameBadge username={copyableUsername} className="ml-0 sm:ml-1" />
        ) : (
          <span className="hidden h-8 w-24 shrink-0 animate-pulse rounded-full bg-slate-200 sm:block dark:bg-slate-700" />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
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
            className="gap-1 border-emerald-200 bg-emerald-50 px-2 text-emerald-700 sm:px-3 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          >
            <Check className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Spotify</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={connectSpotify}
            className="gap-1 px-2 sm:px-3"
          >
            <Music2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Spotify</span>
          </Button>
        )}
        {fitConnected ? (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="gap-1 border-emerald-200 bg-emerald-50 px-2 text-emerald-700 sm:px-3 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          >
            <Check className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fit</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={connectGoogleFit}
            className="gap-1 px-2 sm:px-3"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fit</span>
          </Button>
        )}
        <Button
          size="sm"
          onClick={onCheckIn}
          className="bg-gradient-to-r from-navy to-navy-mid px-2.5 shadow-sm sm:px-3"
        >
          <span className="text-xs sm:text-sm">Check in</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="hidden gap-1.5 lg:inline-flex"
        >
          <a href={`${moodscaleUrl}/dashboard`}>
            <ArrowLeft className="h-3.5 w-3.5" />
            MoodScale
          </a>
        </Button>
      </div>
    </div>
  );
}
