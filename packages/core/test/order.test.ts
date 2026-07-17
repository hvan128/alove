import { describe, expect, it } from 'vitest'
import type { TranscriptSegment } from '@ordervoice/contracts'
import {
  applyHumanLineCorrection,
  applyFinalSegment,
  approveDraft,
  createDemoCatalog,
  createInitialDraft,
  exportDraft,
} from '../src/order.js'

const catalog = createDemoCatalog()

function segment(kind: 'partial' | 'final', text: string): TranscriptSegment {
  return {
    id: `${kind}-${text.length}`,
    conversationId: 'conversation-1',
    kind,
    speaker: 'caller',
    text,
    startedAtMs: 0,
    endedAtMs: 4200,
    confidence: 0.96,
    source: 'browser',
  }
}

describe('evidence-backed order draft', () => {
  it('does not mutate a draft from provisional speech', () => {
    const draft = createInitialDraft('conversation-1')

    expect(applyFinalSegment(draft, segment('partial', 'lấy mười hai thùng Arabica'), catalog)).toBe(draft)
  })

  it('creates evidence-backed resolved lines from a final Vietnamese/code-switching order', () => {
    const draft = applyFinalSegment(
      createInitialDraft('conversation-1'),
      segment('final', 'Chị Lan lấy 12 thùng cà phê Arabica, thêm 3 pack Oat Milk 1L.'),
      catalog,
    )

    expect(draft.lines).toMatchObject([
      { sku: 'CF-ARABICA-1KG', productLabel: 'Arabica Premium', quantity: 12, unit: 'thùng', resolution: 'resolved' },
      { sku: 'OM-OAT-1L', productLabel: 'Oat Milk 1L', quantity: 3, unit: 'pack', resolution: 'resolved' },
    ])
    expect(draft.lines[0]?.evidence[0]?.quote).toContain('12 thùng cà phê Arabica')
    expect(draft.status).toBe('ready_for_approval')
  })

  it('holds an ambiguous product phrase for human review', () => {
    const draft = applyFinalSegment(
      createInitialDraft('conversation-1'),
      segment('final', 'Lấy 2 thùng cà phê house.'),
      catalog,
    )

    expect(draft.exceptions).toContainEqual(expect.objectContaining({ code: 'SKU_AMBIGUOUS', blocking: true }))
    expect(draft.status).toBe('review_required')
  })

  it('requires an explicit operator correction to clear a blocking SKU exception', () => {
    const ambiguous = applyFinalSegment(
      createInitialDraft('conversation-1'),
      segment('final', 'Lấy 2 thùng cà phê house.'),
      catalog,
    )
    const originalEvidence = ambiguous.lines[0]?.evidence

    const corrected = applyHumanLineCorrection(ambiguous, {
      lineId: ambiguous.lines[0]!.id,
      sku: 'CF-HOUSE-BLEND',
      productLabel: 'House Blend',
      quantity: 4,
      unit: 'thùng',
    })

    expect(corrected.status).toBe('ready_for_approval')
    expect(corrected.exceptions).toEqual([])
    expect(corrected.lines[0]).toMatchObject({ sku: 'CF-HOUSE-BLEND', productLabel: 'House Blend', quantity: 4, resolution: 'resolved' })
    expect(corrected.lines[0]?.evidence).toEqual(originalEvidence)
  })

  it('requires human approval and reuses the same export reference on retry', () => {
    const draft = applyFinalSegment(
      createInitialDraft('conversation-1'),
      segment('final', 'Lấy 2 thùng cà phê Arabica.'),
      catalog,
    )
    const approved = approveDraft(draft, 'nguyen.thi.lan', '2026-07-18T09:00:00.000Z')
    const exports = new Map<string, string>()

    const first = exportDraft(approved, 'erp-key-1', exports)
    const retry = exportDraft(approved, 'erp-key-1', exports)

    expect(first.externalReference).toBe(retry.externalReference)
    expect(first.draft.status).toBe('exported')
  })
})
