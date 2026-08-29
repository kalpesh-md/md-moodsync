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
  accent: string;
}[] = [
  { id: "today", label: "Today", icon: CalendarDays, accent: "#378ADD" },
  { id: "forecast", label: "Forecast", icon: CloudSun, accent: "#4ECDC4" },
  { id: "friends", label: "Friends", icon: Users, accent: "#7F77DD" },
  { id: "insights", label: "Insights", icon: Brain, accent: "#FF8C42" },
  { id: "recs", label: "Recs", icon: Music, accent: "#1DB954" },
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
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-white/95 px-2 py-2 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 md:hidden">
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
                  isActive ? "text-navy dark:text-white" : "text-slate-400",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                    isActive && "shadow-sm",
                  )}
                  style={
                    isActive
                      ? { backgroundColor: `${item.accent}22`, color: item.accent }
                      : undefined
                  }
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
    <nav className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line/80 bg-white/90 p-3 shadow-card backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/90">
      <p className="mb-2 px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-[#378ADD]">
        Navigate
      </p>
      <div className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                isActive
                  ? "font-semibold text-white shadow-md"
                  : "font-medium text-slate-500 hover:bg-[#F4F6FA] hover:text-navy dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white",
              )}
              style={
                isActive
                  ? {
                      background: `linear-gradient(135deg, ${item.accent} 0%, #1E3A5F 100%)`,
                    }
                  : undefined
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
