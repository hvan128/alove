import { eq } from 'drizzle-orm'
import {
  demoWorkspaceSchema,
  orderExceptionSchema,
  orderDraftSchema,
  replySchema,
  transcriptSegmentSchema,
  type DemoWorkspace,
  type OrderDraft,
  type PersistentTranscriptSegment,
  type TranscriptSegment,
} from '@ordervoice/contracts'
import {
  applyHumanLineCorrection,
  applyFinalSegment,
  approveDraft,
  createDemoCatalog,
  createInitialDraft,
  exportDraft,
  type DemoCatalog,
  type HumanLineCorrection,
} from '@ordervoice/core'
import {
  conversations,
  exports as erpExports,
  getDb,
  orderDrafts,
  orderEvidence,
  orderLines,
  replies,
  transcriptSegments,
} from '@ordervoice/db'

export type RepositoryMode = 'demo-memory' | 'neon'

export type ConversationRepository = {
  mode: RepositoryMode
  getDemo: () => Promise<DemoWorkspace>
  advanceDemo: (step: number) => Promise<DemoWorkspace>
  appendFinalSegment: (segment: PersistentTranscriptSegment) => Promise<DemoWorkspace>
  correctOrderLine: (orderId: string, correction: HumanLineCorrection) => Promise<OrderDraft>
  approveOrder: (orderId: string, actor: string) => Promise<OrderDraft>
  exportOrder: (orderId: string, idempotencyKey: string) => Promise<{ draft: OrderDraft; externalReference: string }>
}

export function createRepositoryFromEnvironment(): ConversationRepository {
  return process.env.DATABASE_URL ? createNeonRepository() : createMemoryRepository()
}

export function createMemoryRepository(
  catalog: DemoCatalog = createDemoCatalog(),
  initialWorkspace: DemoWorkspace = createDemoWorkspace('conversation-demo-001'),
): ConversationRepository {
  const exports = new Map<string, string>()
  let workspace = initialWorkspace

  function setDraft(draft: OrderDraft): DemoWorkspace {
    workspace = { ...workspace, draft }
    return workspace
  }

  return {
    mode: 'demo-memory',
    async getDemo() {
      return workspace
    },
    async advanceDemo(step) {
      if (step <= workspace.step) {
        return workspace
      }

      const partial = createDemoPartialSegment(workspace.conversationId)
      const final = createDemoFinalSegment(workspace.conversationId)
      const draft = applyFinalSegment(workspace.draft, final, catalog)
      workspace = {
        ...workspace,
        step,
        sourceStates: { ...workspace.sourceStates, browser: 'demo' },
        transcript: [partial, final],
        draft,
      }
      return workspace
    },
    async appendFinalSegment(segment) {
      if (hasFinalSegment(workspace, segment)) {
        return workspace
      }
      const draft = applyFinalSegment(workspace.draft, segment, catalog)
      workspace = {
        ...workspace,
        transcript: [...workspace.transcript, segment],
        draft,
      }
      return workspace
    },
    async correctOrderLine(orderId, correction) {
      assertDraftId(workspace.draft, orderId)
      return setDraft(applyHumanLineCorrection(workspace.draft, correction)).draft
    },
    async approveOrder(orderId, actor) {
      assertDraftId(workspace.draft, orderId)
      return setDraft(approveDraft(workspace.draft, actor, new Date().toISOString())).draft
    },
    async exportOrder(orderId, idempotencyKey) {
      assertDraftId(workspace.draft, orderId)
      const result = exportDraft(workspace.draft, idempotencyKey, exports)
      setDraft(result.draft)
      return result
    },
  }
}

