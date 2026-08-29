"use client";

import { Headphones, ExternalLink, Music2, RefreshCw, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { RecsPageSkeleton } from "@/components/Skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { connectSpotify } from "@/lib/api/spotify";
import { useRecs } from "@/lib/hooks/queries";

export default function RecsScreen() {
  const { data, isPending, isFetching, refetch } = useRecs();

  const recommendations = data?.recommendations ?? [];
  const status = data?.status ?? "ok";
  const message = data?.message;
  const showSkeleton = isPending && !data;

  const energyLabel = (energy?: number) => {
    if (!energy) return "Track";
    if (energy > 0.7) return "High energy";
    if (energy > 0.4) return "Medium energy";
    return "Low energy";
  };

  if (showSkeleton) {
    return <RecsPageSkeleton />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1DB954] to-navy text-white shadow-sm">
            <Headphones className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-navy dark:text-slate-100">
              Recommended For You
            </h2>
            <p className="text-sm text-muted-foreground">
              Based on your Spotify listening history
            </p>
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

      {recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.slice(0, 10).map((track, idx) => (
            <Card
              key={track.id}
              className="ms-card-accent overflow-hidden border-0 bg-white dark:bg-slate-800/80"
            >
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <span className="w-6 text-center text-sm font-semibold text-muted-foreground">
                  {idx + 1}
                </span>
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
                  <Badge variant="secondary" className="mt-1 font-normal">
                    {energyLabel(track.energy)}
                  </Badge>
                </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
