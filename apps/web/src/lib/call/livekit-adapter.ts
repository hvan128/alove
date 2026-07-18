import { roomEventSchema, type RoomEvent } from '@ordervoice/contracts'
import type { CallEventListener, CallEventTransport } from './demo-channel'

export type LiveKitParticipantRole = 'caller' | 'staff'

export type LiveKitAccessDetails = {
  serverUrl: string
  participantToken: string
  roomName: string
  identity: string
  sessionCode: string
}

export type LiveKitTokenRequest = {
  sessionCode: string
  role: LiveKitParticipantRole
  displayName: string
}

type DataPublisher = (payload: Uint8Array) => Promise<void>

export class LiveKitEventTransport implements CallEventTransport {
  private readonly sessionCode: string
  private readonly listeners = new Set<CallEventListener>()
  private readonly pending: RoomEvent[] = []
  private publisher: DataPublisher | null = null
  private closed = false

  constructor(sessionCode: string) {
    this.sessionCode = normalizeCode(sessionCode)
  }

  publish(event: RoomEvent): void {
    if (this.closed) throw new Error('Kênh LiveKit đã đóng.')
    const parsed = roomEventSchema.parse(event)
    if (parsed.sessionCode !== this.sessionCode) throw new Error('Sự kiện không thuộc phiên LiveKit hiện tại.')
    if (!this.publisher) {
      this.pending.push(parsed)
      return
    }
    const publisher = this.publisher
    void publisher(encodeEvent(parsed)).catch(() => {
      if (!this.closed) this.pending.push(parsed)
    })
  }

  subscribe(listener: CallEventListener): () => void {
    if (this.closed) return () => undefined
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readHistory(): RoomEvent[] {
    return []
  }

  async bindPublisher(publisher: DataPublisher): Promise<void> {
    if (this.closed) return
    this.publisher = publisher
    const queued = this.pending.splice(0)
    for (let index = 0; index < queued.length; index += 1) {
      const event = queued[index]
      if (!event) continue
      try {
        await publisher(encodeEvent(event))
      } catch {
        this.pending.push(...queued.slice(index))
        break
      }
    }
  }

  unbindPublisher(publisher?: DataPublisher): void {
    if (!publisher || this.publisher === publisher) this.publisher = null
  }

  receivePayload(payload: Uint8Array): void {
    if (this.closed) return
    try {
      const parsed = roomEventSchema.safeParse(JSON.parse(new TextDecoder().decode(payload)))
      if (!parsed.success || parsed.data.sessionCode !== this.sessionCode) return
      for (const listener of this.listeners) listener(parsed.data)
    } catch {
      // Untrusted room data is ignored at this boundary.
    }
  }

  close(): void {
    this.closed = true
    this.publisher = null
    this.pending.length = 0
    this.listeners.clear()
  }
}

export async function fetchLiveKitAccessDetails(
  request: LiveKitTokenRequest,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<LiveKitAccessDetails> {
  const response = await fetcher('/api/livekit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  })
  const data = await readJsonObject(response)
  if (!response.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : 'Không thể lấy quyền tham gia LiveKit.')
  }
  if (
    typeof data.serverUrl !== 'string'
    || !data.serverUrl.startsWith('wss://')
    || typeof data.participantToken !== 'string'
    || !data.participantToken
    || typeof data.roomName !== 'string'
    || typeof data.identity !== 'string'
    || typeof data.sessionCode !== 'string'
  ) {
    throw new Error('Máy chủ trả về thông tin LiveKit không hợp lệ.')
  }
  return {
    serverUrl: data.serverUrl,
    participantToken: data.participantToken,
    roomName: data.roomName,
    identity: data.identity,
    sessionCode: data.sessionCode,
  }
}

function encodeEvent(event: RoomEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event))
}

async function readJsonObject(response: Response): Promise<Record<string, unknown>> {
  try {
    const value = await response.json() as unknown
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function normalizeCode(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/gu, '')
  if (!/^[A-Z0-9]{4,12}$/u.test(normalized)) throw new Error('Mã phiên LiveKit không hợp lệ.')
  return normalized
}
