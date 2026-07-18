import type { BookingDraft } from '@ordervoice/contracts'
import { BookingForm } from './booking-form'

/**
 * Hai giai đoạn của một cuộc đặt vé. Trong lúc gọi là phiếu ghi nhận điền dần
 * theo lời nói; chốt xong thì vé giấy nhiệt được "in" ra thế chỗ.
 */
export function TicketCard({ booking }: { booking: BookingDraft }) {
  const printed = booking.status === 'confirmed' && booking.bookingCode !== null

  return (
    <section aria-label="Vé xe" className="h-full">
      {printed ? <PrintedTicket booking={booking} /> : <BookingForm booking={booking} />}
    </section>
  )
}

/**
 * Vé xe khách in nhiệt: giấy ngà có vân sợi, chữ in kim một màu mực, mép dưới
 * xé răng cưa và hai khấc bên hông (đều do mask cắt thật vào tờ giấy). Tờ vé
 * trườn ra từ khe máy in theo từng nấc, đầu in quét dọc một lượt, rồi con dấu
 * "đã thu tiền" đóng xuống.
 */
function PrintedTicket({ booking }: { booking: BookingDraft }) {
  const serial = booking.id.replace(/[^a-z0-9]/giu, '').slice(-6).toUpperCase() || '000000'

  return (
    // Khe máy in: cắt phần vé còn nằm trong máy trong lúc giấy chạy ra.
    <div className="overflow-hidden">
      <div className="ticket-shell animate-print-feed relative">
        <div className="ticket-paper relative rounded-t-xl font-mono">
          <PaperGrain />

          <header className="relative px-5 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <BusMark />
                <p className="text-xl font-bold tracking-[0.24em]">ALOVE</p>
              </div>
              <span className="shrink-0 border border-current px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]">
                Đã giữ vé
              </span>
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[var(--paper-faint)]">
              Vé xe khách · N° {serial}
            </p>
          </header>

          <Rule variant="double" />

          {/* Tuyến đi: phần mực đậm nhất của tờ vé. */}
          <div className="relative px-5">
            <div className="flex items-center gap-2">
              <City value={booking.origin} />
              <Chevrons />
              <City value={booking.destination} align="right" />
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-3">
              <Stat label="Khởi hành" value={booking.selectedTrip?.departureTime ?? null} strong />
              <Stat label="Ngày đi" value={booking.travelDateLabel} align="right" />
            </div>
          </div>

          <Rule />

          <dl className="relative px-5">
            <PrintRow label="Hành khách" value={booking.passengerCount ? `${booking.passengerCount} hành khách` : null} />
            <PrintRow label="Người đi" value={booking.passengerName} />
            <PrintRow label="Số điện thoại" value={booking.phone} />
            <PrintRow label="Loại xe" value={booking.selectedTrip?.vehicleType ?? null} />
          </dl>

          <Rule variant="double" />

          <div className="relative flex items-baseline justify-between gap-3 px-5 pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--paper-faint)]">Tổng tiền</p>
            <p className="text-lg font-bold tabular-nums">
              {booking.totalFareVnd === null ? '—' : formatVnd(booking.totalFareVnd)}
            </p>
          </div>

          {/* Cuống vé cao cố định: khấc xé của .ticket-paper canh theo đúng
              chiều cao này, nên không được để nội dung đẩy nó co giãn. */}
          <div className="relative flex h-[var(--ticket-stub)] items-center px-5 pb-[var(--ticket-tear)]">
            <Perforation />
            {/* Mã vạch và con dấu chia làn riêng: dấu đóng chồng lên mã vạch thì
                cả hai cùng khó đọc. */}
            <div className="flex w-full items-center gap-3">
              <div className="min-w-0 flex-1">
                <Barcode code={booking.bookingCode ?? serial} />
                <p className="mt-1.5 text-center text-sm font-bold tracking-[0.18em]">{booking.bookingCode}</p>
                <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] tracking-[0.04em] text-[var(--paper-faint)]">
                  <SeatGlyph />
                  Ghế {booking.seats.join(', ')}
                </p>
              </div>
              <Stamp />
            </div>
          </div>
        </div>

        {/* Vệt đầu in quét dọc tờ giấy đúng một lượt. */}
        <span
          aria-hidden
          className="animate-print-head pointer-events-none absolute inset-x-0 top-0 h-8 bg-[linear-gradient(180deg,transparent,color-mix(in_srgb,var(--ink)_18%,transparent),transparent)]"
        />
      </div>
    </div>
  )
}

/** Vân sợi giấy: nhiễu fractal in đè bằng multiply nên trông như thớ giấy chứ không phải lớp phủ xám. */
function PaperGrain() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16] mix-blend-multiply"
      aria-hidden
      focusable="false"
    >
      <filter id="tk-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#tk-grain)" />
    </svg>
  )
}

function Rule({ variant }: { variant?: 'double' }) {
  return (
    <div
      aria-hidden
      className={`relative mx-5 my-4 border-t border-[var(--paper-rule)] ${
        variant === 'double' ? 'border-t-[3px] border-double' : ''
      }`}
    />
  )
}

function City({ value, align }: { value: string | null; align?: 'right' }) {
  return (
    <p
      className={`min-w-0 flex-1 truncate text-[22px] font-bold uppercase leading-tight tracking-[0.01em] ${
        align === 'right' ? 'text-right' : ''
      }`}
      title={value ?? undefined}
    >
      {value ?? '—'}
    </p>
  )
}

