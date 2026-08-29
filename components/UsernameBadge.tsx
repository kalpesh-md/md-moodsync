"use client";

import { useState } from "react";
import { Check, Copy, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsernameBadgeProps {
  username: string;
  className?: string;
}

export default function UsernameBadge({ username, className }: UsernameBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(username);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / non-secure contexts
      const input = document.createElement("input");
      input.value = username;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={copied ? "Copied!" : "Copy username"}
      aria-label={copied ? "Username copied" : `Copy username ${username}`}
      className={cn(
        "group flex shrink-0 items-center gap-1.5 rounded-full border border-[#378ADD]/25 bg-gradient-to-r from-[#E9EEF5] to-[#dbeafe] px-2.5 py-1.5 text-xs font-semibold text-navy transition-all hover:border-[#378ADD]/50 hover:shadow-sm active:scale-[0.98] dark:border-slate-600 dark:from-slate-800 dark:to-slate-700 dark:text-slate-100 dark:hover:border-slate-500",
        className,
      )}
    >
      <UserRound className="h-3.5 w-3.5 shrink-0 text-[#378ADD] dark:text-sky-300" />
      <span className="max-w-[140px] truncate font-mono sm:max-w-[200px]">
        @{username}
      </span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <Copy
          className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-70 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      )}
    </button>
  );
}
