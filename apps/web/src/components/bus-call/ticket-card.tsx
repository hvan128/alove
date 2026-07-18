import type { BookingDraft } from '@ordervoice/contracts'
import { Armchair as Seat, Bus } from 'lucide-react'
import { cn } from '@/lib/cn'

const STATUS_LABEL: Record<BookingDraft['status'], string> = {
  collecting: 'Đang thu thập',
  trip_proposed: 'Đã đề xuất chuyến',
  awaiting_confirmation: 'Chờ xác nhận',
  confirmed: 'Đã giữ vé',
}

/**
 * Vé xe khách kiểu vé thật: dải màu thương hiệu, hai bến nối bằng đường chạy
 * đứt đoạn có xe ở giữa, đường xé với khấc hai bên, cuống vé mang mã vạch.
 * Mỗi ô lóe sáng + phồng nhẹ khi dữ liệu mới đổ vào (remount qua key); chốt vé
 * thì cuống vé "đóng dấu" và viền chuyển màu thành công.
 */
export function TicketCard({ booking }: { booking: BookingDraft }) {
  const confirmed = booking.status === 'confirmed'
  return (
    <section
      aria-label="Vé xe"
      className={cn(
        'relative flex flex-col overflow-hidden rounded-3xl border bg-[var(--surface)] shadow-[var(--shadow-panel)] transition-colors duration-500',
        confirmed ? 'border-[color-mix(in_srgb,var(--success)_50%,var(--hairline))]' : 'border-[var(--hairline)]',
      )}
    >
      {/* Dải màu thương hiệu */}
      <div className="relative overflow-hidden bg-[linear-gradient(115deg,var(--action),var(--violet))] px-5 py-4 text-white">
        <Bus size={96} className="absolute -bottom-7 -right-4 rotate-[-8deg] opacity-15" aria-hidden />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Vé xe khách</p>
            <p className="mt-0.5 text-xl font-bold tracking-[-0.02em]">Alove</p>
          </div>
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold',
              confirmed ? 'bg-white text-[var(--success)]' : 'bg-white/15 text-white',
            )}
          >
            {STATUS_LABEL[booking.status]}
          </span>
        </div>
      </div>

      {/* Hai bến + xe chạy giữa đường kẻ đứt */}
      <div className="px-5 pb-1 pt-5">
        <div className="flex items-center gap-2">
          <RoutePoint label="Điểm đi" value={booking.origin} />
          <div className="relative mx-1 min-w-14 flex-1" aria-hidden>
            <div className="border-t-2 border-dashed border-[var(--hairline)]" />
            <span className="absolute left-1/2 top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--action-soft)] text-[var(--action)]">
              <Bus size={16} />
            </span>
          </div>
          <RoutePoint label="Điểm đến" value={booking.destination} align="right" />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 px-5 py-4">
        <Field label="Ngày đi" value={booking.travelDateLabel} />
        <Field label="Giờ khởi hành" value={booking.selectedTrip?.departureTime ?? null} />
        <Field label="Hành khách" value={booking.passengerCount ? `${booking.passengerCount} hành khách` : null} />
        <Field label="Tổng tiền" value={booking.totalFareVnd === null ? null : formatVnd(booking.totalFareVnd)} />
        <Field label="Người đi" value={booking.passengerName} />
        <Field label="Số điện thoại" value={booking.phone} mono />
      </dl>

      {/* Đường xé vé + khấc hai bên */}
      <div className="relative" aria-hidden>
        <div className="mx-5 border-t-2 border-dashed border-[var(--hairline)]" />
        <span className="absolute -left-3 -top-3 size-6 rounded-full border border-[var(--hairline)] bg-[var(--canvas)]" />
        <span className="absolute -right-3 -top-3 size-6 rounded-full border border-[var(--hairline)] bg-[var(--canvas)]" />
      </div>

      {/* Cuống vé: mã vạch + mã vé + ghế */}
      <div className="px-5 pb-5 pt-4">
        {confirmed && booking.bookingCode ? (
          <div className="animate-stamp-in rounded-2xl bg-[var(--ink)] px-4 py-4 text-[var(--on-ink)]">
            <div className="barcode h-10 w-full opacity-90" aria-hidden />
            <p className="mt-2.5 text-center font-mono text-lg font-semibold tracking-[0.14em]">{booking.bookingCode}</p>
            <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm opacity-85">
              <Seat size={15} aria-hidden /> Ghế {booking.seats.join(', ')}
            </p>
          </div>
        ) : (
          <div className="flex min-h-20 items-center justify-center rounded-2xl border-2 border-dashed border-[var(--divider)]">
            <p className="px-6 text-center text-xs leading-5 text-[var(--muted)]">
              Mã vé và số ghế xuất hiện tại đây khi bạn xác nhận đặt vé.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function RoutePoint({ label, value, align }: { label: string; value: string | null; align?: 'right' }) {
  return (
    <div className={cn('min-w-0', align === 'right' && 'text-right')}>
      <p className="text-[11px] font-medium text-[var(--muted)]">{label}</p>
      <p
        key={value ?? 'empty'}
        className={cn(
          'truncate text-lg font-semibold tracking-[-0.02em]',
          value ? 'animate-field-fill rounded-md text-[var(--ink)]' : 'text-[var(--muted)]',
        )}
        title={value ?? undefined}
      >
        {value ?? '—'}
      </p>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-[var(--muted)]">{label}</dt>
      <dd
        key={value ?? 'empty'}
        className={cn(
          'mt-0.5 truncate text-sm font-semibold',
          value ? 'animate-field-fill rounded-md text-[var(--ink)]' : 'font-normal text-[var(--muted)]',
          mono && 'font-mono tabular-nums',
        )}
        title={value ?? undefined}
      >
        {value ?? '—'}
      </dd>
    </div>
  )
}

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}
