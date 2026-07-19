import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  Activity,
  Banknote,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  PhoneCall,
  RefreshCw,
  Route,
  Target,
  TicketCheck,
} from 'lucide-react'

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

export const metadata: Metadata = {
  title: 'Vận hành Nhà xe Mai Anh | Alove',
  description: 'Màn hình nội bộ để theo dõi cuộc gọi, booking và mã vé Alove.',
  robots: { index: false, follow: false },
}

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

async function logout() {
  'use server'
  const store = await cookies()
  store.delete(DASHBOARD_COOKIE)
  redirect('/dashboard')
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
        <h1 className="mt-5 text-section font-semibold tracking-[-0.03em] text-[var(--ink)]">
          Màn hình vận hành chưa được bật
        </h1>
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
        <h1 className="mt-5 text-section font-semibold tracking-[-0.03em] text-[var(--ink)]">
          Đăng nhập màn hình vận hành
        </h1>
        <p className="mt-1 text-ui text-[var(--muted)]">Nhập khóa truy cập để xem cuộc gọi và booking Alove.</p>
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
      <div className="dashboard-crm-theme h-svh overflow-hidden bg-[var(--sidebar-shell)] lg:grid lg:grid-cols-[min-content_minmax(0,1fr)] lg:grid-rows-1">
        <DashboardSidebar logout={logout} />
        <div className="flex h-full min-w-0 flex-col lg:py-2 lg:pr-2">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--background)] lg:rounded-xl lg:border lg:border-white/80 lg:shadow-[var(--elevation-panel)] lg:ring-1 lg:ring-black/[0.05]">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 lg:hidden">
              <BrandMark className="size-8 shrink-0" />
              <span className="text-ui font-semibold">Tổng quan vận hành</span>
            </header>
            <main className="mx-auto flex w-full max-w-[1440px] flex-1 items-center px-4 py-6 sm:px-6 lg:px-8">
              <StorageNotConfigured className="w-full shadow-[var(--elevation-card)]" />
            </main>
          </div>
        </div>
      </div>
    )
  }

  const activeCalls = metrics.activeCalls
  const conversionSpark = metrics.hourly.map((point) => (point.calls > 0 ? point.confirmed / point.calls : 0))

  return (
    <div className="dashboard-crm-theme h-svh overflow-hidden bg-[var(--sidebar-shell)] lg:grid lg:grid-cols-[min-content_minmax(0,1fr)] lg:grid-rows-1">
      {/* Cuộc gọi kéo dài hàng phút — làm mới mỗi 15 giây giữ số liệu đủ gần thời
          gian thực mà không nhân số lần quét Neon cho mỗi tab đang mở. */}
      <AutoRefresh seconds={15} />
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-50 -translate-y-20 rounded-lg bg-[var(--primary)] px-3 py-2 text-ui font-medium text-[var(--primary-foreground)] shadow-lg transition-transform focus:translate-y-0"
      >
        Bỏ qua điều hướng
      </a>

      <DashboardSidebar logout={logout} />

      <div className="flex h-full min-w-0 flex-col lg:py-2 lg:pr-2">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--background)] lg:rounded-xl lg:border lg:border-white/80 lg:shadow-[var(--elevation-panel)] lg:ring-1 lg:ring-black/[0.05]">
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_90%,transparent)] px-3 backdrop-blur-md lg:hidden">
            <BrandMark className="size-8 shrink-0" />
            <span className="truncate text-ui font-semibold">Tổng quan vận hành</span>
            <form action={logout} className="ml-auto">
              <button type="submit" aria-label="Đăng xuất" className="flex size-10 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--pearl)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--ring)_35%,transparent)]">
                <LogOut size={17} aria-hidden />
              </button>
            </form>
          </header>

          <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-5 focus:outline-none sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-[var(--ink)]">Tổng quan vận hành</h1>
                  <p className="text-ui text-[var(--muted)]">Nhà xe Mai Anh · cuộc gọi và đặt vé</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-metric font-medium text-[var(--ink)] shadow-sm">
                    {activeCalls > 0 ? (
                      <><span className="size-1.5 animate-pulse rounded-full bg-[var(--success)]" aria-hidden /><span className="tabular-nums">{activeCalls}</span> cuộc đang diễn ra</>
                    ) : (
                      <><span className="size-1.5 rounded-full bg-[var(--muted)]" aria-hidden />Không có cuộc đang diễn ra</>
                    )}
                  </span>
                  <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-metric text-[var(--muted)] shadow-sm">
                    <RefreshCw size={13} aria-hidden /> Cập nhật <span className="tabular-nums text-[var(--ink)]">{formatVnTime(now)}</span>
                  </span>
                </div>
              </div>

        {/* Cửa sổ 24 giờ là mốc trượt tính từ lúc render, không phải "từ 0h" —
            ghi mốc tuyệt đối ra để không ai phải đoán. */}
        <p className="-mt-4 text-metric text-[var(--muted)]">
          Số liệu 24 giờ:{' '}
          <span className="tabular-nums text-[var(--ink)]">{formatVnStamp(new Date(bounds.curFrom))}</span>
          {' → '}
          <span className="tabular-nums text-[var(--ink)]">{formatVnStamp(new Date(bounds.curTo))}</span> (giờ Việt Nam)
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số tổng quan">
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

        <div id="trips" className="grid scroll-mt-6 gap-4 lg:grid-cols-3">
          <UpcomingTripsSection className="lg:col-span-2" trips={upcoming ?? []} />
          <ExpiringHoldsSection holds={holds ?? []} now={now} />
        </div>

        <div id="analytics" className="grid scroll-mt-6 gap-4 lg:grid-cols-3">
          <TrendSection
            className="lg:col-span-2"
            points={metrics.hourly}
            avgDurationSec={metrics.avgDurationSec.current}
          />
          <ChannelSection channels={metrics.channels} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <FunnelSection className="lg:col-span-2" steps={metrics.funnel} />
          <TopRoutesSection routes={metrics.topRoutes} />
        </div>

        <SectionCard
          id="calls"
          className="scroll-mt-6 shadow-[var(--elevation-panel)]"
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
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function DashboardSidebar({ logout }: { logout: (formData: FormData) => Promise<void> }) {
  const nav = [
    { href: '#main-content', label: 'Tổng quan', icon: LayoutDashboard, active: true },
    { href: '#calls', label: 'Cuộc gọi gần đây', icon: PhoneCall },
    { href: '#trips', label: 'Chuyến & giữ ghế', icon: CalendarClock },
    { href: '#analytics', label: 'Phân tích', icon: Activity },
  ]

  return (
    <aside className="hidden h-full lg:flex" aria-label="Điều hướng dashboard">
      <div className="flex w-14 flex-col items-center justify-between py-3">
        <a href="#main-content" aria-label="Về tổng quan" className="flex size-9 items-center justify-center rounded-lg bg-[var(--primary)] shadow-sm transition-transform hover:scale-105 motion-reduce:transform-none">
          <BrandMark className="size-7" />
        </a>
        <form action={logout}>
          <button type="submit" aria-label="Đăng xuất" title="Đăng xuất" className="flex size-9 items-center justify-center rounded-lg text-[var(--sidebar-foreground-token)] transition-colors hover:bg-black/[0.06] active:bg-black/[0.1] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--ring)_40%,transparent)]">
            <LogOut size={17} aria-hidden />
          </button>
        </form>
      </div>

      <div className="py-2 pr-2">
        <div className="flex h-full w-56 flex-col rounded-xl border border-white/70 bg-[var(--sidebar-accent-token)] shadow-[var(--elevation-panel)] ring-1 ring-black/[0.04]">
          <div className="px-5 pb-3 pt-4">
            <p className="text-lg font-semibold tracking-tight text-[var(--ink)]">Alove</p>
            <p className="text-metric text-[var(--muted)]">Điều hành nhà xe</p>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 p-3 pt-1">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={item.active
                  ? 'relative flex h-10 items-center gap-2.5 rounded-lg bg-blue-100/60 px-2.5 text-ui font-medium leading-none text-blue-700 transition-colors before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-blue-600 hover:bg-blue-100/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--ring)_35%,transparent)]'
                  : 'flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-ui leading-none text-[var(--sidebar-foreground-token)] transition-colors hover:bg-black/[0.04] active:bg-black/[0.08] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--ring)_35%,transparent)]'}
              >
                <item.icon size={16} aria-hidden /> {item.label}
              </a>
            ))}
          </nav>
          <div className="m-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="flex items-center gap-2 text-metric font-medium text-[var(--ink)]"><Route size={14} className="text-[var(--info)]" aria-hidden /> Nhà xe Mai Anh</div>
            <p className="mt-1 text-metric text-[var(--muted)]">Khu vực nội bộ</p>
          </div>
        </div>
      </div>
    </aside>
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
