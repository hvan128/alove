import type {
  Evidence,
  OrderDraft,
  OrderException,
  OrderLine,
  TranscriptSegment,
} from '@ordervoice/contracts'

export type CatalogProduct = {
  sku: string
  label: string
  aliases: string[]
}

export type CatalogCustomer = {
  id: string
  label: string
  aliases: string[]
}

export type DemoCatalog = {
  products: CatalogProduct[]
  customers: CatalogCustomer[]
}

export type HumanLineCorrection = {
  lineId: string
  sku: string
  productLabel: string
  quantity: number
  unit: string
}

export function createDemoCatalog(): DemoCatalog {
  return {
    customers: [
      { id: 'CUS-LAN-ANH', label: 'Cửa hàng Lan Anh', aliases: ['chị lan', 'lan anh', 'cửa hàng lan anh'] },
      { id: 'CUS-MINH-PHAT', label: 'Minh Phát Foods', aliases: ['anh minh', 'minh phát', 'minh phat'] },
      { id: 'CUS-AN-NHIEN', label: 'An Nhiên Café', aliases: ['an nhiên', 'an nhien'] },
      { id: 'CUS-HOA-BINH', label: 'Hòa Bình Mart', aliases: ['hòa bình', 'hoa binh'] },
      { id: 'CUS-SAI-GON', label: 'Sài Gòn Pantry', aliases: ['sài gòn pantry', 'saigon pantry'] },
    ],
    products: [
      { sku: 'CF-ARABICA-1KG', label: 'Arabica Premium', aliases: ['cà phê arabica', 'ca phe arabica', 'arabica'] },
      { sku: 'OM-OAT-1L', label: 'Oat Milk 1L', aliases: ['oat milk 1l', 'sữa yến mạch 1l', 'sua yen mach 1l'] },
      { sku: 'CF-HOUSE-BLEND', label: 'House Blend', aliases: ['cà phê house', 'ca phe house', 'house blend'] },
      { sku: 'CF-HOUSE-DECAF', label: 'House Decaf', aliases: ['cà phê house', 'ca phe house', 'house decaf'] },
      { sku: 'SYR-VAN-750', label: 'Vanilla Syrup 750ml', aliases: ['vanilla syrup', 'siro vanilla'] },
    ],
  }
}

export function createInitialDraft(conversationId: string): OrderDraft {
  return {
    id: `order-${conversationId}`,
    conversationId,
    customerId: null,
    customerName: null,
    status: 'capturing',
    lines: [],
    exceptions: [],
    approvedBy: null,
    approvedAt: null,
    externalReference: null,
  }
}

export function applyFinalSegment(draft: OrderDraft, segment: TranscriptSegment, catalog: DemoCatalog): OrderDraft {
  if (segment.kind !== 'final' || draft.status === 'exported') {
    return draft
  }

  const customer = resolveCustomer(segment.text, catalog.customers)
  const extracted = extractLines(segment, catalog.products)

  if (extracted.lines.length === 0) {
    return draft
  }

  const lines = [...draft.lines, ...extracted.lines]
  const exceptions = [...draft.exceptions, ...extracted.exceptions]
  const blocking = exceptions.some((exception) => exception.blocking)

  return {
    ...draft,
    customerId: customer?.id ?? draft.customerId,
    customerName: customer?.label ?? draft.customerName,
    lines,
    exceptions,
    approvedBy: null,
    approvedAt: null,
    status: blocking ? 'review_required' : 'ready_for_approval',
  }
}

export function applyHumanLineCorrection(draft: OrderDraft, correction: HumanLineCorrection): OrderDraft {
  if (draft.status === 'exported') {
    throw new Error('an exported draft cannot be corrected')
  }
  if (!Number.isFinite(correction.quantity) || correction.quantity <= 0) {
    throw new Error('corrected quantity must be greater than zero')
  }
  if (!correction.sku.trim() || !correction.productLabel.trim() || !correction.unit.trim()) {
    throw new Error('corrected SKU, product label and unit are required')
  }
  if (!draft.lines.some((line) => line.id === correction.lineId)) {
    throw new Error('order line was not found')
  }

  const lines = draft.lines.map((line) => line.id === correction.lineId ? {
    ...line,
    sku: correction.sku.trim(),
    productLabel: correction.productLabel.trim(),
    quantity: correction.quantity,
    unit: correction.unit.trim(),
    resolution: 'resolved' as const,
  } : line)
  const exceptions = draft.exceptions.filter((exception) => exception.lineId !== correction.lineId)
  const blocking = exceptions.some((exception) => exception.blocking)

  return {
    ...draft,
    lines,
    exceptions,
    status: blocking ? 'review_required' : 'ready_for_approval',
    approvedBy: null,
    approvedAt: null,
  }
}

