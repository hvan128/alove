import type { BookingDraft } from '@ordervoice/contracts'
import { createBusDemoCatalog, createInitialBooking } from '@ordervoice/core/bus-booking'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  HeadphonesIcon,
  ShieldCheckIcon,
  SpeakerHighIcon,
} from '@phosphor-icons/react/dist/ssr'
import Link from 'next/link'
import { BookingSummary } from '@/components/bus-call/booking-summary'
import { AppShell } from '@/components/ui/app-shell'
import { StatusPill } from '@/components/ui/status'

const trip = createBusDemoCatalog()[0]!
const previewBooking = {
  ...createInitialBooking('landing-preview'),
  status: 'awaiting_confirmation',
  origin: 'Sài Gòn',
  destination: 'Đà Lạt',
  travelDateLabel: 'Tối thứ Sáu, 24/07',
  timeWindow: 'Buổi tối',
  passengerCount: 2,
  selectedTrip: trip,
  passengerName: 'Nguyễn Minh Anh',
  phone: '0909123456',
  totalFareVnd: trip.priceVnd * 2,
} satisfies BookingDraft

const capabilities = [
  ['Realtime cho nhân viên', 'Transcript partial và final đi cùng bằng chứng; nhân viên có thể xem câu gốc hoặc bản dịch có sẵn.', HeadphonesIcon],
  ['Agent điền phiếu', 'Mỗi final của người gọi cập nhật đúng trường vừa nói, giữ lịch sử sửa và không ghi đè trường đã khóa.', ShieldCheckIcon],
  ['Human hoặc Auto', 'Human không tự nói. Auto mới tạo phản hồi; câu mẫu và text vẫn chạy khi chưa có hạ tầng voice.', SpeakerHighIcon],
] as const

export default function HomePage() {
  return (
    <AppShell>
      <main>
        <section className="mx-auto grid max-w-[1180px] gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-24">
          <div>
            <StatusPill tone="demo">Staff-first demo · Phiên DEMO42</StatusPill>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.06em] text-[var(--ink)] sm:text-6xl">
              Một bàn làm việc để nghe, hiểu và đặt vé ngay trong cuộc gọi.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 tracking-[-0.02em] text-[var(--muted)]">
              VéĐi đưa transcript realtime, gợi ý trả lời và phiếu đặt xe tự điền về một màn hình nhân viên. Một route riêng giúp giả lập người gọi ngay trên điện thoại.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--action)] px-5 py-2 text-sm font-medium text-[var(--on-action)] transition hover:bg-[var(--action-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] active:scale-[0.98]" href="/staff?session=DEMO42">
                Mở bàn nhân viên <ArrowRightIcon size={18} weight="bold" aria-hidden />
              </Link>
              <Link className="inline-flex min-h-11 items-center rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-5 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--pearl)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)]" href="/call?session=DEMO42">
                Mở trang người gọi
              </Link>
            </div>
            <p className="mt-5 max-w-xl text-xs leading-5 text-[var(--muted)]">
              Không có key: mở hai tab cùng trình duyệt. Có LiveKit và worker: dùng hai thiết bị, VALSEA RTT và giọng Agent thật.
            </p>
          </div>

          <div className="rounded-[28px] border border-[var(--hairline)] bg-[var(--surface)] p-3 shadow-[0_28px_90px_color-mix(in_srgb,var(--ink)_10%,transparent)] sm:p-5">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--divider)] px-1 pb-4">
              <div>
                <p className="text-xs font-medium text-[var(--muted)]">Xem trước phiếu tự điền</p>
                <p className="mt-1 font-semibold tracking-[-0.025em]">Sài Gòn → Đà Lạt</p>
              </div>
              <StatusPill tone="warning">Chờ nhân viên xác nhận</StatusPill>
            </div>
            <div className="grid gap-3 py-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[var(--action-soft)] p-4">
                <p className="text-xs font-semibold text-[var(--action)]">Khách hàng</p>
                <p className="mt-2 text-sm leading-6">Tôi cần hai vé đi Đà Lạt tối thứ Sáu.</p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-tint)] p-4">
                <p className="text-xs font-semibold text-[var(--success)]">Gợi ý cho nhân viên</p>
                <p className="mt-2 text-sm leading-6">Em đề xuất chuyến giường nằm lúc 22:00. Anh chị cho em xin họ tên và số điện thoại ạ?</p>
              </div>
            </div>
            <BookingSummary booking={previewBooking} />
          </div>
        </section>

        <section className="border-y border-[var(--divider)] bg-[var(--surface)]">
          <div className="mx-auto grid max-w-[1180px] px-4 sm:grid-cols-3 sm:px-6">
            {capabilities.map(([title, body, Icon], index) => (
              <article key={title} className={`py-10 sm:px-7 ${index > 0 ? 'sm:border-l sm:border-[var(--divider)]' : ''}`}>
                <Icon size={25} className="text-[var(--action)]" weight="duotone" aria-hidden />
                <h2 className="mt-4 text-lg font-semibold tracking-[-0.025em]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6">
          <div className="flex items-start gap-3 rounded-[18px] border border-[var(--hairline)] bg-[var(--pearl)] p-5 text-sm leading-6 text-[var(--muted)]">
            <CheckCircleIcon size={20} className="mt-0.5 shrink-0 text-[var(--success)]" weight="fill" aria-hidden />
            <span>Human-in-the-loop là mặc định. Chỉ final của người gọi mới điền phiếu và chỉ nhân viên mới xác nhận booking cuối cùng.</span>
          </div>
        </section>
      </main>
    </AppShell>
  )
}
