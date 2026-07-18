// @vitest-environment node

import { TokenVerifier } from 'livekit-server-sdk'
import { describe, expect, it } from 'vitest'
import {
  createLiveKitToken,
  getPublicIntegrationStatus,
  LiveKitConfigurationError,
  normalizeSessionCode,
} from './server'

const env = {
  LIVEKIT_URL: 'wss://vedi-demo.livekit.cloud',
  LIVEKIT_API_KEY: 'api-key-demo',
  LIVEKIT_API_SECRET: 'secret-demo-with-more-than-thirty-two-characters',
  LIVEKIT_AGENT_NAME: 'vedi-booking-agent',
  VOICE_AGENT_ENABLED: 'true',
  VALSEA_API_KEY: 'valsea-secret',
  DATABASE_URL: 'postgresql://secret',
}

describe('LiveKit server boundary', () => {
  it('normalizes safe demo codes and rejects unsafe or undersized input', () => {
    expect(normalizeSessionCode(' demo-42 ')).toBe('DEMO42')
    expect(normalizeSessionCode('ve di 2026')).toBe('VEDI2026')
    expect(() => normalizeSessionCode('<script>')).toThrow(/mã phiên/iu)
    expect(() => normalizeSessionCode('A')).toThrow(/mã phiên/iu)
  })

  it('creates a room-scoped short-lived caller token with named agent dispatch', async () => {
    const details = await createLiveKitToken({
      sessionCode: 'demo42',
      role: 'caller',
      displayName: 'Khách gọi thử',
    }, env, () => 'fixed-id')
    const claims = await new TokenVerifier(
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET,
    ).verify(details.participantToken)

    expect(details).toMatchObject({
      serverUrl: env.LIVEKIT_URL,
      roomName: 'vedi-demo42',
      identity: 'caller-DEMO42',
      sessionCode: 'DEMO42',
    })
    expect(claims.video).toMatchObject({
      room: 'vedi-demo42',
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })
    expect(claims.roomConfig?.agents).toHaveLength(1)
    expect(claims.roomConfig?.agents?.[0]?.agentName).toBe('vedi-booking-agent')
    expect(JSON.parse(claims.roomConfig?.agents?.[0]?.metadata ?? '{}')).toEqual({
      sessionCode: 'DEMO42',
      callerIdentity: 'caller-DEMO42',
    })
    expect((claims.exp ?? 0) - (claims.nbf ?? 0)).toBeLessThanOrEqual(1_210)
  })

  it('creates unique staff identities and never dispatches another agent', async () => {
    const first = await createLiveKitToken({
      sessionCode: 'DEMO42',
      role: 'staff',
      displayName: 'Linh',
    }, env, () => 'staff-a')
    const second = await createLiveKitToken({
      sessionCode: 'DEMO42',
      role: 'staff',
      displayName: 'Minh',
    }, env, () => 'staff-b')
    const claims = await new TokenVerifier(
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET,
    ).verify(first.participantToken)

    expect(first.identity).toBe('staff-DEMO42-staffa')
    expect(second.identity).toBe('staff-DEMO42-staffb')
    expect(first.identity).not.toBe(second.identity)
    expect(claims.roomConfig?.agents ?? []).toHaveLength(0)
  })

  it('does not dispatch a caller agent when the worker feature is disabled', async () => {
    const details = await createLiveKitToken({
      sessionCode: 'DEMO42',
      role: 'caller',
      displayName: 'Khách',
    }, { ...env, VOICE_AGENT_ENABLED: 'false' }, () => 'caller-a')
    const claims = await new TokenVerifier(
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET,
    ).verify(details.participantToken)

    expect(claims.roomConfig?.agents ?? []).toHaveLength(0)
  })

  it('does not dispatch a caller agent before VALSEA readiness is configured', async () => {
    const environmentWithoutValsea: Partial<typeof env> = { ...env }
    delete environmentWithoutValsea.VALSEA_API_KEY
    const details = await createLiveKitToken({
      sessionCode: 'DEMO42',
      role: 'caller',
      displayName: 'Khách',
    }, environmentWithoutValsea, () => 'caller-a')
    const claims = await new TokenVerifier(
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET,
    ).verify(details.participantToken)

    expect(claims.roomConfig?.agents ?? []).toHaveLength(0)
  })

  it('returns boolean integration readiness without exposing secret values', () => {
    const status = getPublicIntegrationStatus(env)
    const serialized = JSON.stringify(status)
    const environmentWithoutValseaSecret: Partial<typeof env> = { ...env }
    delete environmentWithoutValseaSecret.VALSEA_API_KEY

    expect(status).toEqual({
      transport: 'livekit',
      livekit: true,
      valsea: true,
      voiceAgent: true,
      persistence: true,
      operatorDemo: false,
      localFallback: true,
    })
    expect(serialized).not.toContain('secret')
    expect(serialized).not.toContain('api-key-demo')
    expect(getPublicIntegrationStatus({})).toMatchObject({
      transport: 'local',
      livekit: false,
      valsea: false,
      voiceAgent: false,
      persistence: false,
    })
    expect(getPublicIntegrationStatus({
      ...environmentWithoutValseaSecret,
      VALSEA_ENABLED: 'true',
    })).toMatchObject({ valsea: true, voiceAgent: true })
  })

  it('fails with a typed configuration error when signing values are incomplete', async () => {
    await expect(createLiveKitToken({
      sessionCode: 'DEMO42',
      role: 'caller',
      displayName: 'Khách',
    }, { LIVEKIT_URL: env.LIVEKIT_URL })).rejects.toBeInstanceOf(LiveKitConfigurationError)
  })
})
