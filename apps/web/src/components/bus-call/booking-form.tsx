'use client'

import type { BookingDraft } from '@ordervoice/contracts'
import {
  Banknote,
  CalendarDays,
  Clock,
  Flag,
  MapPin,
  Phone,
  Route,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { cn } from '@/lib/cn'

type FieldPhase = 'idle' | 'filled' | 'amended'

/** Trường chưa nghe được từ khách — nói rõ bằng chữ thay vì để ô trống. */
const UNSET = 'Chưa xác định'

/**
 * Mọi nhãn trường dùng chung một cỡ chữ và một tông mực, bất kể nằm ở khối nào
 * — nhãn nhảy cỡ giữa các khối là thứ khiến phiếu trông chắp vá.
 */
const LABEL = 'flex items-center gap-1.5 text-ui text-[color-mix(in_srgb,var(--ink)_72%,transparent)]'

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
    <div className="flex flex-col overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
      {/* Header và footer cùng tô nền tint để kẹp phần dữ liệu ở giữa — phiếu có
          thanh tiêu đề và thanh tổng kết rõ ràng thay vì một khối trắng phẳng. */}
      <header className="flex items-center justify-between gap-3 border-b border-[var(--divider)] bg-[var(--surface-tint)] px-5 py-4">
        <p className="flex items-center gap-2.5 text-ui font-semibold">
          <span className="relative flex size-2">
            <span className="animate-listen-ring absolute inset-0 rounded-full bg-[var(--action)]" />
            <span className="relative size-2 rounded-full bg-[var(--action)]" />
          </span>
          {STATUS_LABEL[booking.status]}
        </p>
        <div className="flex items-center gap-2.5">
          {/* Một rãnh liền thay vì tám gạch rời: mắt đọc được "còn bao xa nữa"
              trong một nhịp, thay vì phải đếm từng gạch. */}
          <span
            aria-hidden
            className="h-1 w-20 overflow-hidden rounded-full bg-[var(--divider)]"
          >
            <span
              className="block h-full rounded-full bg-[var(--action)] transition-[width] duration-500 ease-out"
              style={{ width: `${(done / filled.length) * 100}%` }}
            />
          </span>
          <span className="font-mono text-metric tabular-nums text-[var(--muted)]">
            {done}/{filled.length}
          </span>
        </div>
      </header>

      <div className="flex flex-col divide-y divide-[var(--divider)]">
        <Section title="Hành trình" icon={Route}>
          <RouteRail origin={booking.origin} destination={booking.destination} />
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Cell label="Ngày đi" icon={CalendarDays} value={booking.travelDateLabel} />
            <Cell label="Giờ khởi hành" icon={Clock} value={booking.selectedTrip?.departureTime ?? null} mono />
          </div>
        </Section>

        <Section title="Hành khách" icon={Users}>
          <dl className="space-y-1">
            <Line
              label="Số khách"
              icon={Users}
              value={booking.passengerCount ? `${booking.passengerCount} hành khách` : null}
            />
            <Line label="Người đi" icon={User} value={booking.passengerName} />
            <Line label="Số điện thoại" icon={Phone} value={booking.phone} mono />
          </dl>
        </Section>
      </div>

      <footer className="border-t border-[var(--divider)] bg-[var(--surface-tint)] px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className={LABEL}>
            <Banknote className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            Tổng tiền
          </p>
          <Value
            value={booking.totalFareVnd === null ? null : formatVnd(booking.totalFareVnd)}
            className="text-section font-semibold tabular-nums tracking-[-0.03em]"
          />
        </div>
        <p className="mt-1.5 text-metric text-[var(--muted)]">
          Vé giấy in ra ngay khi bạn xác nhận đặt chỗ.
        </p>
      </footer>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="px-5 py-4">
      {/* Tiêu đề khối in đậm bằng mực đầy, còn nhãn trường dùng tông nhạt hơn:
          hai bậc phân cấp này là thứ giữ cho phiếu không bị dẹt. */}
      <h3 className="flex items-center gap-1.5 text-ui font-semibold text-[var(--ink)]">
        <Icon className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
        {title}
      </h3>
      <div className="mt-3.5">{children}</div>
    </section>
  )
}

