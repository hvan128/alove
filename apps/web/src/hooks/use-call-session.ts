'use client'

import type {
  BookingDraft,
  BookingFieldKey,
  CallMessageChannel,
  CallMode,
  RoomEvent,
  SeatHold,
  TranscriptDisplayLanguage,
} from '@ordervoice/contracts'
import { bookingDraftSchema, roomEventSchema, seatHoldSchema } from '@ordervoice/contracts'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  DemoCallChannel,
  type CallEventTransport,
} from '@/lib/call/demo-channel'
import {
  applyStaffEditToSession,
  confirmCallSession,
  createInitialCallSessionState,
  reduceCallSession,
  type CallSessionState,
} from '@/lib/call/session-state'

type Role = 'caller' | 'staff'

type SessionAction =
  | { kind: 'event'; event: RoomEvent }
  | { kind: 'staff_edit'; field: BookingFieldKey; value: unknown; messageId: string; occurredAt: string }
  | { kind: 'confirm' }

export type UseCallSessionOptions = {
  sessionCode: string
  role: Role
  transport?: 'local' | 'livekit'
  transportFactory?: (sessionCode: string) => CallEventTransport
  persistence?: boolean
  valseaEnabled?: boolean
  voiceAgentEnabled?: boolean
  catalogVersionId?: string
}

export type CallSessionController = {
  state: CallSessionState
  seatHold: SeatHold | null
  sendEvent: (event: RoomEvent) => void
  receiveEvent: (event: unknown) => void
  sendCallerText: (text: string, channel?: CallMessageChannel) => void
  sendPartial: (text: string) => void
  setPreferences: (mode: CallMode, language: TranscriptDisplayLanguage) => void
  sendStaffSpeech: (text: string) => void
  setCallerPresence: (present: boolean) => void
  endCall: () => Promise<void>
  editField: <K extends BookingFieldKey>(field: K, value: BookingDraft[K]) => Promise<void>
  holdSeats: (tripId: string, seatCodes: string[], inventoryRevision: number) => Promise<SeatHold>
  renewSeatHold: () => Promise<SeatHold>
  releaseSeatHold: (reason?: string) => Promise<void>
  confirmBooking: () => Promise<void>
}

