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
