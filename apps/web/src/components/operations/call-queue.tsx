import type { OperationsDashboardSnapshot } from '@/lib/operations/operations-repository'
import { ArrowUpRightIcon, ClockIcon, UsersIcon } from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'

export function CallQueue({ queue }: { queue: OperationsDashboardSnapshot['queue'] }) {
  return (
    <section id="calls" aria-labelledby="call-queue-title" className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--metric-shadow)] sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Ưu tiên tức thời</p>
          <h2 id="call-queue-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Hàng chờ cuộc gọi</h2>
        </div>
        <span className="rounded-full bg-[var(--action-soft)] px-3 py-1 text-xs font-semibold text-[var(--action)]">{queue.length} đang chờ</span>
      </div>

      <div className="mt-5 divide-y divide-[var(--divider)]">
        {queue.map((call) => (
          <article key={call.sessionCode} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold tracking-[-0.02em]">{call.sessionCode}</p>
                <span className="inline-flex items-center gap-1 text-xs text-[var(--danger)]">
                  <ClockIcon size={14} aria-hidden /> {formatWait(call.waitSeconds)}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-[var(--muted)]">{call.routeLabel}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--subtle)]">
                <UsersIcon size={14} aria-hidden />
                {call.passengerCount === null ? 'Chưa rõ số khách' : `${call.passengerCount} hành khách`}
              </p>
            </div>
            <Link
              href={`/staff?session=${encodeURIComponent(call.sessionCode)}`}
              aria-label={`Nhận cuộc gọi ${call.sessionCode}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-4 text-sm font-medium text-[var(--on-ink)] transition-transform hover:-translate-y-0.5"
            >
              Nhận cuộc gọi <ArrowUpRightIcon size={16} aria-hidden />
            </Link>
          </article>
        ))}
        {queue.length === 0 ? <p className="py-8 text-center text-sm text-[var(--muted)]">Không có khách đang chờ.</p> : null}
      </div>
    </section>
  )
}

function formatWait(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const rest = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${rest}`
}
