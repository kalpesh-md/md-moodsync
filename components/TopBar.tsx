"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Headphones,
  LogOut,
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

interface TopBarProps {
  onCheckIn: () => void;
  onLogout: () => void;
  user: User | null;
}

export default function TopBar({ onCheckIn, onLogout, user }: TopBarProps) {
  const [isDark, setIsDark] = useState(false);

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
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
            <Headphones className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              MoodScale
            </p>
            <h1 className="truncate bg-gradient-to-r from-navy via-blue-600 to-violet-600 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-blue-300 dark:via-violet-300 dark:to-fuchsia-300">
              MoodSync
            </h1>
          </div>
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
          <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Log out">
            <LogOut />
          </Button>
        </div>
      </div>
    </header>
  );
}
