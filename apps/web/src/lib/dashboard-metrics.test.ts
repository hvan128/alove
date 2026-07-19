import { describe, expect, it } from 'vitest'

import {
  buildChannels,
  buildDailySeries,
  buildFunnel,
  buildHourlySeries,
  buildTopRoutes,
  computeAvgDurationDelta,
  computeCallsDelta,
  computeConfirmedDelta,
  computeConversionDelta,
  computeRevenueDelta,
  latestConfirmedPerCall,
  latestSnapshotPerCall,
  toMetricSnapshot,
  withoutCancelledBookings,
  type MetricCall,
  type MetricSnapshot,
} from './db/dashboard-store'
import {
  deltaPercent,
  formatClock,
  formatCompactVnd,
  formatDurationSec,
  formatPercent,
  formatVnd,
} from './dashboard-format'

// Mốc cố định 18/07/2026 14:30 giờ VN — mọi khẳng định về nhãn giờ/ngày bên dưới
// đều neo vào đây, và cố tình viết theo +07:00 để lộ ngay lỗi lệch múi giờ.
const NOW = new Date('2026-07-18T14:30:00+07:00')
const HOUR = 3_600_000
const DAY = 86_400_000

function call(overrides: Partial<MetricCall> & { id: string; startedAt: Date }): MetricCall {
  return { channel: 'web', status: 'ended', endedAt: null, ...overrides }
}

function snapshot(overrides: Partial<MetricSnapshot> & { callId: string }): MetricSnapshot {
  return {
    status: 'confirmed',
    totalFareVnd: 0,
    createdAt: NOW,
    origin: null,
    destination: null,
    ticketCount: 1,
    ...overrides,
  }
}

const NO_CONFIRMED = new Set<string>()

describe('cửa sổ 24h và delta', () => {
  it('trả về 0 cho mọi metric khi không có dữ liệu', () => {
    expect(computeCallsDelta([], NOW)).toEqual({ current: 0, previous: 0 })
    expect(computeRevenueDelta([], new Map(), NOW)).toEqual({ current: 0, previous: 0 })
    expect(computeAvgDurationDelta([], NOW)).toEqual({ current: 0, previous: 0 })
    expect(buildFunnel(new Map()).every((step) => step.count === 0)).toBe(true)
    expect(buildTopRoutes(new Map())).toEqual([])
  })

  it('tách đúng cuộc gọi kỳ này và kỳ trước', () => {
    const source = [
      call({ id: 'a', startedAt: new Date(NOW.getTime() - HOUR) }),
      call({ id: 'b', startedAt: new Date(NOW.getTime() - 5 * HOUR) }),
      call({ id: 'c', startedAt: new Date(NOW.getTime() - 30 * HOUR) }),
      call({ id: 'd', startedAt: new Date(NOW.getTime() - 60 * HOUR) }), // ngoài cả hai kỳ
    ]
    expect(computeCallsDelta(source, NOW)).toEqual({ current: 2, previous: 1 })
  })

  it('cuộc rơi đúng ranh giới 24h chỉ được tính cho một kỳ', () => {
    const source = [call({ id: 'edge', startedAt: new Date(NOW.getTime() - DAY) })]
    expect(computeCallsDelta(source, NOW)).toEqual({ current: 0, previous: 1 })
  })
})

