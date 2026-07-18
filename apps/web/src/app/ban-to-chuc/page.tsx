import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, FileCheck2, Lock, Monitor, PhoneCall, ShieldCheck } from 'lucide-react'

import { BrandMark } from '@/components/ui/brand-mark'

export const metadata: Metadata = {
  title: 'Khu vực ban tổ chức & giám khảo | Alove',
  description: 'Lối vào riêng để đánh giá trải nghiệm hành khách, bằng chứng kỹ thuật và màn hình vận hành Alove.',
  robots: { index: false, follow: false },
}

const reviewRoutes = [
  {
    step: '01',
    audience: 'Góc nhìn hành khách',
    title: 'Thử đặt vé bằng giọng nói',
    description: 'Mở cuộc gọi thật qua LiveKit và đi trọn luồng tìm chuyến, giữ ghế, xác nhận rồi nhận mã vé.',
    href: '/console',
    cta: 'Mở Web Call',
    access: 'Công khai',
    icon: PhoneCall,
  },
  {
    step: '02',
    audience: 'Bằng chứng kỹ thuật',
    title: 'Kiểm tra kết quả nhận dạng',
    description: 'Đối chiếu audio tổng hợp, ground truth, transcript và sai khác của VALSEA với Whisper.',
    href: '/evidence',
    cta: 'Xem bằng chứng',
    access: 'Công khai',
    icon: FileCheck2,
  },
  {
    step: '03',
    audience: 'Góc nhìn nhà xe',
    title: 'Theo dõi cuộc gọi và booking',
    description: 'Đây là màn vận hành nội bộ của nhà xe, tách khỏi hoạt động của hành khách và chỉ mở bằng khóa truy cập.',
    href: '/dashboard',
    cta: 'Mở màn vận hành',
    access: 'Yêu cầu khóa',
    icon: Monitor,
  },
] as const

export default function OrganizerPage() {
  return (
    <main className="min-h-dvh bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--divider)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold tracking-[-0.02em] focus-visible:outline-2 focus-visible:outline-[var(--action-focus)]"
          >
            <BrandMark /> Alove
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
            <ShieldCheck size={14} aria-hidden /> Khu vực chấm thi
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-3xl">
          <p className="inline-flex rounded-full bg-[var(--action-soft)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--action)]">
            Không thuộc luồng hành khách
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-[-0.05em] sm:text-6xl">
            Một lối vào riêng cho ban tổ chức và giám khảo.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            Ba góc nhìn được tách rõ để chấm sản phẩm mà không làm lẫn trải nghiệm đặt vé của khách với công việc vận hành nhà xe.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 lg:grid-cols-3">
          {reviewRoutes.map(({ step, audience, title, description, href, cta, access, icon: Icon }) => (
            <li key={href}>
              <article className="flex h-full flex-col rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-[var(--action-soft)] text-[var(--action)]">
                    <Icon size={20} aria-hidden />
                  </span>
                  <span className="font-mono text-xs font-medium text-[var(--muted)]">{step}</span>
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--action)]">{audience}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em]">{title}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
                <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--divider)] pt-5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    {access === 'Yêu cầu khóa' ? <Lock size={13} aria-hidden /> : null}
                    {access}
                  </span>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[var(--action)] transition hover:bg-[var(--action-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)]"
                  >
                    {cta} <ArrowRight size={15} aria-hidden />
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ol>

        <aside className="mt-8 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-tint)] p-5 text-sm leading-6 text-[var(--muted)] sm:flex sm:items-center sm:justify-between sm:gap-6">
          <p>
            <strong className="text-[var(--ink)]">Lưu ý về quyền truy cập:</strong> màn vận hành chỉ chứa góc nhìn nhà xe và dữ liệu audit. Ban tổ chức dùng khóa do đội Alove cung cấp; khóa không xuất hiện trên trang công khai.
          </p>
          <Link
            href="/"
            className="mt-3 inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-[var(--action)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] sm:mt-0"
          >
            Về trang hành khách
          </Link>
        </aside>
      </section>
    </main>
  )
}
