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
import { Loader2, Mic, MicOff, PhoneOff } from 'lucide-react'
import { type BookingDraft, bookingDraftSchema } from '@ordervoice/contracts'

import { useRingback } from '@/hooks/use-ringback'

// Data-channel topic shared with the Python agent worker (agent/agent.py).
const EVENTS_TOPIC = 'alove-events'

export type LiveKitAgentState = 'idle' | 'listening' | 'thinking' | 'speaking'

// Wait this long with no agent in the room before asking for a fresh dispatch.
const REDISPATCH_AFTER_MS = 12_000
const REDISPATCH_MAX_TRIES = 3

type LiveKitCallProps = {
  conversationId: string
  /** Giọng đọc cho cuộc gọi này. undefined = để worker dùng mặc định của nó. */
  ttsProvider?: string | undefined
  /** Upsert a transcript segment into the workspace message list (keyed by id). */
  onTranscript: (segmentId: string, role: 'customer' | 'agent', text: string) => void
  /** Authoritative booking snapshot published by the agent after each turn. */
  onBooking: (booking: BookingDraft) => void
  /** Mirror the worker's listening/thinking/speaking state into the stage orb. */
  onAgentState?: (state: LiveKitAgentState) => void
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
          body: JSON.stringify({
            conversationId: props.conversationId,
            role: 'customer',
            ...(props.ttsProvider ? { ttsProvider: props.ttsProvider } : {}),
          }),
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
  }, [props.conversationId, props.ttsProvider])

  if (error) {
    return (
      <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70" role="alert">
        {error}
      </div>
    )
  }
  if (!connection) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
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
      <RoomBridge
        conversationId={props.conversationId}
        onTranscript={props.onTranscript}
        onBooking={props.onBooking}
        {...(props.onAgentState ? { onAgentState: props.onAgentState } : {})}
        onEnded={props.onEnded}
      />
    </LiveKitRoom>
  )
}

function RoomBridge({
  conversationId,
  onTranscript,
  onBooking,
  onAgentState,
  onEnded,
}: Pick<LiveKitCallProps, 'conversationId' | 'onTranscript' | 'onBooking' | 'onAgentState' | 'onEnded'>) {
  const connectionState = useConnectionState()
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()
  const remoteParticipants = useRemoteParticipants()
  const transcriptions = useTranscriptions()
  const [agentState, setAgentState] = useState<LiveKitAgentState>('idle')
  const redispatchTries = useRef(0)

  // Chuông chờ chạy tới lúc tổng đài viên cất tiếng, không phải lúc vào phòng:
  // agent vào room xong vẫn mất vài giây nạp phiên và nghĩ câu chào, im lặng
  // quãng đó khiến người gọi tưởng máy hỏng.
  const agentHasSpoken = transcriptions.some(
    (seg) => seg.participantInfo?.identity !== localParticipant.identity && seg.text.trim().length > 0,
  )
  useRingback(!agentHasSpoken && agentState !== 'speaking')

  // Self-heal a silent line: the token's agent dispatch is one-shot, so if it
  // fired while no worker was ready nobody ever joins and the caller just hears
  // nothing. Ask for a fresh dispatch a few times while the room has no agent.
  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return
    if (remoteParticipants.length > 0) {
      redispatchTries.current = 0
      return
    }
    const timer = setInterval(() => {
      if (redispatchTries.current >= REDISPATCH_MAX_TRIES) {
        clearInterval(timer)
        return
      }
      redispatchTries.current += 1
      void fetch('/api/livekit/redispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      }).catch(() => {})
    }, REDISPATCH_AFTER_MS)
    return () => clearInterval(timer)
  }, [connectionState, remoteParticipants.length, conversationId])

  // Forward each transcription segment (customer input + agent output) to the
  // workspace. The key MUST stay stable while a segment grows, otherwise every
  // interim update appends a new bubble ("Tôi" → "Tôi muốn" → …). streamInfo.id
  // is not populated by every LiveKit build, so fall back to the segment's index:
  // useTranscriptions keeps a segment at the same index and mutates it in place.
  useEffect(() => {
    transcriptions.forEach((seg, index) => {
      const identity = seg.participantInfo?.identity
      const isLocal = identity === localParticipant.identity
      const id = seg.streamInfo?.id ?? `${identity ?? 'x'}-${index}`
      onTranscript(id, isLocal ? 'customer' : 'agent', seg.text)
    })
  }, [transcriptions, localParticipant.identity, onTranscript])

  useDataChannel(EVENTS_TOPIC, (msg) => {
    try {
      const payload = JSON.parse(new TextDecoder().decode(msg.payload)) as
        | { type: 'booking.update'; booking: BookingDraft }
        | { type: 'agent.state'; state: string }
        | { type: 'call.end' }
      if (payload.type === 'booking.update') {
        // Soi bằng schema thay vì tin vào cast: vé từng hiện ô trống vì agent
        // gửi draft thiếu trường mà phía này nhận im lặng, không ai biết. Sai
        // schema thì vẫn hiển thị — chặn giữa cuộc gọi thật còn tệ hơn — nhưng
        // phải kêu to trong console.
        const parsed = bookingDraftSchema.safeParse(payload.booking)
        if (!parsed.success) {
          console.error('booking.update sai schema', parsed.error.issues, payload.booking)
        }
        onBooking(payload.booking)
      } else if (payload.type === 'agent.state') {
        const s = payload.state.toLowerCase()
        const state: LiveKitAgentState =
          s.includes('speaking') ? 'speaking' : s.includes('thinking') ? 'thinking' : s.includes('listening') ? 'listening' : 'idle'
        setAgentState(state)
        onAgentState?.(state)
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
    <div className="flex flex-wrap items-center justify-center gap-2">
      {isConnecting || !agentJoined ? (
        <span className="inline-flex items-center gap-2 text-xs text-white/50" role="status">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {isConnecting ? 'Đang kết nối…' : 'Đang chờ tổng đài viên AI…'}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 text-sm font-medium text-white/90 transition hover:bg-white/15"
      >
        {isMicrophoneEnabled ? <Mic className="size-4" aria-hidden /> : <MicOff className="size-4 text-[var(--danger)]" aria-hidden />}
        {isMicrophoneEnabled ? 'Tắt mic' : 'Bật mic'}
      </button>
      <button
        type="button"
        onClick={endTurn}
        disabled={!isConnected || agentState === 'speaking' || agentState === 'thinking'}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 text-sm font-medium text-white/90 transition hover:bg-white/15 disabled:opacity-40"
      >
        Tôi nói xong
      </button>
      <button
        type="button"
        onClick={onEnded}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--danger)_55%,transparent)] bg-[color-mix(in_srgb,var(--danger)_22%,transparent)] px-4 text-sm font-medium text-white transition hover:bg-[color-mix(in_srgb,var(--danger)_35%,transparent)]"
      >
        <PhoneOff className="size-4" aria-hidden /> Kết thúc
      </button>
    </div>
  )
}
