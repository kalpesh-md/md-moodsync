"use client";

import React, { useState, useEffect } from "react";

interface OceanScores {
  O: number;
  C: number;
  E: number;
  A: number;
  N: number;
}

interface MbtiAxes {
  IE: number;
  NS: number;
  TF: number;
  JP: number;
}

interface PersonalityData {
  ocean?: OceanScores;
  mbti?: {
    type: string;
    confidence: number;
    axes?: MbtiAxes;
  };
  insights?: {
    head: string;
    body: string;
    color?: string;
  }[];
}

interface InsightsScreenProps {
  checkins: boolean[];
}

export default function InsightsScreen({ checkins }: InsightsScreenProps) {
  const [personality, setPersonality] = useState<PersonalityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersonality();
  }, []);

  const fetchPersonality = async () => {
    try {
      const res = await fetch("/api/insights/personality", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      setPersonality(data);
    } catch (err) {
      console.log("Personality error:", err);
    } finally {
      setLoading(false);
    }
  };

  const oceanTraits = [
    {
      key: "O" as const,
      name: "Openness",
      description: "Curiosity, creativity, open to new experiences",
    },
    {
      key: "C" as const,
      name: "Conscientiousness",
      description: "Organization, dependability, discipline",
    },
    {
      key: "E" as const,
      name: "Extraversion",
      description: "Sociability, energy, assertiveness",
    },
    {
      key: "A" as const,
      name: "Agreeableness",
      description: "Compassion, cooperation, trust",
    },
    {
      key: "N" as const,
      name: "Neuroticism",
      description: "Emotional sensitivity, anxiety, mood",
    },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Analyzing your personality...</p>
      </div>
    );
  }

  const ocean = personality?.ocean || { O: 60, C: 65, E: 55, A: 50, N: 40 };
  const mbti = personality?.mbti || { type: "INTJ", confidence: 50 };
  const axes = mbti.axes || { IE: 65, NS: 70, TF: 60, JP: 55 };

  return (
    <div className="insights-modern">
      <div className="insights-header">
        <span className="insights-icon">🧠</span>
        <h2>Personality Insights</h2>
        <p>Based on your music & lifestyle patterns</p>
      </div>

      {/* MBTI Card */}
      <div className="mbti-card">
        <div className="mbti-badge">
          <span className="mbti-type">{mbti.type}</span>
          <span className="mbti-confidence">{mbti.confidence}% confidence</span>
        </div>
        <div className="mbti-traits">
          <div className="mbti-trait">
            <span>I</span>
            <span className="trait-bar">
              <div className="trait-fill" style={{ width: `${axes.IE}%` }}></div>
            </span>
            <span>E</span>
          </div>
          <div className="mbti-trait">
            <span>N</span>
            <span className="trait-bar">
              <div className="trait-fill" style={{ width: `${axes.NS}%` }}></div>
            </span>
            <span>S</span>
          </div>
          <div className="mbti-trait">
            <span>T</span>
            <span className="trait-bar">
              <div className="trait-fill" style={{ width: `${axes.TF}%` }}></div>
            </span>
            <span>F</span>
          </div>
          <div className="mbti-trait">
            <span>J</span>
            <span className="trait-bar">
              <div className="trait-fill" style={{ width: `${axes.JP}%` }}></div>
            </span>
            <span>P</span>
          </div>
        </div>
      </div>

      {/* OCEAN Section */}
      <div className="ocean-card">
        <h3>Big 5 Personality Traits</h3>
        {oceanTraits.map((trait) => (
          <div key={trait.key} className="ocean-item">
            <div className="ocean-header">
              <span className="ocean-letter">{trait.key}</span>
              <span className="ocean-name">{trait.name}</span>
              <span className="ocean-score">{ocean[trait.key]}/100</span>
            </div>
            <div className="ocean-bar">
              <div
                className="ocean-fill"
                style={{ width: `${ocean[trait.key]}%` }}
              ></div>
            </div>
            <p className="ocean-desc">{trait.description}</p>
          </div>
        ))}
      </div>

      {/* Insights Cards */}
      <div className="insights-grid">
        {personality?.insights?.map((insight, idx) => (
          <div
            key={idx}
            className="insight-card-modern"
            style={{ background: insight.color || "rgba(127,119,221,0.1)" }}
          >
            <div className="insight-head">{insight.head}</div>
            <div className="insight-body">{insight.body}</div>
          </div>
        ))}
        {(!personality?.insights || personality.insights.length === 0) && (
          <>
            <div
              className="insight-card-modern"
              style={{ background: "rgba(127,119,221,0.1)" }}
            >
              <div className="insight-head">🎵 Music Taste Profile</div>
              <div className="insight-body">
                Your music preferences suggest a balanced approach to life,
                enjoying both energetic highs and calming moments.
              </div>
            </div>
            <div
              className="insight-card-modern"
              style={{ background: "rgba(255,107,107,0.1)" }}
            >
              <div className="insight-head">💪 Energy Patterns</div>
              <div className="insight-body">
                You tend to be most active in the afternoon, with natural dips
                in the evening. Plan important tasks accordingly.
              </div>
            </div>
            <div
              className="insight-card-modern"
              style={{ background: "rgba(69,183,209,0.1)" }}
            >
              <div className="insight-head">🌟 Growth Opportunity</div>
              <div className="insight-body">
                Adding more variety to your music library could expand your
                emotional range and creativity.
              </div>
            </div>
          </>
        )}
      </div>

      <div className="insights-note">
        💡 These insights are generated based on your Spotify listening history,
        fitness data, and mood check-ins
      </div>
    </div>
  );
}
