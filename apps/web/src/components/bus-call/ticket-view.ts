import type { BookingDraft } from '@ordervoice/contracts'
import type { CustomerTicket } from '@/lib/db/booking-store'

/**
 * What the ticket card draws, independent of where the ticket came from.
 *
 * Two sources feed it and they disagree on almost everything: the in-call draft
 * is half-empty by design and tracks conversation state ('awaiting_confirmation'),
 * while a stored booking is complete and tracks money ('pending_payment'). Rather
 * than teach the card both vocabularies, each side maps into this one.
 */

export type TicketTone = 'pending' | 'issued' | 'cancelled'

export type TicketView = {
  tone: TicketTone
  statusLabel: string
  origin: string | null
  destination: string | null
  travelDateLabel: string | null
  departureTime: string | null
  passengerCount: number | null
  totalFareVnd: number | null
  passengerName: string | null
  phone: string | null
  bookingCode: string | null
  seats: string[]
}

const DRAFT_STATUS_LABEL: Record<BookingDraft['status'], string> = {
  collecting: 'Đang thu thập',
  trip_proposed: 'Đã đề xuất chuyến',
  awaiting_confirmation: 'Chờ xác nhận',
  confirmed: 'Đã giữ vé',
}

export function ticketViewFromDraft(draft: BookingDraft): TicketView {
  return {
    tone: draft.status === 'confirmed' ? 'issued' : 'pending',
    statusLabel: DRAFT_STATUS_LABEL[draft.status],
    origin: draft.origin,
    destination: draft.destination,
    travelDateLabel: draft.travelDateLabel,
    departureTime: draft.selectedTrip?.departureTime ?? null,
    passengerCount: draft.passengerCount,
    totalFareVnd: draft.totalFareVnd,
    passengerName: draft.passengerName,
    phone: draft.phone,
    bookingCode: draft.bookingCode,
    seats: draft.seats,
  }
}

const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  cancelled: 'Đã huỷ',
}

export function ticketViewFromCustomerTicket(ticket: CustomerTicket): TicketView {
  const departsAt = new Date(ticket.departureAt)
  return {
    tone: ticket.status === 'cancelled' ? 'cancelled' : 'issued',
    statusLabel: BOOKING_STATUS_LABEL[ticket.status] ?? ticket.status,
    origin: ticket.originCity,
    destination: ticket.destinationCity,
    travelDateLabel: formatTravelDate(departsAt),
    departureTime: formatDepartureTime(departsAt),
    // One seat per passenger is enforced when the booking is written, so the
    // seat list is the passenger count without storing it twice.
    passengerCount: ticket.seatCodes.length,
    totalFareVnd: ticket.totalVnd,
    passengerName: ticket.passengerName,
    phone: ticket.phoneMasked,
    bookingCode: ticket.code,
    seats: ticket.seatCodes,
  }
}

// Departure is stored as an instant; a passenger reads it in Vietnam time no
// matter which device or region opens the page.
const TZ = 'Asia/Ho_Chi_Minh'

function formatTravelDate(value: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', timeZone: TZ,
  }).format(value)
}

function formatDepartureTime(value: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ,
  }).format(value)
}

/** The text a passenger sends to themselves on Zalo — readable without the page. */
export function ticketShareText(view: TicketView, url: string): string {
  const lines = [
    `🎟 Vé xe Alove — ${view.bookingCode ?? ''}`.trim(),
    `${view.origin ?? '?'} → ${view.destination ?? '?'}`,
    [view.travelDateLabel, view.departureTime].filter(Boolean).join(', '),
    view.seats.length ? `Ghế: ${view.seats.join(', ')}` : null,
    view.passengerName ? `Hành khách: ${view.passengerName}` : null,
    view.totalFareVnd === null ? null : `Tổng tiền: ${new Intl.NumberFormat('vi-VN').format(view.totalFareVnd)} ₫`,
    '',
    url,
  ]
  return lines.filter((line) => line !== null).join('\n')
}
