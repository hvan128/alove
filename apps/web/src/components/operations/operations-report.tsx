import type { OperationsReportData } from '@/lib/operations/operations-repository'
import { ChartBarIcon, RobotIcon, TicketIcon } from '@phosphor-icons/react/dist/ssr'
import { MetricCard } from './metric-card'

export function OperationsReport({ report }: { report: OperationsReportData }) {
  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-medium text-[var(--action)]">Phân tích theo kỳ</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Báo cáo vận hành</h1>
          <p className="mt-3 text-[var(--muted)]">Từ {formatDate(report.range.from)} đến {formatDate(report.range.to)}</p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2 rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-3">
          <DateField label="Từ ngày" name="from" value={report.range.from.slice(0, 10)} />
          <DateField label="Đến ngày" name="to" value={report.range.to.slice(0, 10)} />
          <button type="submit" className="min-h-11 rounded-full bg-[var(--ink)] px-4 text-sm font-medium text-[var(--on-ink)]">Xem báo cáo</button>
        </form>
      </header>

      <section aria-label="Chỉ số báo cáo" className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Tổng cuộc gọi" value={String(report.totals.calls)} note="Trong khoảng đã chọn" icon={<ChartBarIcon size={19} aria-hidden />} />
        <MetricCard label="Vé xác nhận" value={String(report.totals.confirmed)} note="Booking phát hành mã" icon={<TicketIcon size={19} aria-hidden />} />
        <MetricCard label="Chuyển đổi" value={`${report.totals.conversionRate}%`} note={`${report.totals.conversionRate}% chuyển đổi`} />
        <MetricCard label="Tự động hóa" value={`${report.totals.agentAssistRate}%`} note={`${report.totals.agentAssistRate}% Agent hỗ trợ`} icon={<RobotIcon size={19} aria-hidden />} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="outcomes-title" className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--metric-shadow)] sm:p-6">
          <h2 id="outcomes-title" className="text-2xl font-semibold tracking-[-0.04em]">Kết quả cuộc gọi</h2>
          <div className="mt-5 space-y-4">
            {report.outcomes.map((outcome) => <ReportBar key={outcome.label} label={`${outcome.label} · ${outcome.count}`} value={outcome.count} max={Math.max(1, report.totals.calls)} ariaLabel={`Kết quả ${outcome.label}`} />)}
          </div>
        </section>
        <section aria-labelledby="route-load-title" className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--metric-shadow)] sm:p-6">
          <h2 id="route-load-title" className="text-2xl font-semibold tracking-[-0.04em]">Tải theo tuyến</h2>
          <div className="mt-5 space-y-4">
            {report.routes.map((route) => <ReportBar key={route.routeLabel} label={`${route.routeLabel} · ${route.booked}/${route.capacity}`} value={route.booked} max={Math.max(1, route.capacity)} ariaLabel={`Tải tuyến ${route.routeLabel}`} />)}
            {report.routes.length === 0 ? <p className="text-sm text-[var(--muted)]">Chưa có dữ liệu tải tuyến trong khoảng này.</p> : null}
          </div>
        </section>
      </div>
      <p className="mt-5 text-xs text-[var(--muted)]">Cập nhật lúc {formatTimestamp(report.freshAt)} · {report.mode === 'memory' ? 'Mô phỏng · không bền vững' : 'Neon'}</p>
    </div>
  )
}

function DateField({ label, name, value }: { label: string; name: string; value: string }) {
  return <label className="text-xs font-medium text-[var(--muted)]">{label}<input type="date" name={name} defaultValue={value} className="mt-1 block min-h-11 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]" /></label>
}

function ReportBar({ label, value, max, ariaLabel }: { label: string; value: number; max: number; ariaLabel: string }) {
  const width = Math.min(100, Math.round((value / max) * 100))
  return <div><div className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><span className="text-[var(--muted)]">{width}%</span></div><div role="progressbar" aria-label={ariaLabel} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--divider)]"><div className="h-full rounded-full bg-[var(--action)]" style={{ width: `${width}%` }} /></div></div>
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))
}
