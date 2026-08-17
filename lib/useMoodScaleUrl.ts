'use client'

import { useEffect, useState } from 'react'
import { getMoodScaleUrl } from '@/lib/moodscaleUrl'

/** Client hook — prefers SSO return origin over build-time env. */
export function useMoodScaleUrl(): string {
  const [url, setUrl] = useState(getMoodScaleUrl)

  useEffect(() => {
    setUrl(getMoodScaleUrl())
  }, [])

  return url
}