describe('doanh thu không cộng trùng', () => {
  it('mỗi call chỉ lấy snapshot confirmed mới nhất', () => {
    const snapshots = [
      snapshot({ callId: 'a', totalFareVnd: 300_000, createdAt: new Date(NOW.getTime() - 2 * HOUR) }),
      snapshot({ callId: 'a', totalFareVnd: 500_000, createdAt: new Date(NOW.getTime() - HOUR) }),
      snapshot({ callId: 'b', totalFareVnd: 200_000, createdAt: new Date(NOW.getTime() - HOUR) }),
    ]
    const confirmed = latestConfirmedPerCall(snapshots)
    expect(confirmed.size).toBe(2)
    expect(confirmed.get('a')?.totalFareVnd).toBe(500_000)

    const source = [
      call({ id: 'a', startedAt: new Date(NOW.getTime() - 3 * HOUR) }),
      call({ id: 'b', startedAt: new Date(NOW.getTime() - 3 * HOUR) }),
    ]
    expect(computeRevenueDelta(source, confirmed, NOW)).toEqual({ current: 700_000, previous: 0 })
    expect(computeConfirmedDelta(source, confirmed, NOW)).toEqual({ current: 2, previous: 0 })
  })

  it('tính tiền theo lúc CHỐT, không theo lúc bắt đầu cuộc gọi', () => {
    // Khách gọi từ hôm qua nhưng vé chốt cách đây một tiếng: tiền phải nằm
    // trong kỳ này, nếu quy theo startedAt thì thẻ sẽ báo giảm 100% vô lý.
    const source = [call({ id: 'a', startedAt: new Date(NOW.getTime() - 25 * HOUR) })]
    const confirmed = latestConfirmedPerCall([
      snapshot({ callId: 'a', totalFareVnd: 500_000, createdAt: new Date(NOW.getTime() - HOUR) }),
    ])
    expect(computeRevenueDelta(source, confirmed, NOW)).toEqual({ current: 500_000, previous: 0 })
    // Ngược lại, số cuộc chốt vẫn quy theo startedAt để cùng mẫu với tỉ lệ chốt.
    expect(computeConfirmedDelta(source, confirmed, NOW)).toEqual({ current: 0, previous: 1 })
  })

  it('bỏ qua snapshot chưa chốt và snapshot thiếu tiền', () => {
    const snapshots = [
      snapshot({ callId: 'a', status: 'collecting', totalFareVnd: 999_000 }),
      snapshot({ callId: 'b', totalFareVnd: null }),
    ]
    const confirmed = latestConfirmedPerCall(snapshots)
    expect(confirmed.has('a')).toBe(false)
    const source = [
      call({ id: 'a', startedAt: new Date(NOW.getTime() - HOUR) }),
      call({ id: 'b', startedAt: new Date(NOW.getTime() - HOUR) }),
    ]
    expect(computeRevenueDelta(source, confirmed, NOW)).toEqual({ current: 0, previous: 0 })
  })

  it('loại booking đã huỷ khỏi vé chốt, doanh thu và phễu', () => {
    const latest = latestSnapshotPerCall([
      snapshot({ callId: 'cancelled', origin: 'Huế', destination: 'Đà Nẵng', totalFareVnd: 500_000 }),
      snapshot({ callId: 'active', origin: 'Huế', destination: 'Đà Nẵng', totalFareVnd: 250_000 }),
      snapshot({ callId: 'legacy', origin: 'Huế', destination: 'Đà Nẵng', totalFareVnd: 100_000 }),
    ])
    const filtered = withoutCancelledBookings(latest, [
      { id: 1, callId: 'cancelled', status: 'pending_payment' },
      { id: 2, callId: 'cancelled', status: 'cancelled' },
      { id: 3, callId: 'active', status: 'paid' },
    ])

    expect([...filtered.keys()]).toEqual(['active', 'legacy'])
    expect(buildTopRoutes(filtered).reduce((sum, route) => sum + route.revenueVnd, 0)).toBe(350_000)
    expect(buildFunnel(filtered).find((step) => step.status === 'confirmed')?.count).toBe(2)
  })
})

describe('thời lượng trung bình', () => {
  it('bỏ qua cuộc chưa kết thúc thay vì coi là 0 giây', () => {
    const started = new Date(NOW.getTime() - 2 * HOUR)
    const source = [
      call({ id: 'done', startedAt: started, endedAt: new Date(started.getTime() + 240_000) }),
      call({ id: 'running', startedAt: started, status: 'active', endedAt: null }),
    ]
    expect(computeAvgDurationDelta(source, NOW).current).toBe(240)
  })

  it('trả 0 khi kỳ đó không có cuộc nào đã kết thúc', () => {
    const source = [call({ id: 'running', startedAt: new Date(NOW.getTime() - HOUR), status: 'active' })]
    expect(computeAvgDurationDelta(source, NOW).current).toBe(0)
  })
})

describe('tỉ lệ chốt', () => {
  it('không chia cho 0 khi không có cuộc gọi', () => {
    expect(computeConversionDelta({ current: 0, previous: 0 }, { current: 0, previous: 0 })).toEqual({
      current: 0,
      previous: 0,
    })
  })

  it('tính đúng tỉ lệ 0..1', () => {
    const rate = computeConversionDelta({ current: 4, previous: 5 }, { current: 1, previous: 0 })
    expect(rate.current).toBeCloseTo(0.25)
    expect(rate.previous).toBe(0)
  })
})

