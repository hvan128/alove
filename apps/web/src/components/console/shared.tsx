import { InfoIcon, WarningCircleIcon, XCircleIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Callout({ tone, title, children }: { tone: 'info' | 'warning' | 'danger'; title: string; children: ReactNode }) {
  const Icon = tone === 'warning' ? WarningCircleIcon : tone === 'danger' ? XCircleIcon : InfoIcon
  return <div className={cn('rounded-xl border p-3 text-sm leading-5', tone === 'warning' && 'border-[color-mix(in_srgb,var(--warning),white_55%)] bg-[color-mix(in_srgb,var(--warning),white_91%)]', tone === 'danger' && 'border-[color-mix(in_srgb,var(--danger),white_55%)] bg-[color-mix(in_srgb,var(--danger),white_92%)]', tone === 'info' && 'border-[color-mix(in_srgb,var(--action),white_70%)] bg-[var(--action-soft)]')}><div className="flex gap-2"><Icon size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold text-[var(--ink)]">{title}</p><div className="mt-1 text-[var(--muted)]">{children}</div></div></div></div>
}
