'use client'

import { Mic, MicOff, PhoneOff } from 'lucide-react'

type CallControlDockProps = {
  connected: boolean
  microphoneEnabled: boolean
  busy?: boolean
  micError?: string | null
  onToggleMicrophone: () => void
  onEndTurn: () => void
  onEndCall: () => void
}

/** Transport controls shared by the real LiveKit call and read-only landing previews. */
export function CallControlDock({
  connected,
  microphoneEnabled,
  busy = false,
  micError,
  onToggleMicrophone,
  onEndTurn,
  onEndCall,
}: CallControlDockProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onToggleMicrophone}
          disabled={!connected}
          aria-describedby={micError ? 'livekit-mic-error' : undefined}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 text-sm font-medium text-white/90 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {microphoneEnabled ? <Mic className="size-4" aria-hidden /> : <MicOff className="size-4 text-[var(--danger)]" aria-hidden />}
          {microphoneEnabled ? 'Tắt mic' : 'Bật mic'}
        </button>
        <button
          type="button"
          onClick={onEndTurn}
          disabled={!connected || busy}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 text-sm font-medium text-white/90 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Tôi nói xong
        </button>
        <button
          type="button"
          onClick={onEndCall}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--danger)_55%,transparent)] bg-[color-mix(in_srgb,var(--danger)_22%,transparent)] px-4 text-sm font-medium text-white transition hover:bg-[color-mix(in_srgb,var(--danger)_35%,transparent)]"
        >
          <PhoneOff className="size-4" aria-hidden /> Kết thúc
        </button>
      </div>
      {micError ? (
        <p id="livekit-mic-error" className="text-center text-xs text-[var(--danger)]" role="alert">
          {micError}
        </p>
      ) : null}
    </>
  )
}
