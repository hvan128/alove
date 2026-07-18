import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  createInitialCallWorkspace,
  type BookingSnapshot,
  type SemanticAnnotation,
} from '@/lib/call-contract'
import { BusCallWorkspace, callWorkspaceReducer } from './bus-call-workspace'

const CALL_ID = '11111111-1111-4111-8111-111111111111'

type MockLiveKitProps = {
  attemptId: number
  onSessionStarted: (session: { attemptId: number; conversationId: string }) => void
  onTranscript: (update: {
    callId: string
    segmentId: string
    role: 'customer' | 'agent'
    text: string
    final: boolean
  }) => void
  onBooking: (booking: BookingSnapshot) => void
  onSemanticAnnotation: (callId: string, annotation: SemanticAnnotation) => void
  onRetry: () => void
  onEnded: (callId: string) => void
}

vi.mock('./livekit-call', () => ({
  LiveKitCall: (props: MockLiveKitProps) => (
    <div aria-label="LiveKit giả lập">
      <span data-testid="attempt">{props.attemptId}</span>
      <button
        type="button"
        onClick={() => props.onSessionStarted({ attemptId: props.attemptId, conversationId: CALL_ID })}
      >
        Kết nối phiên
      </button>
      <button
        type="button"
        onClick={() => props.onTranscript({
          callId: CALL_ID,
          segmentId: 'customer-1',
          role: 'customer',
          text: 'Tôi cần một vé đi Hà Nội.',
          final: true,
        })}
      >
        Nhận transcript
      </button>
      <button
        type="button"
        onClick={() => props.onSemanticAnnotation(CALL_ID, {
          timestamp: '2026-07-18T12:00:00.000Z',
          sourceTranscript: 'toi muon di da lat',
          correctedText: 'Tôi muốn đi Đà Lạt.',
          tags: ['destination'],
          annotations: ['Đà Lạt'],
        })}
      >
        Nhận semantic
      </button>
      <button
        type="button"
        onClick={() => props.onSemanticAnnotation(CALL_ID, {
          timestamp: '2026-07-18T12:00:01.000Z',
          sourceTranscript: 'Tôi muốn đi Đà Lạt.',
          tags: [],
          annotations: [],
        })}
      >
        Nhận semantic rỗng
      </button>
      <button type="button" onClick={() => props.onBooking(confirmedBooking())}>Nhận vé</button>
      <button type="button" onClick={() => props.onEnded(CALL_ID)}>Agent cúp</button>
      <button type="button" onClick={props.onRetry}>Thử phiên mới</button>
    </div>
  ),
}))

describe('LiveKit-only call workspace reducer', () => {
  it('deduplicates unchanged transcript revisions and keeps distinct segments', () => {
    const startedAt = '2026-07-18T00:00:00.000Z'
    let state = callWorkspaceReducer(createInitialCallWorkspace(), { type: 'call.start', startedAt })
    state = callWorkspaceReducer(state, { type: 'session.ready', conversationId: CALL_ID })
    state = callWorkspaceReducer(state, {
      type: 'transcript.upsert',
      callId: CALL_ID,
      segmentId: 'segment-1',
      role: 'customer',
      text: 'Tôi cần',
      final: false,
      createdAt: startedAt,
    })

    const unchanged = callWorkspaceReducer(state, {
      type: 'transcript.upsert',
      callId: CALL_ID,
      segmentId: 'segment-1',
      role: 'customer',
      text: 'Tôi cần',
      final: false,
      createdAt: startedAt,
    })
    expect(unchanged).toBe(state)

    const revised = callWorkspaceReducer(state, {
      type: 'transcript.upsert',
      callId: CALL_ID,
      segmentId: 'segment-1',
      role: 'customer',
      text: 'Tôi cần một vé',
      final: true,
      createdAt: startedAt,
    })
    expect(revised.messages).toHaveLength(1)
    expect(revised.messages[0]).toMatchObject({ text: 'Tôi cần một vé', final: true })

    const second = callWorkspaceReducer(revised, {
      type: 'transcript.upsert',
      callId: CALL_ID,
      segmentId: 'segment-2',
      role: 'customer',
      text: 'Đi Hà Nội',
      final: true,
      createdAt: '2026-07-18T00:00:01.000Z',
    })
    expect(second.messages).toHaveLength(2)
  })

  it('ignores transcript and booking updates from another call', () => {
    let state = callWorkspaceReducer(createInitialCallWorkspace(), {
      type: 'call.start',
      startedAt: '2026-07-18T00:00:00.000Z',
    })
    state = callWorkspaceReducer(state, { type: 'session.ready', conversationId: CALL_ID })

    expect(callWorkspaceReducer(state, {
      type: 'transcript.upsert',
      callId: 'another-call',
      segmentId: 'segment-1',
      role: 'agent',
      text: 'stale',
      final: true,
      createdAt: '2026-07-18T00:00:01.000Z',
    })).toBe(state)

    expect(callWorkspaceReducer(state, {
      type: 'booking.update',
      booking: { ...confirmedBooking(), conversationId: 'another-call' },
    })).toBe(state)
  })

  it('stores semantic evidence without mutating the authoritative booking snapshot', () => {
    let state = callWorkspaceReducer(createInitialCallWorkspace(), {
      type: 'call.start',
      startedAt: '2026-07-18T00:00:00.000Z',
    })
    state = callWorkspaceReducer(state, { type: 'session.ready', conversationId: CALL_ID })
    const booking = state.booking
    const annotation: SemanticAnnotation = {
      timestamp: '2026-07-18T12:00:00.000Z',
      sourceTranscript: 'toi muon di da lat',
      correctedText: 'Tôi muốn đi Đà Lạt.',
      tags: ['destination'],
      annotations: ['Đà Lạt'],
    }

    const updated = callWorkspaceReducer(state, {
      type: 'semantic.annotation',
      callId: CALL_ID,
      annotation,
    })

    expect(updated.booking).toBe(booking)
    expect(updated.semanticAnnotations).toEqual([annotation])
    expect(callWorkspaceReducer(updated, {
      type: 'semantic.annotation',
      callId: 'another-call',
      annotation,
    })).toBe(updated)
  })
})

