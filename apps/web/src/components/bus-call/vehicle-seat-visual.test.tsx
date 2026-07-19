import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { BookingSnapshot } from '@/lib/call-contract'
import { VehicleSeatVisual } from './vehicle-seat-visual'

const heldLimousineSeats: BookingSnapshot = {
  id: 'booking-seat-preview',
  conversationId: 'call-seat-preview',
  status: 'awaiting_confirmation',
  origin: 'Hà Nội',
  destination: 'Vinh',
  travelDateLabel: '20/07',
  passengerCount: 2,
  selectedTrip: {
    id: 'trip-seat-preview',
    origin: 'Hà Nội',
    destination: 'Vinh',
    departureTime: '20:00',
    arrivalTime: '01:30',
    vehicleType: 'Limousine 21 Phòng VIP',
    priceVnd: 530000,
    pickupPoint: 'Bến xe Mỹ Đình',
    dropoffPoint: 'Bến xe Vinh',
    seatNoun: 'phòng',
  },
  seats: ['A1', 'A2'],
  passengerName: null,
  phone: null,
  totalFareVnd: 1060000,
  bookingCode: null,
}

describe('VehicleSeatVisual', () => {
  it('neo hai phòng đầu đúng vào đệm nằm trên ảnh limousine', () => {
    render(<VehicleSeatVisual booking={heldLimousineSeats} />)

    expect(screen.getByText('A1').parentElement).toHaveStyle({ left: '31.5%', top: '14%' })
    expect(screen.getByText('A2').parentElement).toHaveStyle({ left: '27.5%', top: '22.5%' })
  })

  it('đặt chú thích trong một hàng riêng bên dưới mô hình', () => {
    render(<VehicleSeatVisual booking={heldLimousineSeats} />)

    expect(screen.getByText('Ghế đang giữ').closest('.vehicle-seat-summary')).not.toBeNull()
    expect(screen.getByText('Đang giữ A1, A2 cho 2 khách')).toBeInTheDocument()
  })
})
