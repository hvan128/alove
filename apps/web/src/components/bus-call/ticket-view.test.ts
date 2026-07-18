import { describe, expect, it } from 'vitest'
import type { BookingDraft } from '@ordervoice/contracts'
import type { CustomerTicket } from '@/lib/db/booking-store'

import { ticketShareText, ticketViewFromCustomerTicket, ticketViewFromDraft } from './ticket-view'

const storedTicket: CustomerTicket = {
  code: 'VD-260725-0042',
  passengerName: 'Nguyễn Minh Anh',
  phoneMasked: '0909 *** 456',
  seatCodes: ['A05', 'A06'],
  totalVnd: 640_000,
  status: 'paid',
  // 22:00 on 25/07/2026 in Vietnam is 15:00 UTC.
  departureAt: '2026-07-25T15:00:00.000Z',
  originCity: 'Sài Gòn',
  destinationCity: 'Đà Lạt',
  pickupPoint: 'Bến xe Miền Đông',
  dropoffPoint: 'Bến xe Đà Lạt',
}

describe('ticketViewFromCustomerTicket', () => {
  it('renders departure in Vietnam time regardless of where the page is opened', () => {
    const view = ticketViewFromCustomerTicket(storedTicket)
    expect(view.departureTime).toBe('22:00')
    expect(view.travelDateLabel).toContain('25/07')
  })

  it('derives passenger count from seats rather than trusting a second field', () => {
    expect(ticketViewFromCustomerTicket(storedTicket).passengerCount).toBe(2)
  })

  it('marks a cancelled ticket so the stub cannot be mistaken for a valid one', () => {
    const view = ticketViewFromCustomerTicket({ ...storedTicket, status: 'cancelled' })
    expect(view.tone).toBe('cancelled')
    expect(view.statusLabel).toBe('Đã huỷ')
  })

  it('treats an unpaid booking as issued, because the seat is already held', () => {
    expect(ticketViewFromCustomerTicket({ ...storedTicket, status: 'pending_payment' }).tone).toBe('issued')
  })

  it('never carries the full phone number into the view', () => {
    expect(ticketViewFromCustomerTicket(storedTicket).phone).toBe('0909 *** 456')
  })
})

describe('ticketViewFromDraft', () => {
  const draft = {
    id: 'draft-1',
    conversationId: 'call-1',
    status: 'collecting',
    origin: 'Sài Gòn',
    destination: null,
    travelDateLabel: null,
    timeWindow: null,
    passengerCount: null,
    selectedTrip: null,
    seats: [],
    passengerName: null,
    phone: null,
    totalFareVnd: null,
    bookingCode: null,
    evidenceMessageIds: [],
  } satisfies BookingDraft

  it('keeps a half-filled draft pending, so no stub is drawn mid-call', () => {
    const view = ticketViewFromDraft(draft)
    expect(view.tone).toBe('pending')
    expect(view.bookingCode).toBeNull()
  })

  it('switches to issued only once the booking is confirmed', () => {
    const view = ticketViewFromDraft({ ...draft, status: 'confirmed', bookingCode: 'VD-240718-0001' })
    expect(view.tone).toBe('issued')
    expect(view.statusLabel).toBe('Đã giữ vé')
  })
})

describe('ticketShareText', () => {
  it('reads as a complete ticket without opening the link', () => {
    const text = ticketShareText(ticketViewFromCustomerTicket(storedTicket), 'https://alove.vn/ve?code=VD-260725-0042')
    expect(text).toContain('VD-260725-0042')
    expect(text).toContain('Sài Gòn → Đà Lạt')
    expect(text).toContain('Ghế: A05, A06')
    expect(text).toContain('640.000 ₫')
    expect(text).toContain('https://alove.vn/ve?code=VD-260725-0042')
  })

  it('omits missing lines instead of printing empty labels', () => {
    const text = ticketShareText(ticketViewFromDraft({
      id: 'd', conversationId: 'c', status: 'collecting', origin: null, destination: null,
      travelDateLabel: null, timeWindow: null, passengerCount: null, selectedTrip: null, seats: [],
      passengerName: null, phone: null, totalFareVnd: null, bookingCode: null, evidenceMessageIds: [],
    }), 'https://alove.vn/ve')
    expect(text).not.toContain('Ghế:')
    expect(text).not.toContain('Hành khách:')
    expect(text).not.toContain('Tổng tiền:')
  })
})
