import type { BookingSnapshot } from '@/lib/call-contract'
import type { ReactNode } from 'react'
import { Armchair as Seat, MapPin, Receipt, Ticket } from 'lucide-react'

type BookingSummaryView = Pick<
  BookingSnapshot,
  'status' | 'bookingCode' | 'origin' | 'destination' | 'passengerCount' | 'totalFareVnd' | 'travelDateLabel' | 'passengerName' | 'seats'
> & {
  selectedTrip: { id: string; departureTime: string } | null
}

const STATUS_LABEL: Record<BookingSnapshot['status'], string> = {
  collecting: 'Đang thu thập',
  trip_proposed: 'Đã đề xuất chuyến',
  awaiting_confirmation: 'Chờ xác nhận',
  confirmed: 'Đã giữ vé',
}

export function BookingSummary({ booking }: { booking: BookingSummaryView }) {
  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--pearl)] p-4" aria-labelledby="booking-summary-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[var(--muted)]">Phiếu đặt vé</p>
          <h3 id="booking-summary-title" className="mt-0.5 font-semibold text-[var(--ink)]">{STATUS_LABEL[booking.status]}</h3>
        </div>
        <Ticket size={22} className="text-[var(--success)]" aria-hidden />
      </div>

      {booking.bookingCode ? (
        <div className="mt-4 rounded-xl bg-[var(--ink)] px-4 py-3 text-[var(--on-ink)]">
          <p className="text-xs opacity-65">Mã vé</p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-[0.08em]">{booking.bookingCode}</p>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Fact icon={<MapPin size={16} aria-hidden />} label="Hành trình" value={booking.origin && booking.destination ? `${booking.origin} → ${booking.destination}` : 'Chưa đủ'} />
        <Fact icon={<Ticket size={16} aria-hidden />} label="Chuyến" value={booking.selectedTrip?.id ?? 'Chưa chọn'} />
        <Fact icon={<Seat size={16} aria-hidden />} label="Hành khách" value={booking.passengerCount ? `${booking.passengerCount} hành khách` : 'Chưa rõ'} />
        <Fact icon={<Receipt size={16} aria-hidden />} label="Tổng tiền" value={booking.totalFareVnd === null ? 'Chưa tính' : formatVnd(booking.totalFareVnd)} />
      </div>

      <div className="mt-4 rounded-xl border border-[var(--divider)] bg-[var(--surface)] px-3 py-3 text-sm leading-6">
        <p><span className="text-[var(--muted)]">Khởi hành:</span> <strong className="font-medium text-[var(--ink)]">{booking.selectedTrip ? `${booking.selectedTrip.departureTime}, ${booking.travelDateLabel}` : 'Chưa chọn chuyến'}</strong></p>
        <p><span className="text-[var(--muted)]">Người đi:</span> <strong className="font-medium text-[var(--ink)]">{booking.passengerName ?? 'Chưa có thông tin'}</strong></p>
        <p><span className="text-[var(--muted)]">Ghế:</span> <strong className="font-medium text-[var(--ink)]">{booking.seats.length ? booking.seats.join(', ') : 'Sẽ cấp khi xác nhận'}</strong></p>
      </div>
    </section>
  )
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-[var(--surface)] p-3">
      <div className="flex items-center gap-1.5 text-[var(--muted)]">{icon}<span className="text-[11px] font-medium">{label}</span></div>
      <p className="mt-2 truncate text-sm font-semibold text-[var(--ink)]" title={value}>{value}</p>
    </div>
  )
}

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}
