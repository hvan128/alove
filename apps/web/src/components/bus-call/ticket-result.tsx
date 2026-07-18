'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import QRCode from 'react-qr-code'
import { toPng } from 'html-to-image'
import { Check, Copy, Download, FileJson, Link as LinkIcon, PhoneCall, X } from 'lucide-react'
import { serializeBookingSnapshot, type BookingSnapshot } from '@/lib/call-contract'
import { Button } from '@/components/ui/button'
import { TicketCard } from './ticket-card'

type PngState = 'idle' | 'saving' | 'saved' | 'copied'
type JsonState = 'idle' | 'saving' | 'saved' | 'error'
type CopyState = 'idle' | 'copied' | 'error'

function safeFilenameCode(value: string | null): string {
  return (value ?? 'alove').replace(/[^a-z0-9_-]/giu, '_').slice(0, 64)
}

function subscribeToOrigin(): () => void {
  return () => undefined
}

function verificationUrlFor(origin: string | null, booking: BookingSnapshot): string | null {
  if (!origin || booking.status !== 'confirmed' || !booking.bookingCode) return null
  const url = new URL('/verify', origin)
  url.searchParams.set('code', booking.bookingCode)
  return url.toString()
}

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
  const [pngState, setPngState] = useState<PngState>('idle')
  const [jsonState, setJsonState] = useState<JsonState>('idle')
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const browserOrigin = useSyncExternalStore(
    subscribeToOrigin,
    () => window.location.origin,
    () => null,
  )
  const verificationUrl = verificationUrlFor(browserOrigin, booking)

  const saveTicket = async () => {
    if (pngState === 'saving') return
    setPngState('saving')
    try {
      const node = ticketRef.current
      if (!node) throw new Error('ticket node missing')
      const dataUrl = await toPng(node, { pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = `ve-${safeFilenameCode(booking.bookingCode)}.png`
      link.href = dataUrl
      link.click()
      setPngState('saved')
    } catch {
      // html-to-image có thể vấp filter/màu hiếm gặp của tờ vé — không để khách
      // trắng tay: đưa mã vé vào clipboard thay cho tấm ảnh.
      try {
        await navigator.clipboard.writeText(booking.bookingCode ?? '')
        setPngState('copied')
      } catch {
        setPngState('idle')
      }
    }
  }

  const saveJson = () => {
    if (jsonState === 'saving') return
    setJsonState('saving')
    try {
      const blob = new Blob([serializeBookingSnapshot(booking)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `ve-${safeFilenameCode(booking.bookingCode)}.json`
      link.href = url
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      setJsonState('saved')
    } catch {
      setJsonState('error')
    }
  }

  const copyVerificationUrl = async () => {
    if (!verificationUrl) return
    try {
      await navigator.clipboard.writeText(verificationUrl)
      setCopyState('copied')
    } catch {
      setCopyState('error')
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
            {verificationUrl ? (
              <QRCode
                value={verificationUrl}
                size={128}
                className="h-auto w-full sm:size-32"
                aria-label={`Mã QR mở trang xác minh vé ${booking.bookingCode ?? ''}`}
              />
            ) : <div className="aspect-square w-full sm:size-32" aria-hidden />}
          </div>
          <p className="col-start-2 mt-1 font-mono text-xs font-bold tracking-[0.08em] text-[var(--ink)] sm:mt-2 sm:text-sm sm:tracking-[0.12em]">{booking.bookingCode}</p>
          <p className="col-start-2 mt-2 text-xs leading-5 text-[var(--muted)] sm:mt-3">
            Cần đổi hoặc huỷ? Gọi lại và đọc số điện thoại lúc đặt là được.
          </p>
          <button
            type="button"
            className="col-start-2 mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-[var(--action)] hover:underline sm:justify-center"
            disabled={!interactive || !verificationUrl}
            onClick={() => void copyVerificationUrl()}
          >
            {copyState === 'copied' ? <Check size={14} aria-hidden /> : copyState === 'error' ? <X size={14} aria-hidden /> : <LinkIcon size={14} aria-hidden />}
            {copyState === 'copied' ? 'Đã sao chép link' : copyState === 'error' ? 'Không thể sao chép link' : 'Sao chép link xác minh'}
          </button>
          <span className="sr-only" aria-live="polite">{copyState === 'copied' ? 'Đã sao chép link xác minh.' : copyState === 'error' ? 'Không thể sao chép link xác minh.' : ''}</span>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => void saveTicket()} disabled={!interactive || pngState === 'saving'}>
          {pngState === 'saved' ? <Check size={17} aria-hidden /> : pngState === 'copied' ? <Copy size={17} aria-hidden /> : <Download size={17} aria-hidden />}
          {pngState === 'saved' ? 'Đã lưu PNG' : pngState === 'copied' ? 'Đã chép mã vé' : 'Lưu vé PNG'}
        </Button>
        <Button variant="secondary" onClick={saveJson} disabled={!interactive || booking.status !== 'confirmed' || !booking.bookingCode || jsonState === 'saving'}>
          {jsonState === 'saved' ? <Check size={17} aria-hidden /> : <FileJson size={17} aria-hidden />}
          {jsonState === 'saved' ? 'Đã tải JSON' : jsonState === 'error' ? 'Không thể tải JSON' : 'Tải dữ liệu JSON'}
        </Button>
        <Button variant="secondary" onClick={onNewCall} disabled={!interactive}>
          <PhoneCall size={17} aria-hidden /> Đặt chuyến khác
        </Button>
        <Button variant="quiet" onClick={onClose} disabled={!interactive}>
          <X size={17} aria-hidden /> Đóng
        </Button>
      </div>
      <p className="max-w-xl text-center text-xs leading-5 text-[var(--muted)]">
        Tệp JSON chứa thông tin đặt vé; chỉ chia sẻ với nơi bạn tin cậy.
      </p>
      <span className="sr-only" aria-live="polite">
        {jsonState === 'saved' ? 'Đã tải dữ liệu JSON.' : jsonState === 'error' ? 'Không thể tải dữ liệu JSON.' : ''}
      </span>
    </section>
  )
}
