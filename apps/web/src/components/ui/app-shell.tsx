import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandMark } from '@/components/ui/brand-mark'
import { cn } from '@/lib/cn'

export function AppShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-h-screen bg-[var(--canvas)] text-[var(--ink)]', className)}>
      <header className="sticky top-0 z-20 border-b border-[var(--divider)] bg-[color-mix(in_srgb,var(--canvas)_84%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold tracking-[-0.02em] focus-visible:outline-2 focus-visible:outline-[var(--action-focus)]">
            <BrandMark />
            Alove
          </Link>
          <nav aria-label="Điều hướng chính" className="flex items-center gap-1 text-sm">
            <Link className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-[var(--muted)] transition hover:bg-[var(--action-soft)] hover:text-[var(--action)]" href="/console">Web Call</Link>
            <Link className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-[var(--muted)] transition hover:bg-[var(--action-soft)] hover:text-[var(--action)]" href="/engine">Lõi giọng nói</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
