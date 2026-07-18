// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  createDispatch: vi.fn(),
  listParticipants: vi.fn(),
}))

vi.mock('livekit-server-sdk', () => ({
  AgentDispatchClient: class {
    createDispatch = sdk.createDispatch
  },
}))

vi.mock('@/lib/livekit/token', () => ({
  createRoomServiceClient: () => ({ listParticipants: sdk.listParticipants }),
  isLiveKitConfigured: () => true,
  liveKitHttpUrl: () => 'https://test.livekit.cloud',
  roomNameForConversation: (conversationId: string) => `booking-${conversationId}`,
}))

vi.mock('@/lib/livekit/call-session', () => ({
  verifyCallSession: () => ({
    version: 1,
    conversationId: 'call-1',
    identity: 'customer-1',
    expiresAt: 4_000_000_000,
  }),
}))

import { resetRateLimitsForTests } from '@/lib/rate-limit'
import { POST } from './route'

function request() {
  return new Request('http://localhost/api/livekit/redispatch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionToken: 'signed-session' }),
  })
}

describe('POST /api/livekit/redispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRateLimitsForTests()
    process.env.LIVEKIT_API_KEY = 'test-key'
    process.env.LIVEKIT_API_SECRET = 'test-secret-at-least-32-bytes-long'
  })

  it('does not create a ghost room after the customer has left', async () => {
    sdk.listParticipants.mockResolvedValue([])

    const response = await POST(request() as never)

    expect(response.status).toBe(410)
    expect(sdk.createDispatch).not.toHaveBeenCalled()
  })

  it('is idempotent when an agent is already running', async () => {
    sdk.listParticipants.mockResolvedValue([
      { identity: 'customer-1', kind: 0 },
      { identity: 'agent-1', kind: 4 },
    ])

    const response = await POST(request() as never)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, alreadyRunning: true })
    expect(sdk.createDispatch).not.toHaveBeenCalled()
  })

  it('dispatches only into a room containing the signed customer', async () => {
    sdk.listParticipants.mockResolvedValue([{ identity: 'customer-1', kind: 0 }])
    sdk.createDispatch.mockResolvedValue({ id: 'dispatch-1' })

    const response = await POST(request() as never)

    expect(response.status).toBe(200)
    expect(sdk.createDispatch).toHaveBeenCalledWith('booking-call-1', 'alove')
  })
})
