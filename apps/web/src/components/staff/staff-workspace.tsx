'use client'

import type { RoomEvent } from '@ordervoice/contracts'
import { useEffect, useRef } from 'react'
import type { CallEventTransport } from '@/lib/call/demo-channel'
import type { PublicIntegrationStatus } from '@/lib/livekit/server'
import { useCallSession } from '@/hooks/use-call-session'
import { speakVietnamese } from '@/lib/device-speech'
import { AssistantRail } from './assistant-rail'
import { BookingForm } from './booking-form'
import { CallToolbar } from './call-toolbar'
import { LiveTranscript } from './live-transcript'

type Props = {
  sessionCode: string
  integrationStatus: PublicIntegrationStatus
  transportFactory?: (sessionCode: string) => CallEventTransport
}

export function StaffWorkspace({ sessionCode, integrationStatus, transportFactory }: Props) {
  const session = useCallSession({
    sessionCode,
    role: 'staff',
    transport: integrationStatus.livekit ? 'livekit' : 'local',
    ...(transportFactory ? { transportFactory } : {}),
  })
  const handledCaller = useRef<string | null>(null)
  const { state, sendEvent, setPreferences, sendStaffSpeech, endCall, editField, confirmBooking } = session
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

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <CallToolbar
        sessionCode={sessionCode}
        state={state}
        integrationStatus={integrationStatus}
        onModeChange={changeMode}
        onLanguageChange={(language) => setPreferences(mode, language)}
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
    </div>
  )
}
