import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { BrandMark } from '@/components/ui/brand-mark'

export const metadata: Metadata = {
  title: 'What we built | Alove',
  description: 'Hồ sơ sản phẩm Alove: voice booking tiếng Việt từ cuộc gọi đến vé xe và vận hành nhà xe.',
}

export default function WhatWeBuiltPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#f5f1e8] text-slate-950">
      <header className="z-10 shrink-0 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            aria-label="Về trang chủ Alove"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg font-semibold tracking-[-0.02em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <BrandMark className="size-8" />
            <span className="hidden sm:inline">Alove</span>
          </Link>

          <div className="min-w-0 text-center">
            <p className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 sm:block">
              Vietnam AI Innovation Challenge
            </p>
            <h1 className="truncate text-sm font-semibold tracking-[-0.02em] sm:text-base">What we built</h1>
          </div>

          <Link
            href="/"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:px-4"
          >
            <ArrowLeft size={16} aria-hidden />
            <span className="hidden sm:inline">Trang chủ</span>
            <span className="sr-only sm:hidden">Trang chủ</span>
          </Link>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <iframe
          title="What we built — hồ sơ sản phẩm Alove"
          src="/what-we-built.html"
          referrerPolicy="no-referrer"
          className="block h-full w-full border-0 bg-[#f5f1e8]"
        />
      </main>
    </div>
  )
}
