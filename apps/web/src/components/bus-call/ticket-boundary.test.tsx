import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BookingSnapshot } from '@/lib/call-contract'
import { TicketBoundary } from './ticket-boundary'

const booking: BookingSnapshot = {
  id: 'booking-test-1',
  conversationId: 'test-1',
  status: 'confirmed',
  origin: 'Hà Nội',
  destination: 'Huế',
  travelDateLabel: '19-07',
  passengerCount: 2,
  selectedTrip: null,
  seats: ['A01', 'A02'],
  passengerName: 'Nguyễn Mạnh Quyền',
  phone: '0336427988',
  totalFareVnd: 1640000,
  bookingCode: 'VD-260719-0017',
}

function Exploding(): never {
  throw new Error('mask không dựng được')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TicketBoundary', () => {
  it('giữ mã vé và ghế khi tờ vé không dựng được', () => {
    // React in nguyên stack của lỗi đã bắt được; chặn cho log test khỏi rác.
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <TicketBoundary booking={booking} onClose={() => {}}>
        <Exploding />
      </TicketBoundary>,
    )

    expect(screen.getByText('VD-260719-0017')).toBeInTheDocument()
    expect(screen.getByText('A01, A02')).toBeInTheDocument()
    expect(screen.getByText('mask không dựng được')).toBeInTheDocument()
  })

  it('không xen vào khi tờ vé dựng bình thường', () => {
    render(
      <TicketBoundary booking={booking} onClose={() => {}}>
        <p>tờ vé thật</p>
      </TicketBoundary>,
    )

    expect(screen.getByText('tờ vé thật')).toBeInTheDocument()
  })
})
