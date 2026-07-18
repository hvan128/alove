import { cn } from '@/lib/cn'

export function CallStatusBadge({ status }: { status: 'active' | 'ended' }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[color-mix(in_srgb,var(--success)_12%,var(--surface))] px-2.5 py-1 text-xs font-semibold text-[var(--success)]">
        <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden /> Đang diễn ra
      </span>
    )
  }
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[var(--pearl)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
      Đã kết thúc
    </span>
  )
}

const BOOKING_BADGE: Record<string, { label: string; className: string }> = {
  collecting: { label: 'Đang thu thập', className: 'bg-[var(--pearl)] text-[var(--muted)]' },
  trip_proposed: { label: 'Đã đề xuất chuyến', className: 'bg-[var(--action-soft)] text-[var(--action)]' },
  awaiting_confirmation: {
    label: 'Chờ xác nhận',
    className: 'bg-[color-mix(in_srgb,var(--warning)_16%,var(--surface))] text-[var(--warning)]',
  },
  confirmed: {
    label: 'Đã giữ vé',
    className: 'bg-[color-mix(in_srgb,var(--success)_12%,var(--surface))] text-[var(--success)]',
  },
}

export function BookingStatusBadge({ status }: { status: string }) {
  const badge = BOOKING_BADGE[status]
  if (!badge) return <span className="text-sm text-[var(--muted)]">{status}</span>
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium', badge.className)}>
      {badge.label}
    </span>
  )
}
