'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useDataChannel,
  useLocalParticipant,
  useRemoteParticipants,
  useTranscriptions,
} from '@livekit/components-react'
import { ConnectionState, ParticipantKind } from 'livekit-client'
import { Loader2, PhoneOff, RotateCcw } from 'lucide-react'
import { z } from 'zod'

import {
  agentEventSchema,
  MAX_REALTIME_EVENT_BYTES,
  type AgentEvent,
  type BookingSnapshot,
  type CallRole,
  type SemanticAnnotation,
} from '@/lib/call-contract'
import { useRingback } from '@/hooks/use-ringback'
import { CallControlDock } from './call-control-dock'

const EVENTS_TOPIC = 'alove-events'
const TRANSCRIPTION_SEGMENT_ATTRIBUTE = 'lk.segment_id'
const TRANSCRIPTION_FINAL_ATTRIBUTE = 'lk.transcription_final'

const REDISPATCH_AFTER_MS = 12_000
const REDISPATCH_MAX_TRIES = 3
const GIVE_UP_AFTER_MS = REDISPATCH_AFTER_MS * (REDISPATCH_MAX_TRIES + 1)

const tokenResponseSchema = z.object({
  token: z.string().min(1),
  sessionToken: z.string().min(1),
  conversationId: z.string().uuid(),
  serverUrl: z.string().min(1),
  roomName: z.string().min(1),
})

type TokenResponse = z.infer<typeof tokenResponseSchema>

export type LiveKitAgentState = 'idle' | 'listening' | 'thinking' | 'speaking'

export type LiveKitSession = {
  attemptId: number
  conversationId: string
}

export type LiveTranscriptUpdate = {
  callId: string
  segmentId: string
  role: CallRole
  text: string
  final: boolean
}

type LiveKitCallProps = {
  attemptId: number
  onSessionStarted: (session: LiveKitSession) => void
  onTranscript: (update: LiveTranscriptUpdate) => void
  onBooking: (booking: BookingSnapshot) => void
  onSemanticAnnotation: (callId: string, annotation: SemanticAnnotation) => void
  onAgentState?: (callId: string, state: LiveKitAgentState) => void
  onRetry?: () => void
  onEnded: (callId: string) => void
}

type IncomingDataMessage = {
  payload: Uint8Array
  from?: { kind: ParticipantKind }
}

/**
 * LiveKit-only customer transport. The token endpoint creates the call ID,
 * participant identity and signed redispatch session; the browser chooses none
 * of those values.
 */
export function LiveKitCall({
  attemptId,
  onSessionStarted,
  onTranscript,
  onBooking,
  onSemanticAnnotation,
  onAgentState,
  onRetry,
  onEnded,
}: LiveKitCallProps) {
  const [connection, setConnection] = useState<TokenResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const suppressDisconnectRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    void (async () => {
      try {
        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          signal: controller.signal,
        })
        const body = await response.json().catch(() => null)
        if (!active) return
        if (!response.ok) {
          setError(tokenErrorMessage(response.status, body))
          return
        }

        const parsed = tokenResponseSchema.safeParse(body)
        if (!parsed.success) {
          setError('Dịch vụ cuộc gọi trả về dữ liệu không hợp lệ.')
          return
        }

        onSessionStarted({ attemptId, conversationId: parsed.data.conversationId })
        setConnection(parsed.data)
      } catch (caught) {
        if (!active || isAbortError(caught)) return
        setError('Không kết nối được dịch vụ cuộc gọi.')
      }
    })()

    return () => {
      active = false
      controller.abort()
    }
  }, [attemptId, onSessionStarted])

  if (error) {
    return <CallError message={error} onRetry={onRetry} />
  }
  if (!connection) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Đang tạo phiên gọi an toàn…
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
      options={{
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      }}
      onError={() => {
        suppressDisconnectRef.current = true
        setError('Kết nối phòng gọi gặp sự cố. Vui lòng thử lại.')
      }}
      onMediaDeviceFailure={() => {
        suppressDisconnectRef.current = true
        setError('Không thể truy cập microphone. Hãy cấp quyền microphone rồi thử lại.')
      }}
      onDisconnected={() => {
        if (!suppressDisconnectRef.current) onEnded(connection.conversationId)
      }}
    >
      <RoomAudioRenderer />
      <RoomBridge
        conversationId={connection.conversationId}
        sessionToken={connection.sessionToken}
        onTranscript={onTranscript}
        onBooking={onBooking}
        onSemanticAnnotation={onSemanticAnnotation}
        {...(onAgentState ? { onAgentState } : {})}
        {...(onRetry ? { onRetry } : {})}
        onEnded={onEnded}
      />
    </LiveKitRoom>
  )
}

