const MOODS_TAG = /^\[moods:([^\]]+)\]/;

export function normalizeMoodNames(moods: string[]): string[] {
  return moods
    .map((m) => String(m).trim().toLowerCase())
    .filter(Boolean);
}

/** Store extra moods in note — mood_label DB column is a single-value enum. */
export function encodeCheckinNote(
  moods: string[],
  userNote: string,
): string | null {
  const normalized = normalizeMoodNames(moods);
  const note = userNote.trim();
  if (normalized.length <= 1) return note || null;
  const prefix = `[moods:${normalized.join(",")}]`;
  return note ? `${prefix}\n${note}` : prefix;
}

export function getCheckinMoods(checkin: {
  mood_label?: string | null;
  note?: string | null;
  mood_labels?: string[] | null;
}): string {
  if (checkin.mood_labels?.length) {
    return checkin.mood_labels.join(", ");
  }
  const tag = checkin.note?.match(MOODS_TAG);
  if (tag) return tag[1];
  return checkin.mood_label || "";
}

export function getCheckinUserNote(note?: string | null): string {
  if (!note) return "";
  return note.replace(MOODS_TAG, "").replace(/^\n/, "");
}

export function enrichCheckin<T extends { mood_label?: string; note?: string | null }>(
  checkin: T,
): T & { mood_labels: string[]; display_note: string } {
  const moodsStr = getCheckinMoods(checkin);
  const moodLabels = moodsStr
    ? moodsStr.split(",").map((s) => s.trim()).filter(Boolean)
    : checkin.mood_label
      ? [checkin.mood_label]
      : [];

  return {
    ...checkin,
    mood_label: moodsStr || checkin.mood_label,
    mood_labels: moodLabels,
    display_note: getCheckinUserNote(checkin.note),
  };
}
