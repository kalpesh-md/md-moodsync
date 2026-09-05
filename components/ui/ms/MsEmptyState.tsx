import { cn } from "@/lib/utils";

interface MsEmptyStateProps {
  icon: React.ReactNode;
  message: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export function MsEmptyState({
  icon,
  message,
  action,
  compact = false,
  className,
}: MsEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-ms-line-strong bg-ms-tint text-center",
        compact ? "gap-2.5 px-4 py-5" : "gap-3 px-5 py-8",
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ms-soft text-ms-navy">
        {icon}
      </span>
      <p className="max-w-[42ch] text-sm font-medium text-ms-ink2">{message}</p>
      {action}
    </div>
  );
}
