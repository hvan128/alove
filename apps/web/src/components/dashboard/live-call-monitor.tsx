'use client'

import { useEffect, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useRemoteParticipants,
  useTranscriptions,
} from '@livekit/components-react'
import { ConnectionState, ParticipantKind } from 'livekit-client'
import { Loader2, Radio } from 'lucide-react'
import { z } from 'zod'

import { TranscriptBubbles } from '@/components/dashboard/transcript-bubbles'

const tokenResponseSchema = z.object({
  token: z.string().min(1),
  serverUrl: z.string().min(1),
  roomName: z.string().min(1),
})

type TokenResponse = z.infer<typeof tokenResponseSchema>

/**
 * Read-only monitor for an in-progress call: joins the room with an observer
 * token (subscribe-only — the staff member can hear but never speaks or sends
 * data) and mirrors live captions. Booking state lives in the sidebar, fed from
 * Neon snapshots on the 5s refresh, so it is never shown twice.
 */
export function LiveCallMonitor({ conversationId }: { conversationId: string }) {
  const [connection, setConnection] = useState<TokenResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    void (async () => {
      try {
        const res = await fetch('/api/livekit/observer-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId }),
          signal: controller.signal,
        })
        if (!active) return
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          setError(
            body.error === 'livekit_not_configured'
              ? 'LiveKit chưa cấu hình — chỉ hiển thị lịch sử đã lưu.'
              : 'Không lấy được token giám sát.',
          )
          return
        }
        const parsed = tokenResponseSchema.safeParse(await res.json().catch(() => null))
        if (!parsed.success) {
          setError('Dịch vụ token trả về dữ liệu không hợp lệ.')
          return
        }
        setConnection(parsed.data)
      } catch (caught) {
        if (!active || (caught instanceof DOMException && caught.name === 'AbortError')) return
        setError('Không kết nối được dịch vụ token.')
      }
    })()
    return () => {
      active = false
      controller.abort()
    }
  }, [conversationId])

  if (error) {
    return <p className="text-sm text-[var(--muted)]" role="status">{error}</p>
  }
  if (!connection) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Đang kết nối phòng giám sát…
      </p>
    )
  }

  return (
    <LiveKitRoom
      token={connection.token}
      serverUrl={connection.serverUrl}
      connect
      audio={false}
      video={false}
      onError={() => setError('Kết nối phòng giám sát gặp sự cố.')}
    >
      <RoomAudioRenderer />
      <MonitorBridge />
    </LiveKitRoom>
  )
}

function MonitorBridge() {
  const connectionState = useConnectionState()
  const remoteParticipants = useRemoteParticipants()
  const transcriptions = useTranscriptions()
  const connected = connectionState === ConnectionState.Connected
  const participantKinds = new Map(
    remoteParticipants.map((participant) => [participant.identity, participant.kind]),
  )

  const turns = transcriptions.map((seg, index) => {
    const identity = seg.participantInfo?.identity ?? ''
    const isAgent = participantKinds.get(identity) === ParticipantKind.AGENT
    return {
      id: seg.streamInfo?.id ?? index,
      role: isAgent ? ('agent' as const) : ('customer' as const),
      text: seg.text,
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <span
        className={
          connected
            ? 'inline-flex w-fit items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,var(--surface))] px-2.5 py-1 text-xs font-semibold text-[var(--success)]'
            : 'inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--pearl)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]'
        }
      >
        {connected ? (
          <>
            <Radio className="size-3" aria-hidden /> Đang nghe trực tiếp
          </>
        ) : (
          <>
            <Loader2 className="size-3 animate-spin" aria-hidden /> Đang kết nối
          </>
        )}
      </span>

      {turns.length > 0 ? (
        <TranscriptBubbles turns={turns} label="Caption trực tiếp" />
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Chưa có caption trực tiếp — transcript đã lưu hiển thị bên dưới.
        </p>
      )}
    </div>
  )
}
