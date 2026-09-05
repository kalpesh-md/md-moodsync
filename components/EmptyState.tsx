"use client";

import type { ReactNode } from "react";
import { MsButton } from "@/components/ui/ms/MsButton";
import { MsCard } from "@/components/ui/ms/MsCard";
import { MsEmptyState } from "@/components/ui/ms/MsEmptyState";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <MsCard>
      <div className="p-5">
        <MsEmptyState
          icon={icon}
          message={`${title}. ${description}`}
          action={
            action || secondaryAction ? (
              <div className="flex flex-wrap justify-center gap-2">
                {action && (
                  <MsButton size="sm" onClick={action.onClick}>
                    {action.label}
                  </MsButton>
                )}
                {secondaryAction && (
                  <MsButton variant="secondary" size="sm" onClick={secondaryAction.onClick}>
                    {secondaryAction.label}
                  </MsButton>
                )}
              </div>
            ) : undefined
          }
        />
      </div>
    </MsCard>
  );
}
