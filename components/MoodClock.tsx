"use client";

import React, { useMemo } from "react";

type PeriodId = "morning" | "work" | "evening" | "night";

interface Period {
  id: PeriodId;
  label: string;
  emoji: string;
  start: number;
  end: number;
  stroke: string;
}

const PERIODS: Period[] = [
  { id: "morning", label: "Morning", emoji: "🌅", start: 5, end: 8, stroke: "#2D5A8B" },
  { id: "work", label: "Focus", emoji: "💪", start: 9, end: 17, stroke: "#1E3A5F" },
  { id: "evening", label: "Wind down", emoji: "🌙", start: 18, end: 21, stroke: "#378ADD" },
  { id: "night", label: "Rest", emoji: "😴", start: 22, end: 4, stroke: "#64748B" },
];

const R = 72;
const CIRC = 2 * Math.PI * R;

function hourToAngle(hour: number): number {
  return (hour / 24) * 360 - 90;
}

function getCurrentPeriod(hour: number): Period {
  if (hour >= 5 && hour <= 8) return PERIODS[0];
  if (hour >= 9 && hour <= 17) return PERIODS[1];
  if (hour >= 18 && hour <= 21) return PERIODS[2];
  return PERIODS[3];
}

function arcPath(startHour: number, endHour: number): string {
  const span =
    endHour >= startHour ? endHour - startHour + 1 : 24 - startHour + endHour + 1;
  const startAngle = hourToAngle(startHour);
  const endAngle = hourToAngle(startHour + span);
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
  const progress = ((currentHour + 1) / 24) * 100;
  const handAngle = (currentHour / 24) * 360;

  return (
    <div className="mood-clock-modern">
      <div className="clock-container rounded-full bg-ms-tint/60 p-2 ring-1 ring-ms-line">
        <svg className="clock-svg-modern" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={R + 10} fill="#F8FAFC" />
          <circle cx="100" cy="100" r={R} fill="none" stroke="#E9EEF5" strokeWidth="10" />

          {PERIODS.map((p) => (
            <path
              key={p.id}
              d={arcPath(p.start, p.end)}
              fill="none"
              stroke={p.id === period.id ? p.stroke : "#E9EEF5"}
              strokeWidth={p.id === period.id ? 10 : 6}
              strokeLinecap="round"
              opacity={p.id === period.id ? 1 : 0.55}
            />
          ))}

          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke="#1E3A5F"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress / 100)}
            transform="rotate(-90 100 100)"
            opacity={0.35}
          />

          {[0, 6, 12, 18].map((hour) => {
            const angle = hourToAngle(hour);
            const rad = (angle * Math.PI) / 180;
            const x = 100 + (R + 16) * Math.cos(rad);
            const y = 100 + (R + 16) * Math.sin(rad);
            return (
              <text
                key={hour}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#94A3B8"
                fontSize="10"
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
            y2="36"
            stroke="#1E3A5F"
            strokeWidth="2.5"
            strokeLinecap="round"
            transform={`rotate(${handAngle} 100 100)`}
            className="clock-hand"
          />
          <circle cx="100" cy="100" r="5" fill="#1E3A5F" />
          <circle cx="100" cy="100" r="2.5" fill="#fff" />
        </svg>

        <div className="clock-center-mood">
          <span className="clock-emoji">{period.emoji}</span>
          <span className="clock-label">{period.label}</span>
          <span className="clock-time">
            {String(currentHour).padStart(2, "0")}:00
          </span>
        </div>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-2 sm:grid-cols-4">
        {PERIODS.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border px-3 py-2 text-center transition-colors ${
              p.id === period.id
                ? "border-ms-navy/20 bg-ms-soft"
                : "border-ms-line bg-ms-card"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ms-ink3">
              {p.label}
            </p>
            <p className="mt-0.5 text-xs font-medium text-ms-ink">
              {p.start <= p.end
                ? `${p.start}:00–${p.end}:00`
                : `${p.start}:00–${p.end}:00`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
