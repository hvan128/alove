'use client'

import { Component, type ReactNode } from 'react'
import type { BookingSnapshot } from '@/lib/call-contract'

type Props = { booking: BookingSnapshot; onClose: () => void; children: ReactNode }
type State = { message: string | null }

/**
 * Vé là thứ khách phải cầm về được. Nếu khâu vẽ tờ vé hỏng — font, mask, thư
 * viện QR, một trường thiếu — mà không chặn lại thì cả app trắng đúng giây chốt
 * vé, dù vé đã nằm trong hệ thống nhà xe. Ranh giới này vẫn đọc mã vé và ghế ra
 * từ chính snapshot đang có, đồng thời giữ lỗi thật để lần sau còn truy được.
 */
export class TicketBoundary extends Component<Props, State> {
  state: State = { message: null }

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(error: unknown): void {
    console.error('[alove] ticket render error', error, this.props.booking)
  }

  render(): ReactNode {
    const { message } = this.state
    if (!message) return this.props.children

    const { booking, onClose } = this.props
    return (
      <section aria-label="Vé của bạn" className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
        <h2 className="text-xl font-semibold text-[var(--ink)]">Vé đã được giữ</h2>
        <p className="text-sm text-[var(--muted)]">Không vẽ được tờ vé, nhưng vé đã nằm trong hệ thống nhà xe.</p>
        <dl className="w-full space-y-1 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 text-left text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--muted)]">Mã vé</dt>
            <dd className="font-mono font-bold text-[var(--ink)]">{booking.bookingCode ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--muted)]">Ghế</dt>
            <dd className="text-[var(--ink)]">{booking.seats.length > 0 ? booking.seats.join(', ') : '—'}</dd>
          </div>
        </dl>
        <p className="max-w-full break-words font-mono text-xs text-[var(--muted)]">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 items-center rounded-full bg-[var(--action)] px-5 text-sm font-medium text-[var(--on-action)]"
        >
          Đóng
        </button>
      </section>
    )
  }
}
