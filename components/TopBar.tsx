"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Moon,
  Music2,
  Activity,
  Sun,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { connectGoogleFit } from "@/lib/api/googlefit";
import {
  connectSpotify,
  disconnectSpotify,
  switchSpotifyAccount,
} from "@/lib/api/spotify";
import { MsButton } from "@/components/ui/ms/MsButton";
import { MsPill } from "@/components/ui/ms/MsPill";
import { useNotice } from "@/components/notice-provider";
import { useMoodScaleUrl } from "@/lib/useMoodScaleUrl";
import { getCopyableUsername } from "@/lib/utils";
import {
  queryKeys,
  useIntegrationStatus,
  useMe,
  useMoodSync,
} from "@/lib/hooks/queries";
import UsernameBadge from "@/components/UsernameBadge";

interface TopBarProps {
  onCheckIn: () => void;
}

export default function TopBar({ onCheckIn }: TopBarProps) {
  const [isDark, setIsDark] = useState(false);
  const [spotifyMenuOpen, setSpotifyMenuOpen] = useState(false);
  const [spotifyBusy, setSpotifyBusy] = useState(false);
  const queryClient = useQueryClient();
  const notice = useNotice();
  const { data: user, isPending: userLoading } = useMe();
  const { data: integrations } = useIntegrationStatus();
  const { data: syncData } = useMoodSync();
  const spotifyNeedsReconnect = Boolean(syncData?.integrations?.spotifyNeedsReconnect);
  const spotifyLinked =
    integrations?.spotify.connected ?? syncData?.integrations?.spotify ?? false;
  const spotifyConnected = spotifyLinked && !spotifyNeedsReconnect;
  const fitConnected = integrations?.googleFit.connected ?? false;
  const moodscaleUrl = useMoodScaleUrl();
  const copyableUsername = getCopyableUsername(user?.username, user?.email);

  const refreshSpotifyState = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
    window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.moodSync });
    }, 800);
  };

  const handleSpotifyDisconnect = async () => {
    setSpotifyBusy(true);
    try {
      await disconnectSpotify();
      refreshSpotifyState();
      setSpotifyMenuOpen(false);
      notice.success("Spotify disconnected", "You can connect a different account anytime.");
    } catch {
      notice.error("Couldn't disconnect Spotify", "Please try again.");
    } finally {
      setSpotifyBusy(false);
    }
  };

  const handleSpotifySwitch = async () => {
    setSpotifyBusy(true);
    try {
      await switchSpotifyAccount();
    } catch {
      notice.error("Couldn't switch Spotify account", "Please try again.");
      setSpotifyBusy(false);
    }
  };

  const handleSpotifyConnect = async () => {
    setSpotifyBusy(true);
    try {
      await connectSpotify();
    } catch (err) {
      notice.error(
        "Couldn't connect Spotify",
        err instanceof Error ? err.message : "Please try again in a moment.",
      );
      setSpotifyBusy(false);
    }
  };

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
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
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
        ) : userLoading ? (
          <span className="hidden h-8 w-24 shrink-0 animate-pulse rounded-full bg-ms-soft sm:block" />
        ) : null}
      </div>

      <div className="flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
        <div className="flex items-center gap-1 rounded-2xl border border-ms-line bg-ms-tint/60 p-1">
          <button
            type="button"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ms-ink2 transition-colors hover:bg-ms-card hover:text-ms-navy"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {spotifyLinked ? (
            <div className="relative">
              <button
                type="button"
                aria-expanded={spotifyMenuOpen}
                aria-haspopup="menu"
                disabled={spotifyBusy}
                onClick={() => setSpotifyMenuOpen((open) => !open)}
                className="rounded-full transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <MsPill
                  tone={spotifyConnected ? "success" : "warning"}
                  icon={<Check className="h-3 w-3" />}
                  className="cursor-pointer pr-1.5"
                >
                  <span className="hidden sm:inline">
                    {spotifyNeedsReconnect ? "Spotify" : "Spotify"}
                  </span>
                  <span className="sm:hidden">Sp</span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </MsPill>
              </button>
              {spotifyMenuOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Close Spotify menu"
                    className="fixed inset-0 z-40"
                    onClick={() => setSpotifyMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[168px] overflow-hidden rounded-xl border border-ms-line bg-ms-card py-1 shadow-lift"
                  >
                    {spotifyNeedsReconnect ? (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={spotifyBusy}
                        onClick={() => {
                          setSpotifyMenuOpen(false);
                          void handleSpotifyConnect();
                        }}
                        className="flex w-full px-3 py-2 text-left text-xs font-medium text-ms-ink hover:bg-ms-tint"
                      >
                        Reconnect
                      </button>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      disabled={spotifyBusy}
                      onClick={() => void handleSpotifySwitch()}
                      className="flex w-full px-3 py-2 text-left text-xs font-medium text-ms-ink hover:bg-ms-tint"
                    >
                      Switch account
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={spotifyBusy}
                      onClick={() => void handleSpotifyDisconnect()}
                      className="flex w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Disconnect
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <MsButton
              variant="ghost"
              size="sm"
              icon={<Music2 className="h-3.5 w-3.5" />}
              disabled={spotifyBusy}
              onClick={() => void handleSpotifyConnect()}
            >
              <span className="hidden sm:inline">Spotify</span>
              <span className="sm:hidden">Sp</span>
            </MsButton>
          )}
          {fitConnected ? (
            <MsPill tone="success" icon={<Check className="h-3 w-3" />}>
              <span className="hidden sm:inline">Fit</span>
              <span className="sm:hidden">Fit</span>
            </MsPill>
          ) : (
            <MsButton variant="ghost" size="sm" icon={<Activity className="h-3.5 w-3.5" />} onClick={connectGoogleFit}>
              <span className="hidden sm:inline">Fit</span>
            </MsButton>
          )}
        </div>
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
