'use client'

import type { OperatorRole, RoomEvent, TripSeat } from '@ordervoice/contracts'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CallEventTransport } from '@/lib/call/demo-channel'
import { LiveKitEventTransport } from '@/lib/call/livekit-adapter'
import type { PublicIntegrationStatus } from '@/lib/livekit/server'
import { useCallSession } from '@/hooks/use-call-session'
import type { LiveKitConnectionPhase } from '@/components/livekit/live-call-room'
import { AssistantRail } from './assistant-rail'
import { BookingForm } from './booking-form'
import { CallToolbar } from './call-toolbar'
import { LiveTranscript } from './live-transcript'
import { SeatPicker } from './seat-picker'

const LiveCallRoom = dynamic(
  () => import('@/components/livekit/live-call-room').then((module) => module.LiveCallRoom),
  { ssr: false },
)

type Props = {
  sessionCode: string
  integrationStatus: PublicIntegrationStatus
  transportFactory?: (sessionCode: string) => CallEventTransport
  actorRole?: OperatorRole | undefined
}

export function StaffWorkspace({ sessionCode, integrationStatus, transportFactory, actorRole }: Props) {
  const [microphone, setMicrophone] = useState(false)
  const [inventoryState, setInventory] = useState<{ tripId: string; revision: number; seats: TripSeat[] } | null>(null)
  const [inventoryError, setInventoryError] = useState<string | null>(null)
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
    persistence: integrationStatus.persistence,
    valseaEnabled: integrationStatus.valsea,
    voiceAgentEnabled: integrationStatus.voiceAgent,
    ...(integrationStatus.operatorDemo ? { catalogVersionId: 'demo-catalog-v1' } : {}),
    ...(effectiveFactory ? { transportFactory: effectiveFactory } : {}),
  })
  const handledCaller = useRef<string | null>(null)
  const { state, seatHold, sendEvent, receiveEvent, setPreferences, sendStaffSpeech, endCall, editField, holdSeats, renewSeatHold, releaseSeatHold, confirmBooking } = session
  const { messages, mode, suggestion, transcriptLanguage } = state
  const inventoryTripId = state.booking.tripId ?? state.booking.selectedTrip?.id ?? null
  const inventory = inventoryState?.tripId === inventoryTripId ? inventoryState : null

  const loadInventory = useCallback(async (tripId: string) => {
    const snapshot = await fetchTripInventory(tripId)
    setInventory({ tripId, ...snapshot })
    setInventoryError(null)
  }, [])

  useEffect(() => {
    if (state.booking.runtimeProfile !== 'durable' || !inventoryTripId) {
      return
    }
    let active = true
    void fetchTripInventory(inventoryTripId).then((snapshot) => {
      if (active) {
        setInventory({ tripId: inventoryTripId, ...snapshot })
        setInventoryError(null)
      }
    }, (error) => {
      if (active) setInventoryError(error instanceof Error ? error.message : 'Không thể tải sơ đồ ghế.')
    })
    return () => { active = false }
  }, [inventoryTripId, state.booking.runtimeProfile])

  useEffect(() => {
    if (mode !== 'auto' || integrationStatus.voiceAgent) return
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
  }, [integrationStatus.voiceAgent, messages, mode, sendEvent, sessionCode, suggestion.text])

  const changeMode = (mode: 'human' | 'auto') => {
    if (mode === 'auto') {
      handledCaller.current = [...messages].reverse().find((message) => message.role === 'caller')?.id ?? null
    }
    setPreferences(mode, transcriptLanguage)
  }

  const speakSuggestion = () => {
    sendStaffSpeech(suggestion.text)
  }

  const sendCustomReply = (text: string) => {
    sendStaffSpeech(text)
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
        <BookingForm
          booking={state.booking}
          onEdit={editField}
          seatPicker={inventoryTripId && inventory && (state.booking.passengerCount ?? 0) > 0 ? (
            <SeatPicker
              key={inventoryTripId}
              seats={inventory.seats}
              passengerCount={state.booking.passengerCount ?? 0}
              selected={seatHold?.seatCodes ?? []}
              hold={seatHold}
              actorRole={actorRole}
              onHold={async (seatCodes) => {
                const hold = await holdSeats(inventoryTripId, seatCodes, inventory.revision)
                setInventory((current) => current ? {
                  tripId: current.tripId,
                  revision: Math.max(current.revision + 1, ...current.seats.map((seat) => seat.revision + 1)),
                  seats: current.seats.map((seat) => seatCodes.includes(seat.seatCode) ? { ...seat, state: 'held', activeHoldId: hold.id, revision: seat.revision + 1 } : seat),
                } : current)
                return hold
              }}
              onRenew={renewSeatHold}
              onRelease={async (reason) => {
                await releaseSeatHold(reason)
                await loadInventory(inventoryTripId)
              }}
              onBlock={actorRole === 'admin' || actorRole === 'dispatcher' ? async (seatCode, blocked) => {
                const response = await fetch(`/api/trips/${encodeURIComponent(inventoryTripId)}/inventory/block`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seatCodes: [seatCode], blocked }),
                })
                if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? 'Không thể khóa ghế.')
                await loadInventory(inventoryTripId)
              } : undefined}
            />
          ) : inventoryError ? <p role="alert" className="text-xs text-[var(--danger)]">{inventoryError}</p> : undefined}
        />
        <AssistantRail
          state={state}
          onSpeakSuggestion={speakSuggestion}
          onSendCustomReply={sendCustomReply}
          onConfirm={confirmBooking}
          seatHold={seatHold}
        />
      </main>
      {!integrationStatus.livekit ? (
        <p className="mx-auto max-w-[1720px] px-4 pb-4 text-center text-[11px] leading-5 text-[var(--muted)] sm:px-6">
          Mô phỏng chỉ đồng bộ giữa các tab cùng trình duyệt. Hai thiết bị cần LiveKit.
        </p>
      ) : null}
      {integrationStatus.livekit && liveTransport ? (
        <LiveCallRoom
          sessionCode={sessionCode}
          role="staff"
          displayName="Nhân viên VéĐi"
          connect={state.connection.state !== 'ended'}
          microphone={microphone}
          transport={liveTransport}
          onConnectionChange={handleLiveKitPhase}
        />
      ) : null}
    </div>
  )
}

async function fetchTripInventory(tripId: string): Promise<{ revision: number; seats: TripSeat[] }> {
  const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}/inventory`, { cache: 'no-store' })
  const body = await response.json() as { revision?: number; seats?: TripSeat[]; error?: string }
  if (!response.ok || typeof body.revision !== 'number' || !body.seats) throw new Error(body.error ?? 'Không thể tải sơ đồ ghế.')
  return { revision: body.revision, seats: body.seats }
}
