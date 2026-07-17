// @vitest-environment node

import type { RoomEvent } from '@ordervoice/contracts'
import { describe, expect, it, vi } from 'vitest'
import {
  fetchLiveKitAccessDetails,
  LiveKitEventTransport,
} from './livekit-adapter'

const event: RoomEvent = {
  version: 1,
  eventId: 'event-001',
  sessionCode: 'DEMO42',
  occurredAt: '2026-07-18T04:00:00.000Z',
  type: 'staff.preferences',
  mode: 'human',
  transcriptLanguage: 'original',
}

describe('LiveKit call adapter', () => {
  it('queues validated events until the data publisher is bound', async () => {
    const transport = new LiveKitEventTransport('DEMO42')
    const publish = vi.fn(async () => undefined)

    transport.publish(event)
    await transport.bindPublisher(publish)

    expect(publish).toHaveBeenCalledOnce()
    const payload = publish.mock.calls[0]?.[0]
    expect(JSON.parse(new TextDecoder().decode(payload))).toEqual(event)
  })

  it('decodes valid room data and ignores malformed or cross-session payloads', () => {
    const transport = new LiveKitEventTransport('DEMO42')
    const listener = vi.fn()
    transport.subscribe(listener)

    transport.receivePayload(new TextEncoder().encode(JSON.stringify(event)))
    transport.receivePayload(new TextEncoder().encode('{bad json'))
    transport.receivePayload(new TextEncoder().encode(JSON.stringify({ ...event, sessionCode: 'OTHER1' })))

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith(event)
  })

  it('validates the signed token response and reports server errors', async () => {
    const fetchOk = vi.fn(async () => new Response(JSON.stringify({
      serverUrl: 'wss://vedi.livekit.cloud',
      participantToken: 'signed-token',
      roomName: 'vedi-demo42',
      identity: 'caller-DEMO42',
      sessionCode: 'DEMO42',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await expect(fetchLiveKitAccessDetails({
      sessionCode: 'DEMO42',
      role: 'caller',
      displayName: 'Khách thử',
    }, fetchOk)).resolves.toMatchObject({ roomName: 'vedi-demo42' })
    expect(fetchOk).toHaveBeenCalledWith('/api/livekit/token', expect.objectContaining({ method: 'POST' }))

    const fetchFailed = vi.fn(async () => new Response(JSON.stringify({
      message: 'LiveKit chưa cấu hình.',
    }), { status: 503, headers: { 'Content-Type': 'application/json' } }))
    await expect(fetchLiveKitAccessDetails({
      sessionCode: 'DEMO42',
      role: 'staff',
      displayName: 'Linh',
    }, fetchFailed)).rejects.toThrow('LiveKit chưa cấu hình.')
  })

  it('cleans up listeners and refuses publish after close', () => {
    const transport = new LiveKitEventTransport('DEMO42')
    transport.close()

    expect(() => transport.publish(event)).toThrow(/đã đóng/iu)
  })
})
