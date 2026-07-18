import type { BookingDraft } from '@ordervoice/contracts'
import { createBusDemoCatalog, createInitialBooking } from '@ordervoice/core/bus-booking'
import { ArrowRight, CircleCheck, Headphones, ShieldCheck, Volume2 } from 'lucide-react'
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
  ['Hai phía, một màn hình', 'Khách hàng và nhân viên chăm sóc cùng xuất hiện trong một Web Call dễ kiểm chứng.', Headphones],
  ['Agent có thể tiếp quản', 'Chuyển giữa nhân viên và Agent tự động mà không mất nội dung hay phiếu đặt vé.', ShieldCheck],
  ['Luôn demo được', 'Mic và giọng đọc là nâng cấp tùy chọn. Câu mẫu và text chạy ngay, không cần số điện thoại.', Volume2],
] as const

export default function HomePage() {
  return (
    <AppShell>
      <main>
        <section className="mx-auto grid max-w-[1180px] gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-24">
          <div>
            <StatusPill tone="success">Demo Web Call · Không cần số điện thoại</StatusPill>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.06em] text-[var(--ink)] sm:text-6xl">
              Đặt vé nhà xe bằng cuộc gọi, có người kiểm soát khi cần.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 tracking-[-0.02em] text-[var(--muted)]">
              VéĐi cho khách nói nhu cầu tự nhiên, để nhân viên trả lời trực tiếp hoặc bật Agent tự động thu thập hành trình, chọn chuyến và đọc lại xác nhận.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--action)] px-5 py-2 text-sm font-medium text-[var(--on-action)] transition hover:bg-[var(--action-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] active:scale-[0.98]" href="/console">
                Mở demo Web Call <ArrowRight size={18} aria-hidden />
              </Link>
              <Link className="inline-flex min-h-11 items-center rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-5 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--pearl)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)]" href="/design-system">
                Xem design system
              </Link>
            </div>
            <p className="mt-5 max-w-xl text-xs leading-5 text-[var(--muted)]">
              Demo dùng engine đặt vé xác định và giọng đọc của thiết bị. LiveKit, VALSEA và điện thoại thật được tách thành pilot có điều kiện rõ ràng.
            </p>
          </div>

          <div className="rounded-[28px] border border-[var(--hairline)] bg-[var(--surface)] p-3 shadow-[var(--shadow-panel)] sm:p-5">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--divider)] px-1 pb-4">
              <div>
                <p className="text-xs font-medium text-[var(--muted)]">Web Call đang kết nối</p>
                <p className="mt-1 font-semibold tracking-[-0.025em]">Sài Gòn → Đà Lạt</p>
              </div>
              <StatusPill tone="success">Agent đang trực</StatusPill>
            </div>
            <div className="grid gap-3 py-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[var(--action-soft)] p-4">
                <p className="text-xs font-semibold text-[var(--action)]">Khách hàng</p>
                <p className="mt-2 text-sm leading-6">Tôi cần hai vé đi Đà Lạt tối thứ Sáu.</p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-tint)] p-4">
                <p className="text-xs font-semibold text-[var(--success)]">Agent VéĐi</p>
                <p className="mt-2 text-sm leading-6">Em đề xuất chuyến giường nằm lúc 22:00, giá 320.000 ₫ mỗi vé.</p>
              </div>
            </div>
            <BookingSummary booking={previewBooking} />
          </div>
        </section>

        <section className="border-y border-[var(--divider)] bg-[var(--surface)]">
          <div className="mx-auto grid max-w-[1180px] px-4 sm:grid-cols-3 sm:px-6">
            {capabilities.map(([title, body, Icon], index) => (
              <article key={title} className={`py-10 sm:px-7 ${index > 0 ? 'sm:border-l sm:border-[var(--divider)]' : ''}`}>
                <Icon size={25} className="text-[var(--action)]" aria-hidden />
                <h2 className="mt-4 text-lg font-semibold tracking-[-0.025em]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6">
          <div className="flex items-start gap-3 rounded-[18px] border border-[var(--hairline)] bg-[var(--pearl)] p-5 text-sm leading-6 text-[var(--muted)]">
            <CircleCheck size={20} className="mt-0.5 shrink-0 text-[var(--success)]" aria-hidden />
            <span>Luồng demo hoàn tất từ yêu cầu, chọn chuyến, thông tin hành khách đến mã vé ổn định. Nhân viên có thể tiếp quản và xác nhận thủ công.</span>
          </div>
        </section>
      </main>
    </AppShell>
  )
}
