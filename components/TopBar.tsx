"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  LogOut,
  Moon,
  Music2,
  Sun,
  UserRound,
} from "lucide-react";
import { connectGoogleFit } from "@/api/googlefit";
import { connectSpotify } from "@/api/spotify";
import type { User } from "@/api/user";
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
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            MoodScale
          </p>
          <h1 className="truncate text-lg font-semibold tracking-tight text-navy dark:text-slate-100">
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
          <Button variant="outline" size="sm" onClick={connectSpotify} className="gap-1.5">
            <Music2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Spotify</span>
          </Button>
          <Button variant="outline" size="sm" onClick={connectGoogleFit} className="gap-1.5">
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
