import { Armchair as Seat, Bus } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { TicketView } from './ticket-view'

const TONE_BORDER: Record<TicketView['tone'], string> = {
  pending: 'border-[var(--hairline)]',
  issued: 'border-[color-mix(in_srgb,var(--success)_50%,var(--hairline))]',
  cancelled: 'border-[color-mix(in_srgb,var(--danger)_50%,var(--hairline))]',
}

const TONE_BADGE: Record<TicketView['tone'], string> = {
  pending: 'bg-white/15 text-white',
  issued: 'bg-white text-[var(--success)]',
  cancelled: 'bg-white text-[var(--danger)]',
}

/**
 * Vé xe khách kiểu vé thật: dải màu thương hiệu, hai bến nối bằng đường chạy
 * đứt đoạn có xe ở giữa, đường xé với khấc hai bên, cuống vé mang mã vạch.
 * Mỗi ô lóe sáng + phồng nhẹ khi dữ liệu mới đổ vào (remount qua key); chốt vé
 * thì cuống vé "đóng dấu" và viền chuyển màu thành công.
 *
 * Nhận `TicketView` chứ không phải bản nháp trong cuộc gọi, nên cùng một thiết kế
 * dùng được cho vé đang hình thành lẫn vé đã lưu (xem `ticket-view.ts`).
 */
export function TicketCard({ view }: { view: TicketView }) {
  const issued = view.tone === 'issued'
  return (
    <section
      aria-label="Vé xe"
      className={cn(
        'relative flex flex-col overflow-hidden rounded-3xl border bg-[var(--surface)] shadow-[var(--shadow-panel)] transition-colors duration-500',
        TONE_BORDER[view.tone],
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
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', TONE_BADGE[view.tone])}>
            {view.statusLabel}
          </span>
        </div>
      </div>

      {/* Hai bến + xe chạy giữa đường kẻ đứt */}
      <div className="px-5 pb-1 pt-5">
        <div className="flex items-center gap-2">
          <RoutePoint label="Điểm đi" value={view.origin} />
          <div className="relative mx-1 min-w-14 flex-1" aria-hidden>
            <div className="border-t-2 border-dashed border-[var(--hairline)]" />
            <span className="absolute left-1/2 top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--action-soft)] text-[var(--action)]">
              <Bus size={16} />
            </span>
          </div>
          <RoutePoint label="Điểm đến" value={view.destination} align="right" />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 px-5 py-4">
        <Field label="Ngày đi" value={view.travelDateLabel} />
        <Field label="Giờ khởi hành" value={view.departureTime} />
        <Field label="Hành khách" value={view.passengerCount ? `${view.passengerCount} hành khách` : null} />
        <Field label="Tổng tiền" value={view.totalFareVnd === null ? null : formatVnd(view.totalFareVnd)} />
        <Field label="Người đi" value={view.passengerName} />
        <Field label="Số điện thoại" value={view.phone} mono />
      </dl>

      {/* Đường xé vé + khấc hai bên */}
      <div className="relative" aria-hidden>
        <div className="mx-5 border-t-2 border-dashed border-[var(--hairline)]" />
        <span className="absolute -left-3 -top-3 size-6 rounded-full border border-[var(--hairline)] bg-[var(--canvas)]" />
        <span className="absolute -right-3 -top-3 size-6 rounded-full border border-[var(--hairline)] bg-[var(--canvas)]" />
      </div>

      {/* Cuống vé: mã vạch + mã vé + ghế */}
      <div className="px-5 pb-5 pt-4">
        {view.bookingCode && view.tone !== 'pending' ? (
          <div
            className={cn(
              'animate-stamp-in rounded-2xl bg-[var(--ink)] px-4 py-4 text-[var(--on-ink)]',
              // Vé đã huỷ vẫn hiện mã để đối chiếu, nhưng phải nhìn là biết không dùng được.
              !issued && 'opacity-60 grayscale',
            )}
          >
            <div className="barcode h-10 w-full opacity-90" aria-hidden />
            <p className="mt-2.5 text-center font-mono text-lg font-semibold tracking-[0.14em]">{view.bookingCode}</p>
            <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm opacity-85">
              <Seat size={15} aria-hidden /> Ghế {view.seats.join(', ')}
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