function RoomBridge({
  conversationId,
  sessionToken,
  onTranscript,
  onBooking,
  onSemanticAnnotation,
  onAgentState,
  onRetry,
  onEnded,
}: Omit<LiveKitCallProps, 'attemptId' | 'onSessionStarted'> & {
  conversationId: string
  sessionToken: string
}) {
  const connectionState = useConnectionState()
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()
  const remoteParticipants = useRemoteParticipants()
  const transcriptions = useTranscriptions()
  const [agentState, setAgentState] = useState<LiveKitAgentState>('idle')
  const [gaveUp, setGaveUp] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const redispatchTries = useRef(0)
  const lastEventSequence = useRef(0)
  const forwardedTranscripts = useRef(new Map<string, string>())

  const agentParticipants = useMemo(
    () => remoteParticipants.filter((participant) => participant.kind === ParticipantKind.AGENT),
    [remoteParticipants],
  )
  const agentIdentities = useMemo(
    () => new Set(agentParticipants.map((participant) => participant.identity)),
    [agentParticipants],
  )
  const agentJoined = agentParticipants.length > 0
  const isConnected = connectionState === ConnectionState.Connected
  const isConnecting =
    connectionState === ConnectionState.Connecting
    || connectionState === ConnectionState.Reconnecting
    || connectionState === ConnectionState.SignalReconnecting
  const agentHasSpoken = transcriptions.some(
    (segment) => agentIdentities.has(segment.participantInfo.identity) && segment.text.trim().length > 0,
  )

  useRingback(isConnected && !gaveUp && !agentHasSpoken && agentState !== 'speaking')

  useEffect(() => {
    if (!isConnected || agentJoined) return
    const timer = window.setTimeout(() => setGaveUp(true), GIVE_UP_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [agentJoined, isConnected])

  useEffect(() => {
    if (agentJoined) redispatchTries.current = 0
  }, [agentJoined])

  useEffect(() => {
    if (!isConnected || agentJoined) return
    const controller = new AbortController()
    const timer = window.setInterval(() => {
      if (redispatchTries.current >= REDISPATCH_MAX_TRIES) {
        window.clearInterval(timer)
        return
      }
      redispatchTries.current += 1
      void fetch('/api/livekit/redispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
        signal: controller.signal,
      }).then((response) => {
        if (response.status === 401 || response.status === 429) setGaveUp(true)
      }).catch((caught) => {
        if (!isAbortError(caught)) return
      })
    }, REDISPATCH_AFTER_MS)
    return () => {
      window.clearInterval(timer)
      controller.abort()
    }
  }, [agentJoined, isConnected, sessionToken])

  useEffect(() => {
    for (const segment of transcriptions) {
      const identity = segment.participantInfo.identity
      const isLocal = identity === localParticipant.identity
      if (!isLocal && !agentIdentities.has(identity)) continue

      const text = segment.text.trim()
      if (!text) continue
      const attributes = segment.streamInfo.attributes
      const segmentId = attributes?.[TRANSCRIPTION_SEGMENT_ATTRIBUTE] ?? segment.streamInfo.id
      const final = attributes?.[TRANSCRIPTION_FINAL_ATTRIBUTE] === 'true'
      const role: CallRole = isLocal ? 'customer' : 'agent'
      const transcriptKey = `${role}:${segmentId}`
      const fingerprint = `${text}\u0000${String(final)}`
      if (forwardedTranscripts.current.get(transcriptKey) === fingerprint) continue
      forwardedTranscripts.current.set(transcriptKey, fingerprint)
      onTranscript({ callId: conversationId, segmentId, role, text, final })
    }
  }, [agentIdentities, conversationId, localParticipant.identity, onTranscript, transcriptions])

  const handleAgentEvent = useCallback((message: IncomingDataMessage) => {
    const event = parseAgentEventMessage({
      payload: message.payload,
      senderKind: message.from?.kind,
      expectedCallId: conversationId,
      lastSequence: lastEventSequence.current,
    })
    if (!event) return

    lastEventSequence.current = event.sequence
    if (event.type === 'booking.update') {
      onBooking(event.booking)
      return
    }
    if (event.type === 'agent.state') {
      setAgentState(event.state)
      onAgentState?.(conversationId, event.state)
      return
    }
    if (event.type === 'semantic.annotation') {
      onSemanticAnnotation(conversationId, {
        timestamp: event.timestamp,
        sourceTranscript: event.sourceTranscript,
        ...(event.correctedText ? { correctedText: event.correctedText } : {}),
        tags: event.tags,
        annotations: event.annotations,
      })
      return
    }
    onEnded(conversationId)
  }, [conversationId, onAgentState, onBooking, onEnded, onSemanticAnnotation])

  useDataChannel(EVENTS_TOPIC, handleAgentEvent)

  const toggleMicrophone = useCallback(async () => {
    setMicError(null)
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
    } catch {
      setMicError('Không thể thay đổi microphone. Hãy kiểm tra quyền và thiết bị đầu vào.')
    }
  }, [isMicrophoneEnabled, localParticipant])

  const endTurn = useCallback(async () => {
    try {
      await localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: 'user.end_turn' })),
        { topic: EVENTS_TOPIC, reliable: true },
      )
    } catch {
      // Reconnect state already tells the caller delivery is unavailable.
    }
  }, [localParticipant])

  const endCall = useCallback(async () => {
    try {
      await localParticipant.setMicrophoneEnabled(false)
    } catch {
      // LiveKitRoom teardown still stops the local track.
    } finally {
      onEnded(conversationId)
    }
  }, [conversationId, localParticipant, onEnded])

  const retryCall = useCallback(async () => {
    try {
      await localParticipant.setMicrophoneEnabled(false)
    } catch {
      // LiveKitRoom teardown still stops the local track.
    } finally {
      onRetry?.()
    }
  }, [localParticipant, onRetry])

  if (gaveUp && !agentJoined) {
    return (
      <div className="flex flex-col items-center gap-3 text-center" role="alert">
        <p className="text-sm text-white/80">
          Tổng đài đang bận, chưa có ai bắt máy. Anh chị thử gọi lại giúp em ạ.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry ? (
            <button
              type="button"
              onClick={() => void retryCall()}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--action)] px-4 text-sm font-medium text-[var(--on-action)] transition hover:bg-[var(--action-hover)]"
            >
              <RotateCcw className="size-4" aria-hidden /> Gọi lại
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void endCall()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 text-sm font-medium text-white/90 transition hover:bg-white/15"
          >
            <PhoneOff className="size-4" aria-hidden /> Đóng
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {isConnecting || !agentJoined ? (
        <span className="inline-flex items-center gap-2 text-xs text-white/50" role="status">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {isConnecting ? 'Đang kết nối…' : 'Đang chờ tổng đài viên AI…'}
        </span>
      ) : null}
      <CallControlDock
        connected={isConnected}
        microphoneEnabled={isMicrophoneEnabled}
        busy={agentState === 'speaking' || agentState === 'thinking'}
        micError={micError}
        onToggleMicrophone={() => void toggleMicrophone()}
        onEndTurn={() => void endTurn()}
        onEndCall={() => void endCall()}
      />
    </div>
  )
}