/** Mũi tên hướng đi kèm bóng xe — vẽ tay để nét mực đồng bộ với chữ in. */
function Chevrons() {
  return (
    <svg className="h-5 w-12 shrink-0 text-[var(--paper-faint)]" viewBox="0 0 48 20" fill="none" aria-hidden focusable="false">
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6.5 5.5 10 2 13.5" />
        <path d="M8 6.5 11.5 10 8 13.5" />
        <path d="M36 6.5 39.5 10 36 13.5" />
        <path d="M42 6.5 45.5 10 42 13.5" />
      </g>
      <g transform="translate(17 3)" fill="currentColor">
        <rect x="0" y="0" width="15" height="10" rx="2.4" />
        <rect x="1.8" y="1.8" width="4.4" height="3.2" rx="0.8" fill="var(--paper)" />
        <rect x="8.4" y="1.8" width="4.4" height="3.2" rx="0.8" fill="var(--paper)" />
        <circle cx="4" cy="12" r="1.5" />
        <circle cx="11" cy="12" r="1.5" />
      </g>
    </svg>
  )
}

function Stat({ label, value, strong, align }: { label: string; value: string | null; strong?: boolean; align?: 'right' }) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <p className="text-[9px] uppercase tracking-[0.18em] text-[var(--paper-faint)]">{label}</p>
      <p className={`truncate font-semibold tabular-nums ${strong ? 'text-lg' : 'text-sm'}`} title={value ?? undefined}>
        {value ?? '—'}
      </p>
    </div>
  )
}

/** Dòng in kiểu hóa đơn: nhãn trái, dấu chấm dẫn, giá trị phải. */
function PrintRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline gap-2 py-[5px]">
      <dt className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-[var(--paper-faint)]">{label}</dt>
      <span aria-hidden className="min-w-4 flex-1 translate-y-[-2px] border-b border-dotted border-[var(--paper-rule)]" />
      <dd className="min-w-0 shrink truncate text-[13px] font-semibold" title={value ?? undefined}>
        {value ?? '—'}
      </dd>
    </div>
  )
}

/** Đường răng cưa chạy ngang đúng vị trí hai khấc xé đã khoét vào giấy. */
function Perforation() {
  return (
    <svg
      // Chiều rộng phải khai báo tường minh: SVG là replaced element nên
      // width:auto sẽ lấy 300px nội tại thay vì kéo theo left/right.
      className="pointer-events-none absolute left-3.5 top-0 h-1.5 w-[calc(100%-1.75rem)] -translate-y-1/2"
      aria-hidden
      focusable="false"
    >
      <defs>
        <pattern id="tk-perf" width="12" height="6" patternUnits="userSpaceOnUse">
          <rect x="0" y="2" width="7" height="2" rx="1" fill="var(--paper-rule)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#tk-perf)" />
    </svg>
  )
}

/** Con dấu mực đóng nghiêng lên cuống vé, chờ giấy ra hết mới đóng. */
function Stamp() {
  return (
    <div
      aria-hidden
      className="ticket-stamp pointer-events-none w-[74px] shrink-0 border-[3px] border-current px-1.5 py-1.5 text-center outline outline-1 outline-offset-[3px] outline-current"
    >
      <p className="text-[10px] font-bold uppercase leading-[1.15] tracking-[0.1em]">
        Đã thu
        <br />
        tiền
      </p>
    </div>
  )
}

/**
 * Mã vạch trang trí: vân sinh từ mã vé nên mỗi vé một khác và không đổi giữa
 * các lần render. Không phải Code 128 hợp lệ, đừng kỳ vọng máy quét đọc được.
 */
function Barcode({ code }: { code: string }) {
  const bars = barcodeBars(code)
  return (
    <svg
      className="h-9 w-full"
      viewBox={`0 0 ${BARCODE_WIDTH} 36`}
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y="0" width={bar.width} height="36" fill="currentColor" />
      ))}
    </svg>
  )
}

const BARCODE_WIDTH = 296
const BARCODE_QUIET_ZONE = 10

function barcodeBars(code: string): Array<{ x: number; width: number }> {
  const bars: Array<{ x: number; width: number }> = []
  const limit = BARCODE_WIDTH - BARCODE_QUIET_ZONE
  let x = BARCODE_QUIET_ZONE
  let index = 0
  while (x < limit - 2) {
    const seed = code.charCodeAt(index % code.length) + index * 7
    const width = 1 + (seed % 3)
    const gap = 2 + ((seed >> 2) % 3)
    bars.push({ x, width: Math.min(width, limit - x) })
    x += width + gap
    index += 1
  }
  return bars
}

function BusMark() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <rect x="3" y="4" width="18" height="12.5" rx="3.2" />
      <rect x="5.4" y="6.6" width="5.4" height="4" rx="1.2" fill="var(--paper)" />
      <rect x="13.2" y="6.6" width="5.4" height="4" rx="1.2" fill="var(--paper)" />
      <rect x="5.4" y="12.4" width="13.2" height="1.6" rx="0.8" fill="var(--paper)" />
      <circle cx="8" cy="17.6" r="1.9" />
      <circle cx="16" cy="17.6" r="1.9" />
    </svg>
  )
}

function SeatGlyph() {
  return (
    <svg className="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
      <path
        d="M4.8 2.6c1.4-.5 5-.5 6.4 0 .5.2.7.6.7 1.1l-.4 4.6H4.5L4.1 3.7c0-.5.2-.9.7-1.1Z"
        fill="currentColor"
      />
      <path d="M3.4 8.3h9.2c.6 0 1 .5.9 1.1l-.5 2.6H3l-.5-2.6c-.1-.6.3-1.1.9-1.1Z" fill="currentColor" />
      <path d="M3.2 12.4v1.4M12.8 12.4v1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}
