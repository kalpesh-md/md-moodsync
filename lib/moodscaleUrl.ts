const MOODSCALE_RETURN_ORIGIN_KEY = 'moodscale_return_origin'

const DEFAULT_MOODSCALE_URL =
  process.env.NEXT_PUBLIC_MOODSCALE_URL?.replace(/\/$/, '') ||
  'https://moodscale.in'

/** Persist MoodScale origin from SSO launch (e.g. https://test.moodscale.in). */
export function storeMoodScaleReturnUrl(returnUrl: string | null | undefined) {
  if (!returnUrl || typeof window === 'undefined') return
  try {
    const origin = new URL(returnUrl).origin
    localStorage.setItem(MOODSCALE_RETURN_ORIGIN_KEY, origin)
  } catch {
    // ignore malformed URLs
  }
}

export function getMoodScaleUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(MOODSCALE_RETURN_ORIGIN_KEY)
    if (stored) return stored.replace(/\/$/, '')
  }
  return DEFAULT_MOODSCALE_URL
}
