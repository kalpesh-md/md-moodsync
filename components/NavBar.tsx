"use client";

import {
  Brain,
  CalendarDays,
  CloudSun,
  Music,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ScreenId = "today" | "forecast" | "friends" | "insights" | "recs";

const navItems: {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "today", label: "Today", icon: CalendarDays },
  { id: "forecast", label: "Forecast", icon: CloudSun },
  { id: "friends", label: "Friends", icon: Users },
  { id: "insights", label: "Insights", icon: Brain },
  { id: "recs", label: "Music", icon: Music },
];

interface NavBarProps {
  active: ScreenId;
  onChange: (id: ScreenId) => void;
  variant?: "desktop" | "mobile";
}

export default function NavBar({
  active,
  onChange,
  variant = "desktop",
}: NavBarProps) {
  if (variant === "mobile") {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ms-line bg-ms-card/95 px-2 py-2.5 shadow-[0_-4px_24px_rgba(16,24,40,0.06)] backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-colors",
                  isActive ? "text-ms-navy" : "text-ms-ink3",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                    isActive
                      ? "bg-ms-navy text-white shadow-[0_2px_8px_rgba(30,58,95,0.25)]"
                      : "text-ms-ink2",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-ms-line bg-ms-card shadow-card">
      <div className="border-b border-ms-line px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ms-ink3">
          Navigate
        </p>
        <p className="mt-1 text-sm font-semibold text-ms-ink">MoodSync</p>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                isActive
                  ? "bg-ms-navy font-semibold text-white shadow-[0_2px_10px_rgba(30,58,95,0.22)]"
                  : "font-medium text-ms-ink2 hover:bg-ms-tint hover:text-ms-ink",
              )}
            >
              {isActive ? (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white/30" />
              ) : null}
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
