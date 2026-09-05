"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

type PeriodId = "morning" | "work" | "evening" | "night";

interface Period {
  id: PeriodId;
  label: string;
  emoji: string;
  start: number;
  end: number;
  range: string;
}

const PERIODS: Period[] = [
  { id: "morning", label: "Morning", emoji: "🌅", start: 5, end: 8, range: "5:00–8:00" },
  { id: "work", label: "Focus", emoji: "💪", start: 9, end: 17, range: "9:00–17:00" },
  { id: "evening", label: "Wind down", emoji: "🌙", start: 18, end: 21, range: "18:00–21:00" },
  { id: "night", label: "Rest", emoji: "😴", start: 22, end: 4, range: "22:00–4:00" },
];

const R = 68;

function hourToAngle(hour: number): number {
  return (hour / 24) * 360 - 90;
}

function getCurrentPeriod(hour: number): Period {
  if (hour >= 5 && hour <= 8) return PERIODS[0];
  if (hour >= 9 && hour <= 17) return PERIODS[1];
  if (hour >= 18 && hour <= 21) return PERIODS[2];
  return PERIODS[3];
}

function activeArc(startHour: number, endHour: number): string {
  const span =
    endHour >= startHour ? endHour - startHour + 1 : 24 - startHour + endHour + 1;
  const startAngle = hourToAngle(startHour);
  const endAngle = hourToAngle((startHour + span) % 24);
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = 100 + R * Math.cos(startRad);
  const y1 = 100 + R * Math.sin(startRad);
  const x2 = 100 + R * Math.cos(endRad);
  const y2 = 100 + R * Math.sin(endRad);
  const largeArc = span > 12 ? 1 : 0;
  return `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`;
}

interface MoodClockProps {
  currentHour?: number;
}

export default function MoodClock({
  currentHour = new Date().getHours(),
}: MoodClockProps) {
  const period = useMemo(() => getCurrentPeriod(currentHour), [currentHour]);
  const handAngle = (currentHour / 24) * 360;
  const minutes = new Date().getMinutes();
  const timeLabel = `${String(currentHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
      <div className="mx-auto w-full max-w-[200px] shrink-0 sm:max-w-[220px] md:mx-0">
        <div className="relative aspect-square rounded-full bg-ms-tint/70 p-1.5 ring-1 ring-ms-line">
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <circle cx="100" cy="100" r={R + 8} fill="#F8FAFC" />
            <circle cx="100" cy="100" r={R} fill="none" stroke="#E9EEF5" strokeWidth="8" />
            <path
              d={activeArc(period.start, period.end)}
              fill="none"
              stroke="#1E3A5F"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {[0, 6, 12, 18].map((hour) => {
              const angle = hourToAngle(hour);
              const rad = (angle * Math.PI) / 180;
              const x = 100 + (R + 14) * Math.cos(rad);
              const y = 100 + (R + 14) * Math.sin(rad);
              return (
                <text
                  key={hour}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#94A3B8"
                  fontSize="9"
                  fontWeight="600"
                >
                  {hour === 0 ? "12a" : hour === 12 ? "12p" : hour < 12 ? `${hour}a` : `${hour - 12}p`}
                </text>
              );
            })}
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="40"
              stroke="#1E3A5F"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${handAngle} 100 100)`}
            />
            <circle cx="100" cy="100" r="4" fill="#1E3A5F" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <span className="text-xl leading-none">{period.emoji}</span>
            <span className="mt-1 text-xs font-semibold capitalize text-ms-navy">{period.label}</span>
            <span className="mt-0.5 text-[11px] text-ms-ink3">{timeLabel}</span>
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-2 hidden text-[11px] font-semibold uppercase tracking-wider text-ms-ink3 md:block">
          Day phases
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-1 md:gap-1.5">
          {PERIODS.map((p) => {
            const active = p.id === period.id;
            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
                  active
                    ? "border-ms-navy/25 bg-ms-soft"
                    : "border-ms-line bg-ms-card",
                )}
              >
                <span className="text-base leading-none">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-[11px] font-semibold uppercase tracking-wide",
                      active ? "text-ms-navy" : "text-ms-ink3",
                    )}
                  >
                    {p.label}
                  </p>
                  <p className="truncate text-xs text-ms-ink2">{p.range}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
