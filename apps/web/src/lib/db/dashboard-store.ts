import { and, asc, count, desc, eq, gte, inArray, lte } from 'drizzle-orm'

import { getDb } from './client'
import {
  bookings,
  bookingSnapshots,
  calls,
  callTurns,
  routes,
  seats,
  trips,
  type BookingRow,
  type BookingSnapshotRow,
  type CallRow,
  type CallTurnRow,
} from './schema'

export type CallSummary = CallRow & {
  latestBooking: Pick<BookingSnapshotRow, 'status' | 'bookingCode' | 'totalFareVnd'> | null
  bookingRecord: Pick<BookingRow, 'id' | 'code' | 'status' | 'totalFareVnd'> | null
  /** Khách đã có vé — với web call thì đây là cách duy nhất để gọi lại. */
  passenger: { name: string; phone: string } | null
}

export type CallDetail = {
  call: CallRow
  turns: CallTurnRow[]
  latestSnapshot: BookingSnapshotRow | null
}

// null = persistence not configured (no DATABASE_URL) — callers render an
// explicit "not configured" state instead of an empty list.
export async function listRecentCalls(limit = 50): Promise<CallSummary[] | null> {
  const db = getDb()
  if (!db) return null

  const rows = await db.select().from(calls).orderBy(desc(calls.startedAt)).limit(limit)
  if (rows.length === 0) return []

  const ids = rows.map((row) => row.id)
  const [snapshots, bookingRows] = await Promise.all([
    db
      .select()
      .from(bookingSnapshots)
      .where(inArray(bookingSnapshots.callId, ids))
      .orderBy(desc(bookingSnapshots.sequence), desc(bookingSnapshots.id)),
    db
      .select({
        id: bookings.id,
        callId: bookings.callId,
        code: bookings.code,
        status: bookings.status,
        totalFareVnd: bookings.totalFareVnd,
        passengerName: bookings.passengerName,
        phone: bookings.phone,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .where(inArray(bookings.callId, ids))
      .orderBy(desc(bookings.createdAt), desc(bookings.id)),
  ])

  const latestByCall = new Map<string, BookingSnapshotRow>()
  for (const snapshot of snapshots) {
    if (!latestByCall.has(snapshot.callId)) latestByCall.set(snapshot.callId, snapshot)
  }

  const passengerByCall = new Map<string, { name: string; phone: string }>()
  const bookingByCall = new Map<string, Pick<BookingRow, 'id' | 'code' | 'status' | 'totalFareVnd'>>()
  for (const row of bookingRows) {
    if (!row.callId || bookingByCall.has(row.callId)) continue
    bookingByCall.set(row.callId, {
      id: row.id,
      code: row.code,
      status: row.status,
      totalFareVnd: row.totalFareVnd,
    })
    passengerByCall.set(row.callId, { name: row.passengerName, phone: row.phone })
  }

  return rows.map((row) => {
    const latest = latestByCall.get(row.id)
    return {
      ...row,
      latestBooking: latest
        ? { status: latest.status, bookingCode: latest.bookingCode, totalFareVnd: latest.totalFareVnd }
        : null,
      bookingRecord: bookingByCall.get(row.id) ?? null,
      passenger: passengerByCall.get(row.id) ?? null,
    }
  })
}

export async function getCallDetail(callId: string): Promise<CallDetail | null> {
  const db = getDb()
  if (!db) return null

  const [call] = await db.select().from(calls).where(eq(calls.id, callId)).limit(1)
  if (!call) return null

  const turns = await db
    .select()
    .from(callTurns)
    .where(eq(callTurns.callId, callId))
    .orderBy(asc(callTurns.sequence), asc(callTurns.id))
  const [latestSnapshot] = await db
    .select()
    .from(bookingSnapshots)
    .where(eq(bookingSnapshots.callId, callId))
    .orderBy(desc(bookingSnapshots.sequence), desc(bookingSnapshots.id))
    .limit(1)

  return { call, turns, latestSnapshot: latestSnapshot ?? null }
}

// ---------------------------------------------------------------------------
// Dashboard metrics
//
// Phần tính toán nằm trong các hàm thuần bên dưới (nhận mảng row, không chạm DB)
// nên test được mà không cần DATABASE_URL. getDashboardMetrics chỉ làm 3 việc:
// lấy dữ liệu bằng vài query cố định, chuẩn hoá row, rồi gọi các hàm đó.
// ---------------------------------------------------------------------------

export type MetricDelta = { current: number; previous: number }
export type SeriesPoint = { label: string; calls: number; confirmed: number }
export type FunnelStep = { status: string; label: string; count: number }
export type ChannelSlice = { channel: string; label: string; count: number }
export type RouteRollup = { route: string; count: number; revenueVnd: number }

export type DashboardMetrics = {
  activeCalls: number
  calls: MetricDelta
  confirmed: MetricDelta
  revenueVnd: MetricDelta
  avgDurationSec: MetricDelta
  conversionRate: MetricDelta
  hourly: SeriesPoint[]
  daily: SeriesPoint[]
  funnel: FunnelStep[]
  channels: ChannelSlice[]
  topRoutes: RouteRollup[]
}

// Row đã chuẩn hoá — hàm thuần chỉ cần đúng những trường này, không cần cả CallRow.
export type MetricCall = {
  id: string
  channel: string
  status: string
  startedAt: Date
  endedAt: Date | null
}

export type MetricSnapshot = {
  // id là serial nên dùng làm mốc phân định khi hai snapshot trùng mili giây.
  id?: number
  callId: string
  status: string
  totalFareVnd: number | null
  createdAt: Date
  origin: string | null
  destination: string | null
  ticketCount: number
}

export type MetricBookingStatus = {
  id: number
  callId: string | null
  status: 'pending_payment' | 'paid' | 'cancelled'
}

export const HOUR_MS = 3_600_000
export const DAY_MS = 86_400_000
// Giờ Việt Nam lệch đúng 7 giờ tròn và không có DST, nên mọi mốc ngày/giờ tính
// bằng số học offset là chính xác — không phụ thuộc timezone của máy chạy server.
export const VN_OFFSET_MS = 7 * HOUR_MS
export const HOURLY_POINTS = 24
export const DAILY_POINTS = 14
/** Cuộc bán vé không kéo dài quá 2 giờ — quá mốc này coi như row treo, không đếm. */
export const ACTIVE_MAX_MS = 2 * HOUR_MS
/** Cửa sổ nhìn tới của bảng chuyến sắp chạy. */
export const UPCOMING_WINDOW_MS = 12 * HOUR_MS

const FUNNEL_ORDER = [
  { status: 'collecting', label: 'Đang thu thập' },
  { status: 'trip_proposed', label: 'Đã gợi ý chuyến' },
  { status: 'awaiting_confirmation', label: 'Chờ xác nhận' },
  { status: 'confirmed', label: 'Đã chốt vé' },
] as const

const CHANNEL_LABELS: Record<string, string> = {
  phone: 'Điện thoại',
  web: 'Web',
}

function timeOf(value: Date): number {
  const ms = value instanceof Date ? value.getTime() : Number.NaN
  return Number.isFinite(ms) ? ms : Number.NaN
}

function floorToHour(ms: number): number {
  return Math.floor(ms / HOUR_MS) * HOUR_MS
}

function floorToVnDay(ms: number): number {
  return Math.floor((ms + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS
}

function hourLabel(ms: number): string {
  return `${new Date(ms + VN_OFFSET_MS).getUTCHours()}h`
}

function dayLabel(ms: number): string {
  const d = new Date(ms + VN_OFFSET_MS)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

// Cửa sổ nửa mở (from, to]: một cuộc gọi rơi đúng ranh giới chỉ thuộc về một kỳ.
function inWindow(ms: number, from: number, to: number): boolean {
  return Number.isFinite(ms) && ms > from && ms <= to
}

/** Trích origin/destination/số vé từ cột snapshot jsonb (là một BookingDraft). */
export function toMetricSnapshot(row: {
  id?: number
  callId: string
  status: string
  totalFareVnd: number | null
  createdAt: Date
  snapshot: unknown
}): MetricSnapshot {
  const draft = (row.snapshot ?? {}) as Record<string, unknown>
  const seatCount = Array.isArray(draft.seats) ? draft.seats.length : 0
  const passengers = typeof draft.passengerCount === 'number' ? draft.passengerCount : 0
  return {
    ...(row.id === undefined ? {} : { id: row.id }),
    callId: row.callId,
    status: row.status,
    totalFareVnd: row.totalFareVnd,
    createdAt: row.createdAt,
    origin: typeof draft.origin === 'string' && draft.origin ? draft.origin : null,
    destination: typeof draft.destination === 'string' && draft.destination ? draft.destination : null,
    // Ghế đã giữ là con số thật nhất; chưa có ghế thì lấy số khách, cùng lắm coi là 1 vé.
    ticketCount: seatCount || passengers || 1,
  }
}

/** Mỗi call chỉ giữ lại snapshot mới nhất — một call chỉ thuộc đúng một bậc phễu. */
export function latestSnapshotPerCall(snapshots: MetricSnapshot[]): Map<string, MetricSnapshot> {
  const latest = new Map<string, MetricSnapshot>()
  for (const snapshot of snapshots) {
    const current = latest.get(snapshot.callId)
    if (!current) {
      latest.set(snapshot.callId, snapshot)
      continue
    }
    const ms = timeOf(snapshot.createdAt)
    const currentMs = timeOf(current.createdAt)
    // Driver cắt timestamptz về mili giây nên hai lần advance liên tiếp có thể
    // hoà; id serial phân định để phễu/doanh thu không nhấp nháy giữa hai lần load.
    const newer =
      ms > currentMs ||
      (ms === currentMs && snapshot.id !== undefined && current.id !== undefined && snapshot.id > current.id)
    if (newer) latest.set(snapshot.callId, snapshot)
  }
  return latest
}

/**
 * Chỉ snapshot confirmed mới nhất của mỗi call. Agent có thể ghi lại nhiều
 * snapshot confirmed cho cùng một cuộc — cộng hết sẽ nhân đôi doanh thu.
 */
export function latestConfirmedPerCall(snapshots: MetricSnapshot[]): Map<string, MetricSnapshot> {
  return latestSnapshotPerCall(snapshots.filter((snapshot) => snapshot.status === 'confirmed'))
}

/** Cancelled bookings no longer count as held tickets, revenue or conversion. */
export function withoutCancelledBookings(
  snapshots: Map<string, MetricSnapshot>,
  bookingRows: MetricBookingStatus[],
): Map<string, MetricSnapshot> {
  const latestStatus = new Map<string, MetricBookingStatus>()
  for (const row of bookingRows) {
    if (!row.callId) continue
    const current = latestStatus.get(row.callId)
    if (!current || row.id > current.id) latestStatus.set(row.callId, row)
  }

  return new Map(
    [...snapshots].filter(([callId]) => latestStatus.get(callId)?.status !== 'cancelled'),
  )
}

/** Hai kỳ so sánh: 24h gần nhất và 24h liền trước đó. */
export function windowBounds(now: Date): { curFrom: number; curTo: number; prevFrom: number; prevTo: number } {
  const curTo = timeOf(now)
  const curFrom = curTo - DAY_MS
  return { curTo, curFrom, prevTo: curFrom, prevFrom: curFrom - DAY_MS }
}

export function computeCallsDelta(source: MetricCall[], now: Date): MetricDelta {
  const { curFrom, curTo, prevFrom, prevTo } = windowBounds(now)
  let current = 0
  let previous = 0
  for (const call of source) {
    const ms = timeOf(call.startedAt)
    if (inWindow(ms, curFrom, curTo)) current += 1
    else if (inWindow(ms, prevFrom, prevTo)) previous += 1
  }
  return { current, previous }
}

// Cuộc chốt được tính theo thời điểm BẮT ĐẦU cuộc gọi, giống calls — nhờ vậy
// conversionRate luôn là tỉ lệ của cùng một tập mẫu.
export function computeConfirmedDelta(
  source: MetricCall[],
  confirmed: Map<string, MetricSnapshot>,
  now: Date,
): MetricDelta {
  const { curFrom, curTo, prevFrom, prevTo } = windowBounds(now)
  let current = 0
  let previous = 0
  for (const call of source) {
    if (!confirmed.has(call.id)) continue
    const ms = timeOf(call.startedAt)
    if (inWindow(ms, curFrom, curTo)) current += 1
    else if (inWindow(ms, prevFrom, prevTo)) previous += 1
  }
  return { current, previous }
}

/**
 * Tiền vé quy về thời điểm CHỐT (snapshot.createdAt), không phải lúc bắt đầu
 * cuộc gọi: một cuộc mở từ hôm qua mà chốt vé cách đây một tiếng vẫn phải nằm
 * trong 24 giờ này, nếu không thẻ doanh thu sẽ báo giảm 100% một cách vô lý.
 * Tham số source giữ lại để không đổi hợp đồng gọi hàm.
 */
export function computeRevenueDelta(
  _source: MetricCall[],
  confirmed: Map<string, MetricSnapshot>,
  now: Date,
): MetricDelta {
  const { curFrom, curTo, prevFrom, prevTo } = windowBounds(now)
  let current = 0
  let previous = 0
  for (const snapshot of confirmed.values()) {
    const fare = snapshot.totalFareVnd ?? 0
    const ms = timeOf(snapshot.createdAt)
    if (inWindow(ms, curFrom, curTo)) current += fare
    else if (inWindow(ms, prevFrom, prevTo)) previous += fare
  }
  return { current, previous }
}

/** Chỉ cuộc đã kết thúc mới vào trung bình — cuộc đang chạy chưa có thời lượng thật. */
export function computeAvgDurationDelta(source: MetricCall[], now: Date): MetricDelta {
  const { curFrom, curTo, prevFrom, prevTo } = windowBounds(now)
  let curSum = 0
  let curCount = 0
  let prevSum = 0
  let prevCount = 0

  for (const call of source) {
    if (!call.endedAt) continue
    const started = timeOf(call.startedAt)
    const ended = timeOf(call.endedAt)
    if (!Number.isFinite(started) || !Number.isFinite(ended)) continue
    const seconds = Math.max(0, Math.round((ended - started) / 1000))
    if (inWindow(started, curFrom, curTo)) {
      curSum += seconds
      curCount += 1
    } else if (inWindow(started, prevFrom, prevTo)) {
      prevSum += seconds
      prevCount += 1
    }
  }

  return {
    current: curCount === 0 ? 0 : Math.round(curSum / curCount),
    previous: prevCount === 0 ? 0 : Math.round(prevSum / prevCount),
  }
}

/** Tỉ lệ 0..1. Không có cuộc gọi thì trả 0 chứ không chia 0 ra NaN. */
export function computeConversionDelta(callsDelta: MetricDelta, confirmedDelta: MetricDelta): MetricDelta {
  return {
    current: callsDelta.current === 0 ? 0 : confirmedDelta.current / callsDelta.current,
    previous: callsDelta.previous === 0 ? 0 : confirmedDelta.previous / callsDelta.previous,
  }
}

function buildSeries(
  source: MetricCall[],
  confirmedCallIds: ReadonlySet<string>,
  now: Date,
  points: number,
  stepMs: number,
  floor: (ms: number) => number,
  label: (ms: number) => string,
): SeriesPoint[] {
  const nowMs = timeOf(now)
  const end = floor(Number.isFinite(nowMs) ? nowMs : 0)
  const start = end - (points - 1) * stepMs

  const series: SeriesPoint[] = []
  for (let i = 0; i < points; i += 1) series.push({ label: label(start + i * stepMs), calls: 0, confirmed: 0 })

  for (const call of source) {
    const ms = timeOf(call.startedAt)
    if (!Number.isFinite(ms)) continue
    const index = Math.round((floor(ms) - start) / stepMs)
    if (index < 0 || index >= points) continue
    const bucket = series[index]
    if (!bucket) continue
    bucket.calls += 1
    if (confirmedCallIds.has(call.id)) bucket.confirmed += 1
  }
  return series
}

export function buildHourlySeries(
  source: MetricCall[],
  confirmedCallIds: ReadonlySet<string>,
  now: Date,
): SeriesPoint[] {
  return buildSeries(source, confirmedCallIds, now, HOURLY_POINTS, HOUR_MS, floorToHour, hourLabel)
}

export function buildDailySeries(
  source: MetricCall[],
  confirmedCallIds: ReadonlySet<string>,
  now: Date,
): SeriesPoint[] {
  return buildSeries(source, confirmedCallIds, now, DAILY_POINTS, DAY_MS, floorToVnDay, dayLabel)
}

/** Luôn trả đủ 4 bậc (kể cả bậc 0) để chart không nhảy cột giữa các lần load. */
export function buildFunnel(latest: Map<string, MetricSnapshot>): FunnelStep[] {
  const counts = new Map<string, number>()
  for (const snapshot of latest.values()) counts.set(snapshot.status, (counts.get(snapshot.status) ?? 0) + 1)
  return FUNNEL_ORDER.map((step) => ({ status: step.status, label: step.label, count: counts.get(step.status) ?? 0 }))
}

/** Luôn trả đủ phone + web để chú giải donut đứng yên khi một kênh về 0. */
export function buildChannels(source: MetricCall[]): ChannelSlice[] {
  const counts = new Map<string, number>([['phone', 0], ['web', 0]])
  for (const call of source) counts.set(call.channel, (counts.get(call.channel) ?? 0) + 1)
  return [...counts.entries()].map(([channel, value]) => ({
    channel,
    label: CHANNEL_LABELS[channel] ?? channel,
    count: value,
  }))
}

/** Gộp theo tuyến từ snapshot đã chốt, tối đa 5 tuyến, nhiều vé nhất lên trước. */
export function buildTopRoutes(confirmed: Map<string, MetricSnapshot>): RouteRollup[] {
  const rollup = new Map<string, RouteRollup>()
  for (const snapshot of confirmed.values()) {
    if (!snapshot.origin || !snapshot.destination) continue
    const route = `${snapshot.origin} → ${snapshot.destination}`
    const entry = rollup.get(route) ?? { route, count: 0, revenueVnd: 0 }
    entry.count += snapshot.ticketCount
    entry.revenueVnd += snapshot.totalFareVnd ?? 0
    rollup.set(route, entry)
  }
  return [...rollup.values()]
    .sort((a, b) => b.count - a.count || b.revenueVnd - a.revenueVnd || a.route.localeCompare(b.route))
    .slice(0, 5)
}

// null = chưa cấu hình DATABASE_URL, cùng hợp đồng với listRecentCalls.
export async function getDashboardMetrics(): Promise<DashboardMetrics | null> {
  const db = getDb()
  if (!db) return null

  // Lấy "now" một lần rồi truyền xuống: mọi metric phải cùng một mốc thời gian,
  // nếu không tổng của các cửa sổ sẽ lệch nhau vài mili giây.
  const now = new Date()
  const windowStart = new Date(floorToVnDay(now.getTime()) - (DAILY_POINTS - 1) * DAY_MS)

  const [callRows, snapshotRows, activeRows, bookingStatusRows] = await Promise.all([
    db
      .select({
        id: calls.id,
        channel: calls.channel,
        status: calls.status,
        startedAt: calls.startedAt,
        endedAt: calls.endedAt,
      })
      .from(calls)
      .where(gte(calls.startedAt, windowStart)),
    db
      .select({
        id: bookingSnapshots.id,
        callId: bookingSnapshots.callId,
        status: bookingSnapshots.status,
        totalFareVnd: bookingSnapshots.totalFareVnd,
        createdAt: bookingSnapshots.createdAt,
        snapshot: bookingSnapshots.snapshot,
      })
      .from(bookingSnapshots)
      .where(gte(bookingSnapshots.createdAt, windowStart))
      .orderBy(bookingSnapshots.createdAt, bookingSnapshots.id),
    // Chặn theo thời gian: luồng web demo không có worker bắn call.ended nên row
    // mồ côi sẽ kẹt status='active' vĩnh viễn và bơm phồng badge "đang diễn ra".
    db
      .select({ value: count() })
      .from(calls)
      .where(and(eq(calls.status, 'active'), gte(calls.startedAt, new Date(now.getTime() - ACTIVE_MAX_MS)))),
    db
      .select({ id: bookings.id, callId: bookings.callId, status: bookings.status })
      .from(bookings)
      .where(gte(bookings.createdAt, windowStart)),
  ])

  const source: MetricCall[] = callRows
  const snapshots = snapshotRows.map(toMetricSnapshot)
  const latest = withoutCancelledBookings(latestSnapshotPerCall(snapshots), bookingStatusRows)
  const confirmed = withoutCancelledBookings(latestConfirmedPerCall(snapshots), bookingStatusRows)
  const confirmedCallIds = new Set(confirmed.keys())

  const callsDelta = computeCallsDelta(source, now)
  const confirmedDelta = computeConfirmedDelta(source, confirmed, now)

  return {
    activeCalls: activeRows[0]?.value ?? 0,
    calls: callsDelta,
    confirmed: confirmedDelta,
    revenueVnd: computeRevenueDelta(source, confirmed, now),
    avgDurationSec: computeAvgDurationDelta(source, now),
    conversionRate: computeConversionDelta(callsDelta, confirmedDelta),
    hourly: buildHourlySeries(source, confirmedCallIds, now),
    daily: buildDailySeries(source, confirmedCallIds, now),
    // Phễu / kênh / tuyến đọc trên toàn bộ 14 ngày đã nạp, không phải 24h — mẫu
    // 24h quá nhỏ để xếp hạng tuyến cho ra hình.
    funnel: buildFunnel(latest),
    channels: buildChannels(source),
    topRoutes: buildTopRoutes(confirmed),
  }
}

// ---------------------------------------------------------------------------
// Hai khối nhìn về phía trước. Phần còn lại của dashboard chỉ kể chuyện đã qua,
// nhưng người trực ca cần biết chuyến nào sắp chạy và ghế nào sắp tuột.
// ---------------------------------------------------------------------------

export type UpcomingTrip = {
  tripId: string
  route: string
  departureAt: Date
  vehicleType: string
  priceVnd: number
  total: number
  booked: number
  held: number
  available: number
}

export async function listUpcomingTrips(limit = 8): Promise<UpcomingTrip[] | null> {
  const db = getDb()
  if (!db) return null

  const now = new Date()
  const tripRows = await db
    .select({
      id: trips.id,
      departureAt: trips.departureAt,
      vehicleType: trips.vehicleType,
      priceVnd: trips.priceVnd,
      originCity: routes.originCity,
      destinationCity: routes.destinationCity,
    })
    .from(trips)
    .innerJoin(routes, eq(routes.id, trips.routeId))
    .where(
      and(
        eq(trips.active, 'yes'),
        gte(trips.departureAt, now),
        lte(trips.departureAt, new Date(now.getTime() + UPCOMING_WINDOW_MS)),
      ),
    )
    .orderBy(asc(trips.departureAt))
    .limit(limit)

  if (tripRows.length === 0) return []

  // Một truy vấn group-by cho tất cả chuyến, thay vì mỗi chuyến một lượt đếm.
  const seatRows = await db
    .select({ tripId: seats.tripId, status: seats.status, value: count() })
    .from(seats)
    .where(inArray(seats.tripId, tripRows.map((row) => row.id)))
    .groupBy(seats.tripId, seats.status)

  const byTrip = new Map<string, { booked: number; held: number; available: number }>()
  for (const row of seatRows) {
    const entry = byTrip.get(row.tripId) ?? { booked: 0, held: 0, available: 0 }
    entry[row.status] += row.value
    byTrip.set(row.tripId, entry)
  }

  return tripRows.map((row) => {
    const seatCount = byTrip.get(row.id) ?? { booked: 0, held: 0, available: 0 }
    return {
      tripId: row.id,
      route: `${row.originCity} → ${row.destinationCity}`,
      departureAt: row.departureAt,
      vehicleType: row.vehicleType,
      priceVnd: row.priceVnd,
      total: seatCount.booked + seatCount.held + seatCount.available,
      ...seatCount,
    }
  })
}

export type ExpiringHold = {
  callId: string
  seatCodes: string[]
  route: string
  departureAt: Date
  holdExpiresAt: Date
}

/** Ghế đang giữ và sắp tự nhả — đây là danh sách việc cần gọi lại của điều hành viên. */
export async function listExpiringHolds(limit = 10): Promise<ExpiringHold[] | null> {
  const db = getDb()
  if (!db) return null

  const now = new Date()
  const rows = await db
    .select({
      code: seats.code,
      heldByCallId: seats.heldByCallId,
      holdExpiresAt: seats.holdExpiresAt,
      departureAt: trips.departureAt,
      originCity: routes.originCity,
      destinationCity: routes.destinationCity,
    })
    .from(seats)
    .innerJoin(trips, eq(trips.id, seats.tripId))
    .innerJoin(routes, eq(routes.id, trips.routeId))
    .where(and(eq(seats.status, 'held'), gte(seats.holdExpiresAt, now)))
    .orderBy(asc(seats.holdExpiresAt))
    // Nhiều ghế cùng một cuộc gộp lại thành một dòng, nên phải lấy dư rồi mới cắt.
    .limit(limit * 6)

  const byCall = new Map<string, ExpiringHold>()
  for (const row of rows) {
    if (!row.heldByCallId || !row.holdExpiresAt) continue
    const entry = byCall.get(row.heldByCallId)
    if (entry) {
      entry.seatCodes.push(row.code)
      continue
    }
    byCall.set(row.heldByCallId, {
      callId: row.heldByCallId,
      seatCodes: [row.code],
      route: `${row.originCity} → ${row.destinationCity}`,
      departureAt: row.departureAt,
      holdExpiresAt: row.holdExpiresAt,
    })
  }

  return [...byCall.values()].slice(0, limit)
}
