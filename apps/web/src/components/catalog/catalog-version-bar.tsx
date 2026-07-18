import type { CatalogStatus } from './types'

const statusLabels: Record<CatalogStatus, string> = {
  draft: 'Draft',
  validated: 'Validated',
  published: 'Published',
  retired: 'Retired',
}

export function CatalogVersionBar({
  version,
  revision,
  status,
  issueCount,
}: {
  version: number
  revision: number
  status: CatalogStatus
  issueCount: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="rounded-full bg-[var(--ink)] px-3 py-1.5 font-semibold text-[var(--on-ink)]">v{version}</span>
      <span className="rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-3 py-1.5 text-[var(--muted)]">Revision {revision}</span>
      <span className={`rounded-full px-3 py-1.5 font-semibold ${statusClass(status)}`}>{statusLabels[status]}</span>
      <span className="text-[var(--muted)]">{issueCount === 0 ? 'Không có lỗi blocking' : `${issueCount} lỗi blocking`}</span>
    </div>
  )
}

function statusClass(status: CatalogStatus): string {
  if (status === 'published') return 'bg-[var(--success-soft)] text-[var(--success)]'
  if (status === 'validated') return 'bg-[var(--action-soft)] text-[var(--action)]'
  if (status === 'retired') return 'bg-[var(--divider)] text-[var(--muted)]'
  return 'bg-[var(--warning-soft)] text-[var(--warning)]'
}
