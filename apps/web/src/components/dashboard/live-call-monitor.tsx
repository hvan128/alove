'use client'

import { useEffect, useRef, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useTranscriptions,
} from '@livekit/components-react'
import { ConnectionState } from 'livekit-client'
import { Loader2, Radio } from 'lucide-react'

import { TranscriptBubbles } from '@/components/dashboard/transcript-bubbles'

type TokenResponse = { token: string; serverUrl: string; roomName: string }

/**
 * Read-only monitor for an in-progress call: joins the room with an observer
 * token (subscribe-only — the staff member can hear but never speaks or sends
 * data) and mirrors live captions. Booking state lives in the sidebar, fed from
 * Neon snapshots on the 5s refresh, so it is never shown twice.
 */
export function LiveCallMonitor({ conversationId }: { conversationId: string }) {
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
          body: JSON.stringify({ conversationId, role: 'observer' }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          setError(
            body.error === 'livekit_not_configured'
              ? 'LiveKit chưa cấu hình — chỉ hiển thị lịch sử đã lưu.'
              : 'Không lấy được token giám sát.',
          )
          return
        }
        setConnection((await res.json()) as TokenResponse)
      } catch {
        setError('Không kết nối được dịch vụ token.')
      }
    })()
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
    >
      <RoomAudioRenderer />
      <MonitorBridge />
    </LiveKitRoom>
  )
}

function MonitorBridge() {
  const connectionState = useConnectionState()
  const transcriptions = useTranscriptions()
  const connected = connectionState === ConnectionState.Connected

  const turns = transcriptions.map((seg, index) => {
    const identity = seg.participantInfo?.identity ?? ''
    const isAgent = identity.startsWith('agent') || identity === ''
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
