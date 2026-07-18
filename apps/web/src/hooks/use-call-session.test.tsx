import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DemoCallChannel } from '@/lib/call/demo-channel'
import { useCallSession } from './use-call-session'

afterEach(() => vi.restoreAllMocks())

function Harness({ role }: { role: 'caller' | 'staff' }) {
  const session = useCallSession({
    sessionCode: 'DEMO42',
    role,
    transportFactory: (code) => new DemoCallChannel(code, { forceMemory: true }),
  })

  return (
    <section aria-label={role}>
      <output>{session.state.booking.destination ?? 'Chưa có điểm đến'}</output>
      <output>{session.state.messages.length} tin nhắn</output>
      {role === 'caller' ? (
        <button type="button" onClick={() => session.sendCallerText('Đặt 2 vé từ Sài Gòn đi Đà Lạt ngày 24/07 lúc 22 giờ.')}>
          Gửi yêu cầu
        </button>
      ) : null}
    </section>
  )
}

describe('useCallSession local transport', () => {
  it.each([
    ['trip_changed', 'trip'],
    ['seats_changed', 'seats'],
    ['call_ended', 'end'],
  ] as const)('releases active hold for %s', async (reason, action) => {
    const hold = {
      id: 'hold-DEMO42', sessionCode: 'DEMO42', bookingDraftId: 'booking-DEMO42', tripId: 'trip-1',
      seatCodes: ['A05'], actorId: 'staff-1', status: 'active',
      createdAt: '2026-07-18T10:00:00.000Z', expiresAt: '2026-07-18T10:10:00.000Z',
      maxExpiresAt: '2026-07-18T10:30:00.000Z', releasedAt: null, consumedAt: null,
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/seat-holds') return Response.json({ hold })
      if (url.includes('/release')) return Response.json({ hold: { ...hold, status: 'released' } })
      return Response.json({ events: [] })
    })

    function LifecycleHarness() {
      const session = useCallSession({ sessionCode: 'DEMO42', role: 'staff', persistence: true })
      const act = async () => {
        if (action === 'trip') await session.editField('selectedTrip', null)
        else if (action === 'seats') await session.editField('seats', ['A06'])
        else await session.endCall()
      }
      return <>
        <output>{session.state.booking.seatHoldId ?? 'no-hold'}</output>
        <button type="button" onClick={() => void session.holdSeats('trip-1', ['A05'], 0)}>Giữ lifecycle</button>
        <button type="button" onClick={() => void act()}>Thay đổi lifecycle</button>
      </>
    }

    const user = userEvent.setup()
    render(<LifecycleHarness />)
    await user.click(screen.getByRole('button', { name: 'Giữ lifecycle' }))
    expect(await screen.findByText('hold-DEMO42')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Thay đổi lifecycle' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/seat-holds/hold-DEMO42/release',
      expect.objectContaining({ method: 'POST', body: expect.stringContaining(reason) }),
    )
  })

  it('uses hold and confirmation APIs in durable mode', async () => {
    const hold = {
      id: 'hold-DEMO42', sessionCode: 'DEMO42', bookingDraftId: 'booking-DEMO42', tripId: 'trip-1',
      seatCodes: ['A05'], actorId: 'staff-1', status: 'active',
      createdAt: '2026-07-18T10:00:00.000Z', expiresAt: '2026-07-18T10:10:00.000Z',
      maxExpiresAt: '2026-07-18T10:30:00.000Z', releasedAt: null, consumedAt: null,
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/seat-holds') && init?.method === 'POST') {
        return Response.json({ hold })
      }
      if (url.includes('/confirm')) {
        return Response.json({ booking: {
          id: 'booking-DEMO42', conversationId: 'DEMO42', status: 'collecting', runtimeProfile: 'durable',
          catalogVersionId: null, tripId: 'trip-1', seatHoldId: hold.id,
          origin: null, destination: null, travelDateLabel: null, timeWindow: null, passengerCount: null,
          selectedTrip: null, seats: ['A05'], passengerName: null, phone: null, pickupPoint: null,
          dropoffPoint: null, vehiclePreference: null, paymentMethod: null, note: null, totalFareVnd: null,
          bookingCode: null, evidenceMessageIds: [], fieldEvidence: {}, confirmedFields: [], reviewItems: [],
        } })
      }
      return Response.json({ events: [] })
    })

    function DurableHarness() {
      const session = useCallSession({ sessionCode: 'DEMO42', role: 'staff', persistence: true })
      return <>
        <output>{session.state.booking.seatHoldId ?? 'no-hold'}</output>
        <button type="button" onClick={() => void session.holdSeats('trip-1', ['A05'], 0)}>Giữ ghế</button>
        <button type="button" onClick={() => void session.confirmBooking()}>Xác nhận durable</button>
      </>
    }

    const user = userEvent.setup()
    render(<DurableHarness />)
    await user.click(screen.getByRole('button', { name: 'Giữ ghế' }))
    expect(await screen.findByText('hold-DEMO42')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Xác nhận durable' }))

    expect(fetchMock).toHaveBeenCalledWith('/api/seat-holds', expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/bookings/DEMO42/confirm', expect.objectContaining({ method: 'POST' }))
  })

  it('delivers one validated final event between caller and staff instances', async () => {
    const user = userEvent.setup()
    render(<><Harness role="staff" /><Harness role="caller" /></>)

    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }))

    expect(await screen.findAllByText('Đà Lạt')).toHaveLength(2)
    expect(screen.getAllByText('1 tin nhắn')).toHaveLength(2)
  })

  it('replays persisted validated history to a later subscriber', async () => {
    const channel = new DemoCallChannel('HIST42', { forceMemory: true })
    channel.publish({
      version: 1,
      eventId: 'history-001',
      sessionCode: 'HIST42',
      occurredAt: '2026-07-18T04:00:00.000Z',
      type: 'transcript.final',
      message: {
        id: 'history-message-001',
        role: 'caller',
        text: 'Tôi đi từ Sài Gòn đến Đà Lạt.',
        language: 'vi',
        translations: {},
        confidence: 0.95,
        startedAtMs: 0,
        endedAtMs: 900,
        channel: 'text',
      },
    })

    function HistoryHarness() {
      const session = useCallSession({
        sessionCode: 'HIST42',
        role: 'staff',
        transportFactory: (code) => new DemoCallChannel(code, { forceMemory: true }),
      })
      return <output>{session.state.booking.destination ?? 'Đang tải'}</output>
    }

    render(<HistoryHarness />)
    expect(await screen.findByText('Đà Lạt')).toBeInTheDocument()
    channel.close()
  })

  it('publishes an evidence-bearing booking snapshot after a staff edit', async () => {
    const user = userEvent.setup()
    const events: Array<{ type: string; revision?: number }> = []
    const channel = new DemoCallChannel('EDIT42', { forceMemory: true })
    const observer = new DemoCallChannel('EDIT42', { forceMemory: true })
    const transportFactory = () => channel
    observer.subscribe((event) => events.push(event))

    function StaffEditHarness() {
      const session = useCallSession({
        sessionCode: 'EDIT42',
        role: 'staff',
        transportFactory,
      })
      return (
        <button type="button" onClick={() => session.editField('origin', 'Sài Gòn')}>
          Sửa điểm đi
        </button>
      )
    }

    render(<StaffEditHarness />)
    await user.click(screen.getByRole('button', { name: 'Sửa điểm đi' }))

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'booking.snapshot', revision: 1 }),
    ]))
    observer.close()
  })
})
