import Link from 'next/link'
import { ChevronRight, Globe, Phone } from 'lucide-react'

import { BookingStatusBadge, CallStatusBadge } from '@/components/dashboard/status-badge'
import { formatVnd } from '@/lib/dashboard-format'
import type { CallSummary } from '@/lib/db/dashboard-store'

export function CallTable({ rows }: { rows: CallSummary[] }) {
  return (
    // Khung cuộn riêng cho bảng — trang không bao giờ được cuộn ngang theo.
    // `relative` là bắt buộc: không có nó, các <span class="sr-only"> (position
    // absolute) trong bảng lấy containing block là viewport nên thoát khỏi vùng
    // cuộn và kéo cả trang trượt ngang gần 800px trên mobile.
    <div className="relative w-full overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-ui">
        <thead>
          <tr className="border-b border-[var(--divider)] text-left text-metric font-medium text-[var(--muted)]">
            <th scope="col" className="px-4 py-2 font-medium">Mã cuộc gọi</th>
            <th scope="col" className="px-4 py-2 font-medium">Kênh</th>
            <th scope="col" className="px-4 py-2 font-medium">Khách</th>
            <th scope="col" className="px-4 py-2 font-medium">Bắt đầu</th>
            <th scope="col" className="px-4 py-2 font-medium">Trạng thái</th>
            <th scope="col" className="px-4 py-2 font-medium">Booking</th>
            <th scope="col" className="px-4 py-2 font-medium">Mã vé</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Tiền vé</th>
            <th scope="col" className="w-9 px-4 py-2">
              <span className="sr-only">Mở chi tiết</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <CallRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CallRow({ row }: { row: CallSummary }) {
  const startedAt = new Date(row.startedAt)
  const isPhone = row.channel === 'phone'
  const fare = row.latestBooking?.totalFareVnd ?? null

  return (
    <tr className="group border-b border-[var(--divider)] transition-colors last:border-0 hover:bg-[var(--pearl)] focus-within:bg-[var(--pearl)]">
      <td className="whitespace-nowrap px-4 py-3">
        {/* Không dùng stretched link: Chromium bỏ qua position:relative trên <tr>
            nên lớp phủ ::after sẽ neo vào viewport chứ không vào hàng. Mã cuộc
            gọi là vùng bấm thật, hàng chỉ đổi nền để báo đang trỏ tới. */}
        <Link
          href={`/dashboard/calls/${encodeURIComponent(row.id)}`}
          className="rounded-sm font-mono font-medium text-[var(--ink)] underline-offset-2 group-hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)]"
        >
          {row.id}
        </Link>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <span className="inline-flex items-center gap-1.5 text-[var(--ink)]">
          {isPhone ? (
            <Phone size={14} className="text-[var(--muted)]" aria-hidden />
          ) : (
            <Globe size={14} className="text-[var(--muted)]" aria-hidden />
          )}
          {isPhone ? 'Điện thoại' : 'Web'}
          {row.callerNumber ? (
            <span className="font-mono tabular-nums text-metric text-[var(--muted)]">· {row.callerNumber}</span>
          ) : null}
        </span>
      </td>
      {/* Với web call thì callerNumber luôn null — tên và số của khách trên vé
          là cách duy nhất để điều hành viên gọi lại. */}
      <td className="whitespace-nowrap px-4 py-3">
        {row.passenger ? (
          <span className="flex flex-col">
            <span className="text-[var(--ink)]">{row.passenger.name}</span>
            <span className="font-mono text-metric tabular-nums text-[var(--muted)]">{row.passenger.phone}</span>
          </span>
        ) : (
          <Dash />
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[var(--ink)]">
        {startedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        <span className="text-metric text-[var(--muted)]">
          {' · '}
          {startedAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
        </span>
      </td>
      <td className="px-4 py-3">
        <CallStatusBadge status={row.status} />
      </td>
      <td className="px-4 py-3">
        {row.latestBooking ? (
          <BookingStatusBadge status={row.latestBooking.status} />
        ) : (
          <Dash />
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-[var(--ink)]">
        {row.latestBooking?.bookingCode ?? <Dash />}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums tracking-[-0.01em] text-[var(--ink)]">
        {fare === null ? <Dash /> : formatVnd(fare)}
      </td>
      <td className="px-4 py-3 text-right">
        <ChevronRight
          size={15}
          className="inline text-[var(--muted)] transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </td>
    </tr>
  )
}

function Dash() {
  // aria-label không có hiệu lực trên <span> (role=generic); chữ ẩn thì có.
  return (
    <span className="text-[var(--muted)]">
      <span aria-hidden>—</span>
      <span className="sr-only">không có</span>
    </span>
  )
}
