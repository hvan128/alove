import type {
  BookingDraft,
  BookingFieldEvidence,
  BookingFieldKey,
  BookingReviewItem,
  BusTrip,
  CallMessage,
  ReplySuggestion,
} from '@ordervoice/contracts'

export type AgentTurn = {
  draft: BookingDraft
  reply: string
}

export type BookingMessageResult = {
  draft: BookingDraft
  changedFields: BookingFieldKey[]
}

export type BookingConfirmationState = {
  ready: boolean
  missingFields: BookingFieldKey[]
  issues: string[]
}

export type StaffEditMetadata = {
  messageId: string
  occurredAt: string
}

type Candidate = {
  field: BookingFieldKey
  value: unknown
  quote: string
  confidence: number
  source?: BookingFieldEvidence['source']
}

const RECOMMENDED_TRIP_ID = 'SG-DL-2200'
const REQUIRED_FIELDS: BookingFieldKey[] = [
  'origin',
  'destination',
  'travelDateLabel',
  'timeWindow',
  'passengerCount',
  'passengerName',
  'phone',
  'pickupPoint',
  'dropoffPoint',
  'selectedTrip',
  'seats',
]

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
    {
      id: 'SG-NT-2100',
      origin: 'Sài Gòn',
      destination: 'Nha Trang',
      departureTime: '21:00',
      arrivalTime: '06:00',
      vehicleType: 'Giường nằm 34 chỗ',
      priceVnd: 280_000,
      pickupPoint: 'Bến xe Miền Đông mới',
      dropoffPoint: 'Bến xe phía Nam Nha Trang',
      availableSeats: ['A01', 'A02', 'A03', 'A04'],
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
    pickupPoint: null,
    dropoffPoint: null,
    vehiclePreference: null,
    paymentMethod: null,
    note: null,
    totalFareVnd: null,
    bookingCode: null,
    evidenceMessageIds: [],
    fieldEvidence: {},
    confirmedFields: [],
    reviewItems: [],
  }
}

export function applyBookingMessage(draft: BookingDraft, message: CallMessage): BookingMessageResult {
  if (!message.final || (message.role !== 'caller' && message.role !== 'customer')) {
    return { draft, changedFields: [] }
  }
  if (draft.status === 'confirmed') return { draft, changedFields: [] }

  const normalized = normalize(message.text)
  const explicitCorrection = isCorrection(normalized)
  const ambiguousCount = findAmbiguousPassengerCount(message.text)
  let next = ambiguousCount
    ? addReviewItem(draft, {
        id: `${message.id}:passengerCount:ambiguous`,
        field: 'passengerCount',
        code: 'ambiguous',
        message: `Khách nói ${ambiguousCount}; cần xác nhận đúng số vé.`,
        sourceMessageId: message.id,
        proposedValue: ambiguousCount,
        status: 'open',
        createdAt: message.createdAt,
      })
    : draft
  const changedFields: BookingFieldKey[] = []
  const candidates = extractCandidates(message.text, normalized, Boolean(ambiguousCount))

  for (const candidate of candidates) {
    const result = applyCandidate(next, candidate, message, explicitCorrection)
    next = result.draft
    if (result.changed) changedFields.push(candidate.field)
  }

  const trip = matchCatalogTrip(next)
  if (trip) {
    const tripResult = applyCandidate(next, {
      field: 'selectedTrip',
      value: trip,
      quote: `Chuyến ${trip.departureTime} ${trip.vehicleType}`,
      confidence: 1,
      source: 'catalog',
    }, message, explicitCorrection)
    next = tripResult.draft
    if (tripResult.changed) changedFields.push('selectedTrip')

    if (sameTrip(next.selectedTrip, trip)) {
      const catalogCandidates: Candidate[] = []
      if (!next.pickupPoint) {
        catalogCandidates.push({
          field: 'pickupPoint',
          value: trip.pickupPoint,
          quote: `Điểm đón mặc định: ${trip.pickupPoint}`,
          confidence: 1,
          source: 'catalog',
        })
      }
      if (!next.dropoffPoint) {
        catalogCandidates.push({
          field: 'dropoffPoint',
          value: trip.dropoffPoint,
          quote: `Điểm trả mặc định: ${trip.dropoffPoint}`,
          confidence: 1,
          source: 'catalog',
        })
      }
      if (next.passengerCount && next.seats.length !== next.passengerCount) {
        catalogCandidates.push({
          field: 'seats',
          value: trip.availableSeats.slice(0, next.passengerCount),
          quote: `Ghế còn trống chuyến ${trip.departureTime}`,
          confidence: 1,
          source: 'catalog',
        })
      }
      for (const candidate of catalogCandidates) {
        const result = applyCandidate(next, candidate, message, false)
        next = result.draft
        if (result.changed) changedFields.push(candidate.field)
      }
    }
  }

  next = recalculateBooking(next)
  if (changedFields.length > 0 && !next.evidenceMessageIds.includes(message.id)) {
    next = { ...next, evidenceMessageIds: [...next.evidenceMessageIds, message.id] }
  }
  next = { ...next, status: deriveBookingStatus(next) }

  return { draft: next, changedFields: unique(changedFields) }
}

