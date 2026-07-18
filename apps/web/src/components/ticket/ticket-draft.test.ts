import { describe, expect, it } from 'vitest'
import type { CustomerTicket } from '@/lib/db/booking-store'

import { bookingDraftFromTicket, ticketShareText } from './ticket-draft'

const TICKET: CustomerTicket = {
  code: 'VD-260725-0042',
  passengerName: 'Nguyễn Minh Anh',
  phoneMasked: '0909 *** 456',
  seatCodes: ['A05', 'A06'],
  totalVnd: 640_000,
  status: 'paid',
  // 22:00 giờ Việt Nam ngày 25/07/2026 là 15:00 UTC.
  departureAt: '2026-07-25T15:00:00.000Z',
  arrivalAt: '2026-07-25T22:30:00.000Z',
  originCity: 'Sài Gòn',
  destinationCity: 'Đà Lạt',
  vehicleType: 'Giường nằm 34 chỗ',
  pickupPoint: 'Bến xe Miền Đông',
  dropoffPoint: 'Bến xe Đà Lạt',
}

describe('bookingDraftFromTicket', () => {
  it('đổi giờ khởi hành sang giờ Việt Nam bất kể máy đọc ở đâu', () => {
    const draft = bookingDraftFromTicket(TICKET)
    expect(draft.selectedTrip?.departureTime).toBe('22:00')
    expect(draft.travelDateLabel).toContain('25/07')
  })

  it('dựng vé ở trạng thái confirmed để card in ra thay vì hiện phiếu ghi', () => {
    const draft = bookingDraftFromTicket(TICKET)
    expect(draft.status).toBe('confirmed')
    expect(draft.bookingCode).toBe('VD-260725-0042')
  })

  it('suy ra số hành khách từ số ghế thay vì lưu thừa một trường', () => {
    expect(bookingDraftFromTicket(TICKET).passengerCount).toBe(2)
    expect(bookingDraftFromTicket(TICKET).seats).toEqual(['A05', 'A06'])
  })

  it('chia giá mỗi vé từ tổng tiền', () => {
    expect(bookingDraftFromTicket(TICKET).selectedTrip?.priceVnd).toBe(320_000)
  })

  it('không bao giờ mang số điện thoại đầy đủ vào bản nháp', () => {
    expect(bookingDraftFromTicket(TICKET).phone).toBe('0909 *** 456')
  })

  it('thiếu giờ đến thì vẫn dựng được vé (vé in không hiển thị trường này)', () => {
    const draft = bookingDraftFromTicket({ ...TICKET, arrivalAt: null })
    expect(draft.selectedTrip?.arrivalTime).toBe('22:00')
  })

  it('vé một ghế không chia cho 0', () => {
    const draft = bookingDraftFromTicket({ ...TICKET, seatCodes: ['A01'], totalVnd: 530_000 })
    expect(draft.selectedTrip?.priceVnd).toBe(530_000)
    expect(draft.passengerCount).toBe(1)
  })
})

describe('ticketShareText', () => {
  it('đọc được như một tấm vé đầy đủ mà không cần mở link', () => {
    const text = ticketShareText(TICKET, 'https://alove.vn/ve?code=VD-260725-0042')
    expect(text).toContain('VD-260725-0042')
    expect(text).toContain('Sài Gòn → Đà Lạt')
    expect(text).toContain('22:00')
    expect(text).toContain('Ghế: A05, A06')
    expect(text).toContain('Đón tại: Bến xe Miền Đông')
    expect(text).toContain('640.000 ₫')
    expect(text).toContain('https://alove.vn/ve?code=VD-260725-0042')
  })
})
