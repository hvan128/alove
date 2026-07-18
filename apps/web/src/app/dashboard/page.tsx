import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ChevronRight, Globe, Phone, PhoneCall, RefreshCw } from 'lucide-react'

import { Panel } from '@/components/ui/panel'
import {
  createDashboardSession,
  DASHBOARD_COOKIE,
  dashboardAccessKey,
  hasDashboardCookie,
  keyMatches,
} from '@/lib/dashboard-auth'
import { listRecentCalls, type CallSummary } from '@/lib/db/dashboard-store'
import { AutoRefresh } from '@/components/dashboard/auto-refresh'
import { BrandMark } from '@/components/ui/brand-mark'
import { BookingStatusBadge, CallStatusBadge } from '@/components/dashboard/status-badge'
import { DashboardLoginForm } from '@/components/dashboard/dashboard-login-form'

export const dynamic = 'force-dynamic'

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
        <Brand />
        <h1 className="mt-5 text-lg font-semibold tracking-[-0.025em] text-[var(--ink)]">Dashboard chưa được bật</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
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
        <Brand />
        <h1 className="mt-5 text-lg font-semibold tracking-[-0.025em] text-[var(--ink)]">Đăng nhập dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Nhập khóa truy cập để xem cuộc gọi Alove.</p>
        <DashboardLoginForm action={login} {...(error ? { error: 'Khóa không đúng.' } : {})} />
      </AuthShell>
    )
  }

  const callList = await listRecentCalls()
  const activeCount = callList?.filter((row) => row.status === 'active').length ?? 0
  const confirmedCount = callList?.filter((row) => row.latestBooking?.status === 'confirmed').length ?? 0

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <AutoRefresh seconds={5} />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandMark className="size-11 shrink-0" />
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.035em] text-[var(--ink)]">Alove Giám sát</h1>
            <p className="text-sm text-[var(--muted)]">Cuộc gọi đặt vé — trực tiếp và lịch sử</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
          <RefreshCw size={13} aria-hidden /> Tự cập nhật mỗi 5 giây
        </span>
      </header>

      {callList !== null ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Đang diễn ra"
            value={activeCount}
            hint="cuộc gọi đang kết nối"
            live={activeCount > 0}
          />
          <StatTile label="Đã giữ vé" value={confirmedCount} hint="booking xác nhận thành công" />
          <StatTile label="Cuộc gọi gần đây" value={callList.length} hint="tối đa 50 cuộc mới nhất" />
        </div>
      ) : null}

      <Panel title="Cuộc gọi" eyebrow="Danh sách">
        {callList === null ? (
          <EmptyState
            title="Chưa cấu hình lưu trữ"
            description={
              <>
                Đặt biến môi trường <code className="font-mono text-[var(--ink)]">DATABASE_URL</code> (Neon Postgres) để
                ghi và hiển thị lịch sử cuộc gọi.
              </>
            }
          />
        ) : callList.length === 0 ? (
          <EmptyState
            title="Chưa có cuộc gọi nào"
            description="Khi khách gọi vào số PSTN hoặc mở web call, cuộc gọi sẽ hiện ở đây trong vài giây."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--divider)] text-left text-xs uppercase tracking-[0.06em] text-[var(--muted)]">
                  <th className="py-2.5 pr-4 font-medium">Cuộc gọi</th>
                  <th className="py-2.5 pr-4 font-medium">Kênh</th>
                  <th className="py-2.5 pr-4 font-medium">Bắt đầu</th>
                  <th className="py-2.5 pr-4 font-medium">Trạng thái</th>
                  <th className="py-2.5 pr-4 font-medium">Booking</th>
                  <th className="py-2.5 pr-4 font-medium">Mã vé</th>
                  <th className="py-2.5" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {callList.map((row) => (
                  <CallRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </main>
  )
}

function CallRow({ row }: { row: CallSummary }) {
  const startedAt = new Date(row.startedAt)
  return (
    <tr className="group relative border-b border-[var(--divider)] transition-colors last:border-0 hover:bg-[var(--pearl)]">
      <td className="whitespace-nowrap py-3 pr-4">
        {/* Stretched link: phủ cả hàng để click đâu cũng mở chi tiết. */}
        <Link
          href={`/dashboard/calls/${encodeURIComponent(row.id)}`}
          className="font-mono font-medium text-[var(--ink)] underline-offset-2 group-hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] after:absolute after:inset-0 after:content-['']"
        >
          {row.id}
        </Link>
      </td>
      <td className="whitespace-nowrap py-3 pr-4">
        <span className="inline-flex items-center gap-1.5 text-[var(--ink)]">
          {row.channel === 'phone' ? (
            <Phone size={14} className="text-[var(--muted)]" aria-hidden />
          ) : (
            <Globe size={14} className="text-[var(--muted)]" aria-hidden />
          )}
          {row.channel === 'phone' ? 'Điện thoại' : 'Web'}
        </span>
        {row.callerNumber ? <p className="mt-0.5 font-mono text-xs text-[var(--muted)]">{row.callerNumber}</p> : null}
      </td>
      <td className="whitespace-nowrap py-3 pr-4">
        <p className="tabular-nums text-[var(--ink)]">{startedAt.toLocaleTimeString('vi-VN')}</p>
        <p className="mt-0.5 text-xs tabular-nums text-[var(--muted)]">{startedAt.toLocaleDateString('vi-VN')}</p>
      </td>
      <td className="py-3 pr-4">
        <CallStatusBadge status={row.status} />
      </td>
      <td className="py-3 pr-4">
        {row.latestBooking ? <BookingStatusBadge status={row.latestBooking.status} /> : <span className="text-[var(--muted)]">—</span>}
      </td>
      <td className="py-3 pr-4 font-mono">
        {row.latestBooking?.bookingCode ?? <span className="text-[var(--muted)]">—</span>}
      </td>
      <td className="py-3 text-right">
        <ChevronRight size={16} className="inline text-[var(--muted)] transition-transform group-hover:translate-x-0.5" aria-hidden />
      </td>
    </tr>
  )
}

function StatTile({ label, value, hint, live }: { label: string; value: number; hint: string; live?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:p-5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
        {live ? <span className="size-1.5 animate-pulse rounded-full bg-[var(--success)]" aria-hidden /> : null}
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-semibold tracking-[-0.02em] text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-[var(--action-soft)] text-[var(--action)]">
        <PhoneCall size={20} aria-hidden />
      </span>
      <p className="font-medium text-[var(--ink)]">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  )
}

function Brand() {
  return (
    <BrandMark className="mx-auto size-12" />
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-panel)] sm:p-8">
        {children}
      </div>
    </main>
  )
}
