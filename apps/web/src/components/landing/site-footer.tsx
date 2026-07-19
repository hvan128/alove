import Link from 'next/link'
import { ArrowUpRight, Code2, ShieldCheck } from 'lucide-react'

import { BrandMark } from '@/components/ui/brand-mark'
import { NewsletterSignup } from './newsletter-signup'

const footerGroups = [
  {
    title: 'Khám phá',
    links: [
      { label: 'Tính năng', href: '/tinh-nang' },
      { label: 'Cách hoạt động', href: '/cach-hoat-dong' },
      { label: 'Dành cho nhà xe', href: '/danh-cho-nha-xe' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Trung tâm hỗ trợ', href: '/ho-tro' },
      { label: 'Câu hỏi thường gặp', href: '/faq' },
      { label: 'Xác minh vé', href: '/verify' },
    ],
  },
  {
    title: 'Pháp lý',
    links: [
      { label: 'Chính sách bảo mật', href: '/bao-mat' },
      { label: 'Điều khoản sử dụng', href: '/dieu-khoan' },
    ],
  },
] as const

export function SiteFooter() {
  return (
    <footer className="alove-site-footer">
      <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-12 sm:px-8 sm:pt-16 lg:pb-10">
        <section className="alove-newsletter" aria-labelledby="newsletter-title">
          <div>
            <p className="alove-footer-kicker">Ghi chú từ phòng điều hành</p>
            <h2 id="newsletter-title" className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
              Nhận cập nhật khi Alove mở tuyến mới
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Email ngắn về lịch mở bán, tính năng cuộc gọi và thay đổi quan trọng. Không gửi thư quảng cáo dồn dập.
            </p>
          </div>
          <NewsletterSignup />
        </section>

        <div className="alove-footer-grid">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex min-h-11 items-center gap-3 rounded-lg text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300">
              <BrandMark className="size-10" />
              <span className="text-xl font-semibold tracking-[-0.04em]">Alove</span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Tổng đài AI tiếng Việt giúp hành khách tìm chuyến, giữ ghế và nhận vé thật từ dữ liệu vận hành của nhà xe.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href="https://github.com/hvan128/alove" target="_blank" rel="noreferrer" className="alove-footer-icon-link">
                <Code2 size={18} aria-hidden /> <span>GitHub</span><ArrowUpRight size={14} aria-hidden />
              </a>
              <Link href="/ban-to-chuc" aria-label="Khu vực ban tổ chức & giám khảo" className="alove-footer-icon-link">
                <ShieldCheck size={17} aria-hidden /> <span>Ban tổ chức</span>
              </Link>
            </div>
          </div>

          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-sm font-semibold text-white">{group.title}</h2>
              <ul className="mt-4 grid gap-1">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="alove-footer-link">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="alove-footer-bottom">
          <p>© {new Date().getFullYear()} Alove. Bảo lưu mọi quyền.</p>
          <p>Được xây dựng cho hành khách và nhà xe Việt Nam.</p>
        </div>
      </div>
    </footer>
  )
}
