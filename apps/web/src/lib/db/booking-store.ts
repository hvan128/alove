import { createHash } from 'node:crypto'
import { and, eq, gte, lte, sql } from 'drizzle-orm'

import { bookingSnapshotSchema, type BookingSnapshot } from '@/lib/call-contract'

import { requireDb } from './client'
import { bookingWebhookOutbox, bookings, routes, seats, trips } from './schema'

/**
 * Real inventory operations. The LLM decides *what the caller meant*; everything
 * priced or allocated is decided here, against the database, and can never be
 * invented by the model.
 */

export type TripOffer = {
  tripId: string
  originCity: string
  destinationCity: string
  departsAt: string // ISO instant
  arrivesAt: string | null
  departureLabel: string // "20/07 20:00"
  arrivalTime: string | null // "06:00"
  vehicleType: string
  priceVnd: number
  pickupPoint: string
  dropoffPoint: string
  seatsAvailable: number
  /** "ghế" | "giường" | "phòng" — dùng đúng từ nhà xe gọi sản phẩm. */
  seatNoun: string
}

const seatsAvailableSql = sql<number>`count(${seats.id}) filter (
  where ${seats.status} = 'available'
     or (${seats.status} = 'held' and (${seats.holdExpiresAt} is null or ${seats.holdExpiresAt} <= now()))
)::int`

function departureLabel(departureAt: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh', hour12: false,
  }).format(departureAt)
}

function timeLabel(value: Date | null): string | null {
  if (!value) return null
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(value)
}

/**
 * What to call a seat on this vehicle. A "Limousine 21 Phòng VIP" sells cabins,
 * so telling the caller "ghế A1" contradicts the product name they just heard.
 */
export function seatNounFor(vehicleType: string): string {
  const v = vehicleType.toLocaleLowerCase('vi-VN')
  if (v.includes('phòng') || v.includes('cabin')) return 'phòng'
  if (v.includes('giường')) return 'giường'
  return 'ghế'
}

// "Sài Gòn", "sai gon", "TP HCM" → a comparable key.
function normalizeCity(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLocaleLowerCase('vi-VN')
    .replace(/đ/gu, 'd')
    .replace(/\b(tp|thanh pho|tinh)\b/gu, '')
    .replace(/[^a-z0-9]+/gu, '')
    .trim()
}

const CITY_ALIASES: Record<string, string> = {
  saigon: 'hochiminh',
  tphcm: 'hochiminh',
  hcm: 'hochiminh',
  sg: 'hochiminh',
  hn: 'hanoi',
  vinh: 'nghean',
}

function cityKey(value: string): string {
  const key = normalizeCity(value)
  return CITY_ALIASES[key] ?? key
}

/**
 * Alternatives worth offering when the requested route has nothing.
 *
 * Never suggest the exact reverse of what was asked: someone in Nghệ An wanting
 * to reach Hà Nội is not helped by a bus running Hà Nội → Nghệ An. Routes leaving
 * from the caller's own origin come first, since those are the only ones that can
 * actually carry them.
 */
export async function suggestRoutes(asked: {
  origin: string
  destination: string
}): Promise<{ origin: string; destination: string }[]> {
  const db = requireDb()
  const rows = await db
    .select({ origin: routes.originCity, destination: routes.destinationCity })
    .from(routes)
    .where(eq(routes.active, 'yes'))

  const askedOrigin = cityKey(asked.origin)
  const askedDestination = cityKey(asked.destination)

  const usable = rows.filter(
    (r) => !(cityKey(r.origin) === askedDestination && cityKey(r.destination) === askedOrigin),
  )
  const fromSameOrigin = usable.filter((r) => cityKey(r.origin) === askedOrigin)
  return fromSameOrigin.length > 0 ? fromSameOrigin : usable
}

/** Next departures on a route the operator DOES serve, ignoring the asked date. */
export async function nextDeparturesOnRoute(input: {
  origin: string
  destination: string
  passengers?: number | null | undefined
  limit?: number
}): Promise<TripOffer[]> {
  const all = await searchTrips({
    origin: input.origin,
    destination: input.destination,
    date: null,
    passengers: input.passengers,
  })
  return all.slice(0, input.limit ?? 3)
}

/**
 * Find real departures. `date` is a plain YYYY-MM-DD in Vietnam time; omit it to
 * search the next 14 days. Only trips with at least `passengers` free seats are
 * returned, so the agent can never offer a full bus.
 */
