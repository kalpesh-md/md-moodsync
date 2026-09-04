export type EnergyBand = "high" | "medium" | "low";

export function energyFromMoods(moods: string[]): EnergyBand {
  const text = moods.join(" ").toLowerCase();
  if (/(excited|happy)/.test(text)) return "high";
  if (/(tired|low|calm)/.test(text)) return "low";
  if (/(anxious|stressed)/.test(text)) return "medium";
  if (/focused/.test(text)) return "medium";
  return "medium";
}

export function energyBand(energy?: number | null): EnergyBand {
  if (energy == null) return "medium";
  if (energy > 0.7) return "high";
  if (energy > 0.4) return "medium";
  return "low";
}

export function estimateTrackEnergy(
  track: { id?: string; popularity?: number },
  prefer: EnergyBand,
): number {
  const pop =
    typeof track.popularity === "number" ? Math.min(1, Math.max(0, track.popularity / 100)) : 0.5;
  let h = 0;
  const s = track.id || "";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000;
  const jitter = (h % 40) / 100;
  let energy = pop * 0.6 + jitter;
  if (prefer === "high") energy = Math.min(1, energy + 0.15);
  if (prefer === "low") energy = Math.max(0, energy - 0.2);
  return Math.round(energy * 100) / 100;
}

export function reasonForTrack(
  moods: string[],
  band: EnergyBand,
  featured: boolean,
): string {
  const mood = moods[0];
  if (featured && mood) return `Picked for your ${mood} check-in`;
  if (band === "high") {
    return mood
      ? `Keeps the ${mood.toLowerCase()} energy going`
      : "A higher-energy pick from your listening";
  }
  if (band === "low") {
    return mood
      ? `A softer match for ${mood.toLowerCase()}`
      : "A calmer pick from your recent tracks";
  }
  return mood
    ? `Fits a ${mood.toLowerCase()} headspace`
    : "From your recent listening";
}

export function energyLabel(band: EnergyBand): string {
  if (band === "high") return "High energy";
  if (band === "low") return "Low energy";
  return "Medium energy";
}
