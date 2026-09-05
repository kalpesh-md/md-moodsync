import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "inverted";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-ms-navy text-white hover:bg-ms-navy-dark shadow-[0_1px_2px_rgba(16,24,40,0.08)]",
  secondary: "bg-ms-card text-ms-ink border border-ms-line-strong hover:border-ms-navy hover:text-ms-navy",
  ghost: "bg-transparent text-ms-ink2 hover:bg-ms-soft hover:text-ms-navy",
  inverted: "bg-white text-ms-navy hover:bg-ms-sky-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold font-sans transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ms-navy disabled:cursor-not-allowed disabled:opacity-50";

interface MsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  block?: boolean;
}

export function MsButton({
  variant = "primary",
  size = "md",
  icon,
  block = false,
  className,
  children,
  ...rest
}: MsButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

interface MsLinkButtonProps {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  block?: boolean;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
}

export function MsLinkButton({
  href,
  variant = "primary",
  size = "md",
  icon,
  block = false,
  className,
  children,
  external = false,
}: MsLinkButtonProps) {
  const cls = cn(base, variants[variant], sizes[size], block && "w-full", className);
  if (external || href.startsWith("/api/")) {
    return (
      <a href={href} className={cls}>
        {icon}
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {icon}
      {children}
    </Link>
  );
}
