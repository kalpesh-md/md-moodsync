"use client";

import type { ReactNode } from "react";
import { MsCard } from "@/components/ui/ms/MsCard";
import { MsEmptyState } from "@/components/ui/ms/MsEmptyState";
import { MsButton } from "@/components/ui/ms/MsButton";

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
    <MsCard elevated>
      <div className="p-6">
        <MsEmptyState
          icon={icon}
          message={title}
          action={
            <div className="space-y-3">
              <p className="max-w-[42ch] text-sm text-ms-ink2">{description}</p>
              {(action || secondaryAction) && (
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
              )}
            </div>
          }
        />
      </div>
    </MsCard>
  );
}
