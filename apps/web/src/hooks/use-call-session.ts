'use client'

import type {
  BookingDraft,
  BookingFieldKey,
  CallMessageChannel,
  CallMode,
  RoomEvent,
  TranscriptDisplayLanguage,
} from '@ordervoice/contracts'
import { roomEventSchema } from '@ordervoice/contracts'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
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
}

export type CallSessionController = {
  state: CallSessionState
  sendEvent: (event: RoomEvent) => void
  receiveEvent: (event: unknown) => void
  sendCallerText: (text: string, channel?: CallMessageChannel) => void
  sendPartial: (text: string) => void
  setPreferences: (mode: CallMode, language: TranscriptDisplayLanguage) => void
  sendStaffSpeech: (text: string) => void
  setCallerPresence: (present: boolean) => void
  endCall: () => void
  editField: <K extends BookingFieldKey>(field: K, value: BookingDraft[K]) => void
  confirmBooking: () => void
}

export function useCallSession(options: UseCallSessionOptions): CallSessionController {
  const sessionCode = useMemo(() => normalizeCode(options.sessionCode), [options.sessionCode])
  const role = options.role
  const transportKind = options.transport ?? 'local'
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
    () => createInitialCallSessionState(sessionCode, transportKind),
  )
  const transportRef = useRef<CallEventTransport | null>(null)

  useEffect(() => {
    const transport = options.transportFactory?.(sessionCode) ?? new DemoCallChannel(sessionCode)
    transportRef.current = transport
    for (const event of transport.readHistory()) dispatch({ kind: 'event', event })
    const unsubscribe = transport.subscribe((event) => dispatch({ kind: 'event', event }))
    return () => {
      unsubscribe()
      transport.close()
      if (transportRef.current === transport) transportRef.current = null
    }
  }, [options.transportFactory, sessionCode])

  const sendEvent = useCallback((event: RoomEvent) => {
    const parsed = roomEventSchema.parse(event)
    dispatch({ kind: 'event', event: parsed })
    transportRef.current?.publish(parsed)
  }, [])

  const receiveEvent = useCallback((event: unknown) => {
    const parsed = roomEventSchema.safeParse(event)
    if (parsed.success && parsed.data.sessionCode === sessionCode) {
      dispatch({ kind: 'event', event: parsed.data })
    }
  }, [sessionCode])

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
      valsea: transportKind === 'local' ? 'unconfigured' : 'connecting',
      agent: transportKind === 'local' ? 'unconfigured' : 'dispatching',
      detail: transportKind === 'local' ? 'Mô phỏng cục bộ, chưa dùng VALSEA.' : null,
    })
  }, [sendEvent, sessionCode, transportKind])

  const endCall = useCallback(() => {
    sendEvent({
      version: 1,
      eventId: `event-${nextId('end')}`,
      sessionCode,
      occurredAt: new Date().toISOString(),
      type: 'staff.end_call',
      reason: 'ended_by_user',
    })
  }, [sendEvent, sessionCode])

  const editField = useCallback(<K extends BookingFieldKey>(field: K, value: BookingDraft[K]) => {
    if (role !== 'staff') return
    dispatch({
      kind: 'staff_edit',
      field,
      value,
      messageId: `staff-edit-${nextId(field)}`,
      occurredAt: new Date().toISOString(),
    })
  }, [role])

  const confirmCurrentBooking = useCallback(() => {
    if (role === 'staff') dispatch({ kind: 'confirm' })
  }, [role])

  return {
    state,
    sendEvent,
    receiveEvent,
    sendCallerText,
    sendPartial,
    setPreferences,
    sendStaffSpeech,
    setCallerPresence,
    endCall,
    editField,
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
