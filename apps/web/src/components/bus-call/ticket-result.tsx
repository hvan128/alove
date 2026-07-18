'use client'

import { useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { toPng } from 'html-to-image'
import { Check, Copy, Download, PhoneCall, X } from 'lucide-react'
import type { BookingSnapshot } from '@/lib/call-contract'
import { Button } from '@/components/ui/button'
import { TicketCard } from './ticket-card'

type SaveState = 'idle' | 'saving' | 'saved' | 'copied'

type TicketResultProps = {
  booking: BookingSnapshot
  /** Mở cuộc gọi mới ngay trong overlay/console. */
  onNewCall: () => void
  /** Đóng màn vé: overlay morph về nút, /console quay lại sân khấu. */
  onClose: () => void
  /** Landing preview keeps the real layout but disables actions with side effects. */
  interactive?: boolean
}

/**
 * Màn kết sau khi chốt vé: vé in nhiệt + QR + lối ra rõ ràng. Đây là "cái khách
 * cầm về" — không có nó, agent cúp máy xong phiếu vé chỉ đứng im trên màn gọi.
 */
export function TicketResult({ booking, onNewCall, onClose, interactive = true }: TicketResultProps) {
  const ticketRef = useRef<HTMLDivElement | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const saveTicket = async () => {
    if (saveState === 'saving') return
    setSaveState('saving')
    try {
      const node = ticketRef.current
      if (!node) throw new Error('ticket node missing')
      const dataUrl = await toPng(node, { pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = `ve-${booking.bookingCode ?? 'alove'}.png`
      link.href = dataUrl
      link.click()
      setSaveState('saved')
    } catch {
      // html-to-image có thể vấp filter/màu hiếm gặp của tờ vé — không để khách
      // trắng tay: đưa mã vé vào clipboard thay cho tấm ảnh.
      try {
        await navigator.clipboard.writeText(booking.bookingCode ?? '')
        setSaveState('copied')
      } catch {
        setSaveState('idle')
      }
    }
  }

  return (
    <section aria-label="Vé của bạn" className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-start gap-4 py-4 sm:justify-center sm:gap-6 sm:py-6">
      <header className="text-center">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">Vé của bạn</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Vé đã nằm trong hệ thống nhà xe — tổng đài vừa đọc đúng mã bên dưới.
        </p>
      </header>

      <div className="grid w-full items-start gap-4 sm:grid-cols-[minmax(0,1fr)_200px] sm:gap-5">
        <div ref={ticketRef}>
          <TicketCard booking={booking} />
        </div>

        <aside className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-4 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 text-left sm:block sm:text-center">
          <p className="col-start-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Mã lên xe</p>
          <div className="row-span-3 row-start-1 w-full rounded-lg bg-white p-2 sm:mx-auto sm:mt-3 sm:w-fit sm:p-2.5">
            <QRCode
              value={booking.bookingCode ?? booking.id}
              size={128}
              className="h-auto w-full sm:size-32"
              aria-label={`Mã QR vé ${booking.bookingCode ?? ''}`}
            />
          </div>
          <p className="col-start-2 mt-1 font-mono text-xs font-bold tracking-[0.08em] text-[var(--ink)] sm:mt-2 sm:text-sm sm:tracking-[0.12em]">{booking.bookingCode}</p>
          <p className="col-start-2 mt-2 text-xs leading-5 text-[var(--muted)] sm:mt-3">
            Cần đổi hoặc huỷ? Gọi lại và đọc số điện thoại lúc đặt là được.
          </p>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => void saveTicket()} disabled={!interactive || saveState === 'saving'}>
          {saveState === 'saved' ? <Check size={17} aria-hidden /> : saveState === 'copied' ? <Copy size={17} aria-hidden /> : <Download size={17} aria-hidden />}
          {saveState === 'saved' ? 'Đã lưu vé' : saveState === 'copied' ? 'Đã chép mã vé' : 'Lưu vé về máy'}
        </Button>
        <Button variant="secondary" onClick={onNewCall} disabled={!interactive}>
          <PhoneCall size={17} aria-hidden /> Đặt chuyến khác
        </Button>
        <Button variant="quiet" onClick={onClose} disabled={!interactive}>
          <X size={17} aria-hidden /> Đóng
        </Button>
      </div>
    </section>
  )
}
