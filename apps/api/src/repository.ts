import type { DemoWorkspace, OrderDraft, PersistentTranscriptSegment } from '@ordervoice/contracts'
import {
  applyFinalSegment,
  approveDraft,
  createDemoCatalog,
  createInitialDraft,
  exportDraft,
  type DemoCatalog,
} from '@ordervoice/core'

export type ConversationRepository = {
  getDemo: () => DemoWorkspace
  advanceDemo: (step: number) => DemoWorkspace
  appendFinalSegment: (segment: PersistentTranscriptSegment) => DemoWorkspace
  approveOrder: (orderId: string, actor: string) => OrderDraft
  exportOrder: (orderId: string, idempotencyKey: string) => { draft: OrderDraft; externalReference: string }
}

export function createMemoryRepository(catalog: DemoCatalog = createDemoCatalog()): ConversationRepository {
  const conversationId = 'conversation-demo-001'
  const exports = new Map<string, string>()
  let workspace = createDemoWorkspace(conversationId)

  function setDraft(draft: OrderDraft): DemoWorkspace {
    workspace = { ...workspace, draft }
    return workspace
  }

  return {
    getDemo: () => workspace,
    advanceDemo(step) {
      if (step <= workspace.step) {
        return workspace
      }

      const partial = createDemoPartialSegment(conversationId)
      const final = createDemoFinalSegment(conversationId)
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
    appendFinalSegment(segment) {
      const draft = applyFinalSegment(workspace.draft, segment, catalog)
      workspace = {
        ...workspace,
        transcript: [...workspace.transcript, segment],
        draft,
      }
      return workspace
    },
    approveOrder(orderId, actor) {
      assertDraftId(workspace.draft, orderId)
      return setDraft(approveDraft(workspace.draft, actor, new Date().toISOString())).draft
    },
    exportOrder(orderId, idempotencyKey) {
      assertDraftId(workspace.draft, orderId)
      const result = exportDraft(workspace.draft, idempotencyKey, exports)
      setDraft(result.draft)
      return result
    },
  }
}

function createDemoWorkspace(conversationId: string): DemoWorkspace {
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
