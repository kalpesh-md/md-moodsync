"use client";

import React, { useState, useEffect } from "react";
import { Headphones, Loader2, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RecTrack {
  id: string;
  name: string;
  artists?: { name: string }[];
  album?: { images?: { url: string }[] };
  external_urls?: { spotify?: string };
  energy?: number;
}

export default function RecsScreen() {
  const [recommendations, setRecommendations] = useState<RecTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recs", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.recommendations && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
      } else if (data.error) {
        setError(data.error);
      } else {
        setError(
          "No recommendations available. Try playing some music on Spotify!",
        );
      }
    } catch (err) {
      console.log("Recs error:", err);
      setError("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  const energyLabel = (energy?: number) => {
    if (!energy) return "Track";
    if (energy > 0.7) return "High energy";
    if (energy > 0.4) return "Medium energy";
    return "Low energy";
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
        <p className="text-sm">Finding your perfect tracks…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
          <Headphones className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-navy dark:text-slate-100">
            Recommended For You
          </h2>
          <p className="text-sm text-muted-foreground">
            Based on your listening history
          </p>
        </div>
      </div>

      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Couldn&apos;t load recs</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchRecommendations}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {!error && recommendations.length === 0 && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy/10 text-navy">
              <Headphones className="h-6 w-6" />
            </div>
            <CardTitle>No recommendations yet</CardTitle>
            <CardDescription>
              Listen to some music on Spotify and come back.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.slice(0, 10).map((track, idx) => (
            <Card key={track.id} className="overflow-hidden">
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <span className="w-6 text-center text-sm font-semibold text-muted-foreground">
                  {idx + 1}
                </span>
                {track.album?.images?.[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="h-14 w-14 rounded-lg object-cover"
                    src={track.album.images[0].url}
                    alt={track.name}
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-navy/10 text-navy">
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
