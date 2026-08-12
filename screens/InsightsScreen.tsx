"use client";

import React, { useState, useEffect } from "react";
import { Brain, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

export default function InsightsScreen({ checkins: _checkins }: InsightsScreenProps) {
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
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
        <p className="text-sm">Analyzing your personality…</p>
      </div>
    );
  }

  const ocean = personality?.ocean || { O: 60, C: 65, E: 55, A: 50, N: 40 };
  const mbti = personality?.mbti || { type: "INTJ", confidence: 50 };
  const axes = mbti.axes || { IE: 65, NS: 70, TF: 60, JP: 55 };

  const axisRows = [
    { left: "I", right: "E", value: axes.IE },
    { left: "N", right: "S", value: axes.NS },
    { left: "T", right: "F", value: axes.TF },
    { left: "J", right: "P", value: axes.JP },
  ];

  const fallbackInsights = [
    {
      head: "Music taste profile",
      body: "Your music preferences suggest a balanced approach — energetic highs and calming moments.",
    },
    {
      head: "Energy patterns",
      body: "You tend to be most active in the afternoon, with natural dips in the evening.",
    },
    {
      head: "Growth opportunity",
      body: "Adding more variety to your music library could expand your emotional range.",
    },
  ];

  const insightCards =
    personality?.insights && personality.insights.length > 0
      ? personality.insights
      : fallbackInsights;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-navy dark:text-slate-100">
          Personality Insights
        </h2>
        <p className="text-sm text-muted-foreground">
          Based on your music and lifestyle patterns
        </p>
      </div>

      <Card className="border-navy/20 bg-gradient-to-br from-white to-[var(--ms-sky)] dark:from-slate-800 dark:to-slate-900">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardDescription>MBTI estimate</CardDescription>
            <CardTitle className="mt-1 text-3xl tracking-tight text-navy dark:text-slate-100">
              {mbti.type}
            </CardTitle>
          </div>
          <Badge variant="secondary">{mbti.confidence}% confidence</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {axisRows.map((row) => (
            <div key={row.left} className="flex items-center gap-3 text-xs font-medium">
              <span className="w-4 text-muted-foreground">{row.left}</span>
              <Progress value={row.value} className="h-2 flex-1" />
              <span className="w-4 text-right text-muted-foreground">{row.right}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-navy" />
            Big 5 Personality Traits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {oceanTraits.map((trait) => (
            <div key={trait.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-navy hover:bg-navy">{trait.key}</Badge>
                  <span className="text-sm font-medium">{trait.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {ocean[trait.key]}/100
                </span>
              </div>
              <Progress value={ocean[trait.key]} className="h-2" />
              <p className="text-xs text-muted-foreground">{trait.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {insightCards.map((insight, idx) => (
          <Card key={idx} className="bg-[var(--ms-sky)]/60 dark:bg-slate-800/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{insight.head}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{insight.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Generated from Spotify listening, fitness data, and mood check-ins.
      </p>
    </div>
  );
}
