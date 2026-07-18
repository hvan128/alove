import { ArrowDownRight, ArrowUpRight, CircleAlert, CircleCheck, Mic } from 'lucide-react'
import { AppShell } from '@/components/ui/app-shell'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/input'
import { Panel } from '@/components/ui/panel'
import { StatusDot, StatusPill } from '@/components/ui/status'

const colors = [
  ['Canvas', 'var(--canvas)', '--canvas'],
  ['Surface', 'var(--surface)', '--surface'],
  ['Ink', 'var(--ink)', '--ink'],
  ['Primary', 'var(--action)', '--action'],
  ['Success', 'var(--success)', '--success'],
  ['Warning', 'var(--warning)', '--warning'],
  ['Danger', 'var(--danger)', '--danger'],
] as const

const chartColors = [
  ['Chuỗi 1 · chính', 'var(--chart-1)', '--chart-1'],
  ['Chuỗi 2', 'var(--chart-2)', '--chart-2'],
  ['Chuỗi 3', 'var(--chart-3)', '--chart-3'],
  ['Chuỗi 4', 'var(--chart-4)', '--chart-4'],
  ['Chuỗi 5 · nền', 'var(--chart-5)', '--chart-5'],
  ['Lưới', 'var(--chart-grid)', '--chart-grid'],
] as const

const kpiCards = [
  { label: 'Cuộc gọi hôm nay', value: '1.284', unit: 'cuộc', delta: 12.4, note: 'so với hôm qua · 1.142' },
  { label: 'Doanh thu', value: '86,4', unit: 'tr', delta: 4.1, note: 'so với hôm qua · 82,9 tr' },
  { label: 'Thời lượng trung bình', value: '4:12', unit: 'phút', delta: -6.8, note: 'so với hôm qua · 4:31' },
] as const

