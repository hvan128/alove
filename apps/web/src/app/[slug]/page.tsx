import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, CircleHelp, Headphones, Mic2, ShieldCheck, Ticket, Users } from 'lucide-react'

import { SiteFooter } from '@/components/landing/site-footer'
import { BrandMark } from '@/components/ui/brand-mark'

type MarketingPage = {
  eyebrow: string
  title: string
  description: string
  sections: Array<{ title: string; body: string; points?: string[] }>
  cta: { label: string; href: string }
}

const pages: Record<string, MarketingPage> = {
  'tinh-nang': {
    eyebrow: 'Tính năng Alove',
    title: 'Một cuộc gọi, từ nhu cầu đến mã vé',
    description: 'Alove kết nối hội thoại tiếng Việt với dữ liệu lịch chạy, ghế và giá thật của nhà xe. AI hiểu yêu cầu; hệ thống vận hành quyết định kết quả.',
    sections: [
      { title: 'Nghe tiếng Việt tự nhiên', body: 'Khách nói như trong một cuộc gọi bình thường, kể cả khi đổi giữa tiếng Việt và tiếng Anh.', points: ['Nhận giọng nói theo thời gian thực', 'Hiểu ngày giờ, điểm đi và điểm đến', 'Hỗ trợ cách nói vùng miền'] },
      { title: 'Tìm trên dữ liệu đang mở bán', body: 'Kết quả tìm kiếm dùng cùng inventory với hệ thống nhà xe, không dùng lịch hoặc giá dựng sẵn.', points: ['Chỉ đề xuất chuyến còn chỗ', 'Giá và điểm đón từ dữ liệu vận hành', 'Giữ ghế có thời hạn để tránh bán trùng'] },
      { title: 'Xác nhận trước khi đặt', body: 'Alove đọc lại hành trình, số khách, ghế và tổng tiền. Vé chỉ được tạo sau khi khách xác nhận rõ ràng.', points: ['Không tự ý đặt vé', 'Mã vé và QR có thể xác minh', 'Hỗ trợ tra cứu, đổi hoặc yêu cầu huỷ'] },
    ],
    cta: { label: 'Thử gọi Alove', href: '/console' },
  },
  'cach-hoat-dong': {
    eyebrow: 'Cách hoạt động',
    title: 'Bốn bước nghe được, kiểm tra được',
    description: 'Mỗi bước trong cuộc gọi đều có trách nhiệm rõ ràng. Alove không để mô hình ngôn ngữ tự tạo lịch chạy, giá hoặc mã vé.',
    sections: [
      { title: '1. Bạn nói nhu cầu', body: 'Cho Alove biết nơi đi, nơi đến, thời gian và số người. Nếu thiếu thông tin, Alove hỏi tiếp từng ý ngắn.' },
      { title: '2. Alove tìm chuyến', body: 'Hệ thống tra cứu các chuyến đang mở bán và trả về lựa chọn còn ghế phù hợp.' },
      { title: '3. Bạn xác nhận', body: 'Alove đọc lại toàn bộ thông tin quan trọng. Ghế chỉ được xác nhận khi bạn đồng ý rõ ràng.' },
      { title: '4. Bạn nhận vé', body: 'Mã vé, ghế, tổng tiền và QR xác minh được hiển thị ngay sau khi đặt thành công.' },
    ],
    cta: { label: 'Bắt đầu cuộc gọi', href: '/console' },
  },
  'danh-cho-nha-xe': {
    eyebrow: 'Dành cho nhà xe',
    title: 'Nhận cuộc gọi đặt vé mà không tách rời vận hành',
    description: 'Alove được thiết kế để đứng trước inventory hiện có của nhà xe, xử lý yêu cầu lặp lại và để nhân viên tập trung vào tình huống cần con người.',
    sections: [
      { title: 'Dữ liệu nhà xe là nguồn sự thật', body: 'Nhà xe quản lý tuyến, chuyến, giá, điểm đón và sơ đồ ghế. Alove chỉ đọc và thao tác qua hợp đồng API có kiểm soát.' },
      { title: 'Theo dõi cuộc gọi', body: 'Màn vận hành hiển thị trạng thái cuộc gọi, transcript đã hoàn tất và booking tương ứng để đội ngũ kiểm tra.' },
      { title: 'Tích hợp an toàn', body: 'Token ngắn hạn, phân quyền agent và idempotency bảo vệ luồng đặt vé khỏi giả mạo hoặc tạo trùng.' },
    ],
    cta: { label: 'Xem khu vực vận hành', href: '/dashboard' },
  },
  'ho-tro': {
    eyebrow: 'Trung tâm hỗ trợ',
    title: 'Chọn đúng lối hỗ trợ cho vé của bạn',
    description: 'Alove có thể giúp tìm chuyến mới, tra cứu vé đã đặt và hướng dẫn xác minh. Các yêu cầu đổi hoặc huỷ luôn cần kiểm tra quyền sở hữu vé.',
    sections: [
      { title: 'Đặt vé mới', body: 'Mở Web Call, cho phép micro và nói điểm đi, điểm đến cùng ngày muốn khởi hành.', points: ['Dùng tai nghe nếu nơi xung quanh ồn', 'Nói từng thông tin ngắn', 'Nghe lại trước khi xác nhận'] },
      { title: 'Tra cứu hoặc yêu cầu huỷ', body: 'Chuẩn bị mã vé và số điện thoại đã dùng khi đặt. Alove chỉ xử lý sau khi hai thông tin khớp.' },
      { title: 'Xác minh mã QR', body: 'Mở trang xác minh từ QR hoặc nhập mã vé, sau đó cung cấp số điện thoại để xem thông tin tối thiểu của vé.' },
    ],
    cta: { label: 'Mở Web Call', href: '/console' },
  },
  faq: {
    eyebrow: 'Câu hỏi thường gặp',
    title: 'Những điều cần biết trước cuộc gọi đầu tiên',
    description: 'Câu trả lời ngắn cho các tình huống hành khách thường gặp khi dùng Alove.',
    sections: [
      { title: 'Alove có tự quyết định giá vé không?', body: 'Không. Giá được lấy từ chuyến đang mở bán trong dữ liệu vận hành của nhà xe.' },
      { title: 'Nói nhầm có bị đặt vé ngay không?', body: 'Không. Alove phải đọc lại thông tin và chờ bạn xác nhận rõ ràng trước khi tạo vé.' },
      { title: 'Tôi có cần cài ứng dụng không?', body: 'Không. Bạn có thể dùng Web Call ngay trên trình duyệt hỗ trợ micro.' },
      { title: 'Vì sao cần số điện thoại khi xác minh?', body: 'Mã vé có thể bị nhìn thấy hoặc chia sẻ. Số điện thoại là lớp kiểm tra quyền sở hữu trước khi hiển thị thông tin vé.' },
      { title: 'Alove có lưu bản ghi âm không?', body: 'Không. Hệ thống chỉ lưu dữ liệu tối thiểu phục vụ vận hành như transcript hoàn chỉnh và trạng thái booking; không lưu raw audio.' },
    ],
    cta: { label: 'Cần hỗ trợ thêm', href: '/ho-tro' },
  },
  'bao-mat': {
    eyebrow: 'Chính sách bảo mật',
    title: 'Thu thập ít, dùng đúng mục đích',
    description: 'Chính sách này mô tả cách Alove xử lý dữ liệu khi bạn gọi, đặt vé, xác minh vé hoặc đăng ký nhận cập nhật. Cập nhật ngày 19/07/2026.',
    sections: [
      { title: 'Dữ liệu được xử lý', body: 'Alove xử lý thông tin hành trình, tên hành khách, số điện thoại, transcript đã hoàn tất, mã vé và email nếu bạn chủ động đăng ký nhận tin.' },
      { title: 'Mục đích sử dụng', body: 'Dữ liệu được dùng để tìm chuyến, giữ ghế, tạo và xác minh vé, hỗ trợ yêu cầu sau đặt vé, giám sát chất lượng vận hành và gửi cập nhật đã được đồng ý.' },
      { title: 'Giới hạn lưu trữ', body: 'Alove không lưu raw audio. Credential của nhà cung cấp không được gửi xuống trình duyệt. Dữ liệu xác minh chỉ được trả về sau khi mã vé và số điện thoại khớp.' },
      { title: 'Quyền của bạn', body: 'Bạn có thể yêu cầu xem, sửa hoặc xoá dữ liệu phù hợp với nghĩa vụ vận hành và pháp luật áp dụng. Với email bản tin, bạn có thể yêu cầu dừng nhận và xoá đăng ký.' },
    ],
    cta: { label: 'Xem trung tâm hỗ trợ', href: '/ho-tro' },
  },
  'dieu-khoan': {
    eyebrow: 'Điều khoản sử dụng',
    title: 'Điều kiện khi sử dụng Alove',
    description: 'Các điều khoản dưới đây áp dụng cho Web Call, tra cứu và xác minh vé trên Alove. Cập nhật ngày 19/07/2026.',
    sections: [
      { title: 'Vai trò của Alove', body: 'Alove là giao diện hội thoại kết nối hành khách với dữ liệu và quy trình đặt vé của nhà xe. Lịch, giá, chính sách đổi huỷ và năng lực vận chuyển do nhà xe cung cấp.' },
      { title: 'Xác nhận đặt vé', body: 'Bạn chịu trách nhiệm nghe và kiểm tra thông tin được đọc lại. Vé chỉ được tạo sau khi bạn xác nhận; mã vé là bằng chứng để tra cứu giao dịch.' },
      { title: 'Sử dụng hợp lệ', body: 'Không được giả mạo danh tính, dò mã vé, can thiệp cuộc gọi, khai thác hệ thống tự động hoặc sử dụng dịch vụ để gây gián đoạn cho người khác.' },
      { title: 'Gián đoạn dịch vụ', body: 'Khi database, nhà cung cấp cuộc gọi hoặc kết nối nhà xe không sẵn sàng, Alove sẽ báo lỗi thay vì tạo một kết quả giả. Bạn có thể thử lại hoặc liên hệ nhà xe theo kênh chính thức.' },
    ],
    cta: { label: 'Quay về trang chủ', href: '/' },
  },
}

