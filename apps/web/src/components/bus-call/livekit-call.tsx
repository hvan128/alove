'use client'

import { useEffect, useRef, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useDataChannel,
  useLocalParticipant,
  useRemoteParticipants,
  useTranscriptions,
} from '@livekit/components-react'
import { ConnectionState } from 'livekit-client'
import { Loader2, Mic, MicOff, PhoneOff, Wifi, WifiOff } from 'lucide-react'
import type { BookingDraft } from '@ordervoice/contracts'

// Data-channel topic shared with the Python agent worker (agent/agent.py).
const EVENTS_TOPIC = 'vedi-events'

export type LiveKitAgentState = 'idle' | 'listening' | 'thinking' | 'speaking'

type LiveKitCallProps = {
  conversationId: string
  /** Upsert a transcript segment into the workspace message list (keyed by id). */
  onTranscript: (segmentId: string, role: 'customer' | 'agent', text: string) => void
  /** Authoritative booking snapshot published by the agent after each turn. */
  onBooking: (booking: BookingDraft) => void
  onEnded: () => void
}

type TokenResponse = { token: string; serverUrl: string; roomName: string }

/**
 * LiveKit transport for the customer↔agent auto flow. Replaces the in-browser
 * Web Speech path when NEXT_PUBLIC_LIVEKIT_URL is configured: the browser only
 * publishes mic audio + renders the agent's voice; STT/booking/TTS all run in the
 * agent worker. Booking stays deterministic server-side (@ordervoice/core).
 */
export function LiveKitCall(props: LiveKitCallProps) {
  const [connection, setConnection] = useState<TokenResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requested = useRef(false)

  useEffect(() => {
    if (requested.current) return
    requested.current = true
    void (async () => {
      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: props.conversationId, role: 'customer' }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          setError(body.error === 'livekit_not_configured' ? 'LiveKit chưa cấu hình.' : 'Không lấy được token LiveKit.')
          return
        }
        setConnection((await res.json()) as TokenResponse)
      } catch {
        setError('Không kết nối được dịch vụ token.')
      }
    })()
  }, [props.conversationId])

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--hairline)] bg-white px-4 py-3 text-sm text-[var(--muted)]" role="alert">
        {error}
      </div>
    )
  }
  if (!connection) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--hairline)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Đang kết nối LiveKit…
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={connection.token}
      serverUrl={connection.serverUrl}
      connect
      audio
      video={false}
      // Explicit echo cancellation so the mic doesn't re-capture the agent's TTS
      // from the speakers and treat it as the customer talking.
      options={{
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      }}
      onDisconnected={props.onEnded}
    >
      <RoomAudioRenderer />
      <RoomBridge onTranscript={props.onTranscript} onBooking={props.onBooking} onEnded={props.onEnded} />
    </LiveKitRoom>
  )
}

function RoomBridge({
  onTranscript,
  onBooking,
  onEnded,
}: Pick<LiveKitCallProps, 'onTranscript' | 'onBooking' | 'onEnded'>) {
  const connectionState = useConnectionState()
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()
  const remoteParticipants = useRemoteParticipants()
  const transcriptions = useTranscriptions()
  const [agentState, setAgentState] = useState<LiveKitAgentState>('idle')

  // Forward each transcription segment (customer input + agent output) to the
  // workspace, keyed by stream id so streaming updates replace in place.
  useEffect(() => {
    for (const seg of transcriptions) {
      const isLocal = seg.participantInfo?.identity === localParticipant.identity
      const id = seg.streamInfo?.id ?? `${seg.participantInfo?.identity ?? 'x'}-${seg.text.length}`
      onTranscript(id, isLocal ? 'customer' : 'agent', seg.text)
    }
  }, [transcriptions, localParticipant.identity, onTranscript])

  useDataChannel(EVENTS_TOPIC, (msg) => {
    try {
      const payload = JSON.parse(new TextDecoder().decode(msg.payload)) as
        | { type: 'booking.update'; booking: BookingDraft }
        | { type: 'agent.state'; state: string }
        | { type: 'call.end' }
      if (payload.type === 'booking.update') {
        onBooking(payload.booking)
      } else if (payload.type === 'agent.state') {
        const s = payload.state.toLowerCase()
        setAgentState(
          s.includes('speaking') ? 'speaking' : s.includes('thinking') ? 'thinking' : s.includes('listening') ? 'listening' : 'idle',
        )
      } else if (payload.type === 'call.end') {
        onEnded()
      }
    } catch {
      // ignore malformed events
    }
  })

  const isConnected = connectionState === ConnectionState.Connected
  const isConnecting =
    connectionState === ConnectionState.Connecting || connectionState === ConnectionState.Reconnecting
  const agentJoined = remoteParticipants.length > 0

  function endTurn() {
    void localParticipant
      .publishData(new TextEncoder().encode(JSON.stringify({ type: 'user.end_turn' })), {
        topic: EVENTS_TOPIC,
        reliable: true,
      })
      .catch(() => {})
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge isConnecting={isConnecting} isConnected={isConnected} agentJoined={agentJoined} agentState={agentState} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--hairline)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface)]"
        >
          {isMicrophoneEnabled ? <Mic className="size-4" aria-hidden /> : <MicOff className="size-4 text-[var(--danger,#c0392b)]" aria-hidden />}
          {isMicrophoneEnabled ? 'Tắt mic' : 'Bật mic'}
        </button>
        <button
          type="button"
          onClick={endTurn}
          disabled={!isConnected || agentState === 'speaking' || agentState === 'thinking'}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--hairline)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-50"
        >
          Tôi nói xong
        </button>
        <button
          type="button"
          onClick={onEnded}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--hairline)] bg-white px-3 py-2 text-sm font-medium text-[var(--danger,#c0392b)] hover:bg-[var(--surface)]"
        >
          <PhoneOff className="size-4" aria-hidden /> Kết thúc
        </button>
      </div>
    </div>
  )
}

function StatusBadge({
  isConnecting,
  isConnected,
  agentJoined,
  agentState,
}: {
  isConnecting: boolean
  isConnected: boolean
  agentJoined: boolean
  agentState: LiveKitAgentState
}) {
  const base = 'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium'
  if (isConnecting) {
    return (
      <span className={`${base} bg-[var(--surface)] text-[var(--muted)]`}>
        <Loader2 className="size-3 animate-spin" aria-hidden /> Đang kết nối
      </span>
    )
  }
  if (!isConnected) {
    return (
      <span className={`${base} bg-[var(--surface)] text-[var(--danger,#c0392b)]`}>
        <WifiOff className="size-3" aria-hidden /> Mất kết nối
      </span>
    )
  }
  if (!agentJoined) {
    return (
      <span className={`${base} bg-[var(--surface)] text-[var(--muted)]`}>
        <Loader2 className="size-3 animate-spin" aria-hidden /> Đang chờ tổng đài viên AI
      </span>
    )
  }
  const label =
    agentState === 'speaking' ? 'AI đang nói' : agentState === 'thinking' ? 'AI đang xử lý' : 'AI đang nghe'
  return (
    <span className={`${base} bg-[var(--surface)] text-[var(--ink)]`}>
      <Wifi className="size-3" aria-hidden /> {label}
    </span>
  )
}
