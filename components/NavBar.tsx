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
  { id: "recs", label: "Recs", icon: Music },
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
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ms-line bg-ms-card/95 px-2 py-2 backdrop-blur-md md:hidden">
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
                    "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                    isActive ? "bg-ms-navy text-white" : "text-ms-ink2",
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
    <nav className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-ms-line bg-ms-card p-3 shadow-card">
      <p className="mb-2 px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-ms-ink3">
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
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-ms-navy font-semibold text-white"
                  : "font-medium text-ms-ink2 hover:bg-ms-tint hover:text-ms-ink",
              )}
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
