import { roomEventSchema, type RoomEvent } from '@ordervoice/contracts'

export type CallEventListener = (event: RoomEvent) => void

export interface CallEventTransport {
  publish: (event: RoomEvent) => void
  subscribe: (listener: CallEventListener) => () => void
  readHistory: () => RoomEvent[]
  close: () => void
}

export type DemoCallChannelOptions = {
  forceMemory?: boolean
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
}

type MemoryEndpoint = {
  id: symbol
  deliver: CallEventListener
}

const memoryEndpoints = new Map<string, Set<MemoryEndpoint>>()
const memoryHistory = new Map<string, RoomEvent[]>()

export class DemoCallChannel implements CallEventTransport {
  private readonly sessionCode: string
  private readonly channelName: string
  private readonly endpointId = Symbol('demo-call-channel')
  private readonly listeners = new Set<CallEventListener>()
  private readonly nativeChannel: BroadcastChannel | null
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null
  private closed = false

  constructor(sessionCode: string, options: DemoCallChannelOptions = {}) {
    this.sessionCode = normalizeCode(sessionCode)
    this.channelName = `vedi.events.${this.sessionCode}`
    this.storage = options.storage === undefined
      ? safeLocalStorage()
      : options.storage
    this.nativeChannel = !options.forceMemory && typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(this.channelName)
      : null

    if (this.nativeChannel) {
      this.nativeChannel.addEventListener('message', this.handleNativeMessage)
    } else {
      const endpoints = memoryEndpoints.get(this.channelName) ?? new Set<MemoryEndpoint>()
      endpoints.add({ id: this.endpointId, deliver: this.deliver })
      memoryEndpoints.set(this.channelName, endpoints)
    }
  }

  publish(event: RoomEvent): void {
    if (this.closed) throw new Error('Kênh mô phỏng đã đóng.')
    const parsed = roomEventSchema.parse(event)
    if (parsed.sessionCode !== this.sessionCode) throw new Error('Sự kiện không thuộc phiên hiện tại.')
    this.persist(parsed)

    if (this.nativeChannel) {
      this.nativeChannel.postMessage(parsed)
      return
    }
    for (const endpoint of memoryEndpoints.get(this.channelName) ?? []) {
      if (endpoint.id !== this.endpointId) endpoint.deliver(parsed)
    }
  }

  subscribe(listener: CallEventListener): () => void {
    if (this.closed) return () => undefined
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readHistory(): RoomEvent[] {
    const stored = this.storage?.getItem(this.storageKey())
    if (stored) {
      try {
        const values = JSON.parse(stored) as unknown[]
        return values.flatMap((value) => {
          const parsed = roomEventSchema.safeParse(value)
          return parsed.success && parsed.data.sessionCode === this.sessionCode ? [parsed.data] : []
        })
      } catch {
        return []
      }
    }
    return [...(memoryHistory.get(this.channelName) ?? [])]
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.listeners.clear()
    if (this.nativeChannel) {
      this.nativeChannel.removeEventListener('message', this.handleNativeMessage)
      this.nativeChannel.close()
      return
    }
    const endpoints = memoryEndpoints.get(this.channelName)
    if (!endpoints) return
    for (const endpoint of endpoints) {
      if (endpoint.id === this.endpointId) endpoints.delete(endpoint)
    }
    if (endpoints.size === 0) memoryEndpoints.delete(this.channelName)
  }

  private readonly handleNativeMessage = (message: MessageEvent<unknown>): void => {
    const parsed = roomEventSchema.safeParse(message.data)
    if (!parsed.success || parsed.data.sessionCode !== this.sessionCode) return
    this.deliver(parsed.data)
  }

  private readonly deliver = (event: RoomEvent): void => {
    for (const listener of this.listeners) listener(event)
  }

  private persist(event: RoomEvent): void {
    const history = [...(memoryHistory.get(this.channelName) ?? []), event].slice(-100)
    memoryHistory.set(this.channelName, history)
    try {
      this.storage?.setItem(this.storageKey(), JSON.stringify(history))
    } catch {
      // Private browsing or a full quota must not break the live demo.
    }
  }

  private storageKey(): string {
    return `vedi.demo.history.${this.sessionCode}`
  }
}

function normalizeCode(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/gu, '')
  if (!/^[A-Z0-9]{4,12}$/u.test(normalized)) throw new Error('Mã phiên không hợp lệ.')
  return normalized
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}