export function applyStaffFieldEdit<K extends BookingFieldKey>(
  draft: BookingDraft,
  field: K,
  value: BookingDraft[K],
  metadata: StaffEditMetadata,
): BookingDraft {
  let next = setField(draft, field, value)
  const evidence: BookingFieldEvidence = {
    id: `${metadata.messageId}:${field}:staff`,
    field,
    messageId: metadata.messageId,
    quote: value === null || (Array.isArray(value) && value.length === 0)
      ? 'Nhân viên đã xóa giá trị'
      : displayValue(value),
    confidence: 1,
    source: 'staff_edit',
    capturedAt: metadata.occurredAt,
  }
  next = appendEvidence(next, field, evidence)
  next = {
    ...next,
    confirmedFields: unique([...next.confirmedFields, field]),
    reviewItems: next.reviewItems.map((item) => (
      item.field === field && item.status === 'open' ? { ...item, status: 'resolved' as const } : item
    )),
  }
  next = recalculateBooking(next)
  return { ...next, status: deriveBookingStatus(next) }
}

export function getMissingBookingFields(draft: BookingDraft): BookingFieldKey[] {
  return REQUIRED_FIELDS.filter((field) => {
    const value = draft[field]
    if (field === 'seats') {
      return !draft.passengerCount || draft.seats.length !== draft.passengerCount
    }
    if (Array.isArray(value)) return value.length === 0
    return value === null || value === ''
  })
}

export function getBookingConfirmationState(draft: BookingDraft): BookingConfirmationState {
  const missingFields = getMissingBookingFields(draft)
  const issues: string[] = []
  if (draft.phone && !/^0\d{9}$/u.test(draft.phone)) issues.push('Số điện thoại chưa hợp lệ.')
  if (draft.passengerCount && draft.selectedTrip && draft.selectedTrip.availableSeats.length < draft.passengerCount) {
    issues.push('Chuyến không còn đủ ghế.')
  }
  if (draft.reviewItems.some((item) => item.status === 'open')) {
    issues.push('Còn nội dung cần nhân viên duyệt.')
  }
  return { ready: missingFields.length === 0 && issues.length === 0, missingFields, issues }
}

export function createBookingReplySuggestion(draft: BookingDraft): ReplySuggestion {
  const state = getBookingConfirmationState(draft)
  const missingFields = state.missingFields.slice(0, 2)
  let text: string
  let reason: ReplySuggestion['reason'] = 'missing_fields'

  if (draft.reviewItems.some((item) => item.status === 'open')) {
    reason = 'conflict'
    text = 'Em xin xác nhận lại thông tin vừa thay đổi để tránh đặt nhầm vé ạ.'
  } else if (state.ready) {
    reason = 'confirmation'
    text = `Em xin đọc lại: ${draft.passengerCount} vé ${draft.origin} đi ${draft.destination}, chuyến ${draft.selectedTrip?.departureTime}, ghế ${draft.seats.join(', ')}. Anh chị xác nhận đặt vé chứ ạ?`
  } else {
    text = suggestionForMissing(missingFields)
  }

  return {
    id: `suggestion-${draft.conversationId}-${reason}-${missingFields.join('-') || 'ready'}`,
    text,
    reason,
    missingFields,
    speakable: true,
  }
}

