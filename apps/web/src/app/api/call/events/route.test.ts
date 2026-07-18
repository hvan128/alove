import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { POST } from './route'

const SECRET = 'test-agent-secret'

function request(body: unknown, auth: string | null = `Bearer ${SECRET}`): Request {
  return new Request('http://localhost/api/call/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: auth } : {}),
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/call/events', () => {
  beforeEach(() => {
    process.env.AGENT_WEBHOOK_SECRET = SECRET
  })
  afterEach(() => {
    process.env.AGENT_WEBHOOK_SECRET = SECRET
  })

  it('returns 503 when the agent secret is not configured', async () => {
    delete process.env.AGENT_WEBHOOK_SECRET
    const res = await POST(request({ conversationId: 'c1', type: 'call.started' }))
    expect(res.status).toBe(503)
  })

  it('rejects a missing or wrong bearer token', async () => {
    expect((await POST(request({ conversationId: 'c1', type: 'call.started' }, null))).status).toBe(401)
    expect((await POST(request({ conversationId: 'c1', type: 'call.started' }, 'Bearer nope'))).status).toBe(401)
  })

  it('rejects an unknown event type or missing conversation id', async () => {
    expect((await POST(request({ conversationId: 'c1', type: 'call.paused' }))).status).toBe(400)
    expect((await POST(request({ type: 'call.started' }))).status).toBe(400)
  })

  it('accepts start and end events without a configured database', async () => {
    // No DATABASE_URL in tests — persistence must degrade to a silent no-op.
    const started = await POST(
      request({ conversationId: 'c1', type: 'call.started', channel: 'phone', callerNumber: '+84901234567' }),
    )
    expect(started.status).toBe(200)
    const ended = await POST(request({ conversationId: 'c1', type: 'call.ended' }))
    expect(ended.status).toBe(200)
  })
})