/** Trục hành trình dọc: hai bến nối bằng đường đứt, giãn hết chiều cao còn dư. */
function RouteRail({ origin, destination }: { origin: string | null; destination: string | null }) {
  return (
    <div className="flex h-[124px] gap-3.5">
      {/* Chấm phải nằm đúng giữa dòng tên bến: nhãn text-ui cao 20px, cách 0.5
          (2px), tên bến text-section cao 28px → tâm dòng ở 36px, chấm 10px nên
          lùi 31px. Đáy đối xứng: 14 − 5 = 9px. */}
      <div aria-hidden className="flex flex-col items-center pb-[9px] pt-[31px]">
        <Node active={origin !== null} />
        {/* Sợi nối cũng là một thanh tiến độ: đứt nét khi chưa có bến nào, đổ
            màu dần xuống khi đã có điểm đi, liền mạch khi đủ cả hai đầu. */}
        <span
          className={cn(
            'my-1.5 w-px flex-1 rounded-full',
            origin === null
              ? 'bg-[repeating-linear-gradient(180deg,var(--muted)_0_4px,transparent_4px_9px)] opacity-40'
              : destination === null
                ? 'bg-[linear-gradient(180deg,var(--action),color-mix(in_srgb,var(--action)_12%,transparent))]'
                : 'bg-[var(--action)]',
          )}
        />
        <Node active={destination !== null} destination />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <Cell label="Điểm đi" icon={MapPin} value={origin} large />
        <Cell label="Điểm đến" icon={Flag} value={destination} large />
      </div>
    </div>
  )
}

/**
 * Quầng sáng dùng ring chứ không dùng border dày: ring nằm ngoài luồng layout
 * nên chấm vẫn cao đúng 10px, giữ nguyên phép canh của trục hành trình.
 */
function Node({ active, destination }: { active: boolean; destination?: boolean }) {
  return (
    <span
      className={cn(
        'size-2.5 shrink-0 border-2 transition-all duration-500',
        destination ? 'rounded-[3px]' : 'rounded-full',
        active
          ? 'border-[var(--action)] bg-[var(--action)] ring-4 ring-[color-mix(in_srgb,var(--action)_16%,transparent)]'
          : 'border-[var(--hairline)] bg-[var(--surface)]',
      )}
    />
  )
}

function Cell({
  label,
  icon: Icon,
  value,
  large,
  mono,
}: {
  label: string
  icon: LucideIcon
  value: string | null
  large?: boolean
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className={LABEL}>
        <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        {label}
      </p>
      <Value
        value={value}
        className={cn(
          'mt-0.5 truncate',
          large ? 'text-section font-semibold tracking-[-0.03em]' : 'text-ui font-semibold',
          mono && 'font-mono tabular-nums',
        )}
      />
    </div>
  )
}

function Line({
  label,
  icon: Icon,
  value,
  mono,
}: {
  label: string
  icon: LucideIcon
  value: string | null
  mono?: boolean
}) {
  return (
    // items-center chứ không items-baseline: icon canh theo baseline sẽ bị tụt
    // xuống dưới dòng chữ.
    <div className="flex items-center justify-between gap-3 py-1">
      <dt className={cn(LABEL, 'shrink-0')}>
        <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        {label}
      </dt>
      <Value
        value={value}
        as="dd"
        className={cn('min-w-0 truncate text-right text-ui font-semibold', mono && 'font-mono tabular-nums')}
      />
    </div>
  )
}

/**
 * Ô giá trị: trống thì là một vạch chờ có ánh sáng quét qua, vừa được điền thì
 * trượt lên kèm lóe xanh, bị nói lại để sửa thì giá trị cũ gạch ngang trôi đi
 * và nền lóe vàng.
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
      // Vạch chờ để inline-block nên nó tự theo text-align của ô (dòng hành
      // khách canh phải), và vẫn chiếm đúng một dòng nên phiếu không co giật
      // lúc giá trị thật xuất hiện.
      // font-sans đè font-mono của ô giờ và số điện thoại: "Chưa xác định" là
      // chữ tiếng Việt, đánh máy bằng font đẳng khoảng trông như lỗi hiển thị.
      <Tag className={cn(className, 'font-sans font-normal text-[var(--muted)]')}>{UNSET}</Tag>
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
  const [snapshot, setSnapshot] = useState<{
    value: string | null
    phase: FieldPhase
    previous: string | null
    token: number
  }>({ value, phase: 'idle', previous: null, token: 0 })

  if (snapshot.value !== value) {
    setSnapshot((current) => ({
      value,
      previous: current.value,
      phase: value === null ? 'idle' : current.value === null ? 'filled' : 'amended',
      token: current.token + 1,
    }))
  }

  return snapshot
}

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}
