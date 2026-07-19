'use client'

import { Pause, Play } from 'lucide-react'
import { useRef, useState } from 'react'

const SAMPLE_AUDIO_SRC = '/audio/voice_booking.mp3'

export function HeroCallSample() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [hasError, setHasError] = useState(false)

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (!audio) return

    setHasError(false)

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      return
    }

    try {
      await audio.play()
      setHasStarted(true)
      setIsPlaying(true)
    } catch {
      setIsPlaying(false)
      setHasError(true)
    }
  }

  const visibleLabel = hasError
    ? 'Thử phát lại'
    : isPlaying
      ? 'Tạm dừng cuộc gọi'
      : hasStarted
        ? 'Tiếp tục cuộc gọi'
        : 'Nghe thử cuộc gọi AI'
  const accessibleLabel = hasError
    ? 'Thử phát lại cuộc gọi với AI'
    : isPlaying
      ? 'Tạm dừng cuộc gọi mẫu với AI'
      : hasStarted
        ? 'Tiếp tục nghe cuộc gọi với AI'
        : 'Nghe thử cuộc gọi với AI'

  return (
    <>
      <button
        type="button"
        aria-label={accessibleLabel}
        aria-pressed={isPlaying}
        className="inline-flex min-h-12 min-w-48 touch-manipulation items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/75 px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-white hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        onClick={togglePlayback}
      >
        {isPlaying ? <Pause size={17} aria-hidden /> : <Play size={17} aria-hidden />}
        {visibleLabel}
      </button>

      <audio
        ref={audioRef}
        src={SAMPLE_AUDIO_SRC}
        preload="metadata"
        onPause={() => setIsPlaying(false)}
        onEnded={(event) => {
          event.currentTarget.currentTime = 0
          setHasStarted(false)
          setIsPlaying(false)
        }}
        onError={() => {
          setIsPlaying(false)
          setHasError(true)
        }}
      >
        Trình duyệt của bạn không hỗ trợ phát audio.
      </audio>

      <span className="sr-only" role="status" aria-live="polite">
        {hasError ? 'Không thể phát audio. Bấm thử phát lại.' : ''}
      </span>
    </>
  )
}