const sectionIcons = [Mic2, Ticket, ShieldCheck, Headphones, CircleHelp, Users]

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = pages[slug]
  if (!page) return {}
  return { title: `${page.eyebrow} | Alove`, description: page.description }
}

export default async function MarketingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = pages[slug]
  if (!page) notFound()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex min-h-11 items-center gap-3 rounded-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
            <BrandMark className="size-9" /> Alove
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <ArrowLeft size={16} aria-hidden /> Trang chủ
          </Link>
        </div>
      </header>

      <main>
        <section className="marketing-page-hero">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <p className="text-sm font-semibold text-blue-700">{page.eyebrow}</p>
            <h1 className="mt-5 max-w-4xl text-[clamp(2.8rem,6vw,5.6rem)] font-bold leading-[0.98] tracking-[-0.065em] text-balance">{page.title}</h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{page.description}</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-x-16 gap-y-14 lg:grid-cols-2">
            {page.sections.map((section, index) => {
              const Icon = sectionIcons[index % sectionIcons.length]!
              return (
                <article key={section.title} className="marketing-page-section">
                  <span className="marketing-page-icon"><Icon size={20} aria-hidden /></span>
                  <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">{section.title}</h2>
                  <p className="mt-3 text-base leading-7 text-slate-600">{section.body}</p>
                  {section.points ? (
                    <ul className="mt-5 grid gap-3 text-sm text-slate-700">
                      {section.points.map((point) => <li key={point} className="flex gap-2.5"><Check size={17} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />{point}</li>)}
                    </ul>
                  ) : null}
                </article>
              )
            })}
          </div>

          <div className="mt-16 border-t border-slate-200 pt-10">
            <Link href={page.cta.href} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blue-600">
              {page.cta.label} <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
