"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/** Full-screen branded loader (SSO handoff, app boot). */
export function BrandLoader({ message }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Image
        src="/images/moodscale_logo1.png"
        alt="MoodScale"
        width={160}
        height={40}
        className="h-9 w-auto animate-pulse"
        priority
      />
      <Spinner className="h-10 w-10 border-4" />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

/** Inline loader for screen-level fetches. */
export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <Spinner className="h-9 w-9 border-[3px]" />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          "animate-spin rounded-full border-slate-200 border-t-violet-500 dark:border-slate-700 dark:border-t-violet-400",
          className,
        )}
      />
      <span
        className={cn(
          "absolute inset-0 animate-spin rounded-full border-transparent border-b-blue-500 opacity-70 [animation-duration:1.6s] dark:border-b-blue-400",
          className,
        )}
      />
    </span>
  );
}
