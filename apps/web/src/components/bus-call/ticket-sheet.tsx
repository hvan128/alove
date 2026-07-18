'use client'

import { useState } from 'react'
import { ChevronUp } from 'lucide-react'
import type { BookingSnapshot } from '@/lib/call-contract'
import { cn } from '@/lib/cn'
import { TicketCard } from './ticket-card'

const STATUS_LABEL: Record<BookingSnapshot['status'], string> = {
  collecting: 'Đang ghi nhận',
  trip_proposed: 'Đã đề xuất chuyến',
  awaiting_confirmation: 'Chờ xác nhận',
  confirmed: 'Đã giữ vé',
}

/**
 * Phiếu vé trên màn hẹp. Màn điện thoại không đủ chỗ cho cả sân khấu cuộc gọi
 * lẫn phiếu vé, mà đẩy phiếu xuống dưới thì khách phải cuộn đi cuộn lại giữa
 * lúc đang nói. Thanh peek nằm đáy tóm tắt tuyến và trạng thái, chạm để mở
 * xem toàn bộ phiếu.
 */
export function TicketSheet({ booking }: { booking: BookingSnapshot }) {
  const [open, setOpen] = useState(false)
  const route = booking.origin && booking.destination ? `${booking.origin} → ${booking.destination}` : 'Chưa có hành trình'

  return (
    // Bám đáy vùng cuộn: sân khấu cuộc gọi cao hơn màn điện thoại, để thanh
    // peek trôi theo nội dung thì khách phải cuộn mò mới thấy phiếu.
    <div className="sticky bottom-0 z-10 -mx-4 bg-[var(--canvas)] px-4 pb-1 pt-2 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 text-left transition active:scale-[0.99]"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
            {STATUS_LABEL[booking.status]}
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--ink)]">{route}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-[var(--action)]">
          {open ? 'Thu gọn' : 'Xem vé'}
          <ChevronUp className={cn('size-4 transition-transform duration-300', !open && 'rotate-180')} aria-hidden />
        </span>
      </button>

      {open ? (
        <div className="mt-3 max-h-[60dvh] overflow-y-auto pb-2">
          <TicketCard booking={booking} />
        </div>
      ) : null}
    </div>
  )
}
