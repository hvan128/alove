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
})
