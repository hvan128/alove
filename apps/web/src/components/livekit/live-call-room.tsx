'use client'

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useDataChannel,
} from '@livekit/components-react'
import { useCallback, useEffect, useState } from 'react'
import {
  fetchLiveKitAccessDetails,
  type LiveKitEventTransport,
  type LiveKitParticipantRole,
} from '@/lib/call/livekit-adapter'

export type LiveKitConnectionPhase = 'requesting' | 'connecting' | 'connected' | 'disconnected' | 'error'

type Props = {
  sessionCode: string
  role: LiveKitParticipantRole
  displayName: string
  connect: boolean
  microphone: boolean
  transport: LiveKitEventTransport
  onConnectionChange: (phase: LiveKitConnectionPhase, detail?: string) => void
}

export function LiveCallRoom({
  sessionCode,
  role,
  displayName,
  connect,
  microphone,
  transport,
  onConnectionChange,
}: Props) {
  const [access, setAccess] = useState<Awaited<ReturnType<typeof fetchLiveKitAccessDetails>> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!connect) return
    const controller = new AbortController()
    onConnectionChange('requesting')
    void fetchLiveKitAccessDetails({ sessionCode, role, displayName }, fetch, controller.signal)
      .then((details) => {
        setAccess(details)
        onConnectionChange('connecting')
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        const message = reason instanceof Error ? reason.message : 'Không thể kết nối LiveKit.'
        setError(message)
        onConnectionChange('error', message)
      })
    return () => controller.abort()
  }, [connect, displayName, onConnectionChange, role, sessionCode])

  if (!connect) return null
  if (error) return <p className="sr-only" role="alert">{error}</p>
  if (!access) return <p className="sr-only" aria-live="polite">Đang cấp quyền LiveKit</p>

  return (
    <LiveKitRoom
      className="contents"
      serverUrl={access.serverUrl}
      token={access.participantToken}
      connect
      audio={microphone}
      video={false}
      onConnected={() => onConnectionChange('connected')}
      onDisconnected={() => onConnectionChange('disconnected')}
      onError={(roomError) => onConnectionChange('error', roomError.message)}
      onMediaDeviceFailure={() => onConnectionChange('error', 'Không thể mở microphone. Bạn vẫn có thể dùng nội dung text.')}
      options={{ adaptiveStream: true, dynacast: true }}
    >
      <LiveKitDataBridge transport={transport} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  )
}

function LiveKitDataBridge({ transport }: { transport: LiveKitEventTransport }) {
  const handleMessage = useCallback((message: { payload: Uint8Array }) => {
    transport.receivePayload(message.payload)
  }, [transport])
  const { send } = useDataChannel('vedi.events', handleMessage)

  useEffect(() => {
    const publisher = (payload: Uint8Array) => send(payload, { reliable: true })
    void transport.bindPublisher(publisher)
    return () => transport.unbindPublisher(publisher)
  }, [send, transport])

  return null
}
