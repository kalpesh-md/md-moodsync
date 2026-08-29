import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Consistent username display across all screens. */
export function formatUsername(
  username?: string | null,
  email?: string | null,
): string {
  if (username?.trim()) {
    return username
      .trim()
      .replace(/[._-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }
  const prefix = email?.split("@")[0]?.trim();
  if (prefix) return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  return "You";
}

/** Format stored mood labels (e.g. "happy, focused" → "Happy, Focused"). */
export function formatMoodLabel(label?: string | null): string {
  if (!label?.trim()) return "";
  return label
    .split(",")
    .map((m) => {
      const t = m.trim();
      return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
    })
    .filter(Boolean)
    .join(", ");
}

/** Stable mood-match percentage for a friend pair (not random per render). */
export function moodMatchPercent(id: string | number): number {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100;
  return 72 + (h % 23);
}
