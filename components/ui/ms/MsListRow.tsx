import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MsListRowProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  as?: "button" | "div";
}

export function MsListRow({ children, onClick, className, as = "div" }: MsListRowProps) {
  const Tag = as === "button" ? "button" : "div";
  return (
    <Tag
      type={as === "button" ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-ms-line bg-ms-card p-3.5 text-left transition-all",
        (onClick || as === "button") &&
          "cursor-pointer hover:border-ms-line-strong hover:bg-ms-tint hover:shadow-card",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