export async function searchTrips(input: {
  origin: string
  destination: string
  date?: string | null | undefined
  passengers?: number | null | undefined
}): Promise<TripOffer[]> {
  const db = requireDb()

  const routeRows = await db
    .select({
      id: routes.id,
      originCity: routes.originCity,
      destinationCity: routes.destinationCity,
    })
    .from(routes)
    .where(eq(routes.active, 'yes'))

  const wantOrigin = cityKey(input.origin)
  const wantDestination = cityKey(input.destination)
  const match = routeRows.find(
    (r) => cityKey(r.originCity) === wantOrigin && cityKey(r.destinationCity) === wantDestination,
  )
  if (!match) return []

  const now = new Date()
  const requestedFrom = input.date ? new Date(`${input.date}T00:00:00+07:00`) : now
  const from = requestedFrom > now ? requestedFrom : now
  const to = input.date
    ? new Date(`${input.date}T23:59:59+07:00`)
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const needed = Math.max(1, input.passengers ?? 1)

  const rows = await db
    .select({
      tripId: trips.id,
      departureAt: trips.departureAt,
      arrivalAt: trips.arrivalAt,
      vehicleType: trips.vehicleType,
      priceVnd: trips.priceVnd,
      pickupPoint: trips.pickupPoint,
      dropoffPoint: trips.dropoffPoint,
      seatsAvailable: seatsAvailableSql,
    })
    .from(trips)
    .innerJoin(seats, eq(seats.tripId, trips.id))
    .where(and(eq(trips.routeId, match.id), eq(trips.active, 'yes'), gte(trips.departureAt, from), lte(trips.departureAt, to)))
    .groupBy(trips.id, trips.departureAt, trips.arrivalAt, trips.vehicleType, trips.priceVnd, trips.pickupPoint, trips.dropoffPoint)
    .orderBy(trips.departureAt)

  return rows
    .filter((r) => r.seatsAvailable >= needed)
    .map((r) => ({
      tripId: r.tripId,
      originCity: match.originCity,
      destinationCity: match.destinationCity,
      departsAt: r.departureAt.toISOString(),
      arrivesAt: r.arrivalAt?.toISOString() ?? null,
      departureLabel: departureLabel(r.departureAt),
      arrivalTime: timeLabel(r.arrivalAt),
      vehicleType: r.vehicleType,
      priceVnd: r.priceVnd,
      pickupPoint: r.pickupPoint,
      dropoffPoint: r.dropoffPoint,
      seatsAvailable: r.seatsAvailable,
      seatNoun: seatNounFor(r.vehicleType),
    }))
}

/** Real upcoming inventory for server-rendered schedule surfaces. */
export async function listUpcomingTrips(limit = 8): Promise<TripOffer[]> {
  const db = requireDb()
  const now = new Date()
  const horizon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      tripId: trips.id,
      originCity: routes.originCity,
      destinationCity: routes.destinationCity,
      departureAt: trips.departureAt,
      arrivalAt: trips.arrivalAt,
      vehicleType: trips.vehicleType,
      priceVnd: trips.priceVnd,
      pickupPoint: trips.pickupPoint,
      dropoffPoint: trips.dropoffPoint,
      seatsAvailable: seatsAvailableSql,
    })
    .from(trips)
    .innerJoin(routes, eq(routes.id, trips.routeId))
    .innerJoin(seats, eq(seats.tripId, trips.id))
    .where(and(
      eq(trips.active, 'yes'),
      eq(routes.active, 'yes'),
      gte(trips.departureAt, now),
      lte(trips.departureAt, horizon),
    ))
    .groupBy(
      trips.id,
      routes.originCity,
      routes.destinationCity,
      trips.departureAt,
      trips.arrivalAt,
      trips.vehicleType,
      trips.priceVnd,
      trips.pickupPoint,
      trips.dropoffPoint,
    )
    .having(sql`${seatsAvailableSql} > 0`)
    .orderBy(trips.departureAt)
    .limit(Math.max(1, limit))

  return rows.map((row) => ({
    tripId: row.tripId,
    originCity: row.originCity,
    destinationCity: row.destinationCity,
    departsAt: row.departureAt.toISOString(),
    arrivesAt: row.arrivalAt?.toISOString() ?? null,
    departureLabel: departureLabel(row.departureAt),
    arrivalTime: timeLabel(row.arrivalAt),
    vehicleType: row.vehicleType,
    priceVnd: row.priceVnd,
    pickupPoint: row.pickupPoint,
    dropoffPoint: row.dropoffPoint,
    seatsAvailable: row.seatsAvailable,
    seatNoun: seatNounFor(row.vehicleType),
  }))
}