export default function DesignSystemPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold text-[var(--action)]">Alove foundations</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Alove design system</h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            Một bề mặt SaaS trung tính, gọn gàng, rõ ràng và đáng tin cho hành trình đặt vé. Font IBM Plex, primary indigo dẫn hướng, semantic colors chỉ báo trạng thái, elevation ngữ nghĩa và dark mode đi theo thiết bị.
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
              <Button>Bắt đầu Web Call</Button>
              <Button variant="secondary">Chuyển nhân viên</Button>
              <Button variant="quiet">Phát lại giọng</Button>
              <Button disabled disabledReason="Cần đủ thông tin hành khách">Xác nhận vé</Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <StatusPill tone="success">Đã giữ vé</StatusPill>
              <StatusPill tone="warning">Chờ xác nhận</StatusPill>
              <StatusPill tone="demo">Demo Web Call</StatusPill>
              <StatusDot tone="info" label="Agent đang nghe" />
            </div>
          </Panel>
          <Panel title="Form đặt vé" eyebrow="Input">
            <TextInput label="Lời khách hàng" placeholder="Tôi cần hai vé đi Đà Lạt..." hint="Label luôn liên kết với input và có trạng thái focus rõ." />
            <div className="mt-5 rounded-xl border border-[var(--divider)] bg-[var(--pearl)] p-4">
              <p className="text-xs font-medium text-[var(--muted)]">Thông tin đã nghe</p>
              <p className="mt-2 text-sm font-medium">Sài Gòn → Đà Lạt · 2 hành khách · tối thứ Sáu</p>
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <Panel title="Thang chữ · IBM Plex">
            <p className="text-[34px] font-semibold leading-none tracking-[-0.05em]">34px Display</p>
            <p className="mt-4 text-[21px] font-semibold tracking-[-0.03em]">21px Section</p>
            <p className="mt-4 text-[17px] leading-7">17px body giúp đọc hội thoại dài mà không mỏi.</p>
            <p className="mt-4 font-mono text-xs text-[var(--muted)]">12px mono · mã vé · thời lượng · trạng thái</p>
          </Panel>
          <Panel title="Ngữ nghĩa trạng thái">
            <div className="space-y-4">
              <div className="flex gap-2"><CircleCheck className="text-[var(--success)]" size={20} aria-hidden /><p className="text-sm">Xanh lá: hoàn tất hoặc có thể tiếp tục.</p></div>
              <div className="flex gap-2"><CircleAlert className="text-[var(--warning)]" size={20} aria-hidden /><p className="text-sm">Cam: cần người dùng hoặc nhân viên xác nhận.</p></div>
              <div className="flex gap-2"><Mic className="text-[var(--action)]" size={20} aria-hidden /><p className="text-sm">Indigo: hành động, mic và focus.</p></div>
            </div>
          </Panel>
          <Panel title="Quy tắc responsive">
            <p className="text-sm leading-6 text-[var(--muted)]">Hai phía đặt cạnh nhau ở desktop và xếp dọc trên màn hình nhỏ. Trạng thái cuộc gọi, chế độ trả lời và nút bắt đầu luôn đứng trước nội dung hội thoại. Mọi control chính giữ vùng chạm tối thiểu 44px.</p>
          </Panel>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-[-0.03em]">Màu chuỗi dữ liệu</h2>
          <p className="mt-2 max-w-2xl text-ui leading-6 text-[var(--muted)]">
            Biểu đồ chỉ được lấy màu từ bộ <span className="font-mono">--chart-*</span>. Chuỗi 1 bám theo primary indigo để dashboard nối liền mạch với phần còn lại; bốn chuỗi sau chạy trên trục xanh–vàng nên không có cặp đỏ/xanh lá đứng cạnh nhau. Mỗi chuỗi lệch độ sáng so với chuỗi kề, đọc được cả khi in đen trắng.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {chartColors.map(([name, value, token]) => (
              <article className="rounded-[12px] border border-[var(--hairline)] bg-[var(--surface)] p-3" key={token}>
                <div className="h-14 rounded-lg border border-[var(--hairline)]" style={{ backgroundColor: value }} />
                <p className="mt-3 text-metric font-semibold">{name}</p>
                <p className="mt-1 font-mono text-metric text-[var(--muted)]">{token}</p>
              </article>
            ))}
          </div>
          <div className="mt-3 rounded-[12px] border border-[var(--hairline)] bg-[var(--surface-sunken)] p-4">
            <p className="text-metric text-[var(--muted)]">
              Giếng lõm <span className="font-mono">--surface-sunken</span> dùng cho hàng xen kẽ trong bảng và vùng chứa biểu đồ. Thanh chưa đầy nằm trên <span className="font-mono">--chart-track</span>:
            </p>
            <div className="mt-3 space-y-2">
              {[82, 54, 27].map((pct, index) => (
                <div className="h-2 overflow-hidden rounded-full bg-[var(--chart-track)]" key={pct}>
                  <div
                    className="h-full rounded-full"
                    style={{ backgroundColor: `var(--chart-${index + 1})`, width: `${pct}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-[-0.03em]">Màu số liệu (KPI)</h2>
          <p className="mt-2 max-w-2xl text-ui leading-6 text-[var(--muted)]">
            Số lớn dùng <span className="font-mono">tabular-nums</span> và tracking âm để các thẻ đứng cạnh nhau không nhảy chiều rộng. Delta luôn kèm mũi tên và dấu, không chỉ dựa vào màu.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kpiCards.map((kpi) => {
              const isUp = kpi.delta >= 0
              const DeltaIcon = isUp ? ArrowUpRight : ArrowDownRight
              return (
                <article className="rounded-[16px] border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]" key={kpi.label}>
                  <p className="text-metric font-medium text-[var(--muted)]">{kpi.label}</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-display font-semibold tabular-nums tracking-[-0.04em]">{kpi.value}</span>
                    <span className="text-ui text-[var(--muted)]">{kpi.unit}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-metric font-semibold tabular-nums"
                      style={{
                        color: isUp ? 'var(--success)' : 'var(--danger)',
                        backgroundColor: `color-mix(in srgb, ${isUp ? 'var(--success)' : 'var(--danger)'} 12%, transparent)`,
                      }}
                    >
                      <DeltaIcon size={13} aria-hidden />
                      {isUp ? '+' : '−'}
                      {Math.abs(kpi.delta).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                    </span>
                    <span className="text-metric text-[var(--muted)]">{kpi.note}</span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </AppShell>
  )
}
