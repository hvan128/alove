import type { SeatHold, TripSeat } from '@ordervoice/contracts'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SeatPicker } from './seat-picker'

const seats: TripSeat[] = [
  { tripId: 'trip-1', seatCode: 'A01', state: 'booked', revision: 1, activeHoldId: null, bookingId: 'booking-1' },
  { tripId: 'trip-1', seatCode: 'A05', state: 'available', revision: 0, activeHoldId: null, bookingId: null },
  { tripId: 'trip-1', seatCode: 'A06', state: 'available', revision: 0, activeHoldId: null, bookingId: null },
]

const expiredHold: SeatHold = {
  id: 'hold-expired',
  sessionCode: 'DEMO42',
  bookingDraftId: 'booking-DEMO42',
  tripId: 'trip-1',
  seatCodes: ['A05', 'A06'],
  actorId: 'staff-1',
  status: 'active',
  createdAt: '2026-07-18T09:00:00.000Z',
  expiresAt: '2026-07-18T09:10:00.000Z',
  maxExpiresAt: '2026-07-18T09:30:00.000Z',
  releasedAt: null,
  consumedAt: null,
}

describe('SeatPicker', () => {
  it('selects only available seats up to passenger count', async () => {
    const user = userEvent.setup()
    const onHold = vi.fn()
    render(<SeatPicker seats={seats} passengerCount={2} selected={[]} hold={null} onHold={onHold} />)

    await user.click(screen.getByRole('button', { name: 'Ghế A05 · Còn trống' }))
    await user.click(screen.getByRole('button', { name: 'Ghế A06 · Còn trống' }))

    expect(onHold).toHaveBeenCalledWith(['A05', 'A06'])
    expect(screen.getByRole('button', { name: 'Ghế A01 · Đã bán' })).toBeDisabled()
  })

  it('announces expiry and offers a new selection', () => {
    render(<SeatPicker seats={seats} passengerCount={2} selected={['A05', 'A06']} hold={expiredHold} onHold={vi.fn()} now="2026-07-18T10:00:00.000Z" />)

    expect(screen.getByRole('alert')).toHaveTextContent('Giữ ghế đã hết hạn')
    expect(screen.getByRole('button', { name: 'Chọn lại' })).toBeVisible()
  })

  it('shows block control only to dispatcher or admin', () => {
    const { rerender } = render(<SeatPicker seats={seats} passengerCount={1} selected={[]} hold={null} onHold={vi.fn()} actorRole="dispatcher" onBlock={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Khóa ghế A05' })).toBeVisible()

    rerender(<SeatPicker seats={seats} passengerCount={1} selected={[]} hold={null} onHold={vi.fn()} actorRole="customer-care" onBlock={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Khóa ghế A05' })).not.toBeInTheDocument()
  })
})
