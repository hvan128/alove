import { afterEach, describe, expect, it } from 'vitest'
import { createServer } from '../src/server.js'

const apps: Awaited<ReturnType<typeof createServer>>[] = []

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe('operator gateway API', () => {
  it('serves a safe health response without provider credentials', async () => {
    const app = await createServer()
    apps.push(app)

    const response = await app.inject({ method: 'GET', url: '/v1/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('returns one ERP draft reference for a human-approved demo export retry', async () => {
    const app = await createServer()
    apps.push(app)

    await app.inject({ method: 'POST', url: '/v1/demo/advance', payload: { step: 1 } })
    const workspace = (await app.inject({ method: 'GET', url: '/v1/demo' })).json()
    const approved = await app.inject({
      method: 'POST',
      url: `/v1/orders/${workspace.draft.id}/approve`,
      payload: { actor: 'nguyen.thi.lan' },
    })
    expect(approved.statusCode).toBe(200)

    const one = await app.inject({
      method: 'POST',
      url: `/v1/orders/${workspace.draft.id}/export`,
      payload: { idempotencyKey: 'demo-erp-1' },
    })
    const two = await app.inject({
      method: 'POST',
      url: `/v1/orders/${workspace.draft.id}/export`,
      payload: { idempotencyKey: 'demo-erp-1' },
    })

    expect(one.statusCode).toBe(200)
    expect(one.json().externalReference).toBe(two.json().externalReference)
  })

  it('clears an ambiguous line only after an explicit operator correction', async () => {
    const app = await createServer()
    apps.push(app)
    const workspace = (await app.inject({ method: 'GET', url: '/v1/demo' })).json()
    const segment = {
      id: 'segment-house-1',
      conversationId: workspace.conversationId,
      kind: 'final',
      speaker: 'caller',
      text: 'Lấy 2 thùng cà phê house.',
      startedAtMs: 0,
      endedAtMs: 1800,
      confidence: 0.94,
      source: 'browser',
    }
    await app.inject({ method: 'POST', url: `/v1/conversations/${workspace.conversationId}/segments`, payload: segment })
    const withException = (await app.inject({ method: 'GET', url: '/v1/demo' })).json()
    const line = withException.draft.lines[0]

    const response = await app.inject({
      method: 'POST',
      url: `/v1/orders/${withException.draft.id}/lines/${line.id}/correct`,
      payload: { sku: 'CF-HOUSE-BLEND', productLabel: 'House Blend', quantity: 4, unit: 'thùng' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ status: 'ready_for_approval', exceptions: [] })
  })

  it('applies a duplicated final transcript only once', async () => {
    const app = await createServer()
    apps.push(app)
    const workspace = (await app.inject({ method: 'GET', url: '/v1/demo' })).json()
    const segment = {
      id: 'segment-duplicate-1',
      conversationId: workspace.conversationId,
      kind: 'final',
      speaker: 'caller',
      text: 'Lấy 2 thùng cà phê Arabica.',
      startedAtMs: 0,
      endedAtMs: 1600,
      confidence: 0.95,
      source: 'browser',
      providerEventId: 'provider-final-duplicate-1',
    }

    await app.inject({ method: 'POST', url: `/v1/conversations/${workspace.conversationId}/segments`, payload: segment })
    await app.inject({ method: 'POST', url: `/v1/conversations/${workspace.conversationId}/segments`, payload: segment })
    const result = (await app.inject({ method: 'GET', url: '/v1/demo' })).json()

    expect(result.transcript).toHaveLength(1)
    expect(result.draft.lines).toHaveLength(1)
  })
})