describe('chia bucket theo giờ và ngày', () => {
  it('hourly có 24 điểm, cũ trước mới sau, nhãn kết thúc ở giờ hiện tại', () => {
    const series = buildHourlySeries([], NO_CONFIRMED, NOW)
    expect(series).toHaveLength(24)
    expect(series[23]!.label).toBe('14h')
    expect(series[22]!.label).toBe('13h')
    expect(series[0]!.label).toBe('15h') // 24 giờ trước, tức 15h hôm qua
  })

  it('xếp cuộc gọi vào đúng bucket giờ và đếm riêng cuộc đã chốt', () => {
    const source = [
      call({ id: 'a', startedAt: new Date(NOW.getTime() - 10 * 60_000) }), // vẫn trong giờ 14h
      call({ id: 'b', startedAt: new Date(NOW.getTime() - 90 * 60_000) }), // giờ 13h
    ]
    const series = buildHourlySeries(source, new Set(['a']), NOW)
    expect(series[23]).toEqual({ label: '14h', calls: 1, confirmed: 1 })
    expect(series[22]).toEqual({ label: '13h', calls: 1, confirmed: 0 })
  })

  it('daily có 14 điểm và nhãn dạng dd/MM', () => {
    const series = buildDailySeries([], NO_CONFIRMED, NOW)
    expect(series).toHaveLength(14)
    expect(series[13]!.label).toBe('18/07')
    expect(series[12]!.label).toBe('17/07')
    expect(series[0]!.label).toBe('05/07')
  })

  it('cuộc lúc 0h30 giờ VN nằm ở ngày VN, không bị đẩy về hôm trước theo UTC', () => {
    // 00:30 +07 = 17:30Z hôm trước — nếu cắt ngày theo UTC sẽ rơi nhầm sang 17/07.
    const source = [call({ id: 'a', startedAt: new Date('2026-07-18T00:30:00+07:00') })]
    const series = buildDailySeries(source, NO_CONFIRMED, NOW)
    expect(series[13]).toEqual({ label: '18/07', calls: 1, confirmed: 0 })
    expect(series[12]!.calls).toBe(0)
  })

  it('cuộc lúc 23h50 giờ VN vẫn thuộc ngày đó', () => {
    const source = [call({ id: 'a', startedAt: new Date('2026-07-17T23:50:00+07:00') })]
    const series = buildDailySeries(source, NO_CONFIRMED, NOW)
    expect(series[12]).toEqual({ label: '17/07', calls: 1, confirmed: 0 })
  })

  it('bỏ qua cuộc nằm ngoài dải, không làm hỏng mảng', () => {
    const source = [
      call({ id: 'old', startedAt: new Date(NOW.getTime() - 40 * DAY) }),
      call({ id: 'future', startedAt: new Date(NOW.getTime() + 5 * DAY) }),
    ]
    const series = buildDailySeries(source, NO_CONFIRMED, NOW)
    expect(series).toHaveLength(14)
    expect(series.every((point) => point.calls === 0)).toBe(true)
  })
})

describe('phễu, kênh, tuyến', () => {
  it('mỗi call chỉ đứng ở một bậc phễu — bậc mới nhất', () => {
    const latest = latestSnapshotPerCall([
      snapshot({ callId: 'a', status: 'collecting', createdAt: new Date(NOW.getTime() - 3 * HOUR) }),
      snapshot({ callId: 'a', status: 'confirmed', createdAt: new Date(NOW.getTime() - HOUR) }),
      snapshot({ callId: 'b', status: 'trip_proposed' }),
    ])
    const funnel = buildFunnel(latest)
    expect(funnel.map((step) => step.status)).toEqual([
      'collecting',
      'trip_proposed',
      'awaiting_confirmation',
      'confirmed',
    ])
    expect(funnel.map((step) => step.count)).toEqual([0, 1, 0, 1])
    expect(funnel[3]!.label).toBe('Đã chốt vé')
  })

  it('hai snapshot trùng mili giây thì lấy theo id, không lấy theo thứ tự row', () => {
    const at = new Date(NOW.getTime() - HOUR)
    const forward = latestSnapshotPerCall([
      snapshot({ id: 1, callId: 'a', status: 'collecting', createdAt: at }),
      snapshot({ id: 2, callId: 'a', status: 'confirmed', createdAt: at }),
    ])
    const reversed = latestSnapshotPerCall([
      snapshot({ id: 2, callId: 'a', status: 'confirmed', createdAt: at }),
      snapshot({ id: 1, callId: 'a', status: 'collecting', createdAt: at }),
    ])
    expect(forward.get('a')?.status).toBe('confirmed')
    expect(reversed.get('a')?.status).toBe('confirmed')
  })

  it('luôn trả đủ hai kênh kể cả khi một kênh bằng 0', () => {
    const slices = buildChannels([call({ id: 'a', startedAt: NOW, channel: 'phone' })])
    expect(slices).toEqual([
      { channel: 'phone', label: 'Điện thoại', count: 1 },
      { channel: 'web', label: 'Web', count: 0 },
    ])
  })

  it('gộp tuyến theo số vé, giảm dần, tối đa 5 tuyến', () => {
    const confirmed = new Map<string, MetricSnapshot>([
      ['a', snapshot({ callId: 'a', origin: 'Sài Gòn', destination: 'Đà Lạt', ticketCount: 2, totalFareVnd: 500_000 })],
      ['b', snapshot({ callId: 'b', origin: 'Sài Gòn', destination: 'Đà Lạt', ticketCount: 1, totalFareVnd: 250_000 })],
      ['c', snapshot({ callId: 'c', origin: 'Hà Nội', destination: 'Sa Pa', ticketCount: 4, totalFareVnd: 900_000 })],
      ['d', snapshot({ callId: 'd', origin: null, destination: 'Huế', ticketCount: 9 })], // thiếu điểm đi -> bỏ
    ])
    const routes = buildTopRoutes(confirmed)
    expect(routes).toEqual([
      { route: 'Hà Nội → Sa Pa', count: 4, revenueVnd: 900_000 },
      { route: 'Sài Gòn → Đà Lạt', count: 3, revenueVnd: 750_000 },
    ])
  })

  it('cắt còn 5 tuyến khi có nhiều hơn', () => {
    const confirmed = new Map<string, MetricSnapshot>()
    for (let i = 0; i < 8; i += 1) {
      confirmed.set(`c${i}`, snapshot({ callId: `c${i}`, origin: 'A', destination: `B${i}`, ticketCount: i + 1 }))
    }
    const routes = buildTopRoutes(confirmed)
    expect(routes).toHaveLength(5)
    expect(routes[0]!.route).toBe('A → B7')
  })
})

