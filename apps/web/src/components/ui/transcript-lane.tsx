import type { TranscriptSegment } from '@ordervoice/contracts'
import { cn } from '@/lib/cn'
import { StatusPill } from './status'

export function TranscriptLane({ segment }: { segment: TranscriptSegment }) {
  const provisional = segment.kind === 'partial'
  const speaker = segment.speaker === 'caller' ? 'Khách hàng' : segment.speaker === 'agent' ? 'Trợ lý' : 'Không xác định'

  return (
    <article className={cn('rounded-xl border p-3', provisional ? 'border-dashed border-[var(--hairline)] bg-[var(--pearl)]' : 'border-[var(--hairline)] bg-white')}>
      <header className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--ink)]">{speaker}</span>
        <StatusPill tone={provisional ? 'warning' : 'success'}>{provisional ? 'Tạm thời' : 'Đã chốt'}</StatusPill>
      </header>
      <p className={cn('mt-2 text-sm leading-6 text-[var(--ink)]', provisional && 'text-[var(--muted)]')}>{segment.text}</p>
      <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">{(segment.startedAtMs / 1000).toFixed(1)}–{(segment.endedAtMs / 1000).toFixed(1)}s · {segment.source}</p>
    </article>
  )
}
