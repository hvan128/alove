import { cn } from '@/lib/cn'

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'demo'

const toneClass: Record<StatusTone, string> = {
  neutral: 'bg-[#8e8e93]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
  info: 'bg-[var(--action)]',
  demo: 'bg-[var(--violet)]',
}

export function StatusDot({ tone = 'neutral', label }: { tone?: StatusTone; label: string }) {
  return <span className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><span aria-hidden className={cn('h-2 w-2 rounded-full', toneClass[tone])} />{label}</span>
}

export function StatusPill({ tone = 'neutral', children }: { tone?: StatusTone; children: string }) {
  return <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--pearl)] px-2.5 text-xs font-medium text-[var(--ink)]"><span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', toneClass[tone])} />{children}</span>
}
