import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Banknote, PhoneCall, RefreshCw, Target, TicketCheck } from 'lucide-react'

import { AutoRefresh } from '@/components/dashboard/auto-refresh'
import { CallTable } from '@/components/dashboard/call-table'
import { DashboardLoginForm } from '@/components/dashboard/dashboard-login-form'
import {
  ChannelSection,
  EmptyBlock,
  ExpiringHoldsSection,
  FunnelSection,
  SectionCard,
  StorageNotConfigured,
  TopRoutesSection,
  TrendSection,
  UpcomingTripsSection,
} from '@/components/dashboard/dashboard-sections'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { BrandMark } from '@/components/ui/brand-mark'
import {
  createDashboardSession,
  DASHBOARD_COOKIE,
  dashboardAccessKey,
  hasDashboardCookie,
  keyMatches,
} from '@/lib/dashboard-auth'
import { formatCompactVnd, formatPercent, formatVnd } from '@/lib/dashboard-format'
import {
  getDashboardMetrics,
  listExpiringHolds,
  listRecentCalls,
  listUpcomingTrips,
  windowBounds,
} from '@/lib/db/dashboard-store'

export const dynamic = 'force-dynamic'

const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh'

function formatVnTime(value: Date): string {
  return value.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: VN_TIME_ZONE,
  })
}

function formatVnStamp(value: Date): string {
  return value.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: VN_TIME_ZONE,
  })
}

