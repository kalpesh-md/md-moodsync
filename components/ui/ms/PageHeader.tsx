import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-ms-line bg-ms-card/80 p-5 shadow-card backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        {icon ? (
          <span className="ms-icon-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ms-soft text-ms-navy">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ms-ink3">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              "font-semibold tracking-tight text-ms-ink",
              eyebrow ? "mt-1 text-2xl" : "text-2xl",
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ms-ink2">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
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
