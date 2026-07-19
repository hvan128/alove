import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BookingStatusAction } from './booking-status-action'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

describe('BookingStatusAction', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    refresh.mockReset()
  })

  it('requires explicit confirmation then cancels the exact booking', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<BookingStatusAction bookingId={17} callId="call-001" status="pending_payment" />)

    fireEvent.click(screen.getByRole('button', { name: 'Huỷ vé' }))
    expect(screen.getByText('Ghế sẽ được trả về kho.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận huỷ' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/dashboard/bookings/17/cancel',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ callId: 'call-001' }) }),
    ))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it('lets the operator confirm a pending booking as paid', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<BookingStatusAction bookingId={21} callId="call-paid" status="pending_payment" />)

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thanh toán' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/dashboard/bookings/21/pay',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ callId: 'call-paid' }) }),
    ))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it('shows a recovery message when cancellation fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 409 })))
    render(<BookingStatusAction bookingId={18} callId="call-002" status="pending_payment" />)
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ vé' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận huỷ' }))

    expect(await screen.findByText('Không huỷ được. Tải lại và thử lại.')).toBeInTheDocument()
  })

  it('does not offer a reversible action for cancelled bookings', () => {
    render(<BookingStatusAction bookingId={19} callId="call-003" status="cancelled" />)
    expect(screen.getByText('Đã huỷ')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('routes paid bookings to the refund workflow instead of releasing seats', () => {
    render(<BookingStatusAction bookingId={20} callId="call-004" status="paid" />)
    expect(screen.getByText('Cần xử lý hoàn tiền')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
