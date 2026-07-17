import { describe, expect, it } from 'vitest'
import type { CallMessage } from '@ordervoice/contracts'
import {
  advanceBookingAgent,
  applyBookingMessage,
  applyStaffFieldEdit,
  canConfirmBooking,
  confirmBooking,
  createBookingReplySuggestion,
  createInitialBooking,
  getBookingConfirmationState,
  getMissingBookingFields,
} from '../src/bus-booking.js'

function customer(text: string, id = `message-${text.length}`): CallMessage {
  return {
    id,
    conversationId: 'call-demo-001',
    role: 'customer',
    text,
    createdAt: '2026-07-18T04:00:00.000Z',
    channel: 'preset',
    final: true,
  }
}

describe('deterministic bus booking agent', () => {
  it('extracts a Vietnamese route request and proposes the recommended trip', () => {
    const turn = advanceBookingAgent(
      createInitialBooking('call-demo-001'),
      customer('Tôi muốn đi từ Sài Gòn đến Đà Lạt tối thứ Sáu, 2 vé.', 'message-request'),
    )

    expect(turn.draft).toMatchObject({
      origin: 'Sài Gòn',
      destination: 'Đà Lạt',
      travelDateLabel: 'Tối thứ Sáu, 24/07',
      timeWindow: 'Buổi tối',
      passengerCount: 2,
      status: 'trip_proposed',
      totalFareVnd: 640_000,
    })
    expect(turn.draft.selectedTrip?.id).toBe('SG-DL-2200')
    expect(turn.draft.evidenceMessageIds).toEqual(['message-request'])
    expect(turn.reply).toContain('22:00')
    expect(turn.reply).toContain('320.000')
  })

  it('asks one safe clarification when the route is missing', () => {
    const turn = advanceBookingAgent(
      createInitialBooking('call-demo-001'),
      customer('Cho tôi 2 vé tối thứ Sáu.'),
    )

    expect(turn.draft.status).toBe('collecting')
    expect(turn.draft.passengerCount).toBe(2)
    expect(turn.reply).toMatch(/điểm đi và điểm đến/i)
  })

  it('collects passenger details and asks for explicit confirmation', () => {
    const proposed = advanceBookingAgent(
      createInitialBooking('call-demo-001'),
      customer('Tôi muốn đi từ Sài Gòn đến Đà Lạt tối thứ Sáu, 2 vé.'),
    ).draft
    const selected = advanceBookingAgent(proposed, customer('Tôi chọn chuyến 22 giờ.')).draft
    const passenger = advanceBookingAgent(
      selected,
      customer('Tôi là Nguyễn Minh Anh, số điện thoại 0909123456.'),
    )

    expect(passenger.draft).toMatchObject({
      passengerName: 'Nguyễn Minh Anh',
      phone: '0909123456',
      status: 'awaiting_confirmation',
    })
    expect(canConfirmBooking(passenger.draft)).toBe(true)
    expect(passenger.reply).toContain('640.000')
    expect(passenger.reply).toMatch(/xác nhận/i)
  })

  it('requires complete fields and reuses the same code on duplicate confirmation', () => {
    expect(() => confirmBooking(createInitialBooking('call-demo-001'), 'customer')).toThrow(/chưa đủ thông tin/i)

    const requested = advanceBookingAgent(
      createInitialBooking('call-demo-001'),
      customer('Tôi muốn đi từ Sài Gòn đến Đà Lạt tối thứ Sáu, 2 vé.'),
    ).draft
    const ready = advanceBookingAgent(
      requested,
      customer('Tôi là Nguyễn Minh Anh, số điện thoại 0909123456.'),
    ).draft
    const confirmedTurn = advanceBookingAgent(ready, customer('Tôi xác nhận đặt vé.'))
    const retry = confirmBooking(confirmedTurn.draft, 'customer')

    expect(confirmedTurn.draft.status).toBe('confirmed')
    expect(confirmedTurn.draft.seats).toEqual(['A05', 'A06'])
    expect(confirmedTurn.draft.bookingCode).toMatch(/^VD-240718-\d{4}$/u)
    expect(retry).toBe(confirmedTurn.draft)
    expect(retry.bookingCode).toBe(confirmedTurn.draft.bookingCode)
  })

  it('rejects provisional or non-customer messages at the agent boundary', () => {
    const draft = createInitialBooking('call-demo-001')

    expect(() => advanceBookingAgent(draft, { ...customer('Đặt 2 vé.'), final: false })).toThrow(/final customer message/i)
    expect(() => advanceBookingAgent(draft, { ...customer('Đặt 2 vé.'), role: 'staff' })).toThrow(/final customer message/i)
  })
})

