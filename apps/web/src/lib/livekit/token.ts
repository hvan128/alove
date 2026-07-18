import { AccessToken, RoomAgentDispatch, RoomConfiguration, RoomServiceClient } from 'livekit-server-sdk'

// Public room URL is exposed to the browser (never a secret). Server-only key/secret
// stay in LIVEKIT_API_KEY / LIVEKIT_API_SECRET and are used to mint short-lived tokens.
export const LIVEKIT_WS_URL = process.env.LIVEKIT_URL ?? ''

// Named agent for explicit dispatch. A deployed Cloud Agent is not auto-dispatched,
// so the room must request it by name when the customer joins. Must match the agent
// worker's registered name (LIVEKIT_AGENT_NAME in agent/.env).
const LIVEKIT_AGENT_NAME = process.env.LIVEKIT_AGENT_NAME ?? 'alove'

const ROOM_PREFIX = 'booking-'

// observer = dashboard monitoring: subscribe-only, never publishes audio/data
// and never triggers an agent dispatch.
export type CallRole = 'customer' | 'observer'

export function roomNameForConversation(conversationId: string): string {
  return `${ROOM_PREFIX}${conversationId}`
}

export function conversationIdFromRoom(roomName: string): string | null {
  if (roomName.startsWith(ROOM_PREFIX)) return roomName.slice(ROOM_PREFIX.length)
  return null
}

export function isLiveKitConfigured(): boolean {
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) return false
  try {
    const url = new URL(LIVEKIT_WS_URL)
    return url.protocol === 'ws:' || url.protocol === 'wss:'
  } catch {
    return false
  }
}

export function liveKitHttpUrl(): string {
  return LIVEKIT_WS_URL.replace(/^ws/u, 'http')
}

export function createRoomServiceClient(): RoomServiceClient {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!isLiveKitConfigured() || !apiKey || !apiSecret) {
    throw new Error('LiveKit is not configured')
  }
  return new RoomServiceClient(liveKitHttpUrl(), apiKey, apiSecret, { requestTimeout: 3_000 })
}

/** Credentialed, read-only probe; unlike an env check this detects bad keys/host. */
export async function probeLiveKit(): Promise<void> {
  await createRoomServiceClient().listRooms(['alove-readiness-probe'])
}

export async function createParticipantToken(
  roomName: string,
  identity: string,
  displayName: string,
  role: CallRole,
): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!apiKey || !apiSecret) throw new Error('LIVEKIT_API_KEY / LIVEKIT_API_SECRET not set')

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: displayName,
    ttl: '15m',
  })
  const observer = role === 'observer'
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: !observer,
    canSubscribe: true,
    canPublishData: !observer,
  })
  // Dispatch the booking agent into the room when the customer joins. Observer
  // tokens are minted only by the dashboard-authenticated endpoint below.
  if (role === 'customer') {
    at.roomConfig = new RoomConfiguration({
      agents: [new RoomAgentDispatch({ agentName: LIVEKIT_AGENT_NAME })],
    })
  }
  return await at.toJwt()
}