export function advanceBookingAgent(draft: BookingDraft, message: CallMessage): AgentTurn {
  if ((message.role !== 'customer' && message.role !== 'caller') || !message.final) {
    throw new Error('booking agent requires a final customer message')
  }

  if (draft.status === 'confirmed') {
    return {
      draft,
      reply: `Vé đã được xác nhận với mã ${draft.bookingCode}. Em giữ nguyên thông tin này ạ.`,
    }
  }

  const previousTrip = draft.selectedTrip
  let next = applyBookingMessage(draft, message).draft
  const normalized = normalize(message.text)

  if (isConfirmation(normalized)) {
    if (!canConfirmBooking(next)) return { draft: next, reply: missingFieldsReply(next) }
    next = confirmBooking(next, 'customer')
    return {
      draft: next,
      reply: `Đã xác nhận ${next.passengerCount} vé, ghế ${next.seats.join(', ')}. Mã vé ${next.bookingCode}. Hẹn gặp anh chị tại ${next.pickupPoint}.`,
    }
  }

  if (!next.origin || !next.destination) {
    return { draft: { ...next, status: 'collecting' }, reply: 'Anh chị cho em xin điểm đi và điểm đến ạ.' }
  }
  if (!next.travelDateLabel) {
    return { draft: { ...next, status: 'collecting' }, reply: 'Anh chị muốn đi ngày nào ạ?' }
  }
  if (!next.passengerCount) {
    return { draft: { ...next, status: 'collecting' }, reply: 'Mình cần đặt bao nhiêu vé ạ?' }
  }

  if (!next.passengerName || !next.phone) {
    next = { ...next, status: 'trip_proposed' }
    if (!previousTrip && next.selectedTrip) {
      const trip = next.selectedTrip
      const alternative = createBusDemoCatalog().find((item) => (
        item.origin === trip.origin && item.destination === trip.destination && item.id !== trip.id
      ))
      return {
        draft: next,
        reply: alternative
          ? `Em đề xuất chuyến ${trip.vehicleType.toLocaleLowerCase('vi-VN')} ${trip.departureTime}, giá ${formatVnd(trip.priceVnd)} mỗi vé. Chuyến ${alternative.departureTime} còn ${alternative.vehicleType.toLocaleLowerCase('vi-VN')}. Anh chị chọn chuyến nào ạ?`
          : `Em đề xuất chuyến ${trip.departureTime}, giá ${formatVnd(trip.priceVnd)} mỗi vé. Anh chị cho em xin họ tên và số điện thoại ạ?`,
      }
    }
    return {
      draft: next,
      reply: `Em đã giữ chuyến ${next.selectedTrip?.departureTime ?? 'phù hợp'}. Anh chị cho em xin họ tên và số điện thoại người đi ạ.`,
    }
  }

  next = { ...next, status: 'awaiting_confirmation' }
  return {
    draft: next,
    reply: `Em xin đọc lại: ${next.passengerCount} vé ${next.origin} đi ${next.destination}, chuyến ${next.selectedTrip?.departureTime}, tổng ${formatVnd(next.totalFareVnd ?? 0)}, tên ${next.passengerName}. Anh chị xác nhận đặt vé chứ ạ?`,
  }
}

export function canConfirmBooking(draft: BookingDraft): boolean {
  return getBookingConfirmationState(draft).ready
}

export function confirmBooking(draft: BookingDraft, actor: 'customer' | 'staff'): BookingDraft {
  if (draft.status === 'confirmed') return draft
  if (!canConfirmBooking(draft)) throw new Error('chưa đủ thông tin để xác nhận vé')

  const count = draft.passengerCount!
  const trip = draft.selectedTrip!
  const seats = draft.seats.length === count ? draft.seats : trip.availableSeats.slice(0, count)
  return {
    ...draft,
    status: 'confirmed',
    seats,
    totalFareVnd: trip.priceVnd * count,
    bookingCode: stableBookingCode(draft.conversationId, actor),
  }
}