async function login(formData: FormData) {
  'use server'
  if (keyMatches(String(formData.get('key') ?? ''))) {
    const store = await cookies()
    store.set(DASHBOARD_COOKIE, createDashboardSession(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    })
    redirect('/dashboard')
  }
  redirect('/dashboard?error=1')
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  if (!dashboardAccessKey()) {
    return (
      <AuthShell>
        <BrandMark className="mx-auto size-12" />
        <h1 className="mt-5 text-section font-semibold tracking-[-0.03em] text-[var(--ink)]">Dashboard chưa được bật</h1>
        <p className="mt-2 text-ui leading-6 text-[var(--muted)]">
          Đặt biến môi trường <code className="font-mono text-[var(--ink)]">DASHBOARD_ACCESS_KEY</code> (tối thiểu 32 ký
          tự) để mở dashboard giám sát cuộc gọi.
        </p>
      </AuthShell>
    )
  }

  if (!(await hasDashboardCookie())) {
    const { error } = await searchParams
    return (
      <AuthShell>
        <BrandMark className="mx-auto size-12" />
        <h1 className="mt-5 text-section font-semibold tracking-[-0.03em] text-[var(--ink)]">Đăng nhập dashboard</h1>
        <p className="mt-1 text-ui text-[var(--muted)]">Nhập khóa truy cập để xem cuộc gọi Alove.</p>
        <DashboardLoginForm action={login} {...(error ? { error: 'Khóa không đúng.' } : {})} />
      </AuthShell>
    )
  }

  // Các truy vấn độc lập nhau — chạy song song để trang không đợi nhiều vòng.
  const [callList, metrics, upcoming, holds] = await Promise.all([
    listRecentCalls(),
    getDashboardMetrics(),
    listUpcomingTrips(),
    listExpiringHolds(),
  ])

  // Mốc render dùng chung cho dòng khung thời gian và cho đồng hồ đếm ghế giữ.
  const now = new Date()
  const bounds = windowBounds(now)

  // metrics null nghĩa là chưa có DATABASE_URL. Cả bốn loader cùng phụ thuộc
  // getDb() nên chỉ cần một trạng thái "chưa cấu hình", không lặp lại ở dưới.
  if (metrics === null) {
    return (
      <div className="min-h-dvh bg-[var(--canvas)]">
        <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6">
          <StorageNotConfigured />
        </main>
      </div>
    )
  }

  const activeCalls = metrics.activeCalls
  const conversionSpark = metrics.hourly.map((point) => (point.calls > 0 ? point.confirmed / point.calls : 0))

  return (
    <div className="min-h-dvh bg-[var(--canvas)]">
      {/* Cuộc gọi kéo dài hàng phút — làm mới 5 giây một lần không thêm thông tin
          mà nhân năm số lần quét Neon cho mỗi tab đang mở. */}
      <AutoRefresh seconds={15} />

      <header className="sticky top-0 z-20 border-b border-[var(--hairline)] bg-[color-mix(in_srgb,var(--canvas)_82%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 w-full max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark className="size-7 shrink-0" />
            <h1 className="truncate text-ui font-semibold tracking-[-0.015em] text-[var(--ink)]">Giám sát cuộc gọi</h1>
            <span className="hidden text-metric text-[var(--muted)] sm:inline">Alove · đặt vé xe khách</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-2.5 py-1 text-metric font-medium text-[var(--ink)]">
              {activeCalls > 0 ? (
                <>
                  <span className="size-1.5 animate-pulse rounded-full bg-[var(--success)]" aria-hidden />
                  <span className="tabular-nums">{activeCalls}</span> cuộc đang diễn ra
                </>
              ) : (
                <>
                  <span className="size-1.5 rounded-full bg-[var(--muted)]" aria-hidden />
                  Không có cuộc đang diễn ra
                </>
              )}
            </span>
            {/* Mốc cập nhật thật thay cho lời hứa "mỗi 5 giây": nếu refresh hỏng
                thì con số này đứng im và người trực nhìn ra ngay. */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-2.5 py-1 text-metric text-[var(--muted)]">
              <RefreshCw size={12} aria-hidden />
              <span className="hidden sm:inline">Cập nhật lúc</span>{' '}
              <span className="tabular-nums">{formatVnTime(now)}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6">
        {/* Cửa sổ 24 giờ là mốc trượt tính từ lúc render, không phải "từ 0h" —
            ghi mốc tuyệt đối ra để không ai phải đoán. */}
        <p className="text-metric text-[var(--muted)]">
          Số liệu 24 giờ:{' '}
          <span className="tabular-nums text-[var(--ink)]">{formatVnStamp(new Date(bounds.curFrom))}</span>
          {' → '}
          <span className="tabular-nums text-[var(--ink)]">{formatVnStamp(new Date(bounds.curTo))}</span> (giờ Việt Nam)
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Cuộc gọi 24 giờ"
            value={String(metrics.calls.current)}
            icon={PhoneCall}
            delta={metrics.calls}
            deltaSuffix="so với 24 giờ liền trước"
            spark={metrics.hourly.map((point) => point.calls)}
            sparkTone="action"
            sparkLabel="Theo giờ"
            sparkAriaLabel="Số cuộc gọi theo từng giờ"
          />
          <KpiCard
            label="Đã giữ vé"
            value={String(metrics.confirmed.current)}
            icon={TicketCheck}
            delta={metrics.confirmed}
            deltaSuffix="so với 24 giờ liền trước"
            spark={metrics.hourly.map((point) => point.confirmed)}
            sparkTone="success"
            sparkLabel="Theo giờ"
            sparkAriaLabel="Số vé giữ được theo từng giờ"
          />
          {/* "Tiền vé đã chốt" chứ không phải "Doanh thu": bookings vẫn đứng ở
              pending_payment và payments chưa ghi dòng nào — chưa thu đồng nào. */}
          <KpiCard
            label="Tiền vé đã chốt"
            value={formatCompactVnd(metrics.revenueVnd.current)}
            valueLabel={formatVnd(metrics.revenueVnd.current)}
            icon={Banknote}
            delta={metrics.revenueVnd}
            deltaSuffix="so với 24 giờ liền trước"
            spark={metrics.daily.map((point) => point.confirmed)}
            sparkTone="action"
            sparkLabel="Số vé / ngày"
            sparkAriaLabel="Số vé giữ được theo từng ngày"
          />
          <KpiCard
            label="Tỉ lệ chốt"
            value={formatPercent(metrics.conversionRate.current)}
            icon={Target}
            delta={metrics.conversionRate}
            deltaSuffix="so với 24 giờ liền trước"
            spark={conversionSpark}
            sparkTone="action"
            sparkLabel="Theo giờ"
            sparkAriaLabel="Tỉ lệ cuộc gọi chốt được vé theo từng giờ"
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <UpcomingTripsSection className="lg:col-span-2" trips={upcoming ?? []} />
          <ExpiringHoldsSection holds={holds ?? []} now={now} />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <TrendSection
            className="lg:col-span-2"
            points={metrics.hourly}
            avgDurationSec={metrics.avgDurationSec.current}
          />
          <ChannelSection channels={metrics.channels} />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <FunnelSection className="lg:col-span-2" steps={metrics.funnel} />
          <TopRoutesSection routes={metrics.topRoutes} />
        </div>

        <SectionCard
          title="Cuộc gọi gần đây"
          hint={callList && callList.length > 0 ? `${callList.length} cuộc mới nhất` : 'Tối đa 50 cuộc mới nhất'}
          bodyClassName="p-0"
        >
          {callList === null || callList.length === 0 ? (
            <EmptyBlock
              icon={PhoneCall}
              title="Chưa có cuộc gọi nào"
              description="Khi khách gọi vào số PSTN hoặc mở web call, cuộc gọi sẽ hiện ở đây trong vài giây."
            />
          ) : (
            <CallTable rows={callList} />
          )}
        </SectionCard>
      </main>
    </div>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--canvas)] px-4 py-10">
      <div className="w-full max-w-sm rounded-[18px] border border-[var(--hairline)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-panel)] sm:p-8">
        {children}
      </div>
    </main>
  )
}
