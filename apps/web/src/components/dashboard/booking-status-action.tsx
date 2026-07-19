'use client'

import { Check, LoaderCircle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { BookingRecordStatusBadge } from '@/components/dashboard/status-badge'

type BookingRecordStatus = 'pending_payment' | 'paid' | 'cancelled'

export function BookingStatusAction({
  bookingId,
  callId,
  status,
}: {
  bookingId: number
  callId: string
  status: BookingRecordStatus
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pendingAction, setPendingAction] = useState<'pay' | 'cancel' | null>(null)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function updateStatus(action: 'pay' | 'cancel') {
    setMessage('')
    setPendingAction(action)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard/bookings/${bookingId}/${action}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ callId }),
        })
        if (!response.ok) throw new Error('booking_cancel_failed')
        setConfirming(false)
        router.refresh()
      } catch {
        setMessage(action === 'pay'
          ? 'Không xác nhận được thanh toán. Tải lại và thử lại.'
          : 'Không huỷ được. Tải lại và thử lại.')
      } finally {
        setPendingAction(null)
      }
    })
  }

  return (
    <div className="flex min-w-52 flex-col items-start gap-1.5">
      <div className="flex min-h-9 items-center gap-2">
        <BookingRecordStatusBadge status={status} />
        {status === 'pending_payment' && !confirming ? (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => updateStatus('pay')}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-2.5 text-metric font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)] disabled:cursor-wait disabled:opacity-60"
            >
              {isPending && pendingAction === 'pay' ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <Check size={14} aria-hidden />}
              Xác nhận thanh toán
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirming(true)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-metric font-medium text-[var(--danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface))] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--danger)_25%,transparent)] disabled:opacity-60"
            >
              <X size={14} aria-hidden /> Huỷ vé
            </button>
          </>
        ) : null}
        {status === 'paid' ? <span className="text-metric text-[var(--muted)]">Cần xử lý hoàn tiền</span> : null}
      </div>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Xác nhận huỷ vé">
          <span className="text-metric text-[var(--muted)]">Ghế sẽ được trả về kho.</span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => updateStatus('cancel')}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--danger)] px-2.5 text-metric font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--danger)_28%,transparent)] disabled:cursor-wait disabled:opacity-60"
          >
            {isPending && pendingAction === 'cancel' ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : null}
            Xác nhận huỷ
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirming(false)}
            className="min-h-9 rounded-lg px-2.5 text-metric font-medium text-[var(--muted)] transition-colors hover:bg-[var(--pearl)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--ring)_25%,transparent)] disabled:opacity-60"
          >
            Giữ vé
          </button>
        </div>
      ) : null}

      <p role="status" aria-live="polite" className="text-metric text-[var(--danger)]">{message}</p>
    </div>
  )
}
