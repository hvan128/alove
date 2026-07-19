'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

/**
 * `error.tsx` sits inside the root layout, so a failure in the layout itself —
 * a font load, a provider, the shell — escapes it and lands on Next's blank
 * "Application error" screen. This boundary replaces the layout wholesale,
 * which is why it has to ship its own `<html>` and plain inline styles: the
 * stylesheet is exactly one of the things that may have failed.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fff', color: '#111' }}>
        <main
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Trang đang gặp trục trặc</h1>
          <p style={{ fontSize: 14, color: '#666', margin: 0, maxWidth: 420 }}>
            Vé đã đặt vẫn nằm trong hệ thống nhà xe. Gọi lại và đọc số điện thoại lúc đặt là tra được.
          </p>
          {error.digest ? (
            <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#999', margin: 0 }}>{error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              minHeight: 44,
              padding: '0 20px',
              borderRadius: 999,
              border: 0,
              background: '#111',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Tải lại trang
          </button>
        </main>
      </body>
    </html>
  )
}
