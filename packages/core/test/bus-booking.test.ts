import { describe, expect, it } from 'vitest'
import type { CallMessage } from '@ordervoice/contracts'
import {
  advanceBookingAgent,
  canConfirmBooking,
  confirmBooking,
  createInitialBooking,
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
  it('says the route is unavailable instead of re-asking forever', () => {
    // A caller naming an unserved city used to loop on "cho em xin điểm đi và
    // điểm đến" because the catalog only knows Sài Gòn – Đà Lạt.
    const turn = advanceBookingAgent(
      createInitialBooking('call-demo-001'),
      customer('Tôi muốn đi từ Hà Nội tới Hải Phòng.', 'message-unserved'),
    )

    expect(turn.reply).toContain('Hà Nội')
    expect(turn.reply).toContain('Hải Phòng')
    expect(turn.reply).toContain('Sài Gòn')
    expect(turn.reply).not.toBe('Anh chị cho em xin điểm đi và điểm đến ạ.')
    expect(turn.draft.status).toBe('collecting')
  })

  it('still asks for the route when no city is recognised at all', () => {
    const turn = advanceBookingAgent(
      createInitialBooking('call-demo-001'),
      customer('Alo em ơi cho anh hỏi chút.', 'message-vague'),
    )

    expect(turn.reply).toBe('Anh chị cho em xin điểm đi và điểm đến ạ.')
  })

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
