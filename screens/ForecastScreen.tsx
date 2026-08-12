"use client";

import React, { useState, useEffect } from "react";
import { getForecast } from "@/lib/api/forecast";
import type { ForecastItem } from "@/lib/api/forecast";

interface MoodStyle {
  keys?: string[];
  icon: string;
  color: string;
}

export default function ForecastScreen() {
  const [forecast, setForecast] = useState<ForecastItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    try {
      const data = await getForecast();
      setForecast(Array.isArray(data) ? data : null);
      setError(!Array.isArray(data));
    } catch (err) {
      console.log("Forecast error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Gemini returns free-form phrases like "Excited and Energetic" or
  // "Fresh and Focused" — not clean single words. Do keyword matching
  // instead of exact lookup so icons/colors still land correctly.
  const moodStyles: MoodStyle[] = [
    { keys: ["energetic", "excited"], icon: "⚡", color: "#FF6B6B" },
    { keys: ["happy"], icon: "😊", color: "#4ECDC4" },
    { keys: ["calm", "content", "relaxed"], icon: "😌", color: "#45B7D1" },
    { keys: ["tired", "low"], icon: "😴", color: "#F7B731" },
    { keys: ["focused"], icon: "🎯", color: "#7F77DD" },
    { keys: ["creative"], icon: "🎨", color: "#FF8C42" },
  ];

  const matchMood = (mood?: string): MoodStyle => {
    const text = mood?.toLowerCase() || "";
    return (
      moodStyles.find((m) => m.keys?.some((k) => text.includes(k))) || {
        icon: "✨",
        color: "#7F77DD",
      }
    );
  };

  const timeIcons = ["⏰", "🌙", "☀️"];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Analyzing your mood patterns...</p>
      </div>
    );
  }

  if (error || !forecast || forecast.length === 0) {
    return (
      <div className="forecast-modern">
        <div className="forecast-header">
          <span className="forecast-icon">🔮</span>
          <h2>Mood Forecast</h2>
          <p>We couldn't generate a forecast right now. Try again shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="forecast-modern">
      <div className="forecast-header">
        <span className="forecast-icon">🔮</span>
        <h2>Mood Forecast</h2>
        <p>AI-powered predictions based on your patterns</p>
      </div>

      <div className="forecast-grid">
        {forecast.map((item, i) => {
          const style = matchMood(item.predictedMood);
          return (
            <div
              className={`forecast-card ${i === 0 ? "primary" : ""}`}
              key={i}
            >
              <div className="forecast-time-badge">
                <span>{timeIcons[i] || "🕒"}</span>
                <span>{item.timeLabel}</span>
              </div>
              <div
                className={i === 0 ? "forecast-mood-large" : "forecast-mood"}
              >
                <span className="forecast-emoji">{style.icon}</span>
                <span className="forecast-mood-text">{item.predictedMood}</span>
              </div>
              <div className="forecast-confidence">
                <div className="confidence-bar">
                  <div
                    className="confidence-fill"
                    style={{
                      width: `${item.confidence}%`,
                      background: style.color,
                    }}
                  ></div>
                </div>
                <span>{item.confidence}% confidence</span>
              </div>
              <div className="forecast-tips">
                <div className="tips-do">
                  <span>✅ Do:</span>
                  <ul>
                    {item.doNow?.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
                <div className="tips-avoid">
                  <span>❌ Avoid:</span>
                  <ul>
                    {item.avoid?.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="forecast-note">
        💡 <strong>How it works:</strong> Based on your Spotify listening
        patterns, fitness data, and past check-ins
      </div>
    </div>
  );
}
