import { z } from 'zod'

export const sourceSchema = z.enum(['browser', 'telephony', 'replay'])
export const speakerSchema = z.enum(['caller', 'agent', 'unknown'])
export const transcriptKindSchema = z.enum(['partial', 'final'])
export const orderStatusSchema = z.enum([
  'capturing',
  'review_required',
  'ready_for_approval',
  'approved',
  'exported',
])

export const normalizedAudioFrameSchema = z.object({
  sessionId: z.string().min(1),
  source: sourceSchema,
  trackId: z.string().min(1),
  speaker: speakerSchema,
  sequence: z.number().int().nonnegative(),
  capturedAtMs: z.number().nonnegative(),
  sampleRate: z.literal(16000),
  channels: z.literal(1),
  encoding: z.literal('pcm_s16le'),
  pcm: z.instanceof(Int16Array),
  endOfUtterance: z.boolean().optional(),
})

export const transcriptSegmentSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  kind: transcriptKindSchema,
  speaker: speakerSchema,
  text: z.string().min(1),
  startedAtMs: z.number().nonnegative(),
  endedAtMs: z.number().nonnegative(),
  confidence: z.number().min(0).max(1).nullable(),
  source: sourceSchema,
  providerEventId: z.string().min(1).optional(),
})

export const persistentTranscriptSegmentSchema = transcriptSegmentSchema.extend({
  kind: z.literal('final'),
})

export const evidenceSchema = z.object({
  segmentId: z.string().min(1),
  quote: z.string().min(1),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
})

export const resolutionSchema = z.enum(['resolved', 'ambiguous', 'unresolved'])

export const orderLineSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1).nullable(),
  productLabel: z.string().min(1),
  quantity: z.number().positive().nullable(),
  unit: z.string().min(1).nullable(),
  resolution: resolutionSchema,
  evidence: z.array(evidenceSchema).min(1),
})

export const orderExceptionSchema = z.object({
  id: z.string().min(1),
  code: z.enum(['SKU_AMBIGUOUS', 'SKU_UNRESOLVED', 'QUANTITY_INVALID', 'UNIT_MISSING', 'EVIDENCE_MISSING']),
  message: z.string().min(1),
  blocking: z.boolean(),
  lineId: z.string().min(1).nullable(),
})

export const orderPatchSchema = z.object({
  sourceSegmentId: z.string().min(1),
  customerName: z.string().min(1).optional(),
  lines: z.array(orderLineSchema).default([]),
  notes: z.string().min(1).optional(),
})

export const orderDraftSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  customerId: z.string().min(1).nullable(),
  customerName: z.string().min(1).nullable(),
  status: orderStatusSchema,
  lines: z.array(orderLineSchema),
  exceptions: z.array(orderExceptionSchema),
  approvedBy: z.string().min(1).nullable(),
  approvedAt: z.string().datetime().nullable(),
  externalReference: z.string().min(1).nullable(),
})

export const replySchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  text: z.string().min(1),
  approvedForSpeech: z.boolean(),
})

export const sourceReadinessSchema = z.enum(['ready', 'connecting', 'live', 'unavailable', 'demo'])

export const demoWorkspaceSchema = z.object({
  conversationId: z.string().min(1),
  activeSource: sourceSchema,
  sourceStates: z.record(sourceSchema, sourceReadinessSchema),
  isDemo: z.boolean(),
  transcript: z.array(transcriptSegmentSchema),
  draft: orderDraftSchema,
  reply: replySchema,
  step: z.number().int().nonnegative(),
})

export const callModeSchema = z.enum(['human', 'auto'])
export const callStatusSchema = z.enum(['idle', 'connected', 'ended'])
export const callRoleSchema = z.enum(['caller', 'customer', 'staff', 'agent', 'system'])
export const callMessageChannelSchema = z.enum(['voice', 'text', 'preset'])
export const bookingStatusSchema = z.enum([
  'collecting',
  'trip_proposed',
  'awaiting_confirmation',
  'confirmed',
])

export const busTripSchema = z.object({
  id: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/u),
  arrivalTime: z.string().regex(/^\d{2}:\d{2}$/u),
  vehicleType: z.string().min(1),
  priceVnd: z.number().int().positive(),
  pickupPoint: z.string().min(1),
  dropoffPoint: z.string().min(1),
  availableSeats: z.array(z.string().min(1)),
})