export function createNeonRepository(catalog: DemoCatalog = createDemoCatalog()): ConversationRepository {
  let memory = createMemoryRepository(catalog)
  let ready = false

  async function ensureReady(): Promise<void> {
    if (ready) {
      return
    }

    const initial = await memory.getDemo()
    const hydrated = await hydrateWorkspace(initial)
    memory = createMemoryRepository(catalog, hydrated)
    ready = true
  }

  return {
    mode: 'neon',
    async getDemo() {
      await ensureReady()
      return memory.getDemo()
    },
    async advanceDemo(step) {
      await ensureReady()
      const workspace = await memory.advanceDemo(step)
      await persistWorkspace(workspace)
      return workspace
    },
    async appendFinalSegment(segment) {
      await ensureReady()
      const workspace = await memory.appendFinalSegment(segment)
      await persistWorkspace(workspace)
      return workspace
    },
    async correctOrderLine(orderId, correction) {
      await ensureReady()
      const draft = await memory.correctOrderLine(orderId, correction)
      await persistWorkspace(await memory.getDemo())
      return draft
    },
    async approveOrder(orderId, actor) {
      await ensureReady()
      const draft = await memory.approveOrder(orderId, actor)
      await persistWorkspace(await memory.getDemo())
      return draft
    },
    async exportOrder(orderId, idempotencyKey) {
      await ensureReady()
      const database = getDb()
      const [existing] = await database
        .select({ externalReference: erpExports.externalReference })
        .from(erpExports)
        .where(eq(erpExports.idempotencyKey, idempotencyKey))
        .limit(1)

      if (existing) {
        const current = await memory.getDemo()
        assertDraftId(current.draft, orderId)
        return {
          externalReference: existing.externalReference,
          draft: { ...current.draft, status: 'exported', externalReference: existing.externalReference },
        }
      }

      const result = await memory.exportOrder(orderId, idempotencyKey)
      await persistWorkspace(await memory.getDemo())
      await database.insert(erpExports).values({
        idempotencyKey,
        orderDraftId: result.draft.id,
        externalReference: result.externalReference,
        requestSnapshot: result.draft,
      }).onConflictDoNothing()
      return result
    },
  }
}

export function createDemoWorkspace(conversationId: string): DemoWorkspace {
  return {
    conversationId,
    activeSource: 'browser',
    sourceStates: { browser: 'demo', telephony: 'unavailable', replay: 'ready' },
    isDemo: true,
    transcript: [],
    draft: createInitialDraft(conversationId),
    reply: {
      id: 'reply-demo-001',
      conversationId,
      text: 'Dạ em đã ghi nhận 12 thùng Arabica Premium và 3 pack Oat Milk 1L. Chị Lan vui lòng xác nhận giúp em nhé.',
      approvedForSpeech: true,
    },
    step: 0,
  }
}

async function hydrateWorkspace(initial: DemoWorkspace): Promise<DemoWorkspace> {
  const database = getDb()
  const [storedDraft] = await database.select().from(orderDrafts)
    .where(eq(orderDrafts.id, initial.draft.id)).limit(1)

  if (!storedDraft) {
    await persistWorkspace(initial)
    return initial
  }

  const [segmentRows, lineRows, evidenceRows, replyRows] = await Promise.all([
    database.select().from(transcriptSegments).where(eq(transcriptSegments.conversationId, initial.conversationId)),
    database.select().from(orderLines).where(eq(orderLines.orderDraftId, initial.draft.id)),
    database.select().from(orderEvidence),
    database.select().from(replies).where(eq(replies.conversationId, initial.conversationId)).limit(1),
  ])

  const transcript = transcriptSegmentSchema.array().parse(segmentRows.map((segment) => ({
    id: segment.id,
    conversationId: segment.conversationId,
    kind: 'final',
    speaker: segment.speaker,
    text: segment.text,
    startedAtMs: segment.startedAtMs,
    endedAtMs: segment.endedAtMs,
    confidence: segment.confidence,
    source: segment.source,
    ...(segment.providerEventId ? { providerEventId: segment.providerEventId } : {}),
  })))
  const lines = lineRows.map((line) => ({
    id: line.id,
    sku: line.sku,
    productLabel: line.productLabel,
    quantity: line.quantity,
    unit: line.unit,
    resolution: line.resolution,
    evidence: evidenceRows.filter((evidence) => evidence.orderLineId === line.id).map((evidence) => ({
      segmentId: evidence.segmentId,
      quote: evidence.quote,
      startMs: evidence.startMs,
      endMs: evidence.endMs,
      confidence: evidence.confidence,
    })),
  }))
  const draft = orderDraftSchema.parse({
    id: storedDraft.id,
    conversationId: storedDraft.conversationId,
    customerId: storedDraft.customerId,
    customerName: storedDraft.customerName,
    status: storedDraft.status,
    lines,
    exceptions: orderExceptionSchema.array().parse(storedDraft.exceptions),
    approvedBy: storedDraft.approvedBy,
    approvedAt: storedDraft.approvedAt?.toISOString() ?? null,
    externalReference: storedDraft.externalReference,
  })
  const reply = replySchema.parse(replyRows[0] ?? initial.reply)

  return demoWorkspaceSchema.parse({
    ...initial,
    transcript,
    draft,
    reply,
    step: transcript.length > 0 ? 1 : 0,
  })
}

