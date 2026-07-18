'use client'

import type { BookingDraft } from '@ordervoice/contracts'
import { type ReactNode, useRef } from 'react'
import { cn } from '@/lib/cn'

type FieldPhase = 'idle' | 'filled' | 'amended'

const STATUS_LABEL: Record<BookingDraft['status'], string> = {
  collecting: 'Đang thu thập',
  trip_proposed: 'Đã đề xuất chuyến',
  awaiting_confirmation: 'Chờ xác nhận',
  confirmed: 'Đã giữ vé',
}

/**
 * Phiếu ghi nhận trong lúc gọi. Thông tin gom theo ba khối — hành trình, hành
 * khách, thanh toán — thay vì một danh sách phẳng, để mắt bám được cấu trúc
 * chuyến đi. Trục hành trình dọc giãn theo chiều cao còn trống nên phiếu cao
 * bằng khung cuộc gọi mà không phải chèn khoảng trắng chết.
 */
export function BookingForm({ booking }: { booking: BookingDraft }) {
  const filled = [
    booking.origin,
    booking.destination,
    booking.travelDateLabel,
    booking.selectedTrip?.departureTime ?? null,
    booking.passengerCount === null ? null : String(booking.passengerCount),
    booking.passengerName,
    booking.phone,
    booking.totalFareVnd === null ? null : String(booking.totalFareVnd),
  ]
  const done = filled.filter((value) => value !== null).length

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--divider)] px-5 py-4">
        <p className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="relative flex size-2">
            <span className="animate-listen-ring absolute inset-0 rounded-full bg-[var(--action)]" />
            <span className="relative size-2 rounded-full bg-[var(--action)]" />
          </span>
          {STATUS_LABEL[booking.status]}
        </p>
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="flex gap-1">
            {filled.map((value, index) => (
              <span
                key={index}
                className={cn(
                  'h-1 w-2.5 rounded-full transition-colors duration-500',
                  value === null ? 'bg-[var(--divider)]' : 'bg-[var(--action)]',
                )}
              />
            ))}
          </span>
          <span className="font-mono text-xs tabular-nums text-[var(--muted)]">
            {done}/{filled.length}
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col divide-y divide-[var(--divider)]">
        <Section title="Hành trình" grow>
          <RouteRail origin={booking.origin} destination={booking.destination} />
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Cell label="Ngày đi" value={booking.travelDateLabel} />
            <Cell label="Giờ khởi hành" value={booking.selectedTrip?.departureTime ?? null} mono />
          </div>
        </Section>

        <Section title="Hành khách">
          <dl className="space-y-1">
            <Line label="Số khách" value={booking.passengerCount ? `${booking.passengerCount} hành khách` : null} />
            <Line label="Người đi" value={booking.passengerName} />
            <Line label="Số điện thoại" value={booking.phone} mono />
          </dl>
        </Section>
      </div>

      <footer className="border-t border-[var(--divider)] bg-[var(--surface-tint)] px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] text-[var(--muted)]">Tổng tiền</p>
          <Value
            value={booking.totalFareVnd === null ? null : formatVnd(booking.totalFareVnd)}
            className="text-lg font-bold tabular-nums"
          />
        </div>
        <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
          Vé giấy in ra ngay khi bạn xác nhận đặt chỗ.
        </p>
      </footer>
    </div>
  )
}

function Section({ title, grow, children }: { title: string; grow?: boolean; children: ReactNode }) {
  return (
    <section className={cn('px-5 py-4', grow && 'flex flex-1 flex-col')}>
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{title}</h3>
      <div className={cn('mt-3.5', grow && 'flex flex-1 flex-col')}>{children}</div>
    </section>
  )
}

/** Trục hành trình dọc: hai bến nối bằng đường đứt, giãn hết chiều cao còn dư. */
function RouteRail({ origin, destination }: { origin: string | null; destination: string | null }) {
  return (
    <div className="flex min-h-24 flex-1 gap-3.5">
      {/* pt/pb khớp với nhịp chữ đã ghim bên dưới (nhãn leading-4, giá trị
          leading-[26px]) để chấm nằm đúng giữa dòng tên bến. */}
      <div aria-hidden className="flex flex-col items-center pb-2 pt-6">
        <Node active={origin !== null} />
        <span className="my-1.5 w-px flex-1 bg-[repeating-linear-gradient(180deg,var(--hairline)_0_4px,transparent_4px_9px)]" />
        <Node active={destination !== null} destination />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <Cell label="Điểm đi" value={origin} large />
        <Cell label="Điểm đến" value={destination} large />
      </div>
    </div>
  )
}

