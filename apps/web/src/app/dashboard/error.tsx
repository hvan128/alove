'use client'

import { useEffect } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'

/**
 * Không có ranh giới lỗi thì một cú Neon timeout sẽ nuốt cả trang — người trực
 * ca không phân biệt được "đêm yên ắng" với "màn hình đã chết".
 */
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[dashboard] không tải được số liệu', error)
  }, [error])

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6">
      <div className="flex flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-[var(--hairline)] bg-[var(--surface)] px-6 py-12 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface))] text-[var(--danger)]">
          <TriangleAlert size={18} aria-hidden />
        </span>
        <p className="text-ui font-medium text-[var(--ink)]">Không tải được số liệu</p>
        <p className="max-w-md text-metric leading-5 text-[var(--muted)]">
          Kết nối tới kho dữ liệu đang lỗi hoặc quá hạn chờ. Số trên màn hình có thể đã cũ — thử tải lại trước khi tin
          vào nó.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--action)] px-5 text-ui font-medium text-[var(--on-action)] transition hover:bg-[var(--action-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] active:scale-[0.98]"
        >
          <RotateCcw size={16} aria-hidden /> Tải lại số liệu
        </button>
      </div>
    </main>
  )
}
