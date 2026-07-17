import type {
  BookingDraft,
  BookingFieldKey,
  CallMode,
  CallTransport,
  RealtimeTranscriptMessage,
  ReplySuggestion,
  RoomEvent,
  SessionStatusEvent,
  TranscriptDisplayLanguage,
} from '@ordervoice/contracts'
import {
  applyBookingMessage,
  applyStaffFieldEdit,
  confirmBooking,
  createBookingReplySuggestion,
  createInitialBooking,
  type StaffEditMetadata,
} from '@ordervoice/core/bus-booking'

export type CallSessionError = {
  code: string
  message: string
  recoverable: boolean
}

export type CallSessionState = {
  sessionCode: string
  transport: CallTransport
  connection: Pick<SessionStatusEvent, 'state' | 'callerPresent' | 'valsea' | 'agent' | 'detail'>
  agentState: 'idle' | 'listening' | 'thinking' | 'speaking' | 'offline'
  mode: CallMode
  transcriptLanguage: TranscriptDisplayLanguage
  partial: RealtimeTranscriptMessage | null
  messages: RealtimeTranscriptMessage[]
  booking: BookingDraft
  suggestion: ReplySuggestion
  revision: number
  errors: CallSessionError[]
  seenEventIds: string[]
}

export function createInitialCallSessionState(
  sessionCode: string,
  transport: CallTransport,
): CallSessionState {
  const booking = createInitialBooking(sessionCode)
  return {
    sessionCode,
    transport,
    connection: {
      state: 'waiting',
      callerPresent: false,
      valsea: 'unconfigured',
      agent: 'unconfigured',
      detail: transport === 'local' ? 'Mô phỏng cục bộ trên cùng trình duyệt.' : null,
    },
    agentState: 'offline',
    mode: 'human',
    transcriptLanguage: 'original',
    partial: null,
    messages: [],
    booking,
    suggestion: createBookingReplySuggestion(booking),
    revision: 0,
    errors: [],
    seenEventIds: [],
  }
}

export function reduceCallSession(state: CallSessionState, event: RoomEvent): CallSessionState {
  if (event.sessionCode !== state.sessionCode || state.seenEventIds.includes(event.eventId)) return state
  const seenEventIds = [...state.seenEventIds.slice(-199), event.eventId]

  switch (event.type) {
    case 'session.status':
      return {
        ...state,
        transport: event.transport,
        connection: {
          state: event.state,
          callerPresent: event.callerPresent,
          valsea: event.valsea,
          agent: event.agent,
          detail: event.detail,
        },
        seenEventIds,
      }
    case 'transcript.partial':
      return { ...state, partial: event.message, seenEventIds }
    case 'transcript.final': {
      const messages = state.messages.some((message) => message.id === event.message.id)
        ? state.messages
        : [...state.messages, event.message]
      if (event.message.role !== 'caller') {
        return { ...state, partial: null, messages, seenEventIds }
      }
      const result = applyBookingMessage(state.booking, {
        id: event.message.id,
        conversationId: state.sessionCode,
        role: 'caller',
        text: event.message.text,
        createdAt: event.occurredAt,
        channel: event.message.channel,
        final: true,
      })
      const reviewChanged = result.draft.reviewItems.length !== state.booking.reviewItems.length
      const revision = result.changedFields.length > 0 || reviewChanged ? state.revision + 1 : state.revision
      return {
        ...state,
        partial: null,
        messages,
        booking: result.draft,
        suggestion: createBookingReplySuggestion(result.draft),
        revision,
        connection: {
          ...state.connection,
          state: state.connection.state === 'waiting' ? 'connected' : state.connection.state,
          callerPresent: true,
        },
        seenEventIds,
      }
    }
    case 'booking.snapshot':
      if (event.revision <= state.revision) return { ...state, seenEventIds }
      return {
        ...state,
        booking: event.booking,
        suggestion: createBookingReplySuggestion(event.booking),
        revision: event.revision,
        seenEventIds,
      }
    case 'reply.suggested':
      return { ...state, suggestion: event.suggestion, seenEventIds }
    case 'agent.state':
      return { ...state, agentState: event.state, seenEventIds }
    case 'agent.error':
      return {
        ...state,
        errors: [...state.errors.slice(-9), {
          code: event.code,
          message: event.message,
          recoverable: event.recoverable,
        }],
        seenEventIds,
      }
    case 'staff.preferences':
      return {
        ...state,
        mode: event.mode,
        transcriptLanguage: event.transcriptLanguage,
        seenEventIds,
      }
    case 'staff.speak': {
      const message: RealtimeTranscriptMessage = {
        id: `message-${event.eventId}`,
        role: 'staff',
        text: event.text,
        language: 'vi',
        translations: {},
        confidence: 1,
        startedAtMs: 0,
        endedAtMs: 0,
        channel: 'text',
      }
      return {
        ...state,
        messages: state.messages.some((item) => item.id === message.id)
          ? state.messages
          : [...state.messages, message],
        seenEventIds,
      }
    }
    case 'staff.end_call':
      return {
        ...state,
        connection: { ...state.connection, state: 'ended', callerPresent: false },
        seenEventIds,
      }
    case 'staff.end_turn':
      return { ...state, seenEventIds }
  }
}

export function applyStaffEditToSession<K extends BookingFieldKey>(
  state: CallSessionState,
  field: K,
  value: BookingDraft[K],
  metadata: StaffEditMetadata,
): CallSessionState {
  const booking = applyStaffFieldEdit(state.booking, field, value, metadata)
  return {
    ...state,
    booking,
    suggestion: createBookingReplySuggestion(booking),
    revision: state.revision + 1,
  }
}

export function confirmCallSession(state: CallSessionState): CallSessionState {
  const booking = confirmBooking(state.booking, 'staff')
  return {
    ...state,
    booking,
    suggestion: {
      id: `suggestion-${state.sessionCode}-confirmed`,
      text: `Đã xác nhận vé với mã ${booking.bookingCode}.`,
      reason: 'staff_request',
      missingFields: [],
      speakable: true,
    },
    revision: state.revision + 1,
  }
}
