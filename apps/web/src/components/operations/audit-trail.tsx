import type { OperationsAuditEvent } from '@ordervoice/contracts'
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr'

const EVENT_LABELS: Record<OperationsAuditEvent['eventType'], string> = {
  'call.accepted': 'Nhận cuộc gọi',
  'call.reassigned': 'Chuyển giao',
  'call.released': 'Trả về hàng chờ',
  'agent.delegated': 'Trao quyền Agent',
  'call.takeover': 'Thu quyền về nhân viên',
}

export function AuditTrail({ events }: { events: OperationsAuditEvent[] }) {
  return (
    <section
      aria-labelledby="audit-trail-title"
      className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--metric-shadow)] sm:p-6"
    >
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Xuyên phiên</p>
      <h2 id="audit-trail-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
        Nhật ký vận hành
      </h2>

      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">Chưa có thao tác nào trong ca này.</p>
      ) : (
        <ul className="mt-5 space-y-1">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3 rounded-2xl px-3 py-3 hover:bg-[var(--pearl)]">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--pearl)] text-[var(--muted)]">
                <ClockCounterClockwiseIcon size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium tracking-[-0.01em]">{EVENT_LABELS[event.eventType]}</span>
                  <span className="text-sm text-[var(--muted)]">{event.sessionCode}</span>
                </span>
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  {event.actorId} · {event.actorRole} · {formatMoment(event.occurredAt)}
                </span>
                {event.reason ? (
                  <span className="mt-1 block text-sm text-[var(--ink)]">Lý do: {event.reason}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function formatMoment(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}
