import { beforeEach, describe, expect, it, vi } from 'vitest'

const execute = vi.fn()

vi.mock('@/lib/db/client', () => ({
  isDbConfigured: vi.fn(() => true),
  requireDb: vi.fn(() => ({ execute })),
}))

vi.mock('@/lib/livekit/token', () => ({
  isLiveKitConfigured: vi.fn(() => true),
  probeLiveKit: vi.fn(async () => undefined),
}))

vi.mock('@/lib/booking-verification-security', () => ({
  isBookingVerificationConfigured: vi.fn(() => true),
}))

import { isDbConfigured } from '@/lib/db/client'
import { isLiveKitConfigured, probeLiveKit } from '@/lib/livekit/token'
import { GET } from './route'

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.mocked(isDbConfigured).mockReturnValue(true)
    vi.mocked(isLiveKitConfigured).mockReturnValue(true)
    vi.mocked(probeLiveKit).mockResolvedValue(undefined)
    execute.mockResolvedValue({
      rows: [{
        hasOperator: true,
        hasSellableTrip: true,
        auditSchemaReady: true,
        snapshotSchemaReady: true,
        bookingSchemaReady: true,
        verificationSchemaReady: true,
        webhookOutboxSchemaReady: true,
      }],
    })
    process.env.AGENT_WEBHOOK_SECRET = 'test-agent-secret-at-least-32-bytes'
  })

  it('reports ready only when every production dependency is ready', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      status: 'ready',
      services: {
        database: 'ready',
        livekit: 'ready',
        agentWebhook: 'ready',
        bookingVerification: 'ready',
      },
    })
    expect(probeLiveKit).toHaveBeenCalledOnce()
  })

  it('fails readiness when the database is absent', async () => {
    vi.mocked(isDbConfigured).mockReturnValue(false)
    const response = await GET()
    expect(response.status).toBe(503)
    expect((await response.json()).services.database).toBe('not_configured')
  })

  it('fails readiness when canonical inventory is empty', async () => {
    execute.mockResolvedValue({
      rows: [{
        hasOperator: true,
        hasSellableTrip: false,
        auditSchemaReady: true,
        snapshotSchemaReady: true,
        bookingSchemaReady: true,
        verificationSchemaReady: true,
        webhookOutboxSchemaReady: true,
      }],
    })
    const response = await GET()
    expect(response.status).toBe(503)
    expect((await response.json()).services.database).toBe('not_ready')
  })

  it('performs a credentialed LiveKit probe', async () => {
    vi.mocked(probeLiveKit).mockRejectedValue(new Error('bad credentials'))
    const response = await GET()
    expect(response.status).toBe(503)
    expect((await response.json()).services.livekit).toBe('unreachable')
  })
})