export function approveDraft(draft: OrderDraft, actor: string, approvedAt: string): OrderDraft {
  if (draft.status === 'exported') {
    throw new Error('an exported draft cannot be approved again')
  }

  if (draft.lines.length === 0 || draft.exceptions.some((exception) => exception.blocking)) {
    throw new Error('draft has blocking exceptions')
  }

  return {
    ...draft,
    status: 'approved',
    approvedBy: actor,
    approvedAt,
  }
}

export function exportDraft(
  draft: OrderDraft,
  idempotencyKey: string,
  exports: Map<string, string>,
): { draft: OrderDraft; externalReference: string } {
  if (draft.status !== 'approved' && draft.status !== 'exported') {
    throw new Error('human approval is required before ERP export')
  }

  const externalReference = exports.get(idempotencyKey) ?? `ERP-DRAFT-${String(exports.size + 1).padStart(4, '0')}`
  exports.set(idempotencyKey, externalReference)

  return {
    externalReference,
    draft: {
      ...draft,
      status: 'exported',
      externalReference,
    },
  }
}

function resolveCustomer(text: string, customers: CatalogCustomer[]): CatalogCustomer | undefined {
  const normalizedText = normalize(text)
  return customers.find((customer) => customer.aliases.some((alias) => normalizedText.includes(normalize(alias))))
}

function extractLines(
  segment: TranscriptSegment,
  products: CatalogProduct[],
): { lines: OrderLine[]; exceptions: OrderException[] } {
  const matcher = /(?:lấy|thêm|cho|đặt)\s+(\d+)\s+(thùng|pack|chai|hộp)\s+([^,.!?]+)/giu
  const lines: OrderLine[] = []
  const exceptions: OrderException[] = []
  let match = matcher.exec(segment.text)

  while (match) {
    const quantity = Number(match[1])
    const unit = match[2]?.trim() ?? null
    const phrase = match[3]?.trim() ?? ''
    const evidence = createEvidence(segment, match[0])
    const resolution = resolveProduct(phrase, products)
    const id = `${segment.id}-line-${String(lines.length + 1)}`

    if (!Number.isFinite(quantity) || quantity <= 0) {
      const line = createLine(id, phrase, null, null, unit, 'unresolved', evidence)
      lines.push(line)
      exceptions.push(createException(id, 'QUANTITY_INVALID', 'Số lượng phải lớn hơn 0.'))
    } else if (resolution.kind === 'resolved') {
      lines.push(createLine(id, resolution.product.label, resolution.product.sku, quantity, unit, 'resolved', evidence))
    } else if (resolution.kind === 'ambiguous') {
      lines.push(createLine(id, phrase, null, quantity, unit, 'ambiguous', evidence))
      exceptions.push(createException(id, 'SKU_AMBIGUOUS', `Cần chọn một SKU cho “${phrase}”.`))
    } else {
      lines.push(createLine(id, phrase, null, quantity, unit, 'unresolved', evidence))
      exceptions.push(createException(id, 'SKU_UNRESOLVED', `Không tìm thấy SKU cho “${phrase}”.`))
    }

    match = matcher.exec(segment.text)
  }

  return { lines, exceptions }
}

function resolveProduct(
  phrase: string,
  products: CatalogProduct[],
): { kind: 'resolved'; product: CatalogProduct } | { kind: 'ambiguous' } | { kind: 'unresolved' } {
  const normalizedPhrase = normalize(phrase)
  const matches = products.filter((product) =>
    product.aliases.some((alias) => {
      const normalizedAlias = normalize(alias)
      return normalizedPhrase.includes(normalizedAlias) || normalizedAlias.includes(normalizedPhrase)
    }),
  )

  if (matches.length === 1) {
    return { kind: 'resolved', product: matches[0]! }
  }

  return matches.length > 1 ? { kind: 'ambiguous' } : { kind: 'unresolved' }
}

function createEvidence(segment: TranscriptSegment, quote: string): Evidence {
  return {
    segmentId: segment.id,
    quote,
    startMs: segment.startedAtMs,
    endMs: segment.endedAtMs,
    confidence: segment.confidence ?? 0.5,
  }
}

function createLine(
  id: string,
  productLabel: string,
  sku: string | null,
  quantity: number | null,
  unit: string | null,
  resolution: OrderLine['resolution'],
  evidence: Evidence,
): OrderLine {
  return { id, sku, productLabel, quantity, unit, resolution, evidence: [evidence] }
}

function createException(
  lineId: string,
  code: OrderException['code'],
  message: string,
): OrderException {
  return {
    id: `${lineId}-${code.toLowerCase()}`,
    code,
    message,
    blocking: true,
    lineId,
  }
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('vi-VN')
    .replace(/đ/gu, 'd')
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim()
}
