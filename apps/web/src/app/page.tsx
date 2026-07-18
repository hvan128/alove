import type { Metadata } from 'next'
import Image from 'next/image'
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  Clock3,
  Headphones,
  MapPin,
  Mic2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Ticket,
  Wifi,
} from 'lucide-react'
import { CallOverlay } from '@/components/bus-call/call-overlay'
import { AloveProductTour, type AloveTourTrip } from '@/components/landing/alove-product-tour'
import { MobileStickyCall } from '@/components/landing/mobile-sticky-call'
import { BrandMark } from '@/components/ui/brand-mark'
import { listUpcomingTrips, type TripOffer } from '@/lib/db/booking-store'
import { isDbConfigured } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Alove × Nhà xe Mai Anh — AloVé, alo là có vé đi',
  description:
    'Đặt vé nhà xe Mai Anh bằng giọng nói tự nhiên. Alove hiểu giọng vùng miền, cách nói thường ngày và tiếng Việt xen tiếng Anh để tìm đúng chuyến.',
}

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}

async function loadUpcomingTrips(): Promise<TripOffer[]> {
  if (!isDbConfigured()) return []
  try {
    return await listUpcomingTrips()
  } catch (error) {
    console.error('[landing] could not load upcoming trips', error)
    return []
  }
}

function routeLabel(trip: TripOffer): string {
  return `${trip.originCity} → ${trip.destinationCity}`
}

