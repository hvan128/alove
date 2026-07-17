'use client'

import type { RoomEvent } from '@ordervoice/contracts'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CallEventTransport } from '@/lib/call/demo-channel'
import { LiveKitEventTransport } from '@/lib/call/livekit-adapter'
import type { PublicIntegrationStatus } from '@/lib/livekit/server'
import { useCallSession } from '@/hooks/use-call-session'
import { speakVietnamese } from '@/lib/device-speech'
import type { LiveKitConnectionPhase } from '@/components/livekit/live-call-room'
import { AssistantRail } from './assistant-rail'
import { BookingForm } from './booking-form'
import { CallToolbar } from './call-toolbar'
import { LiveTranscript } from './live-transcript'

const LiveCallRoom = dynamic(
  () => import('@/components/livekit/live-call-room').then((module) => module.LiveCallRoom),
  { ssr: false },
)

type Props = {
  sessionCode: string
  integrationStatus: PublicIntegrationStatus
  transportFactory?: (sessionCode: string) => CallEventTransport
}

export function StaffWorkspace({ sessionCode, integrationStatus, transportFactory }: Props) {
  const [microphone, setMicrophone] = useState(false)
  const liveTransport = useMemo(
    () => integrationStatus.livekit ? new LiveKitEventTransport(sessionCode) : null,
    [integrationStatus.livekit, sessionCode],
  )
  const effectiveFactory = useMemo(() => {
    if (transportFactory) return transportFactory
    if (liveTransport) return () => liveTransport
    return undefined
  }, [liveTransport, transportFactory])
  const session = useCallSession({
    sessionCode,
    role: 'staff',
    transport: integrationStatus.livekit ? 'livekit' : 'local',
    ...(effectiveFactory ? { transportFactory: effectiveFactory } : {}),
  })
  const handledCaller = useRef<string | null>(null)
  const { state, sendEvent, receiveEvent, setPreferences, sendStaffSpeech, endCall, editField, confirmBooking } = session
  const { messages, mode, suggestion, transcriptLanguage } = state

  useEffect(() => {
    if (mode !== 'auto') return
    const lastCaller = [...messages].reverse().find((message) => message.role === 'caller')
    if (!lastCaller || handledCaller.current === lastCaller.id) return
    handledCaller.current = lastCaller.id
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`
    const event: RoomEvent = {
      version: 1,
      eventId: `event-agent-${id}`,
      sessionCode,
      occurredAt: new Date().toISOString(),
      type: 'transcript.final',
      message: {
        id: `message-agent-${id}`,
        role: 'agent',
        text: suggestion.text,
        language: 'vi',
        translations: {},
        confidence: 1,
        startedAtMs: 0,
        endedAtMs: 0,
        channel: 'text',
      },
    }
    sendEvent(event)
    speakVietnamese(suggestion.text)
  }, [messages, mode, sendEvent, sessionCode, suggestion.text])

  const changeMode = (mode: 'human' | 'auto') => {
    if (mode === 'auto') {
      handledCaller.current = [...messages].reverse().find((message) => message.role === 'caller')?.id ?? null
    }
    setPreferences(mode, transcriptLanguage)
  }

  const speakSuggestion = () => {
    sendStaffSpeech(suggestion.text)
    speakVietnamese(suggestion.text)
  }

  const sendCustomReply = (text: string) => {
    sendStaffSpeech(text)
    speakVietnamese(text)
  }

  const handleLiveKitPhase = useCallback((phase: LiveKitConnectionPhase, detail?: string) => {
    receiveEvent({
      version: 1,
      eventId: `staff-livekit-${phase}-${Date.now()}`,
      sessionCode,
      occurredAt: new Date().toISOString(),
      type: 'session.status',
      transport: 'livekit',
      state: phase === 'connected' ? 'connected' : phase === 'error' ? 'error' : phase === 'disconnected' ? 'ended' : 'connecting',
      callerPresent: false,
      valsea: integrationStatus.valsea ? (phase === 'connected' ? 'connecting' : 'unconfigured') : 'unconfigured',
      agent: integrationStatus.voiceAgent ? (phase === 'connected' ? 'dispatching' : 'unconfigured') : 'unconfigured',
      detail: detail ?? null,
    })
  }, [integrationStatus.valsea, integrationStatus.voiceAgent, receiveEvent, sessionCode])

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <CallToolbar
        sessionCode={sessionCode}
        state={state}
        integrationStatus={integrationStatus}
        onModeChange={changeMode}
        onLanguageChange={(language) => setPreferences(mode, language)}
        microphone={microphone}
        onMicrophoneChange={setMicrophone}
        onEndCall={endCall}
      />
      <main className="mx-auto grid max-w-[1720px] grid-cols-1 gap-4 px-4 py-4 sm:px-6 xl:grid-cols-[minmax(300px,0.82fr)_minmax(520px,1.38fr)_minmax(280px,0.72fr)] xl:items-start">
        <LiveTranscript
          messages={messages}
          partial={state.partial}
          transcriptLanguage={transcriptLanguage}
        />
        <BookingForm booking={state.booking} onEdit={editField} />
        <AssistantRail
          state={state}
          onSpeakSuggestion={speakSuggestion}
          onSendCustomReply={sendCustomReply}
          onConfirm={confirmBooking}
        />
      </main>
      {!integrationStatus.livekit ? (
        <div className="fixed bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-[10px] border border-[var(--hairline)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3 py-2 text-center text-[11px] text-[var(--muted)] shadow-sm backdrop-blur-xl">
          Mô phỏng chỉ đồng bộ giữa các tab cùng trình duyệt. Hai thiết bị cần LiveKit.
        </div>
      ) : null}
      {integrationStatus.livekit && liveTransport ? (
        <LiveCallRoom
          sessionCode={sessionCode}
          role="staff"
          displayName="Nhân viên VéĐi"
          connect
          microphone={microphone}
          transport={liveTransport}
          onConnectionChange={handleLiveKitPhase}
        />
      ) : null}
    </div>
  )
}
