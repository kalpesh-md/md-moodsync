import { cn } from "@/lib/utils";

type Tone = "brand" | "success" | "info" | "warning" | "neutral" | "onDark";

const tones: Record<Tone, string> = {
  brand: "bg-ms-soft text-ms-navy",
  success: "bg-ms-emerald-soft text-[#059669]",
  info: "bg-ms-sky-soft text-[#0284C7]",
  warning: "bg-ms-amber-soft text-ms-amber",
  neutral: "bg-ms-tint text-ms-ink2 border border-ms-line",
  onDark: "bg-white/15 text-white",
};

interface MsPillProps {
  children: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
}

export function MsPill({ children, tone = "neutral", icon, className }: MsPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