function VoiceBars() {
  return (
    <span aria-hidden className="landing-voice-bars">
      {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
    </span>
  )
}

function HeroExperience({ trip }: { trip: TripOffer | undefined }) {
  const destination = trip?.destinationCity ?? 'Vinh'
  const route = trip ? routeLabel(trip) : 'Hà Nội → Vinh'
  const departure = trip?.departureLabel ?? '20:00 tối nay'
  const price = trip ? formatVnd(trip.priceVnd) : '350.000 ₫'

  return (
    <div className="landing-voice-stage" aria-label="Minh hoạ cuộc gọi đặt vé với Alove">
      <div className="landing-stage-topline">
        <span className="inline-flex items-center gap-2">
          <span className="landing-live-dot" aria-hidden />
          Minh hoạ cuộc gọi Alove
        </span>
        <span className="font-mono text-xs text-slate-400">00:18</span>
      </div>

      <div className="landing-hero-demo-grid">
        <div className="landing-call-pane">
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] text-white/65">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" /> Đang nghe
          </span>
          <div className="landing-orb-wrap" aria-hidden>
            <span className="landing-orb-ring landing-orb-ring-one" />
            <span className="landing-orb-ring landing-orb-ring-two" />
            <span className="landing-orb"><span className="landing-orb-glow" /></span>
          </div>
          <VoiceBars />
          <div className="mt-5 text-center">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">Bạn nói</p>
            <p className="mx-auto mt-2 max-w-[18rem] text-base font-medium leading-6 text-white sm:text-lg">
              “Cho mình book 2 vé Hà Nội đi {destination} tối ni, chuyến gần nhất nha.”
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[10px] font-medium text-white/65">
              <span className="rounded-full bg-white/10 px-2 py-1">“book 2 vé” · Việt–Anh</span>
              <span className="rounded-full bg-white/10 px-2 py-1">“tối ni” · giọng miền Trung</span>
              <span className="rounded-full bg-white/10 px-2 py-1">“nha” · nói tự nhiên</span>
            </div>
          </div>
        </div>

        <div className="landing-understanding-pane">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Sparkles size={18} aria-hidden /></span>
            <div>
              <p className="text-sm font-semibold text-slate-950">Alove đã hiểu</p>
              <p className="text-xs text-slate-500">Giọng nào, cách nói nào cũng tách đúng ý</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2.5">
            {[
              ['Điểm đến', destination],
              ['Số khách', '2 người'],
              ['Ưu tiên', 'Chuyến gần nhất'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-xs font-semibold text-slate-950">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-3.5" aria-label="Vé được tạo từ cuộc gọi">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-600">Chuyến phù hợp</p>
                <p className="mt-1 text-sm font-semibold tracking-[-0.025em] text-slate-950">{route}</p>
              </div>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={14} strokeWidth={2.5} aria-hidden /></span>
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-dashed border-blue-200 pt-3">
              <div>
                <p className="text-[10px] text-slate-500">Khởi hành</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-slate-950">{departure}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500">Mỗi vé</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-blue-700">{price}</p>
              </div>
            </div>
          </div>

          <p className="mt-3 flex items-center gap-2 text-[11px] leading-4 text-slate-500">
            <VoiceBars />
            Alove nhận ra: “book” → đặt vé · “tối ni” → tối nay
          </p>
        </div>
      </div>
    </div>
  )
}

const flowSteps = [
  {
    icon: Mic2,
    number: '01',
    title: 'Nói nhu cầu',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    icon: Wifi,
    number: '02',
    title: 'Alove tìm chuyến',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  {
    icon: ShieldCheck,
    number: '03',
    title: 'Giữ ghế & xác nhận',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    icon: Ticket,
    number: '04',
    title: 'Nhận vé & mã QR',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
] as const

export default async function HomePage() {
  const trips = await loadUpcomingTrips()
  const featuredTrip = trips[0]
  const tourTrip: AloveTourTrip | undefined = featuredTrip ? {
    id: featuredTrip.tripId,
    origin: featuredTrip.originCity,
    destination: featuredTrip.destinationCity,
    travelDateLabel: featuredTrip.departureLabel.split(' ')[0] ?? featuredTrip.departureLabel,
    departure: featuredTrip.departureLabel.split(' ').at(-1) ?? featuredTrip.departureLabel,
    arrival: featuredTrip.arrivalTime ?? '—',
    priceVnd: featuredTrip.priceVnd,
    seatsAvailable: featuredTrip.seatsAvailable,
    seatNoun: featuredTrip.seatNoun,
    vehicleType: featuredTrip.vehicleType,
    pickupPoint: featuredTrip.pickupPoint,
    dropoffPoint: featuredTrip.dropoffPoint,
  } : undefined

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex min-h-20 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-8">
          <a
            href="#top"
            className="inline-flex min-h-11 items-center gap-3 rounded-full text-sm font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            aria-label="Alove — về đầu trang"
          >
            <BrandMark className="size-9" />
            <span className="text-base tracking-[-0.03em]">Alove</span>
            <span className="h-4 w-px bg-slate-300" aria-hidden />
            <span className="font-normal text-slate-500">Nhà xe Mai Anh</span>
          </a>
          <nav aria-label="Điều hướng chính" className="flex items-center gap-1 text-sm text-slate-600">
            <a
              className="hidden min-h-11 items-center rounded-full px-4 transition hover:bg-white/70 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:inline-flex"
              href="#cach-hoat-dong"
            >
              Cách hoạt động
            </a>
            <a
              className="inline-flex min-h-11 items-center rounded-full px-4 transition hover:bg-white/70 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              href="#lich-chay"
            >
              Lịch chạy
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section id="top" className="landing-hero scroll-mt-20">
          <div className="landing-hero-grid" aria-hidden />
          <div className="landing-aurora landing-aurora-one" aria-hidden />
          <div className="landing-aurora landing-aurora-two" aria-hidden />

          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:py-32">
            <div className="max-w-xl">
              <div className="inline-flex min-h-8 items-center gap-2 rounded-full border border-blue-200 bg-white/75 px-3 text-xs font-medium text-blue-800 shadow-sm backdrop-blur-md">
                <Sparkles size={14} aria-hidden className="text-violet-600" />
                Hiểu giọng vùng miền & cách nói thường ngày
              </div>
              <h1 className="mt-6 text-[clamp(3rem,5.2vw,4.75rem)] font-bold leading-[0.92] tracking-[-0.06em] text-slate-950">
                AloVé.
                <span className="landing-accent-text mt-1 block">Alo là có vé đi.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
                Giọng Bắc, Trung, Nam; nói nhanh, nói tự nhiên hay xen tiếng Anh — Alove hiểu ý bạn để tìm đúng chuyến và giữ đúng chỗ.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <CallOverlay layoutKey="hero" className="shadow-[0_16px_50px_-16px_rgba(73,125,255,0.9)]" />
                <a
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-slate-300 bg-white/75 px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-white hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  href="#cach-hoat-dong"
                >
                  Xem Alove làm gì <ArrowDownRight size={17} aria-hidden />
                </a>
              </div>

              <ul className="mt-8 grid gap-2.5 text-sm text-slate-600">
                <li className="inline-flex items-center gap-2.5"><Check size={16} aria-hidden className="text-emerald-600" /> Hiểu giọng vùng miền và tiếng Việt xen tiếng Anh</li>
                <li className="inline-flex items-center gap-2.5"><Check size={16} aria-hidden className="text-emerald-600" /> Luôn đọc lại thông tin trước khi đặt</li>
                <li className="inline-flex items-center gap-2.5"><Check size={16} aria-hidden className="text-emerald-600" /> Không cần cài app, chỉ cần nói như bình thường</li>
              </ul>
            </div>

            <HeroExperience trip={featuredTrip} />
          </div>

          <div className="landing-hero-bottom" aria-hidden>
            <span>Cuộn để khám phá</span>
            <span className="h-px flex-1 bg-slate-300" />
            <ArrowDownRight size={16} />
          </div>
        </section>

        <section id="cach-hoat-dong" className="relative scroll-mt-16 overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-blue-50/35 to-white">
          <div className="absolute -left-48 bottom-0 size-96 rounded-full bg-blue-100/55 blur-3xl" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">Quy trình 4 bước</span>
              <h2 className="mt-4 text-3xl font-bold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-4xl">
                Đơn giản đến mức chỉ cần nói
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Từ câu nói đầu tiên đến mã vé hoàn chỉnh — xem Alove xử lý từng bước ngay bên dưới.
              </p>
            </div>

            <div className="relative mx-auto mt-9 grid max-w-4xl grid-cols-2 gap-5 md:grid-cols-4">
              <div className="absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-gradient-to-r from-blue-400 via-violet-400 to-emerald-400 md:block" aria-hidden />
              {flowSteps.map(({ icon: Icon, number, title, color }) => (
                <div key={number} className="relative flex flex-col items-center text-center">
                  <span className={`relative z-10 grid size-12 place-items-center rounded-xl border shadow-sm ${color}`}>
                    <Icon size={20} aria-hidden />
                    <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-slate-900 font-mono text-[9px] font-bold text-white">{number}</span>
                  </span>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
                </div>
              ))}
            </div>

            <div className="mt-9">
              <AloveProductTour {...(tourTrip ? { trip: tourTrip } : {})} />
            </div>
          </div>
        </section>

        <section id="lich-chay" className="scroll-mt-16 overflow-hidden bg-[var(--surface)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--action)]">Lịch đang mở bán</p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Chọn bằng mắt. Hoặc cứ gọi.</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-[var(--muted)]">Cùng dữ liệu Alove sử dụng khi tư vấn — không phải một bảng giá riêng.</p>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Bảng lịch chạy"
              className="mt-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--action-focus)]"
            >
              {trips.length > 0 ? (
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {trips.slice(0, 6).map((trip, index) => (
                    <li key={trip.tripId}>
                      <article className={`landing-route-card ${index === 0 ? 'landing-route-card-featured' : ''}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs text-[var(--muted)]">{trip.departureLabel}</p>
                            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em]">{routeLabel(trip)}</h3>
                          </div>
                          {index === 0 ? <span className="rounded-full bg-[var(--action)] px-2.5 py-1 text-xs font-medium text-[var(--on-action)]">Gần nhất</span> : null}
                        </div>

                        <div className="mt-8 flex items-end justify-between gap-5 border-b border-[var(--divider)] pb-6">
                          <div>
                            <p className="font-mono text-3xl font-semibold tracking-[-0.06em]">
                              {trip.departureLabel.split(' ').at(-1)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--muted)]">đến {trip.arrivalTime ?? '—'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--action)]">{formatVnd(trip.priceVnd)}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">còn {trip.seatsAvailable} {trip.seatNoun}</p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-2.5 text-xs text-[var(--muted)]">
                          <p className="inline-flex items-center gap-2"><Clock3 size={14} aria-hidden /> {trip.vehicleType}</p>
                          <p className="inline-flex items-center gap-2"><MapPin size={14} aria-hidden /> {trip.pickupPoint}</p>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="landing-schedule-empty">
                  <div className="relative z-10 max-w-lg p-6 sm:p-8">
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"><Clock3 size={13} aria-hidden /> Đang chờ đồng bộ</span>
                    <h3 className="mt-5 text-2xl font-bold tracking-[-0.035em] text-slate-950">Chưa thấy chuyến? Alove kiểm tra giúp ngay trong cuộc gọi.</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">Hệ thống nhà xe chưa trả về chuyến còn chỗ trên bảng công khai. Alove vẫn có thể kiểm tra trực tiếp khi bạn nói điểm đến.</p>
                    <div className="mt-6"><CallOverlay layoutKey="schedule-empty" label="Gọi Alove kiểm tra chuyến" /></div>
                  </div>
                  <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-100 via-indigo-50 to-violet-100 p-6">
                    <div className="absolute inset-0 bg-dot-pattern opacity-50" aria-hidden />
                    <Image src="/alove-journey-3d.png" alt="" width={1254} height={1254} className="landing-generated-art relative z-10 w-56 sm:w-64" sizes="256px" />
                  </div>
                </div>
              )}
            </div>

            {trips.length > 0 ? <div className="mt-10 flex justify-center"><CallOverlay layoutKey="schedule" label="Gọi Alove chọn chuyến giúp" /></div> : null}
          </div>
        </section>

        <section id="doi-huy" className="relative overflow-hidden bg-[#070912] text-white">
          <div className="landing-support-glow" aria-hidden />
          <div className="relative z-10 mx-auto grid max-w-[1280px] gap-10 px-4 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white/75">
                <RotateCcw size={22} aria-hidden />
              </span>
              <h2 className="mt-7 text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl">
                Vé cũ cũng chỉ cần một cuộc gọi.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/55">
                Chuẩn bị mã vé và số điện thoại đã đặt. Alove sẽ xác thực trước khi tra cứu hoặc huỷ.
              </p>
            </div>
            <div className="lg:justify-self-end">
              <CallOverlay layoutKey="support" label="Tra cứu vé qua cuộc gọi" />
              <p className="mt-3 flex items-center gap-2 text-xs text-white/40"><Headphones size={14} aria-hidden /> Hỗ trợ ngay trong trình duyệt</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--divider)] bg-[var(--canvas)]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 pb-24 pt-8 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:pb-8">
          <div className="inline-flex items-center gap-2 font-semibold text-[var(--ink)]">
            <BrandMark className="size-7" /> Alove <span className="font-normal text-[var(--muted)]">cho Nhà xe Mai Anh</span>
          </div>
          <p className="inline-flex items-center gap-2">Lịch, giá và mã vé từ hệ thống vận hành <ArrowRight size={14} aria-hidden /></p>
        </div>
      </footer>

      <MobileStickyCall />
    </div>
  )
}
