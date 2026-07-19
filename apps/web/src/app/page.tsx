import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  Check,
  FileCheck2,
  Headphones,
  Lock,
  LockKeyhole,
  Mic2,
  Monitor,
  PhoneCall,
  RotateCcw,
  ShieldCheck,
  Ticket,
  Wifi,
} from 'lucide-react'
import { CallOverlay } from '@/components/bus-call/call-overlay'
import {
  AloveHeroProductPreview,
  AloveProductTour,
  type AloveTourTrip,
} from '@/components/landing/alove-product-tour'
import { MobileStickyCall } from '@/components/landing/mobile-sticky-call'
import { SiteFooter } from '@/components/landing/site-footer'
import { BrandMark } from '@/components/ui/brand-mark'
import { listUpcomingTrips, type TripOffer } from '@/lib/db/booking-store'
import { isDbConfigured } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Alove × Nhà xe Mai Anh — AloVé - Alo là có vé',
  description:
    'Đặt vé nhà xe bằng giọng nói. Alove luôn đọc lại thông tin trước khi đặt vé.',
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

const organizerCards = [
  {
    number: '01',
    eyebrow: 'Góc nhìn hành khách',
    title: 'Thử đặt vé bằng giọng nói',
    description: 'Đi trọn luồng gọi thật: tìm chuyến, giữ ghế, xác nhận và nhận mã vé.',
    href: '/console',
    cta: 'Mở Web Call',
    access: 'Công khai',
    icon: PhoneCall,
    tone: 'cyan',
    signal: 'Cuộc gọi mô phỏng',
    metric: 'Live',
  },
  {
    number: '02',
    eyebrow: 'Bằng chứng kỹ thuật',
    title: 'Kiểm tra kết quả nhận dạng',
    description: 'Đối chiếu audio, ground truth, transcript và sai khác giữa các hệ thống nhận dạng.',
    href: '/evidence',
    cta: 'Xem bằng chứng',
    access: 'Công khai',
    icon: FileCheck2,
    tone: 'violet',
    signal: 'Audio · transcript · WER',
    metric: '4 lớp',
  },
  {
    number: '03',
    eyebrow: 'Góc nhìn nhà xe',
    title: 'Theo dõi cuộc gọi và booking',
    description: 'Mở màn vận hành nội bộ để xem trạng thái cuộc gọi, transcript và booking tương ứng.',
    href: '/dashboard',
    cta: 'Mở màn vận hành',
    access: 'Yêu cầu khóa',
    icon: Monitor,
    tone: 'amber',
    signal: 'Call · booking · trạng thái',
    metric: 'Realtime',
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
            <span className="hidden h-4 w-px bg-slate-300 md:block" aria-hidden />
            <span className="hidden font-medium text-slate-700 md:inline">Nhà xe Mai Anh</span>
          </a>
          <nav aria-label="Điều hướng chính" className="flex items-center gap-1 text-sm font-medium text-slate-800">
            <a
              className="hidden min-h-11 items-center rounded-full px-4 transition hover:bg-white/70 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:inline-flex"
              href="#cach-hoat-dong"
            >
              Cách hoạt động
            </a>
            <a
              className="hidden min-h-11 items-center rounded-full px-4 transition hover:bg-white/70 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:inline-flex"
              href="#khu-vuc-ban-to-chuc"
            >
              Khu vực chấm thi
            </a>
            <Link
              className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white/75 px-4 font-medium text-slate-800 shadow-sm transition hover:border-blue-300 hover:bg-white hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              href="/what-we-built"
            >
              What we built
            </Link>
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
              <h1 className="text-[clamp(3rem,5.2vw,4.75rem)] font-bold leading-[0.92] tracking-[-0.06em] text-slate-950">
                AloVé -
                <span className="landing-accent-text mt-1 block">Alo là có vé.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
                Đặt vé nhà xe chỉ bằng một cuộc gọi. Alove hỗ trợ tiếng Việt, chuyển đổi Việt–Anh và giọng vùng miền để lắng nghe nhu cầu, tìm chuyến phù hợp rồi đọc lại thông tin trước khi đặt vé.
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
                <li className="inline-flex items-center gap-2.5"><Check size={16} aria-hidden className="text-emerald-600" /> Hiểu thanh điệu và chuyển đổi Việt–Anh</li>
                <li className="inline-flex items-center gap-2.5"><Check size={16} aria-hidden className="text-emerald-600" /> Hỗ trợ giọng vùng miền</li>
                <li className="inline-flex items-center gap-2.5"><Check size={16} aria-hidden className="text-emerald-600" /> Luôn đọc lại thông tin trước khi đặt</li>
                <li className="inline-flex items-center gap-2.5"><Check size={16} aria-hidden className="text-emerald-600" /> Không cần cài app, chỉ cần nói như bình thường</li>
              </ul>
            </div>

            <AloveHeroProductPreview {...(tourTrip ? { trip: tourTrip } : {})} />
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

            <div className="relative mx-auto mt-7 grid max-w-3xl grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-4 md:grid-cols-4">
              <div className="absolute left-[12.5%] right-[12.5%] top-5 hidden h-px bg-gradient-to-r from-blue-400 via-violet-400 to-emerald-400 md:block" aria-hidden />
              {flowSteps.map(({ icon: Icon, number, title, color }) => (
                <div key={number} className="relative flex h-full flex-col items-center text-center">
                  <span className={`relative z-10 grid size-10 place-items-center rounded-xl border shadow-sm ${color}`}>
                    <Icon size={18} aria-hidden />
                    <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-slate-900 font-mono text-[8px] font-bold text-white">{number}</span>
                  </span>
                  <p className="mt-2.5 flex min-h-10 items-start justify-center text-xs font-semibold leading-5 text-slate-900 sm:text-sm">{title}</p>
                </div>
              ))}
            </div>

            <div className="mt-7">
              <AloveProductTour {...(tourTrip ? { trip: tourTrip } : {})} />
            </div>
          </div>
        </section>

        <section id="khu-vuc-ban-to-chuc" className="organizer-landing-section scroll-mt-16 overflow-hidden">
          <div className="organizer-landing-grid" aria-hidden />
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="organizer-landing-kicker"><span aria-hidden /> Khu vực ban tổ chức &amp; giám khảo</p>
                <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl sm:leading-[1.04]">Ba góc nhìn.<br className="hidden sm:block" /> Một hành trình có thể kiểm chứng.</h2>
                <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                  Theo dấu một booking từ trải nghiệm hành khách, qua lớp bằng chứng kỹ thuật, đến màn vận hành thực tế của nhà xe.
                </p>
              </div>
              <div className="organizer-landing-legend" aria-label="Tóm tắt hành trình kiểm chứng">
                <span><strong>01</strong> Trải nghiệm</span><i aria-hidden />
                <span><strong>02</strong> Đối chiếu</span><i aria-hidden />
                <span><strong>03</strong> Vận hành</span>
              </div>
            </div>

            <ol className="organizer-landing-cards mt-10 grid gap-4 lg:grid-cols-3">
              {organizerCards.map(({ number, eyebrow, title, description, href, cta, access, icon: Icon, tone, signal, metric }) => (
                <li key={href} className="relative">
                  <article className="organizer-landing-card" data-tone={tone}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="organizer-landing-icon"><Icon size={21} aria-hidden /></span>
                      <span className="organizer-landing-number">{number}</span>
                    </div>
                    <p className="organizer-landing-eyebrow mt-6">{eyebrow}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-2xl">{title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{description}</p>
                    <div className="organizer-landing-signal">
                      <span className="organizer-landing-pulse" aria-hidden />
                      <span>{signal}</span>
                      <strong>{metric}</strong>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        {access === 'Yêu cầu khóa' ? <Lock size={13} aria-hidden /> : null}{access}
                      </span>
                      <Link href={href} className="organizer-landing-link">{cta} <ArrowRight size={15} aria-hidden /></Link>
                    </div>
                  </article>
                </li>
              ))}
            </ol>


          </div>
        </section>

        <section id="doi-huy" className="landing-support-section">
          <div className="landing-support-grid" aria-hidden />
          <div className="landing-support-orbit" aria-hidden />
          <div className="relative z-10 mx-auto max-w-[1280px] px-4 py-16 sm:px-8 sm:py-24">
            <div className="landing-support-ticket">
              <div className="landing-support-copy">
                <div className="flex items-center gap-3 text-sm font-medium text-sky-200">
                  <span className="landing-support-icon"><RotateCcw size={19} aria-hidden /></span>
                  Hỗ trợ vé đã đặt
                </div>
                <h2 className="mt-7 max-w-3xl text-[clamp(2.5rem,5vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-white text-balance">
                  Vé cũ, gọi một cuộc là xong.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                  Đọc mã vé và số điện thoại đã đặt. Alove xác thực, kiểm tra điều kiện rồi mới thực hiện yêu cầu của bạn.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-2"><BadgeCheck className="text-sky-300" size={17} aria-hidden /> Tra cứu thông tin</span>
                  <span className="inline-flex items-center gap-2"><BadgeCheck className="text-sky-300" size={17} aria-hidden /> Đổi chuyến</span>
                  <span className="inline-flex items-center gap-2"><BadgeCheck className="text-sky-300" size={17} aria-hidden /> Yêu cầu huỷ vé</span>
                </div>
              </div>

              <aside className="landing-support-action" aria-label="Bắt đầu hỗ trợ vé">
                <div className="landing-support-action-head">
                  <div>
                    <p className="font-mono text-[11px] tracking-[0.12em] text-slate-400">ALOVE / HỖ TRỢ VÉ</p>
                    <p className="mt-2 text-lg font-semibold text-white">Sẵn sàng kết nối</p>
                  </div>
                  <span className="landing-support-live"><span aria-hidden /> Trực tuyến</span>
                </div>

                <div className="landing-support-route" aria-hidden>
                  <span className="landing-support-route-dot" />
                  <span className="landing-support-route-line" />
                  <Headphones size={20} />
                </div>

                <CallOverlay
                  layoutKey="support"
                  label="Gọi Alove hỗ trợ vé"
                  className="mt-7 w-full bg-white text-slate-950 shadow-[0_12px_32px_rgba(0,0,0,0.22)] hover:bg-sky-50 focus-visible:outline-sky-300"
                />
                <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-400">
                  <LockKeyhole className="mt-0.5 shrink-0" size={14} aria-hidden />
                  Chỉ xử lý sau khi thông tin đặt vé được xác thực.
                </p>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      <MobileStickyCall />
    </div>
  )
}
