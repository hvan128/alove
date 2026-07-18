import type { OperatorRole } from '@ordervoice/contracts'
import type { OperationsDashboardSnapshot } from '@/lib/operations/operations-repository'
import { ClockIcon, UsersIcon } from '@phosphor-icons/react/dist/ssr'
import { canPerform } from '@/lib/auth/operator-permissions'
import { AcceptCallButton } from './call-actions'

export function CallQueue({
  queue,
  role,
  filtered,
}: {
  queue: OperationsDashboardSnapshot['queue']
  role: OperatorRole
  filtered: boolean
}) {
  const canAccept = canPerform(role, 'call.accept')

  return (
    <section
      id="calls"
      aria-labelledby="call-queue-title"
      className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--metric-shadow)] sm:p-6"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Ưu tiên tức thời</p>
          <h2 id="call-queue-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Hàng chờ cuộc gọi</h2>
        </div>
        <span className="rounded-full bg-[var(--action-soft)] px-3 py-1 text-xs font-semibold text-[var(--action)]">
          {queue.length} đang chờ
        </span>
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
            {canAccept ? <AcceptCallButton sessionCode={call.sessionCode} /> : null}
          </article>
        ))}
        {queue.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            {filtered ? 'Không có cuộc gọi nào khớp bộ lọc.' : 'Không có khách đang chờ.'}
          </p>
        ) : null}
      </div>
    </section>
  )
}

function formatWait(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const rest = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${rest}`
}
