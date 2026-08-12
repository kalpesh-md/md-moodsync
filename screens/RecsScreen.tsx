"use client";

import React, { useState, useEffect } from "react";

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

  const getEnergyIcon = (energy?: number) => {
    if (!energy) return "🎵";
    if (energy > 0.7) return "⚡ High Energy";
    if (energy > 0.4) return "🌊 Medium Energy";
    return "🍃 Low Energy";
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Finding your perfect tracks...</p>
      </div>
    );
  }

  return (
    <div className="recs-modern">
      <div className="recs-header">
        <span className="recs-icon">🎧</span>
        <h2>Recommended For You</h2>
        <p>Based on your listening history</p>
      </div>

      {error && (
        <div className="recs-error">
          <span>⚠️</span>
          <p>{error}</p>
          <button onClick={fetchRecommendations} className="retry-btn">
            Try Again
          </button>
        </div>
      )}

      {!error && recommendations.length === 0 && (
        <div className="recs-empty">
          <span>🎵</span>
          <h3>No recommendations yet</h3>
          <p>Listen to some music on Spotify and come back!</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="recs-list">
          {recommendations.slice(0, 10).map((track, idx) => (
            <div key={track.id} className="rec-card">
              <div className="rec-number">{idx + 1}</div>
              {track.album?.images?.[0]?.url ? (
                <img
                  className="rec-artwork"
                  src={track.album.images[0].url}
                  alt={track.name}
                />
              ) : (
                <div className="rec-artwork-placeholder">🎵</div>
              )}
              <div className="rec-info">
                <div className="rec-title">{track.name}</div>
                <div className="rec-artist">
                  {track.artists?.map((a) => a.name).join(", ")}
                </div>
              </div>
              <a
                href={track.external_urls?.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="rec-play"
              >
                ▶️
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
