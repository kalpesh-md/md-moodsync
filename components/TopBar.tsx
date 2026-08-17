"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Activity,
  ArrowLeft,
  Moon,
  Music2,
  Sun,
  UserRound,
} from "lucide-react";
import { connectGoogleFit } from "@/lib/api/googlefit";
import { connectSpotify } from "@/lib/api/spotify";
import type { User } from "@/lib/api/user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="flex w-full items-center gap-3 px-4 py-3 md:px-6">
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
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <h1 className="truncate bg-gradient-to-r from-navy via-blue-600 to-violet-600 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-blue-300 dark:via-violet-300 dark:to-fuchsia-300">
            MoodSync
          </h1>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          {(user?.username || user?.email) && (
            <Badge variant="secondary" className="gap-1.5 font-normal">
              <UserRound className="h-3.5 w-3.5" />
              {displayName}
            </Badge>
          )}
        </div>

        <Separator orientation="vertical" className="hidden h-6 sm:block" />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {isDark ? <Sun /> : <Moon />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={connectSpotify}
            className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
          >
            <Music2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Spotify</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={connectGoogleFit}
            className="gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-400 dark:hover:bg-sky-950"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fit</span>
          </Button>
          <Button size="sm" onClick={onCheckIn}>
            Check In
          </Button>
          <Button
            size="sm"
            asChild
            className="gap-1.5 bg-gradient-to-r from-navy to-blue-700 text-white shadow-md hover:from-navy-dark hover:to-blue-800"
          >
            <a href={`${moodscaleUrl}/dashboard`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">MoodScale</span>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
