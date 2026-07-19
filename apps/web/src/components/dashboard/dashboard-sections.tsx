import type { ReactNode } from 'react'
import Link from 'next/link'
import { CalendarClock, Database, Inbox, TimerReset, type LucideIcon } from 'lucide-react'

import { ChannelDonut } from '@/components/dashboard/charts/channel-donut'
import { CHART_TONE_VAR, type ChartTone } from '@/components/dashboard/charts/chart-tone'
import { FunnelBars } from '@/components/dashboard/charts/funnel-bars'
import { TrendChart, type TrendSeries } from '@/components/dashboard/charts/trend-chart'
import { cn } from '@/lib/cn'
import { formatClock, formatCompactVnd, formatDurationSec, formatVnd } from '@/lib/dashboard-format'
import type {
  ChannelSlice,
  ExpiringHold,
  FunnelStep,
  RouteRollup,
  SeriesPoint,
  UpcomingTrip,
} from '@/lib/db/dashboard-store'

// ---------------------------------------------------------------------------
// Khung chung: hairline + surface, không dùng shadow nặng để giữ mật độ cao.
// Panel dùng chung có padding cố định nên bảng không thể tràn sát mép — vì vậy
// dashboard có khung riêng cho phép body phẳng.
// ---------------------------------------------------------------------------

export function SectionCard({
  id,
  title,
  hint,
  action,
  children,
  className,
  bodyClassName,
}: {
  id?: string
  title: string
  hint?: ReactNode
  action?: ReactNode
  children: ReactNode
  // exactOptionalPropertyTypes: các section bọc ngoài chuyển tiếp className
  // của chính chúng xuống đây, giá trị đó có thể là undefined tường minh.
  className?: string | undefined
  bodyClassName?: string | undefined
}) {
  return (
    <section
      id={id}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/80 bg-[var(--surface)] shadow-[var(--elevation-card)] ring-1 ring-black/[0.05]',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <h2 className="text-base font-medium leading-snug tracking-tight text-[var(--ink)]">{title}</h2>
          {hint ? <p className="mt-0.5 text-ui text-[var(--muted)]">{hint}</p> : null}
        </div>
        {action}
      </header>
      <div className={cn('flex min-w-0 flex-1 flex-col', bodyClassName ?? 'p-4')}>{children}</div>
    </section>
  )
}

export function EmptyBlock({
  icon: Icon = Inbox,
  title,
  description,
}: {
  icon?: LucideIcon
  title: string
  description: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {/* Trạng thái "chưa có gì" là thụ động — indigo để dành cho hành động thật. */}
      <span className="flex size-10 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-[var(--muted)]">
        <Icon size={18} aria-hidden />
      </span>
      <p className="text-ui font-medium text-[var(--ink)]">{title}</p>
      <p className="max-w-sm text-metric leading-5 text-[var(--muted)]">{description}</p>
    </div>
  )
}

/** DATABASE_URL chưa cấu hình — khác hẳn với "đã cấu hình nhưng chưa có dữ liệu". */
export function StorageNotConfigured({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-[var(--hairline)] bg-[var(--surface)] px-6 py-12 text-center',
        className,
      )}
    >
      {/* Trạng thái "chưa có gì" là thụ động — indigo để dành cho hành động thật. */}
      <span className="flex size-10 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-[var(--muted)]">
        <Database size={18} aria-hidden />
      </span>
      <p className="text-ui font-medium text-[var(--ink)]">Chưa cấu hình lưu trữ</p>
      <p className="max-w-md text-metric leading-5 text-[var(--muted)]">
        Đặt biến môi trường <code className="font-mono text-[var(--ink)]">DATABASE_URL</code> (Neon Postgres) để ghi và
        hiển thị số liệu cuộc gọi.
      </p>
    </div>
  )
}

function ToneDot({ tone }: { tone: ChartTone }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: CHART_TONE_VAR[tone] }}
      aria-hidden
    />
  )
}

// ---------------------------------------------------------------------------
// Xu hướng theo giờ
// ---------------------------------------------------------------------------