export const bookingFieldKeySchema = z.enum([
  'origin',
  'destination',
  'travelDateLabel',
  'timeWindow',
  'passengerCount',
  'passengerName',
  'phone',
  'pickupPoint',
  'dropoffPoint',
  'selectedTrip',
  'seats',
  'vehiclePreference',
  'paymentMethod',
  'note',
])

export const bookingEvidenceSourceSchema = z.enum([
  'caller_speech',
  'staff_edit',
  'catalog',
  'system',
])

export const bookingFieldEvidenceSchema = z.object({
  id: z.string().min(1),
  field: bookingFieldKeySchema,
  messageId: z.string().min(1),
  quote: z.string().min(1),
  confidence: z.number().min(0).max(1),
  source: bookingEvidenceSourceSchema,
  capturedAt: z.string().datetime(),
}).strict()

export const bookingReviewItemSchema = z.object({
  id: z.string().min(1),
  field: bookingFieldKeySchema,
  code: z.enum(['ambiguous', 'conflict', 'invalid', 'correction']),
  message: z.string().min(1),
  sourceMessageId: z.string().min(1).nullable(),
  proposedValue: z.string().min(1).nullable(),
  status: z.enum(['open', 'resolved']),
  createdAt: z.string().datetime(),
}).strict()

export const bookingDraftSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  status: bookingStatusSchema,
  origin: z.string().min(1).nullable(),
  destination: z.string().min(1).nullable(),
  travelDateLabel: z.string().min(1).nullable(),
  timeWindow: z.string().min(1).nullable(),
  passengerCount: z.number().int().min(1).max(6).nullable(),
  selectedTrip: busTripSchema.nullable(),
  seats: z.array(z.string().min(1)),
  passengerName: z.string().min(1).nullable(),
  phone: z.string().regex(/^0\d{9}$/u).nullable(),
  pickupPoint: z.string().min(1).nullable().default(null),
  dropoffPoint: z.string().min(1).nullable().default(null),
  vehiclePreference: z.string().min(1).nullable().default(null),
  paymentMethod: z.string().min(1).nullable().default(null),
  note: z.string().min(1).nullable().default(null),
  totalFareVnd: z.number().int().nonnegative().nullable(),
  bookingCode: z.string().min(1).nullable(),
  evidenceMessageIds: z.array(z.string().min(1)),
  fieldEvidence: z.partialRecord(
    bookingFieldKeySchema,
    z.array(bookingFieldEvidenceSchema),
  ).default({}),
  confirmedFields: z.array(bookingFieldKeySchema).default([]),
  reviewItems: z.array(bookingReviewItemSchema).default([]),
}).strict().superRefine((draft, context) => {
  if (draft.status !== 'confirmed') return

  if (!draft.bookingCode) {
    context.addIssue({ code: 'custom', path: ['bookingCode'], message: 'Confirmed booking requires a booking code.' })
  }
  if (!draft.selectedTrip) {
    context.addIssue({ code: 'custom', path: ['selectedTrip'], message: 'Confirmed booking requires a selected trip.' })
  }
  if (!draft.passengerName || !draft.phone || !draft.passengerCount) {
    context.addIssue({ code: 'custom', path: ['passengerName'], message: 'Confirmed booking requires passenger details.' })
  }
  if (draft.passengerCount && draft.seats.length !== draft.passengerCount) {
    context.addIssue({ code: 'custom', path: ['seats'], message: 'Confirmed booking requires one seat per passenger.' })
  }
})

export const callMessageSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  role: callRoleSchema,
  text: z.string().min(1),
  createdAt: z.string().datetime(),
  channel: callMessageChannelSchema,
  final: z.boolean(),
})

export const busDemoWorkspaceSchema = z.object({
  conversationId: z.string().min(1),
  callStatus: callStatusSchema,
  mode: callModeSchema,
  isDemo: z.boolean(),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  messages: z.array(callMessageSchema),
  booking: bookingDraftSchema,
})