/**
 * Claim seats atomically. `FOR UPDATE SKIP LOCKED` means two callers racing for
 * the last seats can never both win — the loser simply gets fewer seats back.
 * Re-holding for the same call returns the seats it already holds.
 */
export async function holdSeats(input: {
  tripId: string
  callId: string
  passengers: number
  holdMinutes?: number
}): Promise<{ seatCodes: string[]; priceVnd: number; totalVnd: number; seatNoun: string } | null> {
  const db = requireDb()
  const minutes = Math.max(1, input.holdMinutes ?? 15)
  const passengers = Math.max(1, input.passengers)

  // One statement is one Neon HTTP transaction. The per-call advisory lock
  // serializes duplicate hold requests while row locks protect shared seats.
  // `released` drops surplus seats and every hold on a previously selected trip.
  const claimed = await db.execute(sql`
    WITH call_lock AS (
      SELECT pg_advisory_xact_lock(hashtextextended(${input.callId}, 0))
    ), target_trip AS (
      SELECT t.id, t.price_vnd, t.vehicle_type
      FROM ${trips} AS t
      CROSS JOIN call_lock
      WHERE t.id = ${input.tripId} AND t.active = 'yes'
    ), existing AS (
      SELECT s.id
      FROM ${seats} AS s
      CROSS JOIN call_lock
      WHERE s.trip_id = (SELECT id FROM target_trip)
        AND s.status = 'held'
        AND s.held_by_call_id = ${input.callId}
        AND s.hold_expires_at > now()
      ORDER BY s.code
      LIMIT ${passengers}
      FOR UPDATE
    ), candidates AS (
      SELECT s.id
      FROM ${seats} AS s
      CROSS JOIN call_lock
      WHERE s.trip_id = (SELECT id FROM target_trip)
        AND (
          s.status = 'available'
          OR (s.status = 'held' AND (s.hold_expires_at IS NULL OR s.hold_expires_at <= now()))
        )
        AND NOT EXISTS (SELECT 1 FROM existing e WHERE e.id = s.id)
      ORDER BY s.code
      LIMIT (SELECT GREATEST(${passengers} - count(*)::int, 0) FROM existing)
      FOR UPDATE SKIP LOCKED
    ), selected AS (
      SELECT id FROM existing
      UNION ALL
      SELECT id FROM candidates
    ), released AS (
      UPDATE ${seats} AS s
      SET status = 'available', held_by_call_id = NULL, hold_expires_at = NULL
      WHERE s.status = 'held'
        AND s.held_by_call_id = ${input.callId}
        AND EXISTS (SELECT 1 FROM target_trip)
        AND (
          (SELECT count(*) FROM selected) <> ${passengers}
          OR NOT EXISTS (SELECT 1 FROM selected chosen WHERE chosen.id = s.id)
        )
      RETURNING s.id
    ), held AS (
      UPDATE ${seats} AS s
      SET status = 'held',
          held_by_call_id = ${input.callId},
          hold_expires_at = now() + make_interval(mins => ${minutes})
      WHERE s.id IN (SELECT id FROM selected)
        AND (SELECT count(*) FROM selected) = ${passengers}
      RETURNING s.code
    )
    SELECT h.code AS "seatCode",
           t.price_vnd AS "priceVnd",
           t.vehicle_type AS "vehicleType",
           (SELECT count(*) FROM released) AS "releasedCount"
    FROM held h
    CROSS JOIN target_trip t
    ORDER BY h.code
  `)

  const rows = claimed.rows as unknown as Array<{
    seatCode: string
    priceVnd: number | string
    vehicleType: string
  }>
  const seatCodes = rows.map((row) => row.seatCode).sort()
  if (seatCodes.length === 0) return null
  const price = Number(rows[0]!.priceVnd)
  return {
    seatCodes,
    priceVnd: price,
    totalVnd: price * seatCodes.length,
    seatNoun: seatNounFor(rows[0]!.vehicleType),
  }
}

