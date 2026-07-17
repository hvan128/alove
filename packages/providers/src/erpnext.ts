import type { OrderDraft } from '@ordervoice/contracts'

export type ErpNextOptions = {
  baseUrl: string
  apiKey: string
  apiSecret: string
}

export type ErpNextDraftResult = {
  externalReference: string
}

export async function createErpNextDraft(
  draft: OrderDraft,
  idempotencyKey: string,
  options: ErpNextOptions,
  fetcher: typeof fetch = fetch,
): Promise<ErpNextDraftResult> {
  const response = await fetcher(`${options.baseUrl.replace(/\/$/u, '')}/api/resource/Sales Order`, {
    method: 'POST',
    headers: {
      Authorization: `token ${options.apiKey}:${options.apiSecret}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      customer_name: draft.customerName,
      items: draft.lines.map((line) => ({ item_code: line.sku, qty: line.quantity, uom: line.unit })),
      ordervoice_draft_id: draft.id,
    }),
  })

  if (!response.ok) {
    throw new Error(`ERPNext draft export failed with HTTP ${response.status}`)
  }

  const body = await response.json() as { data?: { name?: string } }
  const externalReference = body.data?.name
  if (!externalReference) {
    throw new Error('ERPNext draft export response omitted its reference')
  }

  return { externalReference }
}
