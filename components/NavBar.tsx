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
  gradient: string;
}[] = [
  {
    id: "today",
    label: "Today",
    icon: CalendarDays,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "forecast",
    label: "Forecast",
    icon: CloudSun,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    id: "friends",
    label: "Friends",
    icon: Users,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    id: "insights",
    label: "Insights",
    icon: Brain,
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    id: "recs",
    label: "Recs",
    icon: Music,
    gradient: "from-violet-500 to-fuchsia-500",
  },
];

interface NavBarProps {
  active: ScreenId;
  onChange: (id: ScreenId) => void;
}

export default function NavBar({ active, onChange }: NavBarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden w-56 shrink-0 flex-col gap-1.5 border-r border-border/70 bg-card/40 p-3 md:flex">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Navigate
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-navy text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm transition-transform duration-200 group-hover:scale-105",
                  item.gradient,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] transition-colors",
                  isActive ? "font-semibold text-navy dark:text-white" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                    isActive
                      ? `bg-gradient-to-br text-white shadow-sm ${item.gradient}`
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
