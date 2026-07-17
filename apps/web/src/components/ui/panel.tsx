import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type PanelProps = {
  title?: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, eyebrow, action, children, className }: PanelProps) {
  return (
    <section className={cn('rounded-[18px] border border-[var(--hairline)] bg-white', className)}>
      {title || eyebrow || action ? (
        <header className="flex items-start justify-between gap-4 border-b border-[var(--divider)] px-5 py-4">
          <div>
            {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{eyebrow}</p> : null}
            {title ? <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-[var(--ink)]">{title}</h2> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  )
}