export async function releaseHolds(callId: string): Promise<void> {
  const db = requireDb()
  await db.execute(sql`
    WITH call_lock AS (
      SELECT pg_advisory_xact_lock(hashtextextended(${callId}, 0))
    )
    UPDATE ${seats} AS s
    SET status = 'available', held_by_call_id = NULL, hold_expires_at = NULL
    FROM call_lock
    WHERE s.held_by_call_id = ${callId} AND s.status = 'held'
  `)
}

export type BookingSummary = {
  code: string
  passengerName: string
  phone: string
  seatCodes: string[]
  totalVnd: number
  status: string
  departureLabel: string
  originCity: string
  destinationCity: string
  pickupPoint: string
}

/** Previous-call access requires both possession factors. */
export async function findBookings(input: {
  code: string
  phone: string
}): Promise<BookingSummary[]> {
  const db = requireDb()

  const rows = await db
    .select({
      code: bookings.code,
      passengerName: bookings.passengerName,
      phone: bookings.phone,
      seatCodes: bookings.seatCodes,
      totalFareVnd: bookings.totalFareVnd,
      status: bookings.status,
      departureAt: trips.departureAt,
      pickupPoint: trips.pickupPoint,
      originCity: routes.originCity,
      destinationCity: routes.destinationCity,
    })
    .from(bookings)
    .innerJoin(trips, eq(trips.id, bookings.tripId))
    .innerJoin(routes, eq(routes.id, trips.routeId))
    .where(and(eq(bookings.code, input.code), eq(bookings.phone, input.phone)))
    .orderBy(sql`${bookings.id} desc`)
    .limit(5)

  return rows
    .filter((r) => r.status !== 'cancelled')
    .map((r) => ({
      code: r.code,
      passengerName: r.passengerName,
      phone: r.phone,
      seatCodes: r.seatCodes,
      totalVnd: r.totalFareVnd,
      status: r.status,
      departureLabel: departureLabel(r.departureAt),
      originCity: r.originCity,
      destinationCity: r.destinationCity,
      pickupPoint: r.pickupPoint,
    }))
}

/**
 * Build the same confirmed BookingSnapshot contract used by the call UI from an
 * authoritative booking row. The public verification route validates this full
 * snapshot, then returns a PII-minimised projection rather than the raw object.
 */
export async function findBookingSnapshotForVerification(input: {
  code: string
  phone: string
}): Promise<BookingSnapshot | null> {
  const db = requireDb()
  const [row] = await db
    .select({
      status: bookings.status,
      verificationSnapshot: bookings.verificationSnapshot,
      verificationSnapshotRequired: bookings.verificationSnapshotRequired,
    })
    .from(bookings)
    .where(and(eq(bookings.code, input.code), eq(bookings.phone, input.phone)))
    .orderBy(sql`${bookings.id} desc`)
    .limit(1)

  if (!row || row.status === 'cancelled') return null
  if (row.verificationSnapshot === null) {
    // Legacy rows without a trustworthy archived confirmation intentionally
    // behave like an unknown ticket. A null on a required row is corruption and
    // must still fail closed as an infrastructure error.
    if (!row.verificationSnapshotRequired) return null
    throw new Error('Required booking verification snapshot is missing')
  }
  return bookingSnapshotSchema.parse(row.verificationSnapshot)
}

/**
 * Cancel this call's booking and put its seats back on sale. Without this the
 * agent could only apologise when a caller changed their mind after confirming —
 * and the seats stayed locked to a ticket nobody wanted.
 */
