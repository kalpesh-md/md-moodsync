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
import { Button } from "@/components/ui/button";

type ScreenId = "today" | "forecast" | "friends" | "insights" | "recs";

const navItems: { id: ScreenId; label: string; icon: LucideIcon }[] = [
  { id: "today", label: "Today", icon: CalendarDays },
  { id: "forecast", label: "Forecast", icon: CloudSun },
  { id: "friends", label: "Friends", icon: Users },
  { id: "insights", label: "Insights", icon: Brain },
  { id: "recs", label: "Recs", icon: Music },
];

interface NavBarProps {
  active: ScreenId;
  onChange: (id: ScreenId) => void;
}

export default function NavBar({ active, onChange }: NavBarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border/70 bg-card/40 p-3 md:flex">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Navigate
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "justify-start gap-2",
                !isActive && "text-muted-foreground",
              )}
              onClick={() => onChange(item.id)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
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
                  isActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
