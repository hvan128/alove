import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParticipantKind } from 'livekit-client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BookingSnapshot } from '@/lib/call-contract'
import { LiveKitCall, parseAgentEventMessage } from './livekit-call'

const CALL_ID = '11111111-1111-4111-8111-111111111111'

vi.mock('@livekit/components-react', () => ({
  LiveKitRoom: ({ token, serverUrl }: { token: string; serverUrl: string }) => (
    <div data-testid="livekit-room">{token}@{serverUrl}</div>
  ),
  RoomAudioRenderer: () => null,
  useConnectionState: vi.fn(),
  useDataChannel: vi.fn(),
  useLocalParticipant: vi.fn(),
  useRemoteParticipants: vi.fn(),
  useTranscriptions: vi.fn(),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('LiveKit session lifecycle', () => {
  it('uses the server-issued call ID and never sends a client-selected identity', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      token: 'participant-token',
      sessionToken: 'signed-session',
      conversationId: CALL_ID,
      serverUrl: 'wss://livekit.example.test',
      roomName: `booking-${CALL_ID}`,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const onSessionStarted = vi.fn()

    renderCall({ onSessionStarted })

    await waitFor(() => expect(onSessionStarted).toHaveBeenCalledWith({ attemptId: 7, conversationId: CALL_ID }))
    expect(screen.getByTestId('livekit-room')).toHaveTextContent('participant-token@wss://livekit.example.test')
    expect(fetchMock).toHaveBeenCalledWith('/api/livekit/token', expect.objectContaining({ method: 'POST' }))
    const requestInit = fetchMock.mock.calls[0]![1] as RequestInit
    expect(requestInit).not.toHaveProperty('body')
  })

  it('aborts an outstanding token request when the attempt unmounts', () => {
    let requestSignal: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => {
      requestSignal = init?.signal ?? undefined
      return new Promise<Response>((_resolve, reject) => {
        requestSignal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    }))

    const view = renderCall()
    view.unmount()
    expect(requestSignal?.aborted).toBe(true)
  })

  it('shows a retry action when LiveKit is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'livekit_not_configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )))
    const onRetry = vi.fn()
    const user = userEvent.setup()
    renderCall({ onRetry })

    expect(await screen.findByRole('alert')).toHaveTextContent('Dịch vụ cuộc gọi chưa được cấu hình')
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe('agent event validation', () => {
  it('accepts a valid, increasing event only from an agent participant', () => {
    const event = {
      type: 'booking.update',
      callId: CALL_ID,
      eventId: 'event-1',
      sequence: 2,
      booking: confirmedBooking(),
    }
    const payload = encode(event)

    expect(parseAgentEventMessage({
      payload,
      senderKind: ParticipantKind.AGENT,
      expectedCallId: CALL_ID,
      lastSequence: 1,
    })).toEqual(event)
    expect(parseAgentEventMessage({
      payload,
      senderKind: ParticipantKind.STANDARD,
      expectedCallId: CALL_ID,
      lastSequence: 1,
    })).toBeNull()
  })

  it('rejects malformed, stale, wrong-call, and internally inconsistent events', () => {
    expect(parseAgentEventMessage({
      payload: new TextEncoder().encode('{bad json'),
      senderKind: ParticipantKind.AGENT,
      expectedCallId: CALL_ID,
      lastSequence: 0,
    })).toBeNull()

    const base = { type: 'agent.state', callId: CALL_ID, eventId: 'event-2', sequence: 3, state: 'thinking' }
    expect(parseAgentEventMessage({
      payload: encode(base),
      senderKind: ParticipantKind.AGENT,
      expectedCallId: CALL_ID,
      lastSequence: 3,
    })).toBeNull()
    expect(parseAgentEventMessage({
      payload: encode({ ...base, callId: 'another-call', sequence: 4 }),
      senderKind: ParticipantKind.AGENT,
      expectedCallId: CALL_ID,
      lastSequence: 3,
    })).toBeNull()
    expect(parseAgentEventMessage({
      payload: encode({
        type: 'booking.update',
        callId: CALL_ID,
        eventId: 'event-3',
        sequence: 4,
        booking: { ...confirmedBooking(), conversationId: 'another-call' },
      }),
      senderKind: ParticipantKind.AGENT,
      expectedCallId: CALL_ID,
      lastSequence: 3,
    })).toBeNull()
  })

  it('accepts ordered semantic evidence and rejects missing honest-empty arrays', () => {
    const event = {
      type: 'semantic.annotation',
      callId: CALL_ID,
      eventId: 'event-semantic-1',
      sequence: 5,
      timestamp: '2026-07-18T12:00:00.000Z',
      sourceTranscript: 'toi muon di da lat',
      correctedText: 'Tôi muốn đi Đà Lạt.',
      tags: ['destination'],
      annotations: ['Đà Lạt'],
    }

    expect(parseAgentEventMessage({
      payload: encode(event),
      senderKind: ParticipantKind.AGENT,
      expectedCallId: CALL_ID,
      lastSequence: 4,
    })).toEqual(event)
    expect(parseAgentEventMessage({
      payload: encode({ ...event, sequence: 6, tags: undefined, annotations: undefined }),
      senderKind: ParticipantKind.AGENT,
      expectedCallId: CALL_ID,
      lastSequence: 5,
    })).toBeNull()
  })
})

function renderCall(overrides: Partial<Parameters<typeof LiveKitCall>[0]> = {}) {
  return render(
    <LiveKitCall
      attemptId={7}
      onSessionStarted={vi.fn()}
      onTranscript={vi.fn()}
      onBooking={vi.fn()}
      onSemanticAnnotation={vi.fn()}
      onAgentState={vi.fn()}
      onRetry={vi.fn()}
      onEnded={vi.fn()}
      {...overrides}
    />,
  )
}

function encode(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value))
}

function confirmedBooking(): BookingSnapshot {
  return {
    id: `booking-${CALL_ID}`,
    conversationId: CALL_ID,
    status: 'confirmed',
    origin: 'Hải Phòng',
    destination: 'Hà Nội',
    travelDateLabel: '18/07/2026',
    passengerCount: 1,
    selectedTrip: {
      id: 'trip-1',
      origin: 'Hải Phòng',
      destination: 'Hà Nội',
      departureTime: '08:00',
      arrivalTime: '10:00',
      vehicleType: 'Limousine 21 phòng',
      priceVnd: 250_000,
      pickupPoint: 'Bến xe Vĩnh Niệm',
      dropoffPoint: 'Bến xe Mỹ Đình',
      seatNoun: 'ghế',
    },
    seats: ['A1'],
    passengerName: 'Nguyễn Minh Anh',
    phone: '0909123456',
    totalFareVnd: 250_000,
    bookingCode: 'MA-260718-0001',
  }
}
