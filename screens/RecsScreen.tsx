"use client";

import { useMemo, useState } from "react";
import { Headphones, ExternalLink, Music2, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { RecsPageSkeleton } from "@/components/Skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { connectSpotify } from "@/lib/api/spotify";
import { useRecs } from "@/lib/hooks/queries";
import type { RecTrack } from "@/lib/api/recs";
import { energyBand, energyLabel, type EnergyBand } from "@/lib/moodEnergy";
import { formatMoodLabel, cn } from "@/lib/utils";

type FilterId = "all" | EnergyBand;

export default function RecsScreen() {
  const { data, isPending, isFetching, refetch } = useRecs();
  const [filter, setFilter] = useState<FilterId>("all");

  const recommendations = data?.recommendations ?? [];
  const status = data?.status ?? "ok";
  const message = data?.message;
  const moodLabels = data?.mood?.labels ?? [];
  const showSkeleton = isPending && !data;

  const featured = recommendations[0];
  const rest = recommendations.slice(1);
  const visible = useMemo(() => {
    if (filter === "all") return rest;
    return rest.filter((track) => (track.energy_band ?? energyBand(track.energy)) === filter);
  }, [filter, rest]);

  if (showSkeleton) {
    return <RecsPageSkeleton />;
  }

  const moodLine = moodLabels.length
    ? `Matched to your ${formatMoodLabel(moodLabels.join(", "))} check-in`
    : "Based on your Spotify listening";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1DB954] to-navy text-white shadow-sm">
            <Headphones className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-navy dark:text-slate-100">
              For this mood
            </h2>
            <p className="text-sm text-muted-foreground">{moodLine}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {status === "spotify_not_connected" && (
        <EmptyState
          icon={<Music2 className="h-7 w-7 text-[#1DB954]" />}
          title="Connect Spotify to get recommendations"
          description={
            message ||
            "We'll suggest tracks based on what you listen to and how you're feeling."
          }
          action={{ label: "Connect Spotify", onClick: connectSpotify }}
        />
      )}

      {status === "no_history" && (
        <EmptyState
          icon={<Headphones className="h-7 w-7 text-[#378ADD]" />}
          title="No listening history yet"
          description={
            message ||
            "Play a few songs on Spotify — once we see your taste, recommendations will appear here."
          }
          action={{ label: "Check again", onClick: () => void refetch() }}
          variant="muted"
        />
      )}

      {status === "token_expired" && (
        <EmptyState
          icon={<Music2 className="h-7 w-7 text-amber-500" />}
          title="Spotify session expired"
          description={
            message || "Reconnect Spotify to refresh your music recommendations."
          }
          action={{ label: "Reconnect Spotify", onClick: connectSpotify }}
          secondaryAction={{ label: "Try again", onClick: () => void refetch() }}
        />
      )}

      {status === "error" && recommendations.length === 0 && (
        <EmptyState
          icon={<Headphones className="h-7 w-7 text-slate-400" />}
          title="Couldn't load recommendations"
          description={
            message || "Spotify may be temporarily unavailable. Please try again."
          }
          action={{ label: "Try again", onClick: () => void refetch() }}
        />
      )}

      {status === "ok" && recommendations.length === 0 && (
        <EmptyState
          icon={<Headphones className="h-7 w-7 text-[#378ADD]" />}
          title="No tracks to show yet"
          description="Keep listening on Spotify and we'll populate this list for you."
          action={{ label: "Refresh", onClick: () => void refetch() }}
          variant="muted"
        />
      )}

      {featured && (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-navy to-[#152a45] text-white shadow-md">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
            {featured.album?.images?.[0]?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="h-28 w-28 rounded-2xl object-cover shadow-lg sm:h-32 sm:w-32"
                src={featured.album.images[0].url}
                alt={featured.name}
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white/10 sm:h-32 sm:w-32">
                <Headphones className="h-8 w-8" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/70">
                <Sparkles className="h-3.5 w-3.5" />
                Today&apos;s pick
              </p>
              <h3 className="mt-1 truncate text-2xl font-semibold">{featured.name}</h3>
              <p className="truncate text-sm text-white/75">
                {featured.artists?.map((a) => a.name).join(", ")}
              </p>
              <p className="mt-2 text-sm text-white/80">
                {featured.reason || "From your recent listening"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="bg-white/15 text-white hover:bg-white/20">
                  {energyLabel(featured.energy_band ?? energyBand(featured.energy))}
                </Badge>
                {featured.external_urls?.spotify && (
                  <Button
                    size="sm"
                    className="rounded-full bg-[#1DB954] text-white hover:bg-[#1ed760]"
                    asChild
                  >
                    <a
                      href={featured.external_urls.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in Spotify
                      <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {recommendations.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {(["all", "high", "medium", "low"] as FilterId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === id
                  ? "bg-navy text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              {id === "all" ? "All tracks" : energyLabel(id)}
            </button>
          ))}
        </div>
      )}

      {visible.length > 0 && (
        <div className="space-y-3">
          {visible.map((track) => (
            <TrackRow key={track.id} track={track} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrackRow({ track }: { track: RecTrack }) {
  const band = track.energy_band ?? energyBand(track.energy);
  return (
    <Card className="ms-card-accent overflow-hidden border-0 bg-white dark:bg-slate-800/80">
      <CardContent className="flex items-center gap-3 p-3 sm:p-4">
        {track.album?.images?.[0]?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="h-14 w-14 rounded-lg object-cover shadow-sm"
            src={track.album.images[0].url}
            alt={track.name}
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-[#1DB954]/20 to-navy/10 text-navy">
            <Headphones className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{track.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {track.artists?.map((a) => a.name).join(", ")}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {track.reason || energyLabel(band)}
          </p>
        </div>
        <Badge variant="secondary" className="hidden shrink-0 font-normal sm:inline-flex">
          {energyLabel(band)}
        </Badge>
        {track.external_urls?.spotify && (
          <Button variant="outline" size="icon" asChild>
            <a
              href={track.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in Spotify"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