export const transcriptDisplayLanguageSchema = z.enum(['original', 'vi', 'en'])
export const transcriptLanguageCodeSchema = z.enum(['vi', 'en'])
export const callTransportSchema = z.enum(['local', 'livekit'])

export const realtimeTranscriptMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['caller', 'staff', 'agent']),
  text: z.string().min(1),
  language: transcriptLanguageCodeSchema,
  translations: z.partialRecord(
    transcriptLanguageCodeSchema,
    z.string().min(1),
  ).default({}),
  confidence: z.number().min(0).max(1).nullable(),
  startedAtMs: z.number().nonnegative(),
  endedAtMs: z.number().nonnegative(),
  channel: callMessageChannelSchema.default('voice'),
}).strict()

export const replySuggestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  reason: z.enum(['missing_fields', 'conflict', 'confirmation', 'staff_request']),
  missingFields: z.array(bookingFieldKeySchema).max(2),
  speakable: z.boolean(),
}).strict()

const realtimeEnvelopeShape = {
  version: z.literal(1),
  eventId: z.string().min(1),
  sessionCode: z.string().regex(/^[A-Z0-9]{4,12}$/u),
  occurredAt: z.string().datetime(),
}

export const sessionStatusEventSchema = z.object({
  ...realtimeEnvelopeShape,
  type: z.literal('session.status'),
  transport: callTransportSchema,
  state: z.enum(['waiting', 'connecting', 'connected', 'reconnecting', 'ended', 'error']),
  callerPresent: z.boolean(),
  valsea: z.enum(['unconfigured', 'connecting', 'live', 'error']),
  agent: z.enum(['unconfigured', 'dispatching', 'ready', 'speaking', 'error']),
  detail: z.string().min(1).nullable(),
}).strict()

export const transcriptPartialEventSchema = z.object({
  ...realtimeEnvelopeShape,
  type: z.literal('transcript.partial'),
  message: realtimeTranscriptMessageSchema,
}).strict()

export const transcriptFinalEventSchema = z.object({
  ...realtimeEnvelopeShape,
  type: z.literal('transcript.final'),
  message: realtimeTranscriptMessageSchema,
}).strict()

export const bookingSnapshotEventSchema = z.object({
  ...realtimeEnvelopeShape,
  type: z.literal('booking.snapshot'),
  revision: z.number().int().nonnegative(),
  booking: bookingDraftSchema,
}).strict()

export const replySuggestedEventSchema = z.object({
  ...realtimeEnvelopeShape,
  type: z.literal('reply.suggested'),
  suggestion: replySuggestionSchema,
}).strict()

export const agentStateEventSchema = z.object({
  ...realtimeEnvelopeShape,
  type: z.literal('agent.state'),
  state: z.enum(['idle', 'listening', 'thinking', 'speaking', 'offline']),
  detail: z.string().min(1).nullable(),
}).strict()

export const agentErrorEventSchema = z.object({
  ...realtimeEnvelopeShape,
  type: z.literal('agent.error'),
  code: z.string().min(1),
  message: z.string().min(1),
  recoverable: z.boolean(),
}).strict()

export const realtimeEventSchema = z.discriminatedUnion('type', [
  sessionStatusEventSchema,
  transcriptPartialEventSchema,
  transcriptFinalEventSchema,
  bookingSnapshotEventSchema,
  replySuggestedEventSchema,
  agentStateEventSchema,
  agentErrorEventSchema,
])

export const staffPreferencesCommandSchema = z.object({
  ...realtimeEnvelopeShape,
  type: z.literal('staff.preferences'),
  mode: callModeSchema,
  transcriptLanguage: transcriptDisplayLanguageSchema,
}).strict()

export const staffSpeakCommandSchema = z.object({
  ...realtimeEnvelopeShape,
  type: z.literal('staff.speak'),
  text: z.string().min(1),
}).strict()

export const staffEndTurnCommandSchema = z.object({
  ...realtimeEnvelopeShape,
  type: z.literal('staff.end_turn'),
}).strict()

export const staffEndCallCommandSchema = z.object({
  ...realtimeEnvelopeShape,
  type: z.literal('staff.end_call'),
  reason: z.string().min(1).optional(),
}).strict()

