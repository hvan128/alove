import { z } from 'zod'

export const vietnamesePhoneSchema = z.string().regex(/^(0(3|5|7|8|9)\d{8}|02\d{8,9})$/u)

export const bookingStatusSchema = z.enum([
  'collecting',
  'trip_proposed',
  'awaiting_confirmation',
  'confirmed',
])

export const tripSnapshotSchema = z.object({
  id: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/u),
  arrivalTime: z.string().regex(/^\d{2}:\d{2}$/u).nullable(),
  vehicleType: z.string().min(1),
  priceVnd: z.number().int().positive(),
  pickupPoint: z.string().min(1),
  dropoffPoint: z.string().min(1),
  seatNoun: z.string().min(1),
})

export const bookingSnapshotSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  status: bookingStatusSchema,
  origin: z.string().min(1).nullable(),
  destination: z.string().min(1).nullable(),
  travelDateLabel: z.string().min(1).nullable(),
  passengerCount: z.number().int().min(1).max(20).nullable(),
  selectedTrip: tripSnapshotSchema.nullable(),
  seats: z.array(z.string().min(1)),
  passengerName: z.string().min(1).nullable(),
  phone: vietnamesePhoneSchema.nullable(),
  totalFareVnd: z.number().int().nonnegative().nullable(),
  bookingCode: z.string().min(1).nullable(),
}).superRefine((snapshot, context) => {
  if (snapshot.status !== 'confirmed') return
  if (!snapshot.bookingCode) {
    context.addIssue({ code: 'custom', path: ['bookingCode'], message: 'Confirmed booking requires a code.' })
  }
  if (!snapshot.selectedTrip) {
    context.addIssue({ code: 'custom', path: ['selectedTrip'], message: 'Confirmed booking requires a trip.' })
  }
  if (!snapshot.origin || !snapshot.destination || !snapshot.travelDateLabel) {
    context.addIssue({ code: 'custom', path: ['travelDateLabel'], message: 'Confirmed booking requires route and travel date.' })
  }
  if (!snapshot.passengerName || !snapshot.phone || !snapshot.passengerCount) {
    context.addIssue({ code: 'custom', path: ['passengerName'], message: 'Confirmed booking requires passenger details.' })
  }
  if (snapshot.passengerCount && snapshot.seats.length !== snapshot.passengerCount) {
    context.addIssue({ code: 'custom', path: ['seats'], message: 'Confirmed booking requires one seat per passenger.' })
  }
  if (!snapshot.totalFareVnd || !snapshot.selectedTrip || !snapshot.passengerCount) {
    context.addIssue({ code: 'custom', path: ['totalFareVnd'], message: 'Confirmed booking requires a positive total fare.' })
  } else if (snapshot.totalFareVnd !== snapshot.selectedTrip.priceVnd * snapshot.passengerCount) {
    context.addIssue({ code: 'custom', path: ['totalFareVnd'], message: 'Total fare must match trip price and passenger count.' })
  }
  if (
    snapshot.selectedTrip
    && (snapshot.origin !== snapshot.selectedTrip.origin || snapshot.destination !== snapshot.selectedTrip.destination)
  ) {
    context.addIssue({ code: 'custom', path: ['selectedTrip'], message: 'Selected trip must match the booking route.' })
  }
})

export const callStatusSchema = z.enum(['idle', 'connected', 'ended'])
export const callRoleSchema = z.enum(['customer', 'agent'])
export const callMessageChannelSchema = z.literal('voice')

export const callMessageSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  role: callRoleSchema,
  text: z.string().min(1),
  createdAt: z.string().datetime(),
  channel: callMessageChannelSchema,
  final: z.boolean(),
})

export const SEMANTIC_ANNOTATION_TEXT_MAX_CHARS = 4_096
export const SEMANTIC_ANNOTATION_DISPLAY_MAX_CHARS = 80
export const SEMANTIC_ANNOTATION_ITEMS_MAX = 16
export const MAX_REALTIME_EVENT_BYTES = 60 * 1_024

const semanticStringSchema = (maxCodePoints: number) => z
  .string()
  .min(1)
  .refine(
    (value) => Array.from(value).length <= maxCodePoints,
    { message: `Must not exceed ${maxCodePoints} Unicode code points.` },
  )

const semanticTextSchema = semanticStringSchema(SEMANTIC_ANNOTATION_TEXT_MAX_CHARS)
const semanticDisplaySchema = semanticStringSchema(SEMANTIC_ANNOTATION_DISPLAY_MAX_CHARS)

export const semanticAnnotationSchema = z.object({
  timestamp: z.string().datetime(),
  sourceTranscript: semanticTextSchema,
  correctedText: semanticTextSchema.optional(),
  tags: z
    .array(semanticDisplaySchema)
    .max(SEMANTIC_ANNOTATION_ITEMS_MAX),
  annotations: z
    .array(semanticDisplaySchema)
    .max(SEMANTIC_ANNOTATION_ITEMS_MAX),
})

export const callWorkspaceSchema = z.object({
  conversationId: z.string().min(1),
  callStatus: callStatusSchema,
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  messages: z.array(callMessageSchema),
  semanticAnnotations: z.array(semanticAnnotationSchema),
  booking: bookingSnapshotSchema,
})

const eventEnvelopeSchema = z.object({
  callId: z.string().min(1),
  eventId: z.string().min(1),
  sequence: z.number().int().positive(),
})

export const agentEventSchema = z.discriminatedUnion('type', [
  eventEnvelopeSchema.extend({ type: z.literal('booking.update'), booking: bookingSnapshotSchema }),
  eventEnvelopeSchema.extend({
    type: z.literal('agent.state'),
    state: z.enum(['idle', 'listening', 'thinking', 'speaking']),
  }),
  eventEnvelopeSchema.extend({
    type: z.literal('semantic.annotation'),
    ...semanticAnnotationSchema.shape,
  }),
  eventEnvelopeSchema.extend({ type: z.literal('call.end') }),
])

export type BookingStatus = z.infer<typeof bookingStatusSchema>
export type TripSnapshot = z.infer<typeof tripSnapshotSchema>
export type BookingSnapshot = z.infer<typeof bookingSnapshotSchema>
export type CallStatus = z.infer<typeof callStatusSchema>
export type CallRole = z.infer<typeof callRoleSchema>
export type CallMessageChannel = z.infer<typeof callMessageChannelSchema>
export type CallMessage = z.infer<typeof callMessageSchema>
export type SemanticAnnotation = z.infer<typeof semanticAnnotationSchema>
export type CallWorkspace = z.infer<typeof callWorkspaceSchema>
export type AgentEvent = z.infer<typeof agentEventSchema>

export function createEmptyBooking(conversationId: string): BookingSnapshot {
  return {
    id: `booking-${conversationId}`,
    conversationId,
    status: 'collecting',
    origin: null,
    destination: null,
    travelDateLabel: null,
    passengerCount: null,
    selectedTrip: null,
    seats: [],
    passengerName: null,
    phone: null,
    totalFareVnd: null,
    bookingCode: null,
  }
}

export function createInitialCallWorkspace(): CallWorkspace {
  const conversationId = 'pending-call'
  return {
    conversationId,
    callStatus: 'idle',
    startedAt: null,
    endedAt: null,
    messages: [],
    semanticAnnotations: [],
    booking: createEmptyBooking(conversationId),
  }
}
