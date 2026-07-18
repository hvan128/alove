'use client'

import { Loader2, TicketCheck } from 'lucide-react'
import { useState } from 'react'
import type { CustomerTicket } from '@/lib/db/booking-store'
import { TicketCard } from '@/components/bus-call/ticket-card'
import { ticketShareText, ticketViewFromCustomerTicket } from '@/components/bus-call/ticket-view'
import { ShareTicketButton } from './share-ticket-button'

/**
 * Vé của khách sau cuộc gọi.
 *
 * Khách gọi qua điện thoại không có màn hình nào trong lúc đặt, nên tổng đài viên
 * đọc mã vé rồi khách tự mở trang này. Bốn số cuối điện thoại là thứ duy nhất
 * ngăn người lạ dò tuần tự mã vé — xem `findTicketForCustomer`.
 */

const MESSAGES: Record<string, string> = {
  not_found: 'Không tìm thấy vé khớp với mã và số điện thoại này. Kiểm tra lại giúp em nhé.',
  too_many_attempts: 'Bạn đã thử quá nhiều lần. Đợi một phút rồi thử lại giúp em.',
  invalid_request: 'Mã vé hoặc 4 số cuối chưa đúng định dạng.',
  lookup_unavailable: 'Hệ thống vé đang bận. Thử lại sau ít phút giúp em nhé.',
}

export function TicketLookup({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode)
  const [last4, setLast4] = useState('')
  const [ticket, setTicket] = useState<CustomerTicket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    setTicket(null)
    try {
      const res = await fetch('/api/ticket/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), phoneLast4: last4.trim() }),
      })
      const body = (await res.json().catch(() => ({}))) as { ticket?: CustomerTicket; error?: string }
      if (!res.ok || !body.ticket) {
        setError(MESSAGES[body.error ?? ''] ?? 'Không tra cứu được vé. Thử lại sau giúp em nhé.')
        return
      }
      setTicket(body.ticket)
    } catch {
      setError('Không kết nối được. Kiểm tra mạng rồi thử lại giúp em.')
    } finally {
      setPending(false)
    }
  }

  if (ticket) {
    const view = ticketViewFromCustomerTicket(ticket)
    return (
      <div className="mx-auto grid max-w-md gap-4">
        <TicketCard view={view} />
        <ShareTicketButton
          title={`Vé xe Alove ${ticket.code}`}
          text={ticketShareText(view, shareUrl(ticket.code))}
        />
        <button
          type="button"
          onClick={() => { setTicket(null); setLast4('') }}
          className="min-h-11 text-sm font-medium text-[var(--muted)] underline underline-offset-4 transition hover:text-[var(--ink)]"
        >
          Tra cứu vé khác
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto grid max-w-md gap-4 rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-6 shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-2.5">
        <TicketCheck size={22} className="text-[var(--action)]" aria-hidden />
        <h1 className="text-lg font-semibold tracking-[-0.025em]">Tra cứu vé của bạn</h1>
      </div>
      <p className="text-sm leading-6 text-[var(--muted)]">
        Nhập mã vé tổng đài đã đọc cho bạn, kèm 4 số cuối của số điện thoại đã đặt vé.
      </p>

      <label className="grid gap-1.5">
        <span className="text-[11px] font-medium text-[var(--muted)]">Mã vé</span>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="VD-260725-0042"
          autoComplete="off"
          spellCheck={false}
          required
          className="min-h-11 rounded-xl border border-[var(--hairline)] bg-[var(--canvas)] px-3.5 font-mono text-sm tracking-[0.06em] outline-none focus-visible:border-[var(--action)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--action-focus)]"
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-[11px] font-medium text-[var(--muted)]">4 số cuối điện thoại</span>
        <input
          value={last4}
          // Chặn ký tự không phải số ngay khi gõ, tránh để người dùng bấm gửi rồi mới báo lỗi.
          onChange={(event) => setLast4(event.target.value.replace(/\D/gu, '').slice(0, 4))}
          inputMode="numeric"
          placeholder="3456"
          autoComplete="off"
          required
          className="min-h-11 w-32 rounded-xl border border-[var(--hairline)] bg-[var(--canvas)] px-3.5 font-mono text-sm tracking-[0.24em] tabular-nums outline-none focus-visible:border-[var(--action)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--action-focus)]"
        />
      </label>

      {error ? (
        <p role="alert" className="rounded-xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3.5 py-2.5 text-sm leading-6 text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || last4.length !== 4 || code.trim().length === 0}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--action)] px-5 py-2 text-sm font-medium text-[var(--on-action)] transition hover:bg-[var(--action-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : null}
        {pending ? 'Đang tra cứu…' : 'Xem vé'}
      </button>
    </form>
  )
}

/** Link chia sẻ điền sẵn mã vé; người nhận vẫn phải có 4 số cuối mới mở được. */
function shareUrl(code: string): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/ve?code=${encodeURIComponent(code)}`
}