export function parseAgentEventMessage({
  payload,
  senderKind,
  expectedCallId,
  lastSequence,
}: {
  payload: Uint8Array
  senderKind: ParticipantKind | undefined
  expectedCallId: string
  lastSequence: number
}): AgentEvent | null {
  if (senderKind !== ParticipantKind.AGENT) return null
  if (payload.byteLength > MAX_REALTIME_EVENT_BYTES) return null
  try {
    const decoded: unknown = JSON.parse(new TextDecoder().decode(payload))
    const parsed = agentEventSchema.safeParse(decoded)
    if (!parsed.success) return null
    const event = parsed.data
    if (event.callId !== expectedCallId || event.sequence <= lastSequence) return null
    if (event.type === 'booking.update' && event.booking.conversationId !== expectedCallId) return null
    return event
  } catch {
    return null
  }
}

function CallError({ message, onRetry }: { message: string; onRetry: (() => void) | undefined }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center" role="alert">
      <p className="text-sm text-white/75">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--action)] px-4 text-sm font-medium text-[var(--on-action)]"
        >
          <RotateCcw className="size-4" aria-hidden /> Thử lại
        </button>
      ) : null}
    </div>
  )
}

function tokenErrorMessage(status: number, body: unknown): string {
  const code = z.object({ error: z.string().optional() }).safeParse(body)
  if (code.success && code.data.error === 'livekit_not_configured') return 'Dịch vụ cuộc gọi chưa được cấu hình.'
  if (status === 429) return 'Có quá nhiều yêu cầu gọi. Vui lòng chờ một lúc rồi thử lại.'
  return 'Không tạo được phiên gọi an toàn.'
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
