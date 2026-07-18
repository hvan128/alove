import { BusIcon, GaugeIcon, SquaresFourIcon } from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function AppShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-h-screen bg-[var(--canvas)] text-[var(--ink)]', className)}>
      <header className="sticky top-0 z-20 border-b border-[var(--divider)] bg-[color-mix(in_srgb,var(--canvas)_84%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold tracking-[-0.02em] focus-visible:outline-2 focus-visible:outline-[var(--action-focus)]">
            <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-[var(--ink)] text-[var(--on-ink)]"><BusIcon size={16} weight="fill" aria-hidden /></span>
            VéĐi
          </Link>
          <nav aria-label="Điều hướng chính" className="flex items-center gap-1 text-sm">
            <Link className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 py-2 text-[var(--muted)] transition hover:bg-[var(--action-soft)] hover:text-[var(--action)]" href="/operations"><GaugeIcon size={15} aria-hidden /> Vận hành</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-[var(--muted)] transition hover:bg-[var(--action-soft)] hover:text-[var(--action)]" href="/staff">Nhân viên</Link>
            <Link className="hidden min-h-11 items-center rounded-full px-3 py-2 text-[var(--muted)] transition hover:bg-[var(--action-soft)] hover:text-[var(--action)] sm:inline-flex" href="/call">Gọi thử</Link>
            <Link className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 py-2 text-[var(--muted)] transition hover:bg-[var(--action-soft)] hover:text-[var(--action)]" href="/design-system"><SquaresFourIcon size={15} aria-hidden /> Hệ thống</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
