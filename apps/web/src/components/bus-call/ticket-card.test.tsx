import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { BookingSnapshot } from '@/lib/call-contract'
import { TicketCard } from './ticket-card'

/**
 * Payload đúng như agent phát qua data channel khi chốt vé (booking.update,
 * status confirmed). Nhánh vé đã in trước đây không có test nào chạm tới, nên
 * một lỗi render ở đây chỉ lộ ra khi khách đã gọi tới bước cuối.
 */
const confirmed: BookingSnapshot = {
  id: 'booking-test-1',
  conversationId: 'test-1',
  status: 'confirmed',
  origin: 'Vinh',
  destination: 'Hà Nội',
  travelDateLabel: '19-07',
  passengerCount: 2,
  selectedTrip: {
    id: 't1',
    origin: 'Vinh',
    destination: 'Hà Nội',
    departureTime: '06:00',
    arrivalTime: null,
    vehicleType: 'Giường nằm 34 chỗ',
    priceVnd: 520000,
    pickupPoint: 'Bến xe Vinh',
    dropoffPoint: 'Bến xe Nước Ngầm',
    seatNoun: 'phòng',
  },
  seats: ['A01', 'A02'],
  passengerName: 'Trần Văn A',
  phone: '0912345678',
  totalFareVnd: 1040000,
  bookingCode: 'MA-260719-0001',
}

describe('TicketCard', () => {
  it('in vé khi chốt xong', () => {
    render(<TicketCard booking={confirmed} />)

    expect(screen.getByText('MA-260719-0001')).toBeInTheDocument()
    expect(screen.getByText(/A01, A02/u)).toBeInTheDocument()
  })

  it('vẫn in được khi chuyến và ghế thiếu dữ liệu', () => {
    render(<TicketCard booking={{ ...confirmed, selectedTrip: null, seats: [] }} />)

    expect(screen.getByText('MA-260719-0001')).toBeInTheDocument()
  })
})
