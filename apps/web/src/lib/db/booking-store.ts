import { and, eq, gte, lte, sql } from 'drizzle-orm'

import { getDb } from './client'
import { bookings, routes, seats, trips } from './schema'

/**
 * Real inventory operations. The LLM decides *what the caller meant*; everything
 * priced or allocated is decided here, against the database, and can never be
 * invented by the model.
 */

export type TripOffer = {
  tripId: string
  originCity: string
  destinationCity: string
  departsAt: string // ISO, +07:00
  departureLabel: string // "20/07 20:00"
  vehicleType: string
  priceVnd: number
  pickupPoint: string
  dropoffPoint: string
  seatsAvailable: number
  /** "ghế" | "giường" | "phòng" — dùng đúng từ nhà xe gọi sản phẩm. */
  seatNoun: string
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
  const db = getDb()
  if (!db) return []
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
  const db = getDb()
  if (!db) return []

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

  const from = input.date ? new Date(`${input.date}T00:00:00+07:00`) : new Date()
  const to = input.date
    ? new Date(`${input.date}T23:59:59+07:00`)
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const needed = Math.max(1, input.passengers ?? 1)

  const rows = await db
    .select({
      tripId: trips.id,
      departureAt: trips.departureAt,
      vehicleType: trips.vehicleType,
      priceVnd: trips.priceVnd,
      pickupPoint: trips.pickupPoint,
      dropoffPoint: trips.dropoffPoint,
      seatsAvailable: sql<number>`count(${seats.id}) filter (where ${seats.status} = 'available')::int`,
    })
    .from(trips)
    .innerJoin(seats, eq(seats.tripId, trips.id))
    .where(and(eq(trips.routeId, match.id), eq(trips.active, 'yes'), gte(trips.departureAt, from), lte(trips.departureAt, to)))
    .groupBy(trips.id, trips.departureAt, trips.vehicleType, trips.priceVnd, trips.pickupPoint, trips.dropoffPoint)
    .orderBy(trips.departureAt)

  return rows
    .filter((r) => r.seatsAvailable >= needed)
    .map((r) => ({
      tripId: r.tripId,
      originCity: match.originCity,
      destinationCity: match.destinationCity,
      departsAt: r.departureAt.toISOString(),
      departureLabel: new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh', hour12: false,
      }).format(r.departureAt),
      vehicleType: r.vehicleType,
      priceVnd: r.priceVnd,
      pickupPoint: r.pickupPoint,
      dropoffPoint: r.dropoffPoint,
      seatsAvailable: r.seatsAvailable,
      seatNoun: seatNounFor(r.vehicleType),
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
  const db = getDb()
  if (!db) return null
  const minutes = input.holdMinutes ?? 15

  const tripRows = await db
    .select({ priceVnd: trips.priceVnd, vehicleType: trips.vehicleType })
    .from(trips)
    .where(eq(trips.id, input.tripId))
    .limit(1)
  const trip = tripRows[0]
  if (!trip) return null
  const price = trip.priceVnd

  const claimed = await db.execute(sql`
    UPDATE ${seats} SET
      status = 'held',
      held_by_call_id = ${input.callId},
      hold_expires_at = now() + (${minutes} || ' minutes')::interval
    WHERE id IN (
      SELECT id FROM ${seats}
      WHERE trip_id = ${input.tripId}
        AND (
          status = 'available'
          OR (status = 'held' AND hold_expires_at < now())
          OR (status = 'held' AND held_by_call_id = ${input.callId})
        )
      ORDER BY code
      LIMIT ${input.passengers}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING code
  `)

  const seatCodes = (claimed.rows as { code: string }[]).map((r) => r.code).sort()
  if (seatCodes.length === 0) return null
  return {
    seatCodes,
    priceVnd: price,
    totalVnd: price * seatCodes.length,
    seatNoun: seatNounFor(trip.vehicleType),
  }
}

export async function releaseHolds(callId: string): Promise<void> {
  const db = getDb()
  if (!db) return
  await db.execute(sql`
    UPDATE ${seats} SET status = 'available', held_by_call_id = NULL, hold_expires_at = NULL
    WHERE held_by_call_id = ${callId} AND status = 'held'
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

/**
 * Look a booking up by ticket code or phone number.
 *
 * A caller who booked yesterday rings back on a fresh call, so the booking is not
 * attached to this conversation id and cancel-by-call finds nothing. Phone number
 * is what a real caller actually has to hand.
 */
export async function findBookings(input: {
  code?: string | null | undefined
  phone?: string | null | undefined
}): Promise<BookingSummary[]> {
  const db = getDb()
  if (!db) return []
  if (!input.code && !input.phone) return []

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
    .where(input.code ? eq(bookings.code, input.code) : eq(bookings.phone, input.phone!))
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
      departureLabel: new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh', hour12: false,
      }).format(r.departureAt),
      originCity: r.originCity,
      destinationCity: r.destinationCity,
      pickupPoint: r.pickupPoint,
    }))
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
  const db = getDb()
  if (!db) return { cancelled: false }

  // Ticket code identifies exactly one booking, so prefer it. Phone covers the
  // caller ringing back on a new call. Falling back to this conversation handles
  // "actually, cancel that" moments inside the call that just made the booking.
  const where = input.code
    ? eq(bookings.code, input.code)
    : input.phone
      ? eq(bookings.phone, input.phone)
      : eq(bookings.callId, input.callId)

  const rows = await db
    .select({ id: bookings.id, code: bookings.code, seatCodes: bookings.seatCodes, status: bookings.status })
    .from(bookings)
    .where(where)
    .orderBy(sql`${bookings.id} desc`)
    .limit(1)
  const booking = rows[0]
  if (!booking || booking.status === 'cancelled') return { cancelled: false }

  // Giải phóng idempotency key: nó là callId:tripId, nên nếu giữ nguyên thì khách
  // huỷ xong đặt lại đúng chuyến đó trong cùng cuộc gọi sẽ nhận về chính tấm vé
  // vừa huỷ thay vì vé mới. Gắn hậu tố để key cũ dùng lại được mà vẫn duy nhất.
  await db
    .update(bookings)
    .set({ status: 'cancelled', idempotencyKey: `cancelled:${booking.id}` })
    .where(eq(bookings.id, booking.id))
  await db.execute(sql`
    UPDATE ${seats} SET status = 'available', booking_id = NULL,
                        held_by_call_id = NULL, hold_expires_at = NULL
    WHERE booking_id = ${booking.id}
  `)
  return { cancelled: true, code: booking.code, seatCodes: booking.seatCodes }
}

/** Ticket code derived from the booking id, so it is unique by construction. */
function ticketCode(id: number, departsAt: Date): string {
  const stamp = new Intl.DateTimeFormat('en-CA', {
    year: '2-digit', month: '2-digit', day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(departsAt).replace(/-/gu, '')
  return `VD-${stamp}-${String(id).padStart(4, '0')}`
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
}): Promise<{ code: string; seatCodes: string[]; totalVnd: number; departureLabel: string; pickupPoint: string } | null> {
  const db = getDb()
  if (!db) return null
  const idempotencyKey = `${input.callId}:${input.tripId}`

  const existing = await db
    .select({ code: bookings.code, seatCodes: bookings.seatCodes, totalFareVnd: bookings.totalFareVnd })
    .from(bookings)
    .where(eq(bookings.idempotencyKey, idempotencyKey))
    .limit(1)

  const tripRows = await db
    .select({ priceVnd: trips.priceVnd, departureAt: trips.departureAt, pickupPoint: trips.pickupPoint })
    .from(trips)
    .where(eq(trips.id, input.tripId))
    .limit(1)
  const trip = tripRows[0]
  if (!trip) return null
  const departureLabel = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh', hour12: false,
  }).format(trip.departureAt)

  if (existing[0]) {
    return {
      code: existing[0].code,
      seatCodes: existing[0].seatCodes,
      totalVnd: existing[0].totalFareVnd,
      departureLabel,
      pickupPoint: trip.pickupPoint,
    }
  }

  const held = await db
    .select({ code: seats.code })
    .from(seats)
    .where(and(eq(seats.tripId, input.tripId), eq(seats.heldByCallId, input.callId), eq(seats.status, 'held')))
  const seatCodes = held.map((r) => r.code).sort()
  if (seatCodes.length === 0) return null

  const inserted = await db
    .insert(bookings)
    .values({
      code: 'pending',
      tripId: input.tripId,
      callId: input.callId,
      passengerName: input.passengerName,
      phone: input.phone,
      seatCodes,
      totalFareVnd: trip.priceVnd * seatCodes.length,
      idempotencyKey,
    })
    .returning({ id: bookings.id })
  const bookingId = inserted[0]!.id

  const code = ticketCode(bookingId, trip.departureAt)
  await db.update(bookings).set({ code }).where(eq(bookings.id, bookingId))
  await db.execute(sql`
    UPDATE ${seats} SET status = 'booked', booking_id = ${bookingId}, hold_expires_at = NULL
    WHERE trip_id = ${input.tripId} AND held_by_call_id = ${input.callId} AND status = 'held'
  `)

  return {
    code,
    seatCodes,
    totalVnd: trip.priceVnd * seatCodes.length,
    departureLabel,
    pickupPoint: trip.pickupPoint,
  }
}
