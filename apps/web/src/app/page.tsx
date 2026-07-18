import type { Metadata } from 'next'
import { ArrowRight, Clock, MapPin, Mic, Phone, RotateCcw, TicketCheck } from 'lucide-react'
import { createBusDemoCatalog } from '@ordervoice/core/bus-booking'
import { CallOverlay } from '@/components/bus-call/call-overlay'
import { BrandMark } from '@/components/ui/brand-mark'
import { StatusPill } from '@/components/ui/status'

// Trang chủ là trang bán vé của nhà xe Mai Anh cho khách, không phải trang demo
// sản phẩm. Tuyến/giờ/giá đọc thẳng từ catalog để khớp từng con số với những gì
// agent nói trong cuộc gọi.
const trips = createBusDemoCatalog()

// Override metadata của layout: tab và mô tả của "/" nói giọng nhà xe, không nói
// giọng sản phẩm ("Agent tự động") với khách đặt vé.
export const metadata: Metadata = {
  title: 'Nhà xe Mai Anh — Alo là có vé',
  description:
    'Đặt vé Sài Gòn – Đà Lạt bằng một cuộc gọi. Tổng đài nhà xe Mai Anh nghe máy ngay, đọc lại rõ ràng từng thông tin rồi mới chốt vé.',
}

const bookingSteps = [
  ['Bấm gọi', 'Không cần tải app, không cần điền form. Bấm nút gọi ngay trên trang này.', Phone],
  ['Nói nhu cầu', 'Nói tự nhiên như gọi tổng đài: đi đâu, ngày nào, mấy vé. Tổng đài viên nghe máy ngay.', Mic],
  ['Nhận mã vé', 'Nghe đọc lại chuyến và tổng tiền, xác nhận là có mã vé cùng điểm đón rõ ràng.', TicketCheck],
] as const

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="sticky top-0 z-20 border-b border-[var(--divider)] bg-[color-mix(in_srgb,var(--canvas)_84%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6">
          <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.02em]">
            <BrandMark />
            Nhà xe Mai Anh
          </span>
          <nav aria-label="Điều hướng chính" className="flex items-center gap-1 text-sm">
            <a
              className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-[var(--muted)] transition hover:bg-[var(--action-soft)] hover:text-[var(--action)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)]"
              href="#doi-huy"
            >
              Tra cứu vé
            </a>
            <a
              className="hidden min-h-11 items-center rounded-full px-3 py-2 text-[var(--muted)] transition hover:bg-[var(--action-soft)] hover:text-[var(--action)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] sm:inline-flex"
              href="#lich-chay"
            >
              Lịch chạy
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1180px] gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <StatusPill tone="success">Tổng đài trực 24/7 · Nghe máy ngay</StatusPill>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.06em] sm:text-6xl">
              Alo là có vé.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 tracking-[-0.02em] text-[var(--muted)]">
              Đặt vé Sài Gòn ⇄ Đà Lạt bằng một cuộc gọi. Tổng đài viên của nhà xe Mai Anh nghe máy tức thì,
              tìm chuyến phù hợp, đọc lại rõ ràng từng thông tin rồi mới chốt vé.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CallOverlay layoutKey="hero" />
              <a
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-5 text-sm font-medium transition hover:bg-[var(--pearl)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)]"
                href="#lich-chay"
              >
                Xem lịch chạy <ArrowRight size={17} aria-hidden />
              </a>
            </div>
            <p className="mt-5 max-w-xl text-xs leading-5 text-[var(--muted)]">
              Cuộc gọi diễn ra ngay trong trình duyệt, không mất phí điện thoại. Đổi hay huỷ vé chỉ cần gọi lại
              và đọc số điện thoại đã đặt.
            </p>
          </div>

          <div className="rounded-[28px] border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)] sm:p-6">
            <p className="text-xs font-medium text-[var(--muted)]">Tuyến đang phục vụ</p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.03em]">Sài Gòn ⇄ Đà Lạt · mỗi đêm</p>
            <ul className="mt-4 grid gap-3">
              {trips.map((trip) => (
                <li key={trip.id} className="rounded-2xl border border-[var(--hairline)] bg-[var(--canvas)] p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-semibold tracking-[-0.02em]">
                      {trip.departureTime} → {trip.arrivalTime}
                      <span className="ml-1 text-xs font-normal text-[var(--muted)]">hôm sau</span>
                    </p>
                    <p className="font-semibold text-[var(--action)]">{formatVnd(trip.priceVnd)}</p>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{trip.vehicleType}</p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    <MapPin size={13} aria-hidden className="shrink-0" />
                    Đón {trip.pickupPoint} · trả {trip.dropoffPoint}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-y border-[var(--divider)] bg-[var(--surface)]">
          <div className="mx-auto grid max-w-[1180px] px-4 sm:grid-cols-3 sm:px-6">
            {bookingSteps.map(([title, body, Icon], index) => (
              <article key={title} className={`py-10 sm:px-7 ${index > 0 ? 'sm:border-l sm:border-[var(--divider)]' : ''}`}>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--action)]">
                  <Icon size={22} aria-hidden />
                  Bước {index + 1}
                </span>
                <h2 className="mt-4 text-lg font-semibold tracking-[-0.025em]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="lich-chay" className="mx-auto max-w-[1180px] scroll-mt-16 px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">Lịch chạy hằng đêm</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Giá và giờ chạy bên dưới là dữ liệu tổng đài dùng khi tư vấn — bạn nghe gì trong cuộc gọi thì trên
            trang này y như vậy.
          </p>
          <div
            tabIndex={0}
            role="region"
            aria-label="Bảng lịch chạy"
            className="mt-6 overflow-x-auto rounded-[18px] border border-[var(--hairline)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)]"
          >
            <table className="w-full min-w-[640px] border-collapse bg-[var(--surface)] text-sm">
              <thead>
                <tr className="border-b border-[var(--divider)] text-left text-xs text-[var(--muted)]">
                  <th scope="col" className="px-4 py-3 font-medium">Giờ chạy</th>
                  <th scope="col" className="px-4 py-3 font-medium">Loại xe</th>
                  <th scope="col" className="px-4 py-3 font-medium">Điểm đón</th>
                  <th scope="col" className="px-4 py-3 font-medium">Điểm trả</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Giá vé</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr key={trip.id} className="border-b border-[var(--divider)] last:border-b-0">
                    <td className="px-4 py-3.5 font-semibold tracking-[-0.02em]">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={14} aria-hidden className="text-[var(--muted)]" />
                        {trip.departureTime} → {trip.arrivalTime}
                        <span className="text-xs font-normal text-[var(--muted)]">hôm sau</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5">{trip.vehicleType}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{trip.pickupPoint}</td>
                    <td className="px-4 py-3.5 text-[var(--muted)]">{trip.dropoffPoint}</td>
                    <td className="px-4 py-3.5 text-right font-semibold">{formatVnd(trip.priceVnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="doi-huy" className="mx-auto max-w-[1180px] scroll-mt-16 px-4 pb-14 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[24px] border border-[var(--hairline)] bg-[var(--pearl)] p-6 sm:p-8 lg:flex-row lg:items-center">
            <div className="flex items-start gap-3">
              <RotateCcw size={20} className="mt-1 shrink-0 text-[var(--action)]" aria-hidden />
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.025em]">Tra cứu, đổi hay huỷ vé?</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">
                  Gọi lại và đọc số điện thoại lúc đặt, tổng đài tìm đúng vé của bạn trong vài giây — kể cả khi
                  bạn quên mã vé.
                </p>
              </div>
            </div>
            <CallOverlay layoutKey="support" className="shrink-0" />
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--divider)]">
        {/* pb-24 chừa chỗ cho thanh gọi sticky trên mobile — footer là phần tử cuối trang */}
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-4 pt-8 pb-24 text-xs leading-5 text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:pb-8">
          <p>Nhà xe Mai Anh · Tuyến Sài Gòn ⇄ Đà Lạt · Bến xe Miền Đông mới &amp; Văn phòng Quận 1</p>
          <p>Tổng đài giọng nói vận hành bởi Alove</p>
        </div>
      </footer>

      {/* Thanh gọi thường trực trên mobile — kiểu nút gọi hotline quen thuộc */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--divider)] bg-[color-mix(in_srgb,var(--canvas)_88%,transparent)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <CallOverlay layoutKey="sticky" className="w-full" />
      </div>
    </div>
  )
}