describe('staff-first incremental booking engine', () => {
  it('ignores provisional and non-caller messages without mutating the draft', () => {
    const draft = createInitialBooking('DEMO42')

    const partial = applyBookingMessage(draft, {
      ...customer('Tôi đi từ Sài Gòn đến Đà Lạt.', 'partial-001'),
      final: false,
    })
    const staff = applyBookingMessage(draft, {
      ...customer('Tôi đi từ Sài Gòn đến Đà Lạt.', 'staff-001'),
      role: 'staff',
    })

    expect(partial.draft).toBe(draft)
    expect(partial.changedFields).toEqual([])
    expect(staff.draft).toBe(draft)
    expect(staff.changedFields).toEqual([])
  })

  it('fills a complete booking incrementally and attaches exact evidence to every spoken field', () => {
    const message = customer(
      'Tôi tên Nguyễn Minh Anh, số 0909 123 456, đặt 2 vé từ Sài Gòn đi Đà Lạt ngày 24/07 lúc 22 giờ, đón ở Ngã tư Hàng Xanh, trả tại Chợ Đà Lạt, xe giường nằm, thanh toán chuyển khoản, ghi chú có một bé 5 tuổi.',
      'final-rich-001',
    )

    const result = applyBookingMessage(createInitialBooking('DEMO42'), message)

    expect(result.draft).toMatchObject({
      origin: 'Sài Gòn',
      destination: 'Đà Lạt',
      travelDateLabel: '24/07/2026',
      timeWindow: '22:00',
      passengerCount: 2,
      passengerName: 'Nguyễn Minh Anh',
      phone: '0909123456',
      pickupPoint: 'Ngã tư Hàng Xanh',
      dropoffPoint: 'Chợ Đà Lạt',
      vehiclePreference: 'Giường nằm',
      paymentMethod: 'Chuyển khoản',
      note: 'Có một bé 5 tuổi',
    })
    expect(result.draft.selectedTrip?.id).toBe('SG-DL-2200')
    expect(result.draft.seats).toEqual(['A05', 'A06'])
    expect(result.draft.totalFareVnd).toBe(640_000)
    expect(result.changedFields).toEqual(expect.arrayContaining([
      'origin',
      'destination',
      'travelDateLabel',
      'timeWindow',
      'passengerCount',
      'passengerName',
      'phone',
      'pickupPoint',
      'dropoffPoint',
      'vehiclePreference',
      'paymentMethod',
      'note',
    ]))
    expect(result.draft.fieldEvidence.origin?.at(-1)).toMatchObject({
      field: 'origin',
      messageId: 'final-rich-001',
      quote: 'từ Sài Gòn',
      source: 'caller_speech',
    })
    expect(result.draft.fieldEvidence.phone?.at(-1)?.quote).toBe('0909 123 456')
    expect(result.draft.fieldEvidence.pickupPoint?.at(-1)?.quote).toBe('đón ở Ngã tư Hàng Xanh')
  })

  it('replaces machine values on explicit correction and preserves revision evidence', () => {
    const first = applyBookingMessage(
      createInitialBooking('DEMO42'),
      customer('Đặt 1 vé từ Sài Gòn đi Đà Lạt ngày 24/07 lúc 22 giờ, đón ở Ngã tư Hàng Xanh.', 'final-001'),
    ).draft
    const corrected = applyBookingMessage(
      first,
      customer('Không, đổi điểm đón sang Bến xe Miền Đông mới và đổi sang chuyến 23:30.', 'final-002'),
    ).draft

    expect(corrected.pickupPoint).toBe('Bến xe Miền Đông mới')
    expect(corrected.selectedTrip?.id).toBe('SG-DL-2330')
    expect(corrected.timeWindow).toBe('23:30')
    expect(corrected.fieldEvidence.pickupPoint).toHaveLength(2)
    expect(corrected.fieldEvidence.pickupPoint?.map((item) => item.messageId)).toEqual(['final-001', 'final-002'])
  })

  it('protects staff-confirmed values and sends an explicit caller correction to review', () => {
    const machineDraft = applyBookingMessage(
      createInitialBooking('DEMO42'),
      customer('Tôi đi từ Sài Gòn đến Đà Lạt.', 'final-001'),
    ).draft
    const staffDraft = applyStaffFieldEdit(machineDraft, 'origin', 'Biên Hòa', {
      messageId: 'staff-edit-001',
      occurredAt: '2026-07-18T04:01:00.000Z',
    })

    const ordinary = applyBookingMessage(
      staffDraft,
      customer('Tôi đi từ Sài Gòn đến Đà Lạt.', 'final-002'),
    ).draft
    const correction = applyBookingMessage(
      ordinary,
      customer('Xin sửa lại, đổi điểm đi sang Sài Gòn.', 'final-003'),
    ).draft

    expect(ordinary.origin).toBe('Biên Hòa')
    expect(correction.origin).toBe('Biên Hòa')
    expect(correction.confirmedFields).toContain('origin')
    expect(correction.reviewItems.at(-1)).toMatchObject({
      field: 'origin',
      code: 'correction',
      proposedValue: 'Sài Gòn',
      sourceMessageId: 'final-003',
      status: 'open',
    })
  })

  it('creates a review item instead of guessing an ambiguous passenger count', () => {
    const result = applyBookingMessage(
      createInitialBooking('DEMO42'),
      customer('Tôi cần 2 hoặc 3 vé đi Đà Lạt.', 'ambiguous-001'),
    )

    expect(result.draft.passengerCount).toBeNull()
    expect(result.draft.reviewItems).toEqual([
      expect.objectContaining({
        field: 'passengerCount',
        code: 'ambiguous',
        sourceMessageId: 'ambiguous-001',
      }),
    ])
  })

  it('asks for no more than two next facts and reports the confirmation gate', () => {
    const empty = createInitialBooking('DEMO42')
    const suggestion = createBookingReplySuggestion(empty)

    expect(suggestion.missingFields).toEqual(['origin', 'destination'])
    expect(suggestion.text).toMatch(/điểm đi.*điểm đến/iu)
    expect(getMissingBookingFields(empty).length).toBeGreaterThan(2)
    expect(getBookingConfirmationState(empty)).toMatchObject({ ready: false })

    const ready = applyBookingMessage(
      empty,
      customer(
        'Tôi tên Nguyễn Minh Anh, số 0909 123 456, đặt 2 vé từ Sài Gòn đi Đà Lạt ngày 24/07 lúc 22 giờ, đón ở Ngã tư Hàng Xanh, trả tại Chợ Đà Lạt.',
        'ready-001',
      ),
    ).draft

    expect(getBookingConfirmationState(ready)).toEqual({ ready: true, missingFields: [], issues: [] })
    expect(canConfirmBooking(ready)).toBe(true)
  })
})