describe('LiveKit-only web call console', () => {
  it('starts a server-issued session without exposing demo controls', async () => {
    const user = userEvent.setup()
    render(<BusCallWorkspace />)

    await user.click(screen.getByRole('button', { name: 'Bắt đầu Web Call' }))
    expect(screen.getByLabelText('LiveKit giả lập')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Yêu cầu mẫu' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Lời khách hàng' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Kết nối phiên' }))
    await user.click(screen.getByRole('button', { name: 'Nhận transcript' }))
    expect(screen.getByRole('list', { name: 'Hội thoại' })).toHaveTextContent('Tôi cần một vé đi Hà Nội.')
  })

  it('shows the authoritative ticket after a confirmed call ends', async () => {
    const onEnded = vi.fn()
    const user = userEvent.setup()
    render(<BusCallWorkspace onEnded={onEnded} />)

    await user.click(screen.getByRole('button', { name: 'Bắt đầu Web Call' }))
    await user.click(screen.getByRole('button', { name: 'Kết nối phiên' }))
    await user.click(screen.getByRole('button', { name: 'Nhận vé' }))
    await user.click(screen.getByRole('button', { name: 'Kết thúc' }))

    expect(onEnded).not.toHaveBeenCalled()
    const result = screen.getByRole('region', { name: 'Vé của bạn' })
    expect(within(result).getByRole('heading', { name: 'Vé của bạn' })).toBeVisible()
    expect(within(result).getAllByText('MA-260718-0001').length).toBeGreaterThan(0)

    await user.click(within(result).getByRole('button', { name: 'Đóng' }))
    expect(onEnded).toHaveBeenCalledOnce()
  })

  it('renders corrected semantic evidence and an honest empty-tag state', async () => {
    const user = userEvent.setup()
    render(<BusCallWorkspace />)

    await user.click(screen.getByRole('button', { name: 'Bắt đầu Web Call' }))
    await user.click(screen.getByRole('button', { name: 'Kết nối phiên' }))
    await user.click(screen.getByRole('button', { name: 'Nhận semantic' }))

    const evidence = screen.getByRole('complementary', { name: 'Bằng chứng semantic VALSEA' })
    expect(evidence).toHaveTextContent('Tôi muốn đi Đà Lạt.')
    expect(evidence).toHaveTextContent('destination')
    expect(evidence).toHaveTextContent('Đà Lạt')

    await user.click(screen.getByRole('button', { name: 'Nhận semantic rỗng' }))
    expect(screen.getByRole('complementary', { name: 'Bằng chứng semantic VALSEA' }))
      .toHaveTextContent('Không có semantic tag')
  })

  it('closes an unconfirmed overlay and creates a fresh transport attempt on retry', async () => {
    const onEnded = vi.fn()
    const user = userEvent.setup()
    const view = render(<BusCallWorkspace onEnded={onEnded} />)

    await user.click(screen.getByRole('button', { name: 'Bắt đầu Web Call' }))
    expect(screen.getByTestId('attempt')).toHaveTextContent('1')
    await user.click(screen.getByRole('button', { name: 'Thử phiên mới' }))
    expect(screen.getByTestId('attempt')).toHaveTextContent('2')

    view.rerender(<BusCallWorkspace onEnded={onEnded} />)
    await user.click(screen.getByRole('button', { name: 'Kết thúc' }))
    expect(onEnded).toHaveBeenCalledOnce()
  })
})

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
