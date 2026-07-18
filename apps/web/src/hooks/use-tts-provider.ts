import { useCallback, useEffect, useState } from 'react'

export type TtsProvider = 'elevenlabs' | 'google'

const STORAGE_KEY = 'alove.tts'
const DEFAULT_PROVIDER: TtsProvider = 'elevenlabs'

/**
 * Hidden A/B switch for the agent's voice.
 *
 * Deliberately undiscoverable: no label, no tooltip, no visible state. Tapping
 * the operator name toggles it so the voice can be compared on a live call
 * without the person on the other end noticing anything changed. The choice
 * rides the next call's token to the worker, so it takes effect on the call
 * after the toggle, not mid-sentence.
 */
export function useTtsProvider(): { provider: TtsProvider; toggle: () => void } {
  const [provider, setProvider] = useState<TtsProvider>(DEFAULT_PROVIDER)

  // Read after mount only: localStorage is unavailable during SSR, and seeding
  // state from it directly would make server and client markup disagree.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored !== 'elevenlabs' && stored !== 'google') return
    const timer = window.setTimeout(() => setProvider(stored), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const toggle = useCallback(() => {
    setProvider((current) => {
      const next: TtsProvider = current === 'elevenlabs' ? 'google' : 'elevenlabs'
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // riêng tư/hết dung lượng: vẫn đổi cho phiên hiện tại
      }
      return next
    })
  }, [])

  return { provider, toggle }
}
