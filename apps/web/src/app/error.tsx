'use client'

import { useEffect } from 'react'

/**
 * Không có ranh giới lỗi nào thì một lỗi render lẻ ở bất kỳ đâu cũng thay cả
 * trang bằng màn "Application error" trắng của Next, khách mất luôn đường quay
 * lại. Ranh giới này giữ khách ở trong sản phẩm và in lỗi thật ra console để
 * còn lần theo được.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[alove] render error', error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-[var(--ink)]">Màn hình gặp trục trặc</h1>
      <p className="text-sm text-[var(--muted)]">
        Vé đã đặt vẫn nằm trong hệ thống nhà xe. Gọi lại và đọc số điện thoại lúc đặt là tra được.
      </p>
      <p className="max-w-full break-words font-mono text-xs text-[var(--muted)]">
        {error.message}
        {error.digest ? ` · ${error.digest}` : ''}
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-11 items-center rounded-full bg-[var(--action)] px-5 text-sm font-medium text-[var(--on-action)]"
      >
        Thử lại
      </button>
    </main>
  )
}
