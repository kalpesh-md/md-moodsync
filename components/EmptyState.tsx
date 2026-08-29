"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  variant?: "default" | "muted";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
}: EmptyStateProps) {
  return (
    <Card
      className={
        variant === "muted"
          ? "ms-card-accent border-0 bg-gradient-to-br from-white to-[#f0f9ff] dark:from-slate-800 dark:to-slate-900"
          : "ms-card-accent border-0 bg-white dark:bg-slate-800/80"
      }
    >
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-navy/10 to-[#378ADD]/15 text-navy dark:text-slate-100">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="max-w-sm">{description}</CardDescription>
      </CardHeader>
      {(action || secondaryAction) && (
        <CardContent className="flex flex-wrap justify-center gap-2 pt-0">
          {action && (
            <Button onClick={action.onClick} className="bg-gradient-to-r from-navy to-navy-mid">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
