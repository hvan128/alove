import type { ReactNode } from 'react'

export function MetricCard({
  label,
  value,
  note,
  icon,
}: {
  label: string
  value: string
  note: string
  icon?: ReactNode
}) {
  return (
    <article className="rounded-3xl border border-[var(--hairline)] bg-[var(--glass-surface)] p-5 shadow-[var(--metric-shadow)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">{label}</p>
        {icon ? <span className="text-[var(--subtle)]">{icon}</span> : null}
      </div>
      <p className="mt-6 text-4xl font-semibold tabular-nums tracking-[-0.05em]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{note}</p>
    </article>
  )
}
