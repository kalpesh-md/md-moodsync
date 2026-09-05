import { cn } from "@/lib/utils";

interface MsProgressProps {
  value: number;
  className?: string;
  size?: "sm" | "md";
}

export function MsProgress({ value, className, size = "sm" }: MsProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        "overflow-hidden rounded-full bg-ms-soft",
        size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-ms-navy to-ms-mid transition-all duration-700 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
