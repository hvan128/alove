import type { OperationsDashboardSnapshot } from '@/lib/operations/operations-repository'
import { RobotIcon, UserCircleIcon, WaveformIcon } from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'

export function ActiveCallList({ calls }: { calls: OperationsDashboardSnapshot['activeCalls'] }) {
  return (
    <section aria-labelledby="active-calls-title" className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--metric-shadow)] sm:p-6">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Đang diễn ra</p>
      <h2 id="active-calls-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Cuộc gọi trực tiếp</h2>
      <div className="mt-5 space-y-2">
        {calls.map((call) => {
          const isAuto = call.authority === 'auto'
          return (
            <Link
              key={call.sessionCode}
              href={`/staff?session=${encodeURIComponent(call.sessionCode)}`}
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-transparent px-3 py-2 transition-colors hover:border-[var(--divider)] hover:bg-[var(--pearl)]"
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${isAuto ? 'bg-[var(--action-soft)] text-[var(--action)]' : 'bg-[var(--success-soft)] text-[var(--success)]'}`}>
                {isAuto ? <RobotIcon size={20} aria-hidden /> : <UserCircleIcon size={20} aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold tracking-[-0.02em]">{call.sessionCode}</span>
                <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                  {isAuto ? `Agent tự động · ${call.bookingState}` : `${call.ownerId ?? 'Nhân viên'} · ${call.bookingState}`}
                </span>
              </span>
              <WaveformIcon size={18} className="text-[var(--success)]" aria-hidden />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