export async function cancelBooking(input: {
  callId: string
  code?: string | null
  phone?: string | null
}): Promise<{ cancelled: boolean; code?: string; seatCodes?: string[] }> {
  const hasCode = Boolean(input.code)
  const hasPhone = Boolean(input.phone)
  if (hasCode !== hasPhone) {
    throw new Error('Previous-call cancellation requires both booking code and phone')
  }

  const db = requireDb()
  const authorizedBooking = hasCode
    ? sql`b.code = ${input.code!} AND b.phone = ${input.phone!}`
    : sql`b.call_id = ${input.callId}`
  const releaseCurrentHolds = hasCode ? sql`FALSE` : sql`TRUE`

  // Cancellation and inventory release succeed or roll back together. A caller
  // can also change their mind after hold but before confirm; current-call holds
  // must be released immediately instead of lingering until their TTL. Re-keying
  // a cancelled row lets a genuinely new hold in this call be confirmed later.
  const result = await db.execute(sql`
    WITH call_lock AS (
      SELECT pg_advisory_xact_lock(hashtextextended(${input.callId}, 0))
    ), target AS (
      SELECT b.id, b.code, b.seat_codes, b.idempotency_key
      FROM ${bookings} AS b
      CROSS JOIN call_lock
      WHERE ${authorizedBooking} AND b.status <> 'cancelled'
      ORDER BY b.id DESC
      LIMIT 1
      FOR UPDATE
    ), cancelled AS (
      UPDATE ${bookings} AS b
      SET status = 'cancelled',
          idempotency_key = concat('cancelled:', b.id::text, ':', b.idempotency_key)
      FROM target t
      WHERE b.id = t.id
      RETURNING b.id, b.code, b.seat_codes
    ), released AS (
      UPDATE ${seats} AS s
      SET status = 'available', booking_id = NULL,
          held_by_call_id = NULL, hold_expires_at = NULL
      FROM cancelled c
      WHERE s.booking_id = c.id
      RETURNING s.id
    ), held_released AS (
      UPDATE ${seats} AS s
      SET status = 'available', booking_id = NULL,
          held_by_call_id = NULL, hold_expires_at = NULL
      FROM call_lock
      WHERE ${releaseCurrentHolds}
        AND s.held_by_call_id = ${input.callId}
        AND s.status = 'held'
      RETURNING s.code
    ), outcomes AS (
      SELECT 0 AS priority, c.code, c.seat_codes AS "seatCodes"
      FROM cancelled c
      UNION ALL
      SELECT 1 AS priority, NULL::text AS code,
             jsonb_agg(h.code ORDER BY h.code) AS "seatCodes"
      FROM held_released h
      HAVING count(*) > 0
    )
    SELECT o.code, o."seatCodes"
    FROM outcomes o
    ORDER BY o.priority
    LIMIT 1
  `)

  const [row] = result.rows as unknown as Array<{ code: string | null; seatCodes: string[] }>
  if (!row) return { cancelled: false }
  return {
    cancelled: true,
    ...(row.code ? { code: row.code } : {}),
    seatCodes: row.seatCodes,
  }
}

function normalizeConfirmationText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('vi-VN')
    .replace(/đ/gu, 'd')
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim()
}

/**
 * Chỉ đồng ý khi khách nói rõ ràng — phủ định và do dự không bao giờ lọt.
 *
 * Danh sách chấp nhận phải phủ đúng cách người Việt xác nhận qua điện thoại. Bản
 * đầu chỉ nhận "xác nhận", "đồng ý", "chốt" nên khách trả lời "ok luôn", "được
 * rồi em", "chuẩn rồi" đều bị từ chối và xuất vé hỏng. Riêng "đúng rồi" từng bị
 * chặn ngược với chính chú thích trong code: nó qua được cửa lọc "dung" nhưng
 * không có trong danh sách chấp nhận.
 */
export function isExplicitBookingConfirmation(value: string): boolean {
  const normalized = normalizeConfirmationText(value)
  // Phủ định và do dự: chặn trước, không có ngoại lệ.
  if (/\b(?:khong|chua|huy|khoan|thoi|de sau|co le|hinh nhu|phan van|de xem|suy nghi)\b/u.test(normalized)) {
    return false
  }
  // "dung" không dấu vừa là "đúng" vừa là "đừng". Chỉ "đúng rồi" mới an toàn.
  if (/\bdung\b/u.test(normalized) && !/\bdung roi\b/u.test(normalized)) return false
  return AFFIRMATIVE_PATTERNS.some((pattern) => pattern.test(normalized))
}

const AFFIRMATIVE_PATTERNS: RegExp[] = [
  /\bxac nhan\b/u,
  /\bdong y\b/u,
  /\bchot\b/u,
  /\bdat\s+(?:ve\s+)?(?:di|luon|giup|cho|nhe)\b/u,
  /\bdung roi\b/u,
  /\bduoc(?:\s+roi)?\b/u,
  /\bchuan(?:\s+roi)?\b/u,
  /\bok(?:e|ie|ay)?\b/u,
  // Trả lời gọn cho câu hỏi đóng "anh xác nhận đặt vé chứ ạ?" — đây là cách
  // khách hay đáp nhất, chặn thì hỏng hẳn luồng chốt vé.
  /^(?:u|ua|um|vang|da|co)\b/u,
]