function Node({ active, destination }: { active: boolean; destination?: boolean }) {
  return (
    <span
      className={cn(
        'size-2.5 shrink-0 border-2 transition-colors duration-500',
        destination ? 'rounded-[3px]' : 'rounded-full',
        active ? 'border-[var(--action)] bg-[var(--action)]' : 'border-[var(--hairline)] bg-[var(--surface)]',
      )}
    />
  )
}

function Cell({ label, value, large, mono }: { label: string; value: string | null; large?: boolean; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] leading-4 text-[var(--muted)]">{label}</p>
      <Value
        value={value}
        className={cn(
          'mt-0.5 truncate',
          large ? 'text-[19px] font-semibold leading-[26px] tracking-[-0.01em]' : 'text-sm font-semibold',
          mono && 'font-mono tabular-nums',
        )}
      />
    </div>
  )
}

function Line({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="shrink-0 text-[13px] text-[var(--muted)]">{label}</dt>
      <Value
        value={value}
        as="dd"
        className={cn('min-w-0 truncate text-right text-sm font-semibold', mono && 'font-mono tabular-nums')}
      />
    </div>
  )
}

/**
 * Ô giá trị: trống thì chỉ là gạch ngang mờ, vừa được điền thì trượt lên kèm
 * lóe xanh, bị nói lại để sửa thì giá trị cũ gạch ngang trôi đi và nền lóe vàng.
 */
function Value({
  value,
  className,
  as: Tag = 'p',
}: {
  value: string | null
  className?: string
  as?: 'p' | 'dd'
}) {
  const { phase, previous, token } = useValuePhase(value)

  if (value === null) {
    return (
      <Tag className={cn(className, 'font-normal text-[color-mix(in_srgb,var(--muted)_55%,transparent)]')}>—</Tag>
    )
  }

  return (
    <Tag className={cn('relative', className)} title={value}>
      {phase === 'idle' ? null : (
        <span
          // Lớp lóe có key riêng: mỗi lần đổi giá trị nó được gắn lại nên
          // animation chạy lại, kể cả hai lần sửa liên tiếp.
          key={token}
          aria-hidden
          className={cn(
            'pointer-events-none absolute -inset-x-1.5 -inset-y-1 rounded-md',
            phase === 'filled' ? 'animate-row-flash' : 'animate-row-amend',
          )}
        />
      )}
      {phase === 'amended' && previous ? (
        <span
          key={`was-${token}`}
          aria-hidden
          className="animate-value-out absolute inset-x-0 top-0 truncate text-[var(--muted)] line-through"
        >
          {previous}
        </span>
      ) : null}
      <span key={value} className="animate-value-in relative block truncate">
        {value}
      </span>
    </Tag>
  )
}

/**
 * Phân biệt lần điền đầu tiên với lần nói lại để sửa, giữ luôn giá trị cũ để ô
 * chiếu lại thứ vừa bị thay. Dùng ref chứ không dùng state: pha hiển thị chỉ
 * đổi khi giá trị đổi, còn parent thì render lại liên tục theo transcript — nếu
 * để state thì mỗi lần render giữa chừng sẽ cắt ngang animation.
 */
function useValuePhase(value: string | null): { phase: FieldPhase; previous: string | null; token: number } {
  const seen = useRef<string | null>(value)
  const phase = useRef<FieldPhase>('idle')
  const previous = useRef<string | null>(null)
  const token = useRef(0)

  if (seen.current !== value) {
    previous.current = seen.current
    phase.current = value === null ? 'idle' : seen.current === null ? 'filled' : 'amended'
    seen.current = value
    token.current += 1
  }

  return { phase: phase.current, previous: previous.current, token: token.current }
}

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}
