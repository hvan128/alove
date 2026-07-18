import type { OperatorRole } from '@ordervoice/contracts'
import type { OperationsDashboardSnapshot } from '@/lib/operations/operations-repository'
import { RobotIcon, UserCircleIcon, WaveformIcon } from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'
import { canPerform } from '@/lib/auth/operator-permissions'
import { AcceptCallButton, DelegateAgentButton } from './call-actions'

type ActiveCall = OperationsDashboardSnapshot['activeCalls'][number]

export function ActiveCallList({ calls, role }: { calls: ActiveCall[]; role: OperatorRole }) {
  const canAccept = canPerform(role, 'call.accept')
  const canDelegate = canPerform(role, 'call.delegate')

  return (
    <section
      aria-labelledby="active-calls-title"
      className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--metric-shadow)] sm:p-6"
    >
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Đang diễn ra</p>
      <h2 id="active-calls-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Cuộc gọi trực tiếp</h2>

      {calls.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">Không có cuộc gọi nào đang diễn ra.</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {calls.map((call) => (
            <li
              key={call.sessionCode}
              aria-label={`Phiên ${call.sessionCode}`}
              className="rounded-2xl border border-transparent px-3 py-3 hover:border-[var(--divider)] hover:bg-[var(--pearl)]"
            >
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${call.delegation === 'agent' ? 'bg-[var(--action-soft)] text-[var(--action)]' : 'bg-[var(--success-soft)] text-[var(--success)]'}`}>
                  {call.delegation === 'agent' ? <RobotIcon size={20} aria-hidden /> : <UserCircleIcon size={20} aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/staff?session=${encodeURIComponent(call.sessionCode)}`}
                    aria-label={`Mở phiên ${call.sessionCode}`}
                    className="block font-semibold tracking-[-0.02em] hover:underline"
                  >
                    {call.sessionCode}
                  </Link>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
                    {/* Authority is stated in words, never by icon colour alone. */}
                    <span className="rounded-full bg-[var(--pearl)] px-2 py-0.5 font-medium text-[var(--ink)]">
                      {call.delegation === 'agent' ? 'Agent tự động' : 'Nhân viên trả lời'}
                    </span>
                    <span>{ownerLabel(call)}</span>
                    <span aria-hidden>·</span>
                    <span>{call.bookingState}</span>
                  </span>
                </span>
                <WaveformIcon size={18} className="shrink-0 text-[var(--success)]" aria-hidden />
              </div>

              {call.takeoverReason ? (
                <p className="mt-2 rounded-xl bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning)]">
                  Đã thu quyền · {call.takeoverReason}
                </p>
              ) : null}

              {/* An in-progress call nobody claimed is still claimable; otherwise
                  it could only be accepted while it sat in the queue. */}
              {canAccept && !call.ownerId ? (
                <div className="mt-2">
                  <AcceptCallButton sessionCode={call.sessionCode} />
                </div>
              ) : null}

              {canDelegate && call.ownerId ? (
                <div className="mt-2">
                  <DelegateAgentButton sessionCode={call.sessionCode} delegated={call.delegation === 'agent'} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ownerLabel(call: ActiveCall): string {
  // An unclaimed call says so. Printing a generic "Nhân viên" here used to make
  // an unowned session look staffed.
  if (!call.ownerId) return 'Chưa có người nhận'
  return call.ownerRole ? `${call.ownerId} · ${call.ownerRole}` : call.ownerId
}