export function useCallSession(options: UseCallSessionOptions): CallSessionController {
  const sessionCode = useMemo(() => normalizeCode(options.sessionCode), [options.sessionCode])
  const role = options.role
  const transportKind = options.transport ?? 'local'
  const transportFactory = options.transportFactory
  const persistence = options.persistence ?? false
  const valseaEnabled = options.valseaEnabled ?? false
  const voiceAgentEnabled = options.voiceAgentEnabled ?? false
  const catalogVersionId = options.catalogVersionId ?? null
  const reducer = useCallback((state: CallSessionState, action: SessionAction): CallSessionState => {
    if (action.kind === 'event') return reduceCallSession(state, action.event)
    if (action.kind === 'confirm') return confirmCallSession(state)
    return applyStaffEditToSession(
      state,
      action.field,
      action.value as never,
      { messageId: action.messageId, occurredAt: action.occurredAt },
    )
  }, [])
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => {
      const initial = createInitialCallSessionState(sessionCode, transportKind)
      return persistence
        ? { ...initial, booking: { ...initial.booking, runtimeProfile: 'durable' as const } }
        : initial
    },
  )
  const transportRef = useRef<CallEventTransport | null>(null)
  const seatHoldRef = useRef<SeatHold | null>(null)
  const [seatHold, setSeatHold] = useState<SeatHold | null>(null)

  const persistEvent = useCallback((event: RoomEvent) => {
    if (!persistence || event.type === 'transcript.partial') return
    void fetch(`/api/sessions/${sessionCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => undefined)
  }, [persistence, sessionCode])

  useEffect(() => {
    const transport = transportFactory?.(sessionCode) ?? new DemoCallChannel(sessionCode)
    transportRef.current = transport
    for (const event of transport.readHistory()) dispatch({ kind: 'event', event })
    const unsubscribe = transport.subscribe((event) => {
      dispatch({ kind: 'event', event })
      persistEvent(event)
    })
    return () => {
      unsubscribe()
      transport.close()
      if (transportRef.current === transport) transportRef.current = null
    }
  }, [persistEvent, transportFactory, sessionCode])

  useEffect(() => {
    if (!persistence) return
    const controller = new AbortController()
    void fetch(`/api/sessions/${sessionCode}`, {
      cache: 'no-store',
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return
      const body = await response.json() as { events?: unknown[] }
      for (const candidate of body.events ?? []) {
        const parsed = roomEventSchema.safeParse(candidate)
        if (parsed.success && parsed.data.sessionCode === sessionCode) {
          dispatch({ kind: 'event', event: parsed.data })
        }
      }
    }).catch(() => undefined)
    return () => controller.abort()
  }, [persistence, sessionCode])

  const sendEvent = useCallback((event: RoomEvent) => {
    const parsed = roomEventSchema.parse(event)
    dispatch({ kind: 'event', event: parsed })
    transportRef.current?.publish(parsed)
    persistEvent(parsed)
  }, [persistEvent])

  const receiveEvent = useCallback((event: unknown) => {
    const parsed = roomEventSchema.safeParse(event)
    if (parsed.success && parsed.data.sessionCode === sessionCode) {
      dispatch({ kind: 'event', event: parsed.data })
      persistEvent(parsed.data)
    }
  }, [persistEvent, sessionCode])

  const sendCallerText = useCallback((text: string, channel: CallMessageChannel = 'text') => {
    if (role !== 'caller' || !text.trim()) return
    const occurredAt = new Date().toISOString()
    const id = nextId('caller')
    sendEvent({
      version: 1,
      eventId: `event-${id}`,
      sessionCode,
      occurredAt,
      type: 'transcript.final',
      message: {
        id: `message-${id}`,
        role: 'caller',
        text: text.trim(),
        language: 'vi',
        translations: {},
        confidence: channel === 'voice' ? null : 1,
        startedAtMs: 0,
        endedAtMs: 0,
        channel,
      },
    })
  }, [role, sendEvent, sessionCode])

  const sendPartial = useCallback((text: string) => {
    if (role !== 'caller' || !text.trim()) return
    const id = nextId('partial')
    sendEvent({
      version: 1,
      eventId: `event-${id}`,
      sessionCode,
      occurredAt: new Date().toISOString(),
      type: 'transcript.partial',
      message: {
        id: `message-live-${sessionCode}`,
        role: 'caller',
        text: text.trim(),
        language: 'vi',
        translations: {},
        confidence: null,
        startedAtMs: 0,
        endedAtMs: 0,
        channel: 'voice',
      },
    })
  }, [role, sendEvent, sessionCode])

  const setPreferences = useCallback((mode: CallMode, language: TranscriptDisplayLanguage) => {
    if (role !== 'staff') return
    sendEvent({
      version: 1,
      eventId: `event-${nextId('preferences')}`,
      sessionCode,
      occurredAt: new Date().toISOString(),
      type: 'staff.preferences',
      mode,
      transcriptLanguage: language,
    })
  }, [role, sendEvent, sessionCode])

  const sendStaffSpeech = useCallback((text: string) => {
    if (role !== 'staff' || !text.trim()) return
    sendEvent({
      version: 1,
      eventId: `event-${nextId('staff')}`,
      sessionCode,
      occurredAt: new Date().toISOString(),
      type: 'staff.speak',
      text: text.trim(),
    })
  }, [role, sendEvent, sessionCode])

  const setCallerPresence = useCallback((present: boolean) => {
    sendEvent({
      version: 1,
      eventId: `event-${nextId('status')}`,
      sessionCode,
      occurredAt: new Date().toISOString(),
      type: 'session.status',
      transport: transportKind,
      state: present ? 'connected' : 'waiting',
      callerPresent: present,
      valsea: transportKind === 'livekit' && valseaEnabled ? 'connecting' : 'unconfigured',
      agent: transportKind === 'livekit' && voiceAgentEnabled ? 'dispatching' : 'unconfigured',
      detail: transportKind === 'local' ? 'Mô phỏng cục bộ, chưa dùng VALSEA.' : null,
    })
  }, [sendEvent, sessionCode, transportKind, valseaEnabled, voiceAgentEnabled])

  const releaseCurrentSeatHold = useCallback(async (reason = 'staff_release'): Promise<void> => {
    const holdId = seatHoldRef.current?.id ?? state.booking.seatHoldId
    if (role !== 'staff' || !holdId) return
    const response = await fetch(`/api/seat-holds/${holdId}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (!response.ok) {
      const body = await response.json() as { error?: string }
      throw new Error(body.error ?? 'HOLD_RELEASE_FAILED')
    }
    seatHoldRef.current = null
    setSeatHold(null)
  }, [role, state.booking.seatHoldId])

  useEffect(() => {
    const releaseOnPageHide = () => {
      const holdId = seatHoldRef.current?.id
      if (!holdId || role !== 'staff') return
      void fetch(`/api/seat-holds/${holdId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'pagehide' }),
        keepalive: true,
      }).catch(() => undefined)
    }
    window.addEventListener('pagehide', releaseOnPageHide)
    return () => window.removeEventListener('pagehide', releaseOnPageHide)
  }, [role])

  const endCall = useCallback(async (): Promise<void> => {
    await releaseCurrentSeatHold('call_ended')
    sendEvent({
      version: 1,
      eventId: `event-${nextId('end')}`,
      sessionCode,
      occurredAt: new Date().toISOString(),
      type: 'staff.end_call',
      reason: 'ended_by_user',
    })
  }, [releaseCurrentSeatHold, sendEvent, sessionCode])

  const editField = useCallback(async <K extends BookingFieldKey>(field: K, value: BookingDraft[K]): Promise<void> => {
    if (role !== 'staff') return
    const releaseReason = field === 'selectedTrip'
      ? 'trip_changed'
      : field === 'seats'
        ? 'seats_changed'
        : null
    if (releaseReason) await releaseCurrentSeatHold(releaseReason)
    const occurredAt = new Date().toISOString()
    const messageId = `staff-edit-${nextId(field)}`
    const next = applyStaffEditToSession(state, field, value, { messageId, occurredAt })
    const booking = releaseReason ? { ...next.booking, seatHoldId: null } : next.booking
    sendEvent({
      version: 1,
      eventId: `event-${nextId('snapshot')}`,
      sessionCode,
      occurredAt,
      type: 'booking.snapshot',
      revision: next.revision,
      booking,
    })
  }, [releaseCurrentSeatHold, role, sendEvent, sessionCode, state])

  const holdSeats = useCallback(async (
    tripId: string,
    seatCodes: string[],
    inventoryRevision: number,
  ): Promise<SeatHold> => {
    if (role !== 'staff') throw new Error('FORBIDDEN')
    const response = await fetch('/api/seat-holds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionCode,
        bookingDraftId: state.booking.id,
        tripId,
        seatCodes,
        expectedInventoryRevision: inventoryRevision,
      }),
    })
    const body = await response.json() as { hold?: unknown; error?: string }
    if (!response.ok) throw new Error(body.error ?? 'SEAT_HOLD_FAILED')
    const hold = seatHoldSchema.parse(body.hold)
    seatHoldRef.current = hold
    setSeatHold(hold)
    const booking: BookingDraft = {
      ...state.booking,
      runtimeProfile: 'durable',
      catalogVersionId: state.booking.catalogVersionId ?? catalogVersionId,
      tripId,
      seatHoldId: hold.id,
      seats: hold.seatCodes,
    }
    const holdEvent: RoomEvent = {
      version: 1,
      eventId: `event-${nextId('hold')}`,
      sessionCode,
      occurredAt: new Date().toISOString(),
      type: 'booking.snapshot',
      revision: state.revision + 1,
      booking,
    }
    sendEvent(holdEvent)
    if (persistence) {
      const persisted = await fetch(`/api/sessions/${sessionCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holdEvent),
      })
      if (!persisted.ok) throw new Error('BOOKING_SNAPSHOT_PERSIST_FAILED')
    }
    return hold
  }, [catalogVersionId, persistence, role, sendEvent, sessionCode, state.booking, state.revision])

  const renewCurrentSeatHold = useCallback(async (): Promise<SeatHold> => {
    const holdId = seatHoldRef.current?.id ?? state.booking.seatHoldId
    if (role !== 'staff' || !holdId) throw new Error('HOLD_NOT_FOUND')
    const response = await fetch(`/api/seat-holds/${holdId}/renew`, { method: 'POST' })
    const body = await response.json() as { hold?: unknown; error?: string }
    if (!response.ok) throw new Error(body.error ?? 'HOLD_RENEW_FAILED')
    const hold = seatHoldSchema.parse(body.hold)
    seatHoldRef.current = hold
    setSeatHold(hold)
    return hold
  }, [role, state.booking.seatHoldId])

  const confirmCurrentBooking = useCallback(async (): Promise<void> => {
    if (role !== 'staff') return
    if (state.booking.runtimeProfile === 'durable') {
      const holdId = seatHoldRef.current?.id ?? state.booking.seatHoldId
      if (!holdId) throw new Error('HOLD_NOT_FOUND')
      const response = await fetch(`/api/bookings/${sessionCode}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingDraftId: state.booking.id,
          holdId,
          acceptedSummaryHash: JSON.stringify({
            tripId: state.booking.tripId,
            seats: state.booking.seats,
            passengerName: state.booking.passengerName,
            phone: state.booking.phone,
          }),
          idempotencyKey: `confirm-${sessionCode}-${state.revision}`,
          expectedRevision: state.revision,
        }),
      })
      const body = await response.json() as { booking?: unknown; error?: string }
      if (!response.ok) throw new Error(body.error ?? 'BOOKING_CONFIRMATION_FAILED')
      const booking = bookingDraftSchema.parse(body.booking)
      sendEvent({
        version: 1,
        eventId: `event-${nextId('confirmed')}`,
        sessionCode,
        occurredAt: new Date().toISOString(),
        type: 'booking.snapshot',
        revision: state.revision + 1,
        booking,
      })
      seatHoldRef.current = null
      setSeatHold(null)
      return
    }
    const next = confirmCallSession(state)
    const occurredAt = new Date().toISOString()
    dispatch({ kind: 'confirm' })
    sendEvent({
      version: 1,
      eventId: `event-${nextId('confirmed')}`,
      sessionCode,
      occurredAt,
      type: 'booking.snapshot',
      revision: next.revision,
      booking: next.booking,
    })
  }, [role, sendEvent, sessionCode, state])

  return {
    state,
    seatHold,
    sendEvent,
    receiveEvent,
    sendCallerText,
    sendPartial,
    setPreferences,
    sendStaffSpeech,
    setCallerPresence,
    endCall,
    editField,
    holdSeats,
    renewSeatHold: renewCurrentSeatHold,
    releaseSeatHold: releaseCurrentSeatHold,
    confirmBooking: confirmCurrentBooking,
  }
}

function normalizeCode(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/gu, '')
  return /^[A-Z0-9]{4,12}$/u.test(normalized) ? normalized : 'DEMO42'
}

function nextId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`
}
