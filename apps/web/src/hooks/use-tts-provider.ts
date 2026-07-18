import { useCallback, useEffect, useState } from 'react'

export type TtsProvider = 'elevenlabs' | 'google'

const STORAGE_KEY = 'alove.tts'

/**
 * Hidden A/B switch for the agent's voice.
 *
 * Deliberately undiscoverable: no label, no tooltip, no visible state. Tapping
 * the operator name toggles it so the voice can be compared on a live call
 * without the person on the other end noticing anything changed. The choice
 * rides the next call's token to the worker, so it takes effect on the call
 * after the toggle, not mid-sentence.
 */
export function useTtsProvider(): { provider: TtsProvider | undefined; toggle: () => void } {
  // undefined = chưa từng bấm công tắc, để worker dùng mặc định của nó (TTS_DEFAULT).
  // Gửi cứng một giá trị từ client sẽ đè lên cấu hình server và làm việc đổi
  // giọng bằng env trở nên vô tác dụng.
  const [provider, setProvider] = useState<TtsProvider | undefined>(undefined)

  // Read after mount only: localStorage is unavailable during SSR, and seeding
  // state from it directly would make server and client markup disagree.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'elevenlabs' || stored === 'google') setProvider(stored)
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