export const staffCommandSchema = z.discriminatedUnion('type', [
  staffPreferencesCommandSchema,
  staffSpeakCommandSchema,
  staffEndTurnCommandSchema,
  staffEndCallCommandSchema,
])

export const roomEventSchema = z.union([realtimeEventSchema, staffCommandSchema])

export const mediaControlSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start'), source: sourceSchema, trackId: z.string().min(1) }),
  z.object({ type: z.literal('end_of_utterance') }),
  z.object({ type: z.literal('stop') }),
])

export const gatewayEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('transcript.partial'), segment: transcriptSegmentSchema.omit({ id: true, conversationId: true }) }),
  z.object({ type: z.literal('transcript.final'), segment: persistentTranscriptSegmentSchema.omit({ id: true, conversationId: true }) }),
  z.object({ type: z.literal('source.status'), state: z.enum(['connecting', 'live', 'error']), detail: z.string().min(1).optional() }),
])

export type Source = z.infer<typeof sourceSchema>
export type Speaker = z.infer<typeof speakerSchema>
export type NormalizedAudioFrame = z.infer<typeof normalizedAudioFrameSchema>
export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>
export type PersistentTranscriptSegment = z.infer<typeof persistentTranscriptSegmentSchema>
export type Evidence = z.infer<typeof evidenceSchema>
export type OrderLine = z.infer<typeof orderLineSchema>
export type OrderException = z.infer<typeof orderExceptionSchema>
export type OrderPatch = z.infer<typeof orderPatchSchema>
export type OrderDraft = z.infer<typeof orderDraftSchema>
export type Reply = z.infer<typeof replySchema>
export type DemoWorkspace = z.infer<typeof demoWorkspaceSchema>
export type CallMode = z.infer<typeof callModeSchema>
export type CallStatus = z.infer<typeof callStatusSchema>
export type CallRole = z.infer<typeof callRoleSchema>
export type CallMessageChannel = z.infer<typeof callMessageChannelSchema>
export type BookingStatus = z.infer<typeof bookingStatusSchema>
export type BusTrip = z.infer<typeof busTripSchema>
export type BookingFieldKey = z.infer<typeof bookingFieldKeySchema>
export type BookingEvidenceSource = z.infer<typeof bookingEvidenceSourceSchema>
export type BookingFieldEvidence = z.infer<typeof bookingFieldEvidenceSchema>
export type BookingReviewItem = z.infer<typeof bookingReviewItemSchema>
export type BookingDraft = z.infer<typeof bookingDraftSchema>
export type CallMessage = z.infer<typeof callMessageSchema>
export type BusDemoWorkspace = z.infer<typeof busDemoWorkspaceSchema>
export type TranscriptDisplayLanguage = z.infer<typeof transcriptDisplayLanguageSchema>
export type TranscriptLanguageCode = z.infer<typeof transcriptLanguageCodeSchema>
export type CallTransport = z.infer<typeof callTransportSchema>
export type RealtimeTranscriptMessage = z.infer<typeof realtimeTranscriptMessageSchema>
export type ReplySuggestion = z.infer<typeof replySuggestionSchema>
export type SessionStatusEvent = z.infer<typeof sessionStatusEventSchema>
export type TranscriptPartialEvent = z.infer<typeof transcriptPartialEventSchema>
export type TranscriptFinalEvent = z.infer<typeof transcriptFinalEventSchema>
export type BookingSnapshotEvent = z.infer<typeof bookingSnapshotEventSchema>
export type ReplySuggestedEvent = z.infer<typeof replySuggestedEventSchema>
export type AgentStateEvent = z.infer<typeof agentStateEventSchema>
export type AgentErrorEvent = z.infer<typeof agentErrorEventSchema>
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>
export type StaffPreferencesCommand = z.infer<typeof staffPreferencesCommandSchema>
export type StaffSpeakCommand = z.infer<typeof staffSpeakCommandSchema>
export type StaffEndTurnCommand = z.infer<typeof staffEndTurnCommandSchema>
export type StaffEndCallCommand = z.infer<typeof staffEndCallCommandSchema>
export type StaffCommand = z.infer<typeof staffCommandSchema>
export type RoomEvent = z.infer<typeof roomEventSchema>
