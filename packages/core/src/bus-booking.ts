import type { BookingDraft, BusTrip, CallMessage } from '@ordervoice/contracts'

export type AgentTurn = {
  draft: BookingDraft
  reply: string
}

const RECOMMENDED_TRIP_ID = 'SG-DL-2200'

const SERVED_ORIGIN = 'Sài Gòn'
const SERVED_DESTINATION = 'Đà Lạt'

// Cities the demo catalog does NOT serve. Recognised solely so the agent can say
// so once, instead of re-asking for a route it can never accept — a caller who
// names an unserved city otherwise loops on "cho em xin điểm đi và điểm đến".
const UNSERVED_CITIES: ReadonlyArray<readonly [RegExp, string]> = [
  [/ha noi/u, 'Hà Nội'],
  [/hai phong/u, 'Hải Phòng'],
  [/da nang/u, 'Đà Nẵng'],
  [/nha trang/u, 'Nha Trang'],
  [/\bhue\b/u, 'Huế'],
  [/can tho/u, 'Cần Thơ'],
  [/vung tau/u, 'Vũng Tàu'],
  [/quy nhon/u, 'Quy Nhơn'],
  [/phan thiet/u, 'Phan Thiết'],
  [/buon ma thuot/u, 'Buôn Ma Thuột'],
  [/sa pa|lao cai/u, 'Sa Pa'],
]

function unservedCities(normalized: string): string[] {
  return UNSERVED_CITIES.filter(([pattern]) => pattern.test(normalized)).map(([, label]) => label)
}

export function createBusDemoCatalog(): BusTrip[] {
  return [
    {
      id: RECOMMENDED_TRIP_ID,
      origin: 'Sài Gòn',
      destination: 'Đà Lạt',
      departureTime: '22:00',
      arrivalTime: '05:30',
      vehicleType: 'Giường nằm 34 chỗ',
      priceVnd: 320_000,
      pickupPoint: 'Bến xe Miền Đông mới',
      dropoffPoint: 'Bến xe liên tỉnh Đà Lạt',
      availableSeats: ['A05', 'A06', 'A07', 'A08', 'B05', 'B06'],
    },
    {
      id: 'SG-DL-2330',
      origin: 'Sài Gòn',
      destination: 'Đà Lạt',
      departureTime: '23:30',
      arrivalTime: '06:30',
      vehicleType: 'Limousine phòng đôi',
      priceVnd: 390_000,
      pickupPoint: 'Văn phòng Quận 1',
      dropoffPoint: 'Chợ Đà Lạt',
      availableSeats: ['P03', 'P04', 'P05', 'P06'],
    },
  ]
}

export function createInitialBooking(conversationId: string): BookingDraft {
  return {
    id: `booking-${conversationId}`,
    conversationId,
    status: 'collecting',
    origin: null,
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
  }
}

export function advanceBookingAgent(draft: BookingDraft, message: CallMessage): AgentTurn {
  if (message.role !== 'customer' || !message.final) {
    throw new Error('booking agent requires a final customer message')
  }

  if (draft.status === 'confirmed') {
    return {
      draft,
      reply: `Vé đã được xác nhận với mã ${draft.bookingCode}. Em giữ nguyên thông tin này ạ.`,
    }
  }

  const previousTrip = draft.selectedTrip
  const normalized = normalize(message.text)
  const extracted = extractCustomerDetails(draft, message.text, normalized)
  let next = extracted.changed
    ? addEvidence(extracted.draft, message.id)
    : extracted.draft

  if (isConfirmation(normalized)) {
    if (!canConfirmBooking(next)) {
      return { draft: next, reply: missingFieldsReply(next) }
    }
    next = confirmBooking(next, 'customer')
    return {
      draft: next,
      reply: `Đã xác nhận ${next.passengerCount} vé, ghế ${next.seats.join(', ')}. Mã vé ${next.bookingCode}. Hẹn gặp anh chị tại ${next.selectedTrip?.pickupPoint}.`,
    }
  }

  if (!next.origin || !next.destination) {
    const unserved = unservedCities(normalized)
    if (unserved.length > 0) {
      return {
        draft: { ...next, status: 'collecting' },
        reply: `Dạ VéĐi chưa chạy tuyến ${unserved.join(' – ')} ạ. Hiện em chỉ có tuyến ${SERVED_ORIGIN} đi ${SERVED_DESTINATION}. Anh chị có muốn đặt tuyến này không ạ?`,
      }
    }
    return { draft: { ...next, status: 'collecting' }, reply: 'Anh chị cho em xin điểm đi và điểm đến ạ.' }
  }
  if (!next.travelDateLabel) {
    return { draft: { ...next, status: 'collecting' }, reply: 'Anh chị muốn đi ngày nào ạ?' }
  }
  if (!next.passengerCount) {
    return { draft: { ...next, status: 'collecting' }, reply: 'Mình cần đặt bao nhiêu vé ạ?' }
  }

  if (!next.selectedTrip) {
    next = selectTrip(next, preferredTrip(normalized))
  }

  if (!next.passengerName || !next.phone) {
    next = { ...next, status: 'trip_proposed' }
    if (!previousTrip) {
      const trip = next.selectedTrip!
      const alternative = createBusDemoCatalog().find((item) => item.id !== trip.id)!
      return {
        draft: next,
        reply: `Em đề xuất chuyến ${trip.vehicleType.toLocaleLowerCase('vi-VN')} ${trip.departureTime}, giá ${formatVnd(trip.priceVnd)} mỗi vé. Chuyến ${alternative.departureTime} còn phòng limousine. Anh chị chọn chuyến nào ạ?`,
      }
    }
    return {
      draft: next,
      reply: 'Em đã giữ chuyến 22:00. Anh chị cho em xin họ tên và số điện thoại người đi ạ.',
    }
  }

  next = { ...next, status: 'awaiting_confirmation' }
  return {
    draft: next,
    reply: `Em xin đọc lại: ${next.passengerCount} vé ${next.origin} đi ${next.destination}, chuyến ${next.selectedTrip?.departureTime}, tổng ${formatVnd(next.totalFareVnd ?? 0)}, tên ${next.passengerName}. Anh chị xác nhận đặt vé chứ ạ?`,
  }
}

