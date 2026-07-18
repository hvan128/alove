import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Globe, MessageCircle, Phone } from 'lucide-react'
import { bookingDraftSchema } from '@ordervoice/contracts'

import { BookingSummary } from '@/components/bus-call/booking-summary'
import { AutoRefresh } from '@/components/dashboard/auto-refresh'
import { LiveCallMonitor } from '@/components/dashboard/live-call-monitor'
import { CallStatusBadge } from '@/components/dashboard/status-badge'
import { TranscriptBubbles } from '@/components/dashboard/transcript-bubbles'
import { Panel } from '@/components/ui/panel'
import { cn } from '@/lib/cn'
import { dashboardAccessKey, hasDashboardCookie } from '@/lib/dashboard-auth'
import { getCallDetail } from '@/lib/db/dashboard-store'

export const dynamic = 'force-dynamic'

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ callId: string }>
}) {
  if (!dashboardAccessKey() || !(await hasDashboardCookie())) {
    // Same closed-by-default gate as the list page; send them to the login form.
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-panel)] sm:p-8">
          <h1 className="text-lg font-semibold tracking-[-0.025em] text-[var(--ink)]">Cần đăng nhập</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Trang chi tiết cuộc gọi yêu cầu khóa truy cập dashboard.</p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--action)] px-4 text-sm font-medium text-[var(--on-action)] transition hover:bg-[var(--action-hover)]"
          >
            Về trang đăng nhập
          </Link>
        </div>
      </main>
    )
  }

  const { callId } = await params
  const detail = await getCallDetail(decodeURIComponent(callId))
  if (!detail) notFound()

  const { call, turns, latestSnapshot } = detail
  const parsedBooking = latestSnapshot ? bookingDraftSchema.safeParse(latestSnapshot.snapshot) : null
  const isActive = call.status === 'active'
  const channelLabel = call.channel === 'phone' ? 'Điện thoại' : 'Web call'

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      {isActive ? <AutoRefresh seconds={5} /> : null}

      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
        >
          <ArrowLeft size={15} aria-hidden /> Danh sách cuộc gọi
        </Link>
        <div className="mt-3 flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--action-soft)] text-[var(--action)]">
            {call.channel === 'phone' ? <Phone size={20} aria-hidden /> : <Globe size={20} aria-hidden />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate font-mono text-lg font-semibold text-[var(--ink)] sm:text-xl">{call.id}</h1>
              <CallStatusBadge status={call.status} />
            </div>
            <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
              {channelLabel}
              {call.callerNumber ? ` · ${call.callerNumber}` : ''} · bắt đầu {formatDateTime(call.startedAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {isActive ? (
            <Panel title="Trực tiếp" eyebrow="Realtime">
              <LiveCallMonitor conversationId={call.id} />
            </Panel>
          ) : null}

          <Panel
            title={isActive ? 'Transcript đã lưu' : 'Transcript'}
            eyebrow={isActive ? 'Lịch sử đầy đủ · cập nhật mỗi 5 giây' : `${turns.length} lượt hội thoại`}
          >
            {turns.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-[var(--action-soft)] text-[var(--action)]">
                  <MessageCircle size={20} aria-hidden />
                </span>
                <p className="font-medium text-[var(--ink)]">Chưa có lượt hội thoại nào được lưu</p>
                <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--muted)]">
                  Mỗi lượt khách nói và agent trả lời sẽ được ghi lại tại đây.
                </p>
              </div>
            ) : (
              <TranscriptBubbles turns={turns} label="Transcript đã lưu" />
            )}
          </Panel>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          {parsedBooking?.success ? (
            <BookingSummary booking={parsedBooking.data} />
          ) : (
            <Panel title="Booking">
              <p className="text-sm text-[var(--muted)]">
                {latestSnapshot ? `Trạng thái: ${latestSnapshot.status}` : 'Chưa có snapshot booking.'}
              </p>
            </Panel>
          )}

          <Panel title="Thông tin cuộc gọi">
            <dl className="divide-y divide-[var(--divider)]">
              <Fact label="Kênh" value={channelLabel} />
              {call.callerNumber ? <Fact label="Số gọi đến" value={call.callerNumber} mono /> : null}
              <Fact label="Bắt đầu" value={formatDateTime(call.startedAt)} />
              <Fact label="Kết thúc" value={call.endedAt ? formatDateTime(call.endedAt) : 'Đang diễn ra'} />
              <Fact label="Thời lượng" value={formatDuration(call.startedAt, call.endedAt)} mono />
              <Fact label="Lượt hội thoại" value={String(turns.length)} />
            </dl>
          </Panel>
        </aside>
      </div>
    </main>
  )
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-sm text-[var(--muted)]">{label}</dt>
      <dd className={cn('text-right text-sm font-medium text-[var(--ink)]', mono && 'font-mono tabular-nums')}>{value}</dd>
    </div>
  )
}

function formatDateTime(value: Date | string): string {
  return new Date(value).toLocaleString('vi-VN')
}

function formatDuration(start: Date | string, end: Date | string | null): string {
  const endMs = end ? new Date(end).getTime() : Date.now()
  const totalSec = Math.max(0, Math.floor((endMs - new Date(start).getTime()) / 1000))
  const hours = Math.floor(totalSec / 3600)
  const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSec % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`
}
