import type { LucideIcon } from "lucide-react";
import { MsButton } from "@/components/ui/ms/MsButton";
import { MsCard } from "@/components/ui/ms/MsCard";
import { cn } from "@/lib/utils";

interface MetricTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  action?: () => void;
  actionLabel?: string;
  className?: string;
}

export function MetricTile({
  icon: Icon,
  label,
  value,
  detail,
  action,
  actionLabel,
  className,
}: MetricTileProps) {
  return (
    <MsCard interactive className={cn("group", className)}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="ms-icon-ring flex h-10 w-10 items-center justify-center rounded-xl bg-ms-soft text-ms-navy transition-colors group-hover:bg-ms-navy group-hover:text-white">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          {action && actionLabel ? (
            <MsButton variant="secondary" size="sm" onClick={action}>
              {actionLabel}
            </MsButton>
          ) : null}
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ms-ink3">
          {label}
        </p>
        <p className="mt-1 truncate text-xl font-bold leading-tight text-ms-ink">{value}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-ms-ink2">{detail}</p>
      </div>
    </MsCard>
  );
}
