import { randomUUID } from 'node:crypto'
import {
  AccessToken,
  RoomAgentDispatch,
  RoomConfiguration,
} from 'livekit-server-sdk'

export type CallParticipantRole = 'caller' | 'staff'

export type LiveKitTokenRequest = {
  sessionCode: string
  role: CallParticipantRole
  displayName: string
}

export type LiveKitAccessDetails = {
  serverUrl: string
  participantToken: string
  roomName: string
  identity: string
  sessionCode: string
}

export type PublicIntegrationStatus = {
  transport: 'local' | 'livekit'
  livekit: boolean
  valsea: boolean
  voiceAgent: boolean
  persistence: boolean
  localFallback: true
}

type IntegrationEnvironment = {
  LIVEKIT_URL?: string
  LIVEKIT_API_KEY?: string
  LIVEKIT_API_SECRET?: string
  LIVEKIT_AGENT_NAME?: string
  VOICE_AGENT_ENABLED?: string
  VALSEA_API_KEY?: string
  DATABASE_URL?: string
  [key: string]: string | undefined
}

export class LiveKitConfigurationError extends Error {
  readonly code = 'LIVEKIT_NOT_CONFIGURED'

  constructor(message = 'LiveKit chưa được cấu hình đầy đủ trên máy chủ.') {
    super(message)
    this.name = 'LiveKitConfigurationError'
  }
}

export function normalizeSessionCode(input: string): string {
  const normalized = input.trim().toUpperCase().replace(/[\s-]+/gu, '')
  if (!/^[A-Z0-9]{4,12}$/u.test(normalized)) {
    throw new Error('Mã phiên phải gồm 4 đến 12 chữ cái hoặc chữ số.')
  }
  return normalized
}

export function getPublicIntegrationStatus(
  environment: IntegrationEnvironment = process.env,
): PublicIntegrationStatus {
  const livekit = Boolean(
    nonEmpty(environment.LIVEKIT_URL)
    && nonEmpty(environment.LIVEKIT_API_KEY)
    && nonEmpty(environment.LIVEKIT_API_SECRET),
  )
  const valsea = Boolean(nonEmpty(environment.VALSEA_API_KEY))
  const voiceAgent = livekit
    && valsea
    && environment.VOICE_AGENT_ENABLED?.toLocaleLowerCase('en-US') === 'true'

  return {
    transport: livekit ? 'livekit' : 'local',
    livekit,
    valsea,
    voiceAgent,
    persistence: Boolean(nonEmpty(environment.DATABASE_URL)),
    localFallback: true,
  }
}

export async function createLiveKitToken(
  request: LiveKitTokenRequest,
  environment: IntegrationEnvironment = process.env,
  idFactory: () => string = randomUUID,
): Promise<LiveKitAccessDetails> {
  const serverUrl = nonEmpty(environment.LIVEKIT_URL)
  const apiKey = nonEmpty(environment.LIVEKIT_API_KEY)
  const apiSecret = nonEmpty(environment.LIVEKIT_API_SECRET)
  if (!serverUrl || !apiKey || !apiSecret) throw new LiveKitConfigurationError()
  if (!/^wss:\/\//u.test(serverUrl)) {
    throw new LiveKitConfigurationError('LIVEKIT_URL phải dùng giao thức wss://.')
  }
  if (request.role !== 'caller' && request.role !== 'staff') {
    throw new Error('Vai trò tham gia cuộc gọi không hợp lệ.')
  }

  const sessionCode = normalizeSessionCode(request.sessionCode)
  const roomName = `vedi-${sessionCode.toLocaleLowerCase('en-US')}`
  const displayName = normalizeDisplayName(request.displayName, request.role)
  const suffix = idFactory().replace(/[^a-z0-9]/giu, '').toLocaleLowerCase('en-US').slice(0, 12) || 'participant'
  const identity = request.role === 'caller'
    ? `caller-${sessionCode}`
    : `staff-${sessionCode}-${suffix}`
  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: displayName,
    ttl: 1_200,
    metadata: JSON.stringify({ role: request.role, sessionCode }),
  })

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })

  const agentEnabled = environment.VOICE_AGENT_ENABLED?.toLocaleLowerCase('en-US') === 'true'
  if (request.role === 'caller' && agentEnabled) {
    token.roomConfig = new RoomConfiguration({
      name: roomName,
      agents: [new RoomAgentDispatch({
        agentName: nonEmpty(environment.LIVEKIT_AGENT_NAME) ?? 'vedi-booking-agent',
        metadata: JSON.stringify({ sessionCode, callerIdentity: identity }),
      })],
    })
  }

  return {
    serverUrl,
    participantToken: await token.toJwt(),
    roomName,
    identity,
    sessionCode,
  }
}

function normalizeDisplayName(value: string, role: CallParticipantRole): string {
  const normalized = value.trim().replace(/\s+/gu, ' ').slice(0, 80)
  return normalized || (role === 'caller' ? 'Khách gọi' : 'Nhân viên')
}

function nonEmpty(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}
