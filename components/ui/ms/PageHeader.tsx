import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  actions,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-ms-line bg-ms-card/80 shadow-card backdrop-blur-sm sm:gap-4",
        compact ? "p-4" : "p-5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {icon ? (
          <span
            className={cn(
              "ms-icon-ring flex shrink-0 items-center justify-center rounded-xl bg-ms-soft text-ms-navy",
              compact ? "h-10 w-10" : "h-12 w-12 rounded-2xl",
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ms-ink3 sm:text-[11px]">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              "font-semibold tracking-tight text-ms-ink",
              compact ? "text-lg sm:text-xl" : "text-2xl",
              eyebrow && "mt-0.5",
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-xs leading-relaxed text-ms-ink2 sm:text-sm">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

interface SectionHeadingProps {
  title: string;
  meta?: string;
  className?: string;
}

export function SectionHeading({ title, meta, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3 px-0.5", className)}>
      <h2 className="text-sm font-semibold text-ms-ink">{title}</h2>
      {meta ? <span className="text-xs text-ms-ink3">{meta}</span> : null}
    </div>
  );
}
