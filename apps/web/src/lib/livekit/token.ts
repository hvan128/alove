import { AccessToken, RoomAgentDispatch, RoomConfiguration } from 'livekit-server-sdk'

// Public room URL is exposed to the browser (never a secret). Server-only key/secret
// stay in LIVEKIT_API_KEY / LIVEKIT_API_SECRET and are used to mint short-lived tokens.
export const LIVEKIT_WS_URL = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL ?? ''

// Named agent for explicit dispatch. A deployed Cloud Agent is not auto-dispatched,
// so the room must request it by name when the customer joins. Must match the agent
// worker's registered name (LIVEKIT_AGENT_NAME in agent/.env).
const LIVEKIT_AGENT_NAME = process.env.LIVEKIT_AGENT_NAME ?? 'alove'

const ROOM_PREFIX = 'booking-'

// observer = dashboard monitoring: subscribe-only, never publishes audio/data
// and never triggers an agent dispatch.
export type CallRole = 'customer' | 'staff' | 'observer'

export function roomNameForConversation(conversationId: string): string {
  return `${ROOM_PREFIX}${conversationId}`
}

export function conversationIdFromRoom(roomName: string): string | null {
  if (roomName.startsWith(ROOM_PREFIX)) return roomName.slice(ROOM_PREFIX.length)
  return null
}

export function isLiveKitConfigured(): boolean {
  return Boolean(LIVEKIT_WS_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET)
}

export async function createParticipantToken(
  roomName: string,
  identity: string,
  displayName: string,
  role: CallRole,
  // Đi kèm participant để worker biết chọn giọng nào cho cuộc gọi này.
  metadata?: Record<string, string>,
): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!apiKey || !apiSecret) throw new Error('LIVEKIT_API_KEY / LIVEKIT_API_SECRET not set')

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: displayName,
    ttl: '2h',
    ...(metadata ? { metadata: JSON.stringify(metadata) } : {}),
  })
  const observer = role === 'observer'
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: !observer,
    canSubscribe: true,
    canPublishData: !observer,
  })
  // Dispatch the booking agent into the room when the CUSTOMER joins. The staff
  // participant listens/assists but never triggers a second agent — one agent per room.
  if (role === 'customer') {
    at.roomConfig = new RoomConfiguration({
      agents: [new RoomAgentDispatch({ agentName: LIVEKIT_AGENT_NAME })],
    })
  }
  return await at.toJwt()
}
