import { cn } from "@/lib/utils";

interface MsCardProps {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
  elevated?: boolean;
  interactive?: boolean;
}

export function MsCard({
  children,
  className,
  as: Tag = "section",
  elevated = false,
  interactive = false,
}: MsCardProps) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-ms-line bg-ms-card shadow-card",
        elevated && "shadow-[0_4px_24px_rgba(16,24,40,0.06)]",
        interactive &&
          "transition-all duration-200 hover:border-ms-line-strong hover:shadow-lift",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

interface MsCardHeaderProps {
  title: string;
  meta?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}

export function MsCardHeader({ title, meta, icon, action, compact = false }: MsCardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-ms-line bg-ms-tint/30",
        compact ? "px-4 py-3" : "px-5 py-4",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className="ms-icon-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ms-soft text-ms-navy">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2
            className={cn(
              "truncate font-sans font-semibold text-ms-ink",
              compact ? "text-sm" : "text-[15px]",
            )}
          >
            {title}
          </h2>
          {meta ? <p className="mt-0.5 truncate text-xs leading-relaxed text-ms-ink3">{meta}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
