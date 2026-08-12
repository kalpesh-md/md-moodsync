"use client";

import React, { useEffect, useState } from "react";

interface MoodColor {
  start: string;
  end: string;
}

const MOOD_COLORS: Record<string, MoodColor> = {
  morning: { start: "#EF9F27", end: "#F5C451" }, // 5-8am
  work: { start: "#1E3A5F", end: "#378ADD" }, // 9-5pm
  evening: { start: "#D85A30", end: "#EF9F27" }, // 6-9pm
  night: { start: "#152A45", end: "#1E3A5F" }, // 10pm-4am
};

interface MoodClockProps {
  currentHour?: number;
}

export default function MoodClock({
  currentHour = new Date().getHours(),
}: MoodClockProps) {
  const [animate, setAnimate] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setAnimate(true);
    const angle = (currentHour / 24) * 360;
    setRotation(angle);
    const timer = setTimeout(() => setAnimate(false), 1000);
    return () => clearTimeout(timer);
  }, [currentHour]);

  const getMoodColor = (hour: number): MoodColor => {
    if (hour >= 5 && hour <= 8) return MOOD_COLORS.morning;
    if (hour >= 9 && hour <= 17) return MOOD_COLORS.work;
    if (hour >= 18 && hour <= 21) return MOOD_COLORS.evening;
    return MOOD_COLORS.night;
  };

  const getMoodEmoji = (hour: number): string => {
    if (hour >= 5 && hour <= 8) return "🌅";
    if (hour >= 9 && hour <= 12) return "💪";
    if (hour >= 13 && hour <= 17) return "⚡";
    if (hour >= 18 && hour <= 21) return "🌙";
    return "😴";
  };

  const getMoodLabel = (hour: number): string => {
    if (hour >= 5 && hour <= 8) return "Fresh Start";
    if (hour >= 9 && hour <= 12) return "Peak Focus";
    if (hour >= 13 && hour <= 17) return "Deep Work";
    if (hour >= 18 && hour <= 21) return "Wind Down";
    return "Rest Mode";
  };

  const colors = getMoodColor(currentHour);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="mood-clock-modern">
      <div className="clock-container">
        <svg className="clock-svg-modern" viewBox="0 0 200 200">
          <defs>
            <linearGradient
              id="clockGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={colors.start} />
              <stop offset="100%" stopColor={colors.end} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="8"
          />

          {/* Progress circle - animated */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="url(#clockGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={
              circumference - (currentHour / 24) * circumference
            }
            transform="rotate(-90 100 100)"
            className={`clock-progress ${animate ? "pulse-animation" : ""}`}
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />

          {/* Hour markers */}
          {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => {
            const angle = (hour / 24) * 360 - 90;
            const radian = (angle * Math.PI) / 180;
            const x = 100 + 70 * Math.cos(radian);
            const y = 100 + 70 * Math.sin(radian);
            return (
              <text
                key={hour}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.4)"
                fontSize="10"
                fontWeight="bold"
              >
                {hour === 0 ? "12" : hour}
              </text>
            );
          })}

          {/* Current time indicator */}
          <line
            x1="100"
            y1="100"
            x2={100 + 55 * Math.cos(((rotation - 90) * Math.PI) / 180)}
            y2={100 + 55 * Math.sin(((rotation - 90) * Math.PI) / 180)}
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            className="clock-hand"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "100px 100px",
            }}
          />

          {/* Center dot */}
          <circle
            cx="100"
            cy="100"
            r="6"
            fill={colors.start}
            filter="url(#glow)"
          />
        </svg>

        {/* Center mood display */}
        <div className="clock-center-mood">
          <span className="clock-emoji">{getMoodEmoji(currentHour)}</span>
          <span className="clock-label">{getMoodLabel(currentHour)}</span>
          <span className="clock-time">{currentHour}:00</span>
        </div>
      </div>

      {/* Time legend */}
      <div className="clock-legend-modern">
        <div className="legend-item">
          <div
            className="legend-dot"
            style={{ background: MOOD_COLORS.morning.start }}
          />
          <span>Morning</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-dot"
            style={{ background: MOOD_COLORS.work.start }}
          />
          <span>Work</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-dot"
            style={{ background: MOOD_COLORS.evening.start }}
          />
          <span>Evening</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-dot"
            style={{ background: MOOD_COLORS.night.start }}
          />
          <span>Night</span>
        </div>
      </div>
    </div>
  );
}