export function TrendSection({
  points,
  avgDurationSec,
  className,
}: {
  points: SeriesPoint[]
  avgDurationSec: number
  className?: string
}) {
  const series: TrendSeries[] = [
    { name: 'Cuộc gọi', tone: 'action', points: points.map((point) => point.calls) },
    { name: 'Đã giữ vé', tone: 'success', points: points.map((point) => point.confirmed) },
  ]

  return (
    <SectionCard
      className={className}
      title="Xu hướng theo giờ"
      hint={
        <>
          Thời lượng trung bình{' '}
          {/* aria-label không có tác dụng trên <span> (role=generic) — phải dùng
              cặp hiện/ẩn thì screen reader mới đọc được bản đầy đủ. */}
          <span className="font-mono tabular-nums text-[var(--ink)]">
            <span aria-hidden>{formatClock(avgDurationSec)}</span>
            <span className="sr-only">{formatDurationSec(avgDurationSec)}</span>
          </span>
        </>
      }
      action={
        <ul className="flex flex-wrap items-center gap-3 text-metric text-[var(--muted)]">
          {series.map((line) => (
            <li key={line.name} className="inline-flex items-center gap-1.5">
              <ToneDot tone={line.tone} />
              {line.name}
            </li>
          ))}
        </ul>
      }
    >
      {points.length > 1 ? (
        <TrendChart
          labels={points.map((point) => point.label)}
          series={series}
          ariaLabel="Biểu đồ số cuộc gọi và số vé đã giữ theo từng giờ"
          height={220}
        />
      ) : (
        <EmptyBlock
          title="Chưa đủ dữ liệu để vẽ xu hướng"
          description="Cần ít nhất hai khung giờ có cuộc gọi thì đường xu hướng mới có ý nghĩa."
        />
      )}
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Kênh vào cuộc gọi
// ---------------------------------------------------------------------------

const CHANNEL_TONE: Record<string, ChartTone> = {
  phone: 'action',
  web: 'violet',
}

export function ChannelSection({ channels, className }: { channels: ChannelSlice[]; className?: string }) {
  const total = channels.reduce((sum, slice) => sum + slice.count, 0)
  const slices = channels.map((slice) => ({
    label: slice.label,
    value: slice.count,
    tone: CHANNEL_TONE[slice.channel] ?? 'muted',
  }))

  return (
    // Tổng đã nằm ở tâm donut nên hint chỉ nói phạm vi thời gian — ba khối dưới
    // hàng KPI đọc trên 14 ngày, khác hẳn cửa sổ 24 giờ của thẻ KPI.
    // justify-center: thẻ này bị kéo cao bằng thẻ xu hướng bên cạnh, không căn
    // giữa thì donut dính đỉnh và bỏ lại một khoảng trống lớn dưới đáy.
    <SectionCard className={className} title="Kênh vào" hint="14 ngày gần nhất" bodyClassName="justify-center p-4">
      {total > 0 ? (
        // ChannelDonut đã tự vẽ chú giải đầy đủ (nhãn + số + %); section không
        // được vẽ thêm một danh sách nữa, nếu không screen reader đọc hai lượt.
        <ChannelDonut slices={slices} ariaLabel="Tỉ lệ cuộc gọi theo kênh vào" />
      ) : (
        <EmptyBlock
          title="Chưa có cuộc gọi nào"
          description="Khi có cuộc gọi qua điện thoại hoặc web call, tỉ lệ từng kênh sẽ hiện ở đây."
        />
      )}
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Phễu đặt vé
// ---------------------------------------------------------------------------

export function FunnelSection({ steps, className }: { steps: FunnelStep[]; className?: string }) {
  const hasData = steps.some((step) => step.count > 0)

  return (
    <SectionCard
      className={className}
      title="Phễu đặt vé"
      hint="14 ngày gần nhất — từ lúc thu thập thông tin tới khi giữ được vé"
    >
      {hasData ? (
        <FunnelBars
          steps={steps.map((step) => ({ label: step.label, count: step.count }))}
          ariaLabel="Số cuộc gọi còn lại ở từng bước của phễu đặt vé"
        />
      ) : (
        <EmptyBlock
          title="Chưa có booking nào"
          description="Mỗi cuộc gọi có thu thập thông tin đặt vé sẽ được xếp vào một bước của phễu."
        />
      )}
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Top tuyến
// ---------------------------------------------------------------------------

export function TopRoutesSection({ routes, className }: { routes: RouteRollup[]; className?: string }) {
  // buildTopRoutes xếp theo SỐ VÉ, nên thanh nền cũng phải vẽ theo số vé —
  // vẽ theo doanh thu sẽ cho ra bảng xếp hạng có thanh dài ngắn lộn xộn.
  const peak = routes.reduce((max, route) => Math.max(max, route.count), 0)

  return (
    <SectionCard className={className} title="Tuyến bán chạy" hint="Xếp theo số vé đã chốt · 14 ngày">
      {routes.length > 0 ? (
        <ol className="flex flex-col gap-1">
          {routes.map((route, index) => (
            <li key={route.route} className="relative overflow-hidden rounded-[9px] px-2.5 py-2">
              {/* Thanh nền tỉ lệ số vé: đọc được thứ hạng mà không cần thêm trục. */}
              <span
                className="absolute inset-y-0 left-0 rounded-[9px] bg-[color-mix(in_srgb,var(--chart-1)_16%,var(--surface))]"
                style={{ width: peak > 0 ? `${Math.max(4, (route.count / peak) * 100)}%` : '0%' }}
                aria-hidden
              />
              <span className="relative flex items-center gap-2.5 text-ui">
                <span className="w-4 shrink-0 text-metric tabular-nums text-[var(--muted)]">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink)]">{route.route}</span>
                <span className="shrink-0 tabular-nums text-[var(--muted)]">{route.count} vé</span>
                <span className="w-20 shrink-0 text-right font-medium tabular-nums tracking-[-0.01em] text-[var(--ink)]">
                  <span aria-hidden>{formatCompactVnd(route.revenueVnd)}</span>
                  <span className="sr-only">{formatVnd(route.revenueVnd)}</span>
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyBlock
          title="Chưa có tuyến nào chốt được vé"
          description="Danh sách này chỉ tính các booking đã giữ vé thành công."
        />
      )}
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Hai khối nhìn về phía trước. Phần trên của dashboard chỉ kể chuyện đã qua.
// ---------------------------------------------------------------------------

function vnClock(value: Date): string {
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}

export function UpcomingTripsSection({ trips, className }: { trips: UpcomingTrip[]; className?: string }) {
  return (
    <SectionCard className={className} title="Chuyến sắp khởi hành" hint="12 giờ tới">
      {trips.length > 0 ? (
        <ol className="flex flex-col gap-1">
          {trips.map((trip) => {
            const filled = trip.total > 0 ? (trip.booked + trip.held) / trip.total : 0
            // Sắp hết ghế là tin phải thấy ngay, không phải tin phải tự tính.
            const tone =
              trip.available === 0 ? 'var(--danger)' : trip.available <= 2 ? 'var(--warning)' : 'var(--muted)'
            return (
              <li key={trip.tripId} className="relative overflow-hidden rounded-[9px] px-2.5 py-2">
                <span
                  className="absolute inset-y-0 left-0 rounded-[9px] bg-[color-mix(in_srgb,var(--chart-1)_16%,var(--surface))]"
                  style={{ width: `${Math.max(4, filled * 100)}%` }}
                  aria-hidden
                />
                <span className="relative flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-ui">
                  <span className="shrink-0 font-medium tabular-nums text-[var(--ink)]">
                    {vnClock(trip.departureAt)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{trip.route}</span>
                  {/* Màn hẹp: loại xe nhường chỗ cho tuyến. Giữ cả hai thì tuyến
                      — thứ người trực cần đọc trước — bị cắt còn "Đà Nẵng…". */}
                  <span className="hidden shrink-0 text-metric text-[var(--muted)] sm:inline">{trip.vehicleType}</span>
                  <span className="shrink-0 tabular-nums" style={{ color: tone }}>
                    {trip.available === 0 ? 'Hết ghế' : `Còn ${trip.available}/${trip.total} ghế`}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      ) : (
        <EmptyBlock
          icon={CalendarClock}
          title="Không có chuyến nào trong 12 giờ tới"
          description="Khi lịch chạy có chuyến sắp khởi hành, số ghế còn trống sẽ hiện ở đây."
        />
      )}
    </SectionCard>
  )
}

export function ExpiringHoldsSection({
  holds,
  now,
  className,
}: {
  holds: ExpiringHold[]
  /** Mốc render từ server — AutoRefresh đã chạy nên không cần đếm lùi phía client. */
  now: Date
  className?: string
}) {
  return (
    <SectionCard className={className} title="Ghế đang giữ, sắp hết hạn" hint="Hết hạn là ghế tự nhả về kho">
      {holds.length > 0 ? (
        <ol className="flex flex-col gap-1">
          {holds.map((hold) => {
            const minutes = Math.max(0, Math.round((new Date(hold.holdExpiresAt).getTime() - now.getTime()) / 60_000))
            const urgent = minutes < 3
            return (
              <li
                key={hold.callId}
                className="group relative rounded-[9px] px-2.5 py-2 transition-colors hover:bg-[var(--pearl)] focus-within:bg-[var(--pearl)]"
              >
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-ui">
                  <Link
                    href={`/dashboard/calls/${encodeURIComponent(hold.callId)}`}
                    className="rounded-sm font-mono font-medium text-[var(--ink)] underline-offset-2 group-hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] after:absolute after:inset-0 after:content-['']"
                  >
                    {hold.callId}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{hold.route}</span>
                  <span className="shrink-0 font-mono text-metric tabular-nums text-[var(--muted)]">
                    {hold.seatCodes.join(', ')}
                  </span>
                  <span
                    className="shrink-0 tabular-nums"
                    style={{ color: urgent ? 'var(--danger)' : 'var(--muted)' }}
                  >
                    còn {minutes} phút
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      ) : (
        <EmptyBlock
          icon={TimerReset}
          title="Không có ghế nào đang bị giữ"
          description="Khi khách chọn được ghế mà chưa chốt, ghế giữ tạm sẽ hiện ở đây kèm thời gian còn lại."
        />
      )}
    </SectionCard>
  )
}
