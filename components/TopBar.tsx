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
import { MsButton } from "@/components/ui/ms/MsButton";
import { MsPill } from "@/components/ui/ms/MsPill";
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
        <span className="hidden h-6 w-px shrink-0 bg-ms-line sm:block" />
        <span className="hidden shrink-0 text-sm font-semibold tracking-tight text-ms-ink sm:block">
          MoodSync
        </span>
        {copyableUsername ? (
          <UsernameBadge username={copyableUsername} className="ml-0 sm:ml-1" />
        ) : (
          <span className="hidden h-8 w-24 shrink-0 animate-pulse rounded-full bg-ms-soft sm:block" />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ms-ink2 transition-colors hover:bg-ms-tint hover:text-ms-navy"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        {spotifyConnected ? (
          <MsPill tone="success" icon={<Check className="h-3 w-3" />}>
            <span className="hidden sm:inline">Spotify</span>
            <span className="sm:hidden">Sp</span>
          </MsPill>
        ) : (
          <MsButton variant="secondary" size="sm" icon={<Music2 className="h-3.5 w-3.5" />} onClick={connectSpotify}>
            <span className="hidden sm:inline">Spotify</span>
          </MsButton>
        )}
        {fitConnected ? (
          <MsPill tone="success" icon={<Check className="h-3 w-3" />}>
            <span className="hidden sm:inline">Fit</span>
            <span className="sm:hidden">Fit</span>
          </MsPill>
        ) : (
          <MsButton variant="secondary" size="sm" icon={<Activity className="h-3.5 w-3.5" />} onClick={connectGoogleFit}>
            <span className="hidden sm:inline">Fit</span>
          </MsButton>
        )}
        <MsButton size="sm" onClick={onCheckIn}>
          <span className="text-xs sm:text-sm">Check in</span>
        </MsButton>
        <MsButton
          variant="secondary"
          size="sm"
          className="hidden lg:inline-flex"
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
          onClick={() => {
            window.location.href = `${moodscaleUrl}/dashboard`;
          }}
        >
          MoodScale
        </MsButton>
      </div>
    </div>
  );
}