function extractCandidates(original: string, normalized: string, skipPassengerCount: boolean): Candidate[] {
  const candidates: Candidate[] = []
  const push = (candidate: Candidate | null) => {
    if (candidate) candidates.push(candidate)
  }

  push(extractPlaceCandidate(original, 'origin'))
  push(extractPlaceCandidate(original, 'destination'))

  const date = original.match(/ngày\s+(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?/iu)
  if (date?.[1] && date[2]) {
    const year = date[3] ? normalizeYear(date[3]) : '2026'
    candidates.push({
      field: 'travelDateLabel',
      value: `${date[1].padStart(2, '0')}/${date[2].padStart(2, '0')}/${year}`,
      quote: date[0],
      confidence: 0.98,
    })
  } else if (/toi thu sau|thu sau toi/u.test(normalized)) {
    candidates.push({ field: 'travelDateLabel', value: 'Tối thứ Sáu, 24/07', quote: findQuote(original, /tối thứ sáu|thứ sáu tối/iu), confidence: 0.92 })
  } else if (/ngay mai/u.test(normalized)) {
    candidates.push({ field: 'travelDateLabel', value: 'Ngày mai, 19/07/2026', quote: findQuote(original, /ngày mai/iu), confidence: 0.96 })
  } else if (/toi nay/u.test(normalized)) {
    candidates.push({ field: 'travelDateLabel', value: 'Tối nay, 18/07', quote: findQuote(original, /tối nay/iu), confidence: 0.96 })
  }

  const time = extractTime(original)
  if (time) candidates.push({ field: 'timeWindow', ...time, confidence: 0.97 })
  else if (/buoi toi|toi thu sau|toi nay/u.test(normalized)) {
    candidates.push({ field: 'timeWindow', value: 'Buổi tối', quote: findQuote(original, /buổi tối|tối thứ sáu|tối nay/iu), confidence: 0.88 })
  }

  if (!skipPassengerCount) push(extractPassengerCount(original))

  const name = original.match(/(?:tôi\s+tên|tôi\s+là|tên\s+tôi\s+là|tên\s+là)\s+([^,.]+?)(?=\s*(?:,|số\s+(?:điện thoại)?|sđt|đặt\s+\d|$))/iu)
  if (name?.[1]) {
    candidates.push({ field: 'passengerName', value: titleCaseName(name[1]), quote: name[0].trim(), confidence: 0.96 })
  }

  const phone = extractPhone(original)
  if (phone) candidates.push({ field: 'phone', value: phone.value, quote: phone.quote, confidence: 0.99 })

  push(extractLocationDetail(original, 'pickupPoint'))
  push(extractLocationDetail(original, 'dropoffPoint'))

  const vehicle = original.match(/(?:xe\s+)?(limousine|giường\s+nằm|ghế\s+ngồi)/iu)
  if (vehicle?.[1]) {
    candidates.push({ field: 'vehiclePreference', value: canonicalVehicle(vehicle[1]), quote: vehicle[0], confidence: 0.96 })
  }

  const payment = original.match(/(?:thanh\s+toán\s+)?(chuyển\s+khoản|tiền\s+mặt|momo|zalopay)/iu)
  if (payment?.[1]) {
    candidates.push({ field: 'paymentMethod', value: canonicalPayment(payment[1]), quote: payment[0], confidence: 0.97 })
  }

  const note = original.match(/(?:ghi\s+chú|lưu\s+ý)\s+(.+?)(?=[,.]|$)/iu)
  if (note?.[1]) {
    candidates.push({ field: 'note', value: sentenceCase(note[1]), quote: note[0].trim(), confidence: 0.92 })
  }

  const seats = extractSeats(original)
  if (seats.length > 0) {
    candidates.push({ field: 'seats', value: seats, quote: findQuote(original, /ghế\s+[A-Z]\d{1,2}(?:\s*(?:,|và)?\s*[A-Z]\d{1,2})*/iu), confidence: 0.98 })
  }

  return candidates
}

function extractPlaceCandidate(original: string, field: 'origin' | 'destination'): Candidate | null {
  const place = '(Sài\\s*Gòn|TP\\.?\\s*HCM|Hồ\\s*Chí\\s*Minh|Biên\\s*Hòa|Đà\\s*Lạt|Nha\\s*Trang)'
  const patterns = field === 'origin'
    ? [
        new RegExp(`(?:điểm\\s+đi\\s+(?:là|sang)|đổi\\s+điểm\\s+đi\\s+sang)\\s+${place}`, 'iu'),
        new RegExp(`từ\\s+${place}`, 'iu'),
      ]
    : [
        new RegExp(`(?:điểm\\s+đến\\s+(?:là|sang)|đổi\\s+điểm\\s+đến\\s+sang)\\s+${place}`, 'iu'),
        new RegExp(`(?:đến|về|đi)\\s+${place}`, 'iu'),
      ]
  for (const pattern of patterns) {
    const match = original.match(pattern)
    if (!match?.[1]) continue
    return {
      field,
      value: canonicalPlace(match[1]),
      quote: match[0].trim(),
      confidence: 0.97,
    }
  }
  return null
}

function extractLocationDetail(original: string, field: 'pickupPoint' | 'dropoffPoint'): Candidate | null {
  const prefix = field === 'pickupPoint'
    ? '(?:đổi\\s+)?(?:điểm\\s+đón|đón(?:\\s+tôi)?)'
    : '(?:đổi\\s+)?(?:điểm\\s+trả|trả|xuống)'
  const pattern = new RegExp(
    `(${prefix}(?:\\s+(?:ở|tại|là|sang))?\\s+)(.+?)(?=\\s+(?:và\\s+)?(?:đổi|trả|xuống|xe\\s+(?:giường|limousine|ghế)|thanh\\s+toán|ghi\\s+chú)|[,.;]|$)`,
    'iu',
  )
  const match = original.match(pattern)
  const value = match?.[2]?.trim()
  if (!match?.[0] || !value) return null
  return { field, value: titleCaseLocation(value), quote: match[0].trim(), confidence: 0.94 }
}

function extractPassengerCount(original: string): Candidate | null {
  const wordNumbers: Record<string, number> = { một: 1, hai: 2, ba: 3, bốn: 4, tư: 4, năm: 5, sáu: 6 }
  const match = original.match(/(?<![\p{L}\p{N}])([1-6]|một|hai|ba|bốn|tư|năm|sáu)\s*(?:vé|người|khách)(?=$|[^\p{L}\p{N}])/iu)
  if (!match?.[1]) return null
  const normalizedValue = match[1].toLocaleLowerCase('vi-VN')
  const value = /^\d$/u.test(normalizedValue) ? Number(normalizedValue) : wordNumbers[normalizedValue]
  return value ? { field: 'passengerCount', value, quote: match[0], confidence: 0.98 } : null
}

function extractTime(original: string): { value: string; quote: string } | null {
  const match = original.match(/(?<!\d)([01]?\d|2[0-3])\s*(?::|h|giờ)\s*([0-5]\d)?(?=$|[^\p{L}\p{N}])/iu)
  if (!match?.[1]) return null
  return { value: `${match[1].padStart(2, '0')}:${(match[2] ?? '00').padStart(2, '0')}`, quote: match[0] }
}

function extractPhone(original: string): { value: string; quote: string } | null {
  const match = original.match(/(?:\+84|0)(?:[\s.\-]*\d){9}\b/u)
  if (!match?.[0]) return null
  const digits = match[0].replace(/\D/gu, '')
  const value = match[0].startsWith('+84') ? `0${digits.slice(2)}` : digits
  return /^0\d{9}$/u.test(value) ? { value, quote: match[0] } : null
}

function extractSeats(original: string): string[] {
  const match = original.match(/ghế\s+([A-Z]\d{1,2}(?:\s*(?:,|và)?\s*[A-Z]\d{1,2})*)/iu)
  return match?.[1]?.match(/[A-Z]\d{1,2}/giu)?.map((seat) => seat.toUpperCase()) ?? []
}

function applyCandidate(
  draft: BookingDraft,
  candidate: Candidate,
  message: CallMessage,
  explicitCorrection: boolean,
): { draft: BookingDraft; changed: boolean } {
  const current = draft[candidate.field]
  if (valuesEqual(current, candidate.value)) return { draft, changed: false }

  if (draft.confirmedFields.includes(candidate.field)) {
    if (!explicitCorrection) return { draft, changed: false }
    return {
      draft: addReviewItem(draft, {
        id: `${message.id}:${candidate.field}:correction`,
        field: candidate.field,
        code: 'correction',
        message: `Khách đề nghị đổi ${fieldLabel(candidate.field)}; cần nhân viên duyệt.`,
        sourceMessageId: message.id,
        proposedValue: displayValue(candidate.value),
        status: 'open',
        createdAt: message.createdAt,
      }),
      changed: false,
    }
  }

  let next = setField(draft, candidate.field, candidate.value)
  const evidence: BookingFieldEvidence = {
    id: `${message.id}:${candidate.field}:${draft.fieldEvidence[candidate.field]?.length ?? 0}`,
    field: candidate.field,
    messageId: message.id,
    quote: candidate.quote.trim(),
    confidence: candidate.confidence,
    source: candidate.source ?? 'caller_speech',
    capturedAt: message.createdAt,
  }
  next = appendEvidence(next, candidate.field, evidence)
  return { draft: next, changed: true }
}

function setField(draft: BookingDraft, field: BookingFieldKey, value: unknown): BookingDraft {
  return { ...draft, [field]: value } as BookingDraft
}

function appendEvidence(draft: BookingDraft, field: BookingFieldKey, evidence: BookingFieldEvidence): BookingDraft {
  const existing = draft.fieldEvidence[field] ?? []
  return {
    ...draft,
    fieldEvidence: { ...draft.fieldEvidence, [field]: [...existing, evidence] },
  }
}

function addReviewItem(draft: BookingDraft, item: BookingReviewItem): BookingDraft {
  if (draft.reviewItems.some((existing) => existing.id === item.id)) return draft
  return { ...draft, reviewItems: [...draft.reviewItems, item] }
}

function recalculateBooking(draft: BookingDraft): BookingDraft {
  if (!draft.selectedTrip || !draft.passengerCount) return { ...draft, totalFareVnd: null }
  const seats = draft.seats.length === draft.passengerCount
    ? draft.seats
    : draft.selectedTrip.availableSeats.slice(0, draft.passengerCount)
  return {
    ...draft,
    seats,
    totalFareVnd: draft.selectedTrip.priceVnd * draft.passengerCount,
  }
}

function matchCatalogTrip(draft: BookingDraft): BusTrip | null {
  if (!draft.origin || !draft.destination || !draft.travelDateLabel || !draft.passengerCount) return null
  const matching = createBusDemoCatalog().filter((trip) => (
    trip.origin === draft.origin
    && trip.destination === draft.destination
    && trip.availableSeats.length >= (draft.passengerCount ?? 1)
  ))
  if (matching.length === 0) return null
  const exactTime = matching.find((trip) => trip.departureTime === draft.timeWindow)
  if (exactTime) return exactTime
  const preferredVehicle = draft.vehiclePreference
    ? matching.find((trip) => normalize(trip.vehicleType).includes(normalize(draft.vehiclePreference!)))
    : null
  return preferredVehicle ?? matching.find((trip) => trip.id === RECOMMENDED_TRIP_ID) ?? matching[0] ?? null
}

function deriveBookingStatus(draft: BookingDraft): BookingDraft['status'] {
  if (draft.status === 'confirmed') return 'confirmed'
  if (getBookingConfirmationState(draft).ready) return 'awaiting_confirmation'
  if (draft.selectedTrip) return 'trip_proposed'
  return 'collecting'
}

function suggestionForMissing(fields: BookingFieldKey[]): string {
  if (fields.length === 0) return 'Em sẽ kiểm tra lại thông tin và hỗ trợ anh chị ngay ạ.'
  if (fields[0] === 'origin' && fields[1] === 'destination') return 'Anh chị cho em xin điểm đi và điểm đến ạ.'
  if (fields[0] === 'travelDateLabel' && fields[1] === 'timeWindow') return 'Anh chị muốn đi ngày nào và khoảng mấy giờ ạ?'
  if (fields[0] === 'passengerName' && fields[1] === 'phone') return 'Anh chị cho em xin họ tên và số điện thoại người đi ạ.'
  if (fields[0] === 'pickupPoint' && fields[1] === 'dropoffPoint') return 'Anh chị muốn đón và trả tại đâu ạ?'
  const labels = fields.map(fieldLabel)
  return labels.length === 1
    ? `Anh chị cho em xin ${labels[0]} ạ.`
    : `Anh chị cho em xin ${labels[0]} và ${labels[1]} ạ.`
}

function missingFieldsReply(draft: BookingDraft): string {
  return `Em chưa đủ thông tin. ${createBookingReplySuggestion(draft).text}`
}

function findAmbiguousPassengerCount(original: string): string | null {
  return original.match(/(?<![\p{L}\p{N}])(?:[1-6]|một|hai|ba|bốn|tư|năm|sáu)\s*(?:hoặc|hay)\s*(?:[1-6]|một|hai|ba|bốn|tư|năm|sáu)\s*vé(?=$|[^\p{L}\p{N}])/iu)?.[0] ?? null
}

function isCorrection(normalized: string): boolean {
  return /\b(khong|doi|sua lai|chinh lai|chuyen sang)\b/u.test(normalized)
}

function isConfirmation(normalized: string): boolean {
  return /\b(xac nhan|dong y|chot ve|dat ve di)\b/u.test(normalized)
}

function sameTrip(left: BusTrip | null, right: BusTrip | null): boolean {
  return left?.id === right?.id
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (isBusTrip(left) && isBusTrip(right)) return left.id === right.id
  if (Array.isArray(left) && Array.isArray(right)) return JSON.stringify(left) === JSON.stringify(right)
  return left === right
}

function isBusTrip(value: unknown): value is BusTrip {
  return Boolean(value && typeof value === 'object' && 'id' in value && 'departureTime' in value)
}

function canonicalPlace(value: string): string {
  const normalized = normalize(value)
  if (/sai gon|tp hcm|ho chi minh/u.test(normalized)) return 'Sài Gòn'
  if (/da lat/u.test(normalized)) return 'Đà Lạt'
  if (/nha trang/u.test(normalized)) return 'Nha Trang'
  if (/bien hoa/u.test(normalized)) return 'Biên Hòa'
  return value.trim()
}

function canonicalVehicle(value: string): string {
  const normalized = normalize(value)
  if (normalized.includes('limousine')) return 'Limousine'
  if (normalized.includes('giuong nam')) return 'Giường nằm'
  return 'Ghế ngồi'
}

function canonicalPayment(value: string): string {
  const normalized = normalize(value)
  if (normalized.includes('chuyen khoan')) return 'Chuyển khoản'
  if (normalized.includes('tien mat')) return 'Tiền mặt'
  if (normalized.includes('momo')) return 'MoMo'
  return 'ZaloPay'
}

function normalizeYear(value: string): string {
  return value.length === 2 ? `20${value}` : value
}

function findQuote(original: string, pattern: RegExp): string {
  return original.match(pattern)?.[0]?.trim() ?? original.trim()
}

function titleCaseName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').replace(/(^|\s)(\p{L})/gu, (part) => part.toLocaleUpperCase('vi-VN'))
}

function titleCaseLocation(value: string): string {
  const trimmed = value.trim().replace(/\s+/gu, ' ')
  return trimmed.charAt(0).toLocaleUpperCase('vi-VN') + trimmed.slice(1)
}

function sentenceCase(value: string): string {
  const trimmed = value.trim()
  return trimmed.charAt(0).toLocaleUpperCase('vi-VN') + trimmed.slice(1)
}

function fieldLabel(field: BookingFieldKey): string {
  const labels: Record<BookingFieldKey, string> = {
    origin: 'điểm đi',
    destination: 'điểm đến',
    travelDateLabel: 'ngày đi',
    timeWindow: 'giờ đi',
    passengerCount: 'số vé',
    passengerName: 'họ tên',
    phone: 'số điện thoại',
    pickupPoint: 'điểm đón',
    dropoffPoint: 'điểm trả',
    selectedTrip: 'chuyến xe',
    seats: 'ghế',
    vehiclePreference: 'loại xe',
    paymentMethod: 'cách thanh toán',
    note: 'ghi chú',
  }
  return labels[field]
}

function displayValue(value: unknown): string {
  if (isBusTrip(value)) return `${value.departureTime}, ${value.vehicleType}`
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
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

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}