describe('toMetricSnapshot', () => {
  it('lấy tuyến và số vé từ cột jsonb', () => {
    const result = toMetricSnapshot({
      callId: 'a',
      status: 'confirmed',
      totalFareVnd: 500_000,
      createdAt: NOW,
      snapshot: { origin: 'Sài Gòn', destination: 'Đà Lạt', seats: ['A01', 'A02'], passengerCount: 2 },
    })
    expect(result).toMatchObject({ origin: 'Sài Gòn', destination: 'Đà Lạt', ticketCount: 2 })
  })

  it('chịu được jsonb rỗng hoặc sai kiểu', () => {
    const result = toMetricSnapshot({
      callId: 'a',
      status: 'collecting',
      totalFareVnd: null,
      createdAt: NOW,
      snapshot: null,
    })
    expect(result).toMatchObject({ origin: null, destination: null, ticketCount: 1 })
  })

  it('chưa giữ ghế thì lấy số khách làm số vé', () => {
    const result = toMetricSnapshot({
      callId: 'a',
      status: 'awaiting_confirmation',
      totalFareVnd: null,
      createdAt: NOW,
      snapshot: { seats: [], passengerCount: 3 },
    })
    expect(result.ticketCount).toBe(3)
  })
})

describe('định dạng hiển thị', () => {
  it('formatVnd nhóm nghìn bằng dấu chấm', () => {
    expect(formatVnd(1_250_000)).toBe('1.250.000 đ')
    expect(formatVnd(0)).toBe('0 đ')
    expect(formatVnd(980)).toBe('980 đ')
  })

  it('formatCompactVnd rút gọn theo đơn vị tiếng Việt', () => {
    expect(formatCompactVnd(1_250_000)).toBe('1,25 tr')
    expect(formatCompactVnd(980_000)).toBe('980 ng')
    expect(formatCompactVnd(12_500_000)).toBe('12,5 tr')
    expect(formatCompactVnd(2_000_000)).toBe('2 tr')
    expect(formatCompactVnd(0)).toBe('0 đ')
  })

  it('formatDurationSec đọc thành lời cho aria-label', () => {
    expect(formatDurationSec(252)).toBe('4 phút 12 giây')
    expect(formatDurationSec(240)).toBe('4 phút')
    expect(formatDurationSec(0)).toBe('0 giây')
    expect(formatDurationSec(45)).toBe('45 giây')
  })

  it('formatClock hiển thị dạng đồng hồ', () => {
    expect(formatClock(252)).toBe('4:12')
    expect(formatClock(9)).toBe('0:09')
    expect(formatClock(3661)).toBe('1:01:01')
  })

  it('formatPercent nhận tỉ lệ 0..1', () => {
    expect(formatPercent(0.42)).toBe('42%')
    expect(formatPercent(0)).toBe('0%')
    expect(formatPercent(Number.NaN)).toBe('0%')
  })

  it('deltaPercent trả null khi kỳ trước bằng 0', () => {
    expect(deltaPercent({ current: 5, previous: 0 })).toBeNull()
    expect(deltaPercent({ current: 0, previous: 0 })).toBeNull()
    expect(deltaPercent({ current: 5, previous: 4 })).toBeCloseTo(0.25)
    expect(deltaPercent({ current: 3, previous: 4 })).toBeCloseTo(-0.25)
  })
})