async function persistWorkspace(workspace: DemoWorkspace): Promise<void> {
  const database = getDb()
  await database.insert(conversations).values({
    id: workspace.conversationId,
    source: workspace.activeSource,
  }).onConflictDoNothing()

  const finalSegments = workspace.transcript.filter((segment) => segment.kind === 'final')
  if (finalSegments.length > 0) {
    await database.insert(transcriptSegments).values(finalSegments.map((segment) => ({
      id: segment.id,
      conversationId: segment.conversationId,
      providerEventId: segment.providerEventId ?? null,
      speaker: segment.speaker,
      text: segment.text,
      startedAtMs: segment.startedAtMs,
      endedAtMs: segment.endedAtMs,
      confidence: segment.confidence,
      source: segment.source,
    }))).onConflictDoNothing()
  }

  await database.insert(orderDrafts).values({
    id: workspace.draft.id,
    conversationId: workspace.draft.conversationId,
    customerId: workspace.draft.customerId,
    customerName: workspace.draft.customerName,
    status: workspace.draft.status,
    approvedBy: workspace.draft.approvedBy,
    approvedAt: workspace.draft.approvedAt ? new Date(workspace.draft.approvedAt) : null,
    externalReference: workspace.draft.externalReference,
    exceptions: workspace.draft.exceptions,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: orderDrafts.id,
    set: {
      customerId: workspace.draft.customerId,
      customerName: workspace.draft.customerName,
      status: workspace.draft.status,
      approvedBy: workspace.draft.approvedBy,
      approvedAt: workspace.draft.approvedAt ? new Date(workspace.draft.approvedAt) : null,
      externalReference: workspace.draft.externalReference,
      exceptions: workspace.draft.exceptions,
      updatedAt: new Date(),
    },
  })

  await database.delete(orderLines).where(eq(orderLines.orderDraftId, workspace.draft.id))
  if (workspace.draft.lines.length > 0) {
    await database.insert(orderLines).values(workspace.draft.lines.map((line) => ({
      id: line.id,
      orderDraftId: workspace.draft.id,
      sku: line.sku,
      productLabel: line.productLabel,
      quantity: line.quantity,
      unit: line.unit,
      resolution: line.resolution,
    })))
    const evidence = workspace.draft.lines.flatMap((line) => line.evidence.map((item, index) => ({
      id: `${line.id}-evidence-${String(index + 1)}`,
      orderLineId: line.id,
      segmentId: item.segmentId,
      quote: item.quote,
      startMs: item.startMs,
      endMs: item.endMs,
      confidence: item.confidence,
    })))
    if (evidence.length > 0) {
      await database.insert(orderEvidence).values(evidence)
    }
  }

  await database.insert(replies).values({
    id: workspace.reply.id,
    conversationId: workspace.reply.conversationId,
    text: workspace.reply.text,
    approvedForSpeech: workspace.reply.approvedForSpeech,
  }).onConflictDoUpdate({
    target: replies.id,
    set: { text: workspace.reply.text, approvedForSpeech: workspace.reply.approvedForSpeech },
  })
}

function createDemoPartialSegment(conversationId: string): DemoWorkspace['transcript'][number] {
  return {
    id: 'segment-demo-partial-001',
    conversationId,
    kind: 'partial',
    speaker: 'caller',
    text: 'Chị Lan lấy mười hai thùng cà phê…',
    startedAtMs: 0,
    endedAtMs: 1800,
    confidence: 0.72,
    source: 'browser',
  }
}

function createDemoFinalSegment(conversationId: string): PersistentTranscriptSegment {
  return {
    id: 'segment-demo-final-001',
    conversationId,
    kind: 'final',
    speaker: 'caller',
    text: 'Chị Lan lấy 12 thùng cà phê Arabica, thêm 3 pack Oat Milk 1L.',
    startedAtMs: 0,
    endedAtMs: 5100,
    confidence: 0.96,
    source: 'browser',
    providerEventId: 'demo-final-001',
  }
}

function assertDraftId(draft: OrderDraft, orderId: string): void {
  if (draft.id !== orderId) {
    throw new Error('order was not found')
  }
}

function hasFinalSegment(workspace: DemoWorkspace, incoming: PersistentTranscriptSegment): boolean {
  const key = finalSegmentKey(incoming)
  return workspace.transcript.some((segment) => segment.kind === 'final' && finalSegmentKey(segment) === key)
}

function finalSegmentKey(segment: Pick<TranscriptSegment, 'providerEventId' | 'source' | 'speaker' | 'startedAtMs' | 'endedAtMs' | 'text'>): string {
  if (segment.providerEventId) {
    return `provider:${segment.providerEventId}`
  }
  return `${segment.source}:${segment.speaker}:${segment.startedAtMs}:${segment.endedAtMs}:${segment.text}`
}
