import { CheckCircleIcon, MicrophoneIcon, WarningCircleIcon } from '@phosphor-icons/react/dist/ssr'
import { AppShell } from '@/components/ui/app-shell'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/input'
import { Panel } from '@/components/ui/panel'
import { StatusDot, StatusPill } from '@/components/ui/status'

const colors = [
  ['Canvas', 'var(--canvas)', '--canvas'],
  ['Surface', 'var(--surface)', '--surface'],
  ['Ink', 'var(--ink)', '--ink'],
  ['Journey', 'var(--action)', '--action'],
  ['Success', 'var(--success)', '--success'],
  ['Warning', 'var(--warning)', '--warning'],
  ['Danger', 'var(--danger)', '--danger'],
] as const

export default function DesignSystemPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold text-[var(--action)]">VéĐi foundations</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">VéĐi design system</h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            Một bề mặt Apple-like rõ ràng và đáng tin cho bàn vận hành đặt vé. Action Blue dẫn hướng, semantic colors chỉ báo trạng thái và mọi control chính có vùng chạm tối thiểu 44px.
          </p>
        </header>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-[-0.03em]">Vai trò màu</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {colors.map(([name, value, token]) => (
              <article className="rounded-[18px] border border-[var(--hairline)] bg-[var(--surface)] p-3" key={name}>
                <div className="h-20 rounded-xl border border-[var(--hairline)]" style={{ backgroundColor: value }} />
                <p className="mt-3 text-sm font-semibold">{name}</p>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">{token}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <Panel title="Hành động và trạng thái" eyebrow="Components">
            <div className="flex flex-wrap items-start gap-3">
              <Button>Bật mic nhân viên</Button>
              <Button variant="secondary">Mở trang người gọi</Button>
              <Button variant="quiet">Nói câu gợi ý</Button>
              <Button disabled disabledReason="Cần đủ thông tin hành khách">Xác nhận vé</Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <StatusPill tone="success">VALSEA đang nghe</StatusPill>
              <StatusPill tone="warning">Chờ xác nhận</StatusPill>
              <StatusPill tone="demo">Demo Web Call</StatusPill>
              <StatusDot tone="info" label="Agent đang nghe" />
            </div>
          </Panel>
          <Panel title="Form đặt vé" eyebrow="Input">
            <TextInput label="Điểm đến" placeholder="Đà Lạt" hint="Mỗi trường hiển thị nguồn, độ tin cậy và trạng thái nhân viên khóa." />
            <div className="mt-5 rounded-xl border border-[var(--divider)] bg-[var(--pearl)] p-4">
              <p className="text-xs font-medium text-[var(--muted)]">Thông tin đã nghe</p>
              <p className="mt-2 text-sm font-medium">Sài Gòn → Đà Lạt · 2 hành khách · tối thứ Sáu</p>
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <Panel title="Thang chữ">
            <p className="text-[34px] font-semibold leading-none tracking-[-0.05em]">34px Display</p>
            <p className="mt-4 text-[21px] font-semibold tracking-[-0.03em]">21px Section</p>
            <p className="mt-4 text-[17px] leading-7">17px body giúp đọc hội thoại dài mà không mỏi.</p>
            <p className="mt-4 font-mono text-xs text-[var(--muted)]">12px · mã vé · thời lượng · trạng thái</p>
          </Panel>
          <Panel title="Ngữ nghĩa trạng thái">
            <div className="space-y-4">
              <div className="flex gap-2"><CheckCircleIcon className="text-[var(--success)]" size={20} weight="fill" aria-hidden /><p className="text-sm">Xanh lá: hoàn tất hoặc có thể tiếp tục.</p></div>
              <div className="flex gap-2"><WarningCircleIcon className="text-[var(--warning)]" size={20} weight="fill" aria-hidden /><p className="text-sm">Cam: cần người dùng hoặc nhân viên xác nhận.</p></div>
              <div className="flex gap-2"><MicrophoneIcon className="text-[var(--action)]" size={20} weight="fill" aria-hidden /><p className="text-sm">Xanh hành trình: hành động, mic và focus.</p></div>
            </div>
          </Panel>
          <Panel title="Quy tắc responsive">
            <p className="text-sm leading-6 text-[var(--muted)]">Desktop ưu tiên ba cột: transcript, phiếu đặt vé, trợ lý nhân viên. Route người gọi dùng một cột để thao tác tốt trên điện thoại; bàn nhân viên xếp dọc khi màn hình hẹp.</p>
          </Panel>
        </section>
      </main>
    </AppShell>
  )
}
