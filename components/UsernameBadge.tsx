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
        "group flex shrink-0 items-center gap-1.5 rounded-full border border-ms-line bg-ms-tint px-2.5 py-1.5 text-xs font-semibold text-ms-ink transition-colors hover:border-ms-line-strong hover:bg-ms-soft active:scale-[0.98]",
        className,
      )}
    >
      <UserRound className="h-3.5 w-3.5 shrink-0 text-ms-navy" />
      <span className="max-w-[140px] truncate font-mono sm:max-w-[200px]">@{username}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-ms-emerald" aria-hidden />
      ) : (
        <Copy
          className="h-3.5 w-3.5 shrink-0 text-ms-ink3 opacity-70 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      )}
    </button>
  );
}