function confirmationIdempotencyKey(input: { callId: string; tripId: string }): string {
  return createHash('sha256')
    .update(JSON.stringify([input.callId, input.tripId]))
    .digest('hex')
}

/**
 * Turn this call's held seats into a ticket. Idempotent: the same call
 * confirming twice gets the same ticket back rather than a second booking.
 */
export async function confirmBooking(input: {
  callId: string
  tripId: string
  passengerName: string
  phone: string
  confirmationText: string
  enqueueWebhook?: boolean
}): Promise<{
  code: string
  seatCodes: string[]
  totalVnd: number
  departureLabel: string
  pickupPoint: string
  webhookEventId?: string
} | null> {
  if (!isExplicitBookingConfirmation(input.confirmationText)) return null

  const db = requireDb()
  const idempotencyKey = confirmationIdempotencyKey(input)

  // A single statement is atomic through Neon HTTP. Existing confirmations are
  // returned first; otherwise only unexpired rows held by this call are locked,
  // booked and used to construct the ticket.
  const result = await db.execute(sql`
    WITH call_lock AS (
      SELECT pg_advisory_xact_lock(hashtextextended(${input.callId}, 0))
    ), existing AS (
      SELECT b.code,
             b.seat_codes AS "seatCodes",
             b.total_fare_vnd AS "totalVnd",
             b.trip_id AS "tripId",
             b.passenger_name AS "passengerName",
             b.phone,
             t.departure_at AS "departureAt",
             t.pickup_point AS "pickupPoint"
      FROM ${bookings} AS b
      INNER JOIN ${trips} AS t ON t.id = b.trip_id
      CROSS JOIN call_lock
      WHERE b.idempotency_key = ${idempotencyKey} AND b.status <> 'cancelled'
      LIMIT 1
    ), target_trip AS (
      SELECT t.id, t.price_vnd, t.departure_at, t.arrival_at,
             t.vehicle_type, t.pickup_point, t.dropoff_point,
             r.origin_city, r.destination_city
      FROM ${trips} AS t
      INNER JOIN ${routes} AS r ON r.id = t.route_id
      CROSS JOIN call_lock
      WHERE t.id = ${input.tripId} AND t.active = 'yes'
    ), held AS (
      SELECT s.id, s.code
      FROM ${seats} AS s
      CROSS JOIN call_lock
      WHERE s.trip_id = ${input.tripId}
        AND s.held_by_call_id = ${input.callId}
        AND s.status = 'held'
        AND s.hold_expires_at > now()
      ORDER BY s.code
      FOR UPDATE
    ), held_summary AS (
      SELECT array_agg(h.code ORDER BY h.code) AS seat_codes
      FROM held h
      HAVING count(*) > 0
    ), candidate AS (
      SELECT nextval(pg_get_serial_sequence('bookings', 'id'))::integer AS id,
             t.id AS trip_id,
             t.price_vnd,
             t.departure_at,
             t.arrival_at,
             t.vehicle_type,
             t.pickup_point,
             t.dropoff_point,
             t.origin_city,
             t.destination_city,
             h.seat_codes
      FROM target_trip t
      CROSS JOIN held_summary h
      WHERE NOT EXISTS (SELECT 1 FROM existing)
    ), prepared AS (
      SELECT c.*,
             concat(
               'MA-',
               to_char(c.departure_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMMDD'),
               '-',
               lpad(c.id::text, 4, '0')
             ) AS code
      FROM candidate c
    ), booked AS (
      UPDATE ${seats} AS s
      SET status = 'booked',
          booking_id = p.id,
          held_by_call_id = NULL,
          hold_expires_at = NULL
      FROM prepared p
      WHERE s.id IN (SELECT id FROM held)
      RETURNING s.id
    ), inserted AS (
      INSERT INTO ${bookings} (
        id, code, trip_id, call_id, passenger_name, phone, confirmation_text,
        seat_codes, total_fare_vnd, verification_snapshot, idempotency_key
      )
      SELECT p.id,
             p.code,
             p.trip_id,
             ${input.callId},
             ${input.passengerName},
             ${input.phone},
             ${input.confirmationText},
             to_jsonb(p.seat_codes),
             p.price_vnd * cardinality(p.seat_codes),
             jsonb_build_object(
               'id', concat('booking-', p.id),
               'conversationId', ${input.callId}::text,
               'status', 'confirmed',
               'origin', p.origin_city,
               'destination', p.destination_city,
               'travelDateLabel', to_char(
                 p.departure_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
                 'DD/MM/YYYY'
               ),
               'passengerCount', cardinality(p.seat_codes),
               'selectedTrip', jsonb_build_object(
                 'id', p.trip_id,
                 'origin', p.origin_city,
                 'destination', p.destination_city,
                 'departureTime', to_char(
                   p.departure_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
                   'HH24:MI'
                 ),
                 'arrivalTime', CASE WHEN p.arrival_at IS NULL THEN NULL ELSE to_char(
                   p.arrival_at AT TIME ZONE 'Asia/Ho_Chi_Minh',
                   'HH24:MI'
                 ) END,
                 'vehicleType', p.vehicle_type,
                 'priceVnd', p.price_vnd,
                 'pickupPoint', p.pickup_point,
                 'dropoffPoint', p.dropoff_point,
                 'seatNoun', CASE
                   WHEN lower(p.vehicle_type) LIKE '%phòng%'
                     OR lower(p.vehicle_type) LIKE '%cabin%' THEN 'phòng'
                   WHEN lower(p.vehicle_type) LIKE '%giường%' THEN 'giường'
                   ELSE 'ghế'
                 END
               ),
               'seats', to_jsonb(p.seat_codes),
               'passengerName', ${input.passengerName}::text,
               'phone', ${input.phone}::text,
               'totalFareVnd', p.price_vnd * cardinality(p.seat_codes),
               'bookingCode', p.code
             ),
             ${idempotencyKey}
      FROM prepared p
      CROSS JOIN (SELECT count(*)::int AS count FROM booked) booked_count
      WHERE booked_count.count = cardinality(p.seat_codes)
      RETURNING code,
                seat_codes AS "seatCodes",
                total_fare_vnd AS "totalVnd",
                trip_id AS "tripId",
                passenger_name AS "passengerName",
                phone
    ), inserted_result AS (
      SELECT i.code,
             i."seatCodes",
             i."totalVnd",
             i."tripId",
             i."passengerName",
             i.phone,
             t.departure_at AS "departureAt",
             t.pickup_point AS "pickupPoint"
      FROM inserted i
      CROSS JOIN target_trip t
    ), confirmed_result AS (
      SELECT * FROM existing
      UNION ALL
      SELECT * FROM inserted_result
      LIMIT 1
    ), queued_webhook AS (
      INSERT INTO ${bookingWebhookOutbox} (event_id, payload)
      SELECT concat('booking.confirmed.v1:', c.code),
             jsonb_build_object(
               'schemaVersion', '1.0',
               'type', 'booking.confirmed',
               'eventId', concat('booking.confirmed.v1:', c.code),
               'booking', jsonb_build_object(
                 'conversationId', ${input.callId}::text,
                 'tripId', c."tripId",
                 'bookingCode', c.code,
                 'passengerName', c."passengerName",
                 'phone', c.phone,
                 'seats', c."seatCodes",
                 'totalFareVnd', c."totalVnd",
                 'departureLabel', to_char(
                   c."departureAt" AT TIME ZONE 'Asia/Ho_Chi_Minh',
                   'DD/MM HH24:MI'
                 ),
                 'pickupPoint', c."pickupPoint"
               )
             )
      FROM confirmed_result c
      WHERE ${input.enqueueWebhook ?? false}
      ON CONFLICT (event_id) DO NOTHING
      RETURNING event_id
    )
    SELECT c.*,
           CASE WHEN ${input.enqueueWebhook ?? false}
             THEN concat('booking.confirmed.v1:', c.code)
             ELSE NULL
           END AS "webhookEventId",
           (SELECT count(*) FROM queued_webhook) AS "queuedWebhookCount"
    FROM confirmed_result c
  `)

  const [row] = result.rows as unknown as Array<{
    code: string
    seatCodes: string[]
    totalVnd: number | string
    departureAt: Date | string
    pickupPoint: string
    webhookEventId: string | null
  }>
  if (!row) return null
  return {
    code: row.code,
    seatCodes: row.seatCodes,
    totalVnd: Number(row.totalVnd),
    departureLabel: departureLabel(new Date(row.departureAt)),
    pickupPoint: row.pickupPoint,
    ...(row.webhookEventId ? { webhookEventId: row.webhookEventId } : {}),
  }
}