export function canConfirmBooking(draft: BookingDraft): boolean {
  return Boolean(
    draft.origin
    && draft.destination
    && draft.travelDateLabel
    && draft.passengerCount
    && draft.selectedTrip
    && draft.passengerName
    && draft.phone
    && draft.selectedTrip.availableSeats.length >= draft.passengerCount,
  )
}

export function confirmBooking(draft: BookingDraft, actor: 'customer' | 'staff'): BookingDraft {
  if (draft.status === 'confirmed') return draft
  if (!canConfirmBooking(draft)) {
    throw new Error('chưa đủ thông tin để xác nhận vé')
  }

  const count = draft.passengerCount!
  const trip = draft.selectedTrip!
  const seats = trip.availableSeats.slice(0, count)
  return {
    ...draft,
    status: 'confirmed',
    seats,
    totalFareVnd: trip.priceVnd * count,
    bookingCode: stableBookingCode(draft.conversationId, actor),
  }
}

function extractCustomerDetails(
  draft: BookingDraft,
  original: string,
  normalized: string,
): { draft: BookingDraft; changed: boolean } {
  let next = draft
  let changed = false
  const set = <K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) => {
    if (value !== null && next[key] !== value) {
      next = { ...next, [key]: value }
      changed = true
    }
  }

  if (/(sai gon|tp hcm|ho chi minh)/u.test(normalized)) set('origin', 'Sài Gòn')
  if (/da lat/u.test(normalized)) set('destination', 'Đà Lạt')
  if (/toi thu sau|thu sau toi/u.test(normalized)) {
    set('travelDateLabel', 'Tối thứ Sáu, 24/07')
    set('timeWindow', 'Buổi tối')
  } else if (/toi nay/u.test(normalized)) {
    set('travelDateLabel', 'Tối nay, 18/07')
    set('timeWindow', 'Buổi tối')
  }

  const passengerMatch = normalized.match(/\b([1-6])\s*(?:ve|nguoi)\b/u)
  if (passengerMatch?.[1]) set('passengerCount', Number(passengerMatch[1]))

  const phone = original.match(/\b0\d{9}\b/u)?.[0] ?? null
  if (phone) set('phone', phone)

  const name = extractPassengerName(original)
  if (name) set('passengerName', name)

  if (next.origin && next.destination && next.travelDateLabel && next.passengerCount) {
    const trip = preferredTrip(normalized)
    if (!next.selectedTrip || trip.id !== next.selectedTrip.id) {
      next = selectTrip(next, trip)
      changed = true
    } else if (next.totalFareVnd !== trip.priceVnd * next.passengerCount) {
      next = { ...next, totalFareVnd: trip.priceVnd * next.passengerCount }
      changed = true
    }
  }

  return { draft: next, changed }
}

function extractPassengerName(text: string): string | null {
  const match = text.match(/(?:tôi là|tên tôi là|tên là)\s+([^,.]+?)(?=\s*(?:,|số điện thoại|sđt|số đt|$))/iu)
  const value = match?.[1]?.trim()
  return value && value.length >= 2 ? value : null
}

function preferredTrip(normalized: string): BusTrip {
  const trips = createBusDemoCatalog()
  if (/23\s*(?:gio|:30)|limousine/u.test(normalized)) return trips[1]!
  return trips[0]!
}

function selectTrip(draft: BookingDraft, trip: BusTrip): BookingDraft {
  return {
    ...draft,
    selectedTrip: trip,
    totalFareVnd: draft.passengerCount ? trip.priceVnd * draft.passengerCount : null,
  }
}

function addEvidence(draft: BookingDraft, messageId: string): BookingDraft {
  if (draft.evidenceMessageIds.includes(messageId)) return draft
  return { ...draft, evidenceMessageIds: [...draft.evidenceMessageIds, messageId] }
}

function missingFieldsReply(draft: BookingDraft): string {
  if (!draft.origin || !draft.destination) return 'Em chưa đủ thông tin. Anh chị cho em xin điểm đi và điểm đến ạ.'
  if (!draft.travelDateLabel) return 'Em chưa đủ thông tin. Anh chị muốn đi ngày nào ạ?'
  if (!draft.passengerCount) return 'Em chưa đủ thông tin. Mình cần đặt bao nhiêu vé ạ?'
  if (!draft.passengerName || !draft.phone) return 'Em chưa đủ thông tin. Anh chị cho em xin họ tên và số điện thoại người đi ạ.'
  return 'Em chưa thể xác nhận chuyến này. Nhân viên sẽ hỗ trợ ngay ạ.'
}

function isConfirmation(normalized: string): boolean {
  return /\b(xac nhan|dong y|chot ve|dat ve di)\b/u.test(normalized)
}

function stableBookingCode(conversationId: string, actor: 'customer' | 'staff'): string {
  const actorOffset = actor === 'staff' ? 17 : 0
  const hash = [...conversationId].reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 10_000, actorOffset)
  return `VD-240718-${String(hash).padStart(4, '0')}`
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('vi-VN')
    .replace(/đ/gu, 'd')
    .replace(/[^a-z0-9:]+/gu, ' ')
    .trim()
}

