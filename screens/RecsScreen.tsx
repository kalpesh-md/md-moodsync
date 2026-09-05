"use client";

import { useMemo, useState } from "react";
import { Headphones, ExternalLink, Music2, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { RecsPageSkeleton } from "@/components/Skeletons";
import { MsButton, MsLinkButton } from "@/components/ui/ms/MsButton";
import { MsCard } from "@/components/ui/ms/MsCard";
import { FilterChips } from "@/components/ui/ms/FilterChips";
import { MsListRow } from "@/components/ui/ms/MsListRow";
import { MsPill } from "@/components/ui/ms/MsPill";
import { PageHeader, SectionHeading } from "@/components/ui/ms/PageHeader";
import { connectSpotify } from "@/lib/api/spotify";
import { useRecs } from "@/lib/hooks/queries";
import type { RecTrack } from "@/lib/api/recs";
import { energyBand, energyLabel, type EnergyBand } from "@/lib/moodEnergy";
import { formatMoodLabel } from "@/lib/utils";

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Music"
        title="For this mood"
        subtitle={moodLine}
        icon={<Headphones className="h-5 w-5" />}
        actions={
          <MsButton
            variant="secondary"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            icon={
              isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )
            }
          >
            Refresh
          </MsButton>
        }
      />

      {status === "spotify_not_connected" && (
        <EmptyState
          icon={<Music2 className="h-[17px] w-[17px]" />}
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
          icon={<Headphones className="h-[17px] w-[17px]" />}
          title="No listening history yet"
          description={
            message ||
            "Play a few songs on Spotify — once we see your taste, recommendations will appear here."
          }
          action={{ label: "Check again", onClick: () => void refetch() }}
        />
      )}

      {status === "token_expired" && (
        <EmptyState
          icon={<Music2 className="h-[17px] w-[17px]" />}
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
          icon={<Headphones className="h-[17px] w-[17px]" />}
          title="Couldn't load recommendations"
          description={
            message || "Spotify may be temporarily unavailable. Please try again."
          }
          action={{ label: "Try again", onClick: () => void refetch() }}
        />
      )}

      {status === "ok" && recommendations.length === 0 && (
        <EmptyState
          icon={<Headphones className="h-[17px] w-[17px]" />}
          title="No tracks to show yet"
          description="Keep listening on Spotify and we'll populate this list for you."
          action={{ label: "Refresh", onClick: () => void refetch() }}
        />
      )}

      {featured && (
        <MsCard elevated className="overflow-hidden">
          <div className="flex flex-col gap-5 bg-ms-tint/30 p-5 sm:flex-row sm:items-center">
            {featured.album?.images?.[0]?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="h-32 w-32 shrink-0 rounded-2xl object-cover shadow-lift ring-1 ring-ms-line sm:h-36 sm:w-36"
                src={featured.album.images[0].url}
                alt={featured.name}
              />
            ) : (
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-ms-soft sm:h-36 sm:w-36">
                <Headphones className="h-9 w-9 text-ms-navy" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ms-ink3">
                <Sparkles className="h-3.5 w-3.5 text-ms-navy" />
                Today&apos;s pick
              </p>
              <h3 className="mt-2 truncate text-2xl font-semibold tracking-tight text-ms-ink">
                {featured.name}
              </h3>
              <p className="mt-1 truncate text-sm text-ms-ink2">
                {featured.artists?.map((a) => a.name).join(", ")}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ms-ink2">
                {featured.reason || "From your recent listening"}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <MsPill tone="brand">
                  {energyLabel(featured.energy_band ?? energyBand(featured.energy))}
                </MsPill>
                {featured.external_urls?.spotify && (
                  <MsLinkButton
                    href={featured.external_urls.spotify}
                    variant="secondary"
                    size="sm"
                    external
                    icon={<ExternalLink className="h-3.5 w-3.5" />}
                  >
                    Open in Spotify
                  </MsLinkButton>
                )}
              </div>
            </div>
          </div>
        </MsCard>
      )}

      {recommendations.length > 1 && (
        <div className="space-y-3">
          <SectionHeading title="More tracks" meta={`${visible.length} shown`} />
          <FilterChips
            value={filter}
            onChange={setFilter}
            options={(["all", "high", "medium", "low"] as FilterId[]).map((id) => ({
              id,
              label: id === "all" ? "All tracks" : energyLabel(id),
            }))}
          />
        </div>
      )}

      {visible.length > 0 && (
        <div className="space-y-2">
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
    <MsListRow>
      {track.album?.images?.[0]?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-ms-line"
          src={track.album.images[0].url}
          alt={track.name}
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-ms-soft text-ms-navy">
          <Headphones className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ms-ink">{track.name}</p>
        <p className="truncate text-sm text-ms-ink2">
          {track.artists?.map((a) => a.name).join(", ")}
        </p>
        <p className="mt-0.5 truncate text-xs text-ms-ink3">
          {track.reason || energyLabel(band)}
        </p>
      </div>
      <MsPill tone="neutral" className="hidden shrink-0 sm:inline-flex">
        {energyLabel(band)}
      </MsPill>
      {track.external_urls?.spotify && (
        <a
          href={track.external_urls.spotify}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open in Spotify"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ms-line-strong text-ms-ink2 transition-colors hover:border-ms-navy hover:bg-ms-soft hover:text-ms-navy"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </MsListRow>
  );
}
