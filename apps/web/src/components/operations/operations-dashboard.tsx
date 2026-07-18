import type { OperationsDashboardSnapshot } from '@/lib/operations/operations-repository'
import { BellIcon, CheckCircleIcon, HeadsetIcon, PhoneCallIcon, TrendUpIcon } from '@phosphor-icons/react/dist/ssr'
import { ActiveCallList } from './active-call-list'
import { CallQueue } from './call-queue'
import { DepartureList } from './departure-list'
import { MetricCard } from './metric-card'

export function OperationsDashboard({ snapshot }: { snapshot: OperationsDashboardSnapshot }) {
  const metrics = snapshot.metrics
  return (
    <div className="mx-auto max-w-[1240px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--action)]">Trung tâm vận hành</p>
          <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Chào buổi sáng, đội vận hành.</h1>
          <p className="mt-3 max-w-xl leading-7 text-[var(--muted)]">Nhìn nhanh nhu cầu, cuộc gọi và năng lực ghế trước khi bắt đầu ca.</p>
        </div>
        <p className="rounded-full border border-[var(--hairline)] bg-[var(--glass-surface)] px-4 py-2 text-xs text-[var(--muted)] backdrop-blur-xl">
          Cập nhật lúc {formatFreshness(snapshot.freshAt)}
        </p>
      </header>

      <section aria-label="Chỉ số vận hành" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Đang chờ" value={metrics.queuedCalls.toString().padStart(2, '0')} note={`Lâu nhất ${formatWait(metrics.longestWaitSeconds)}`} icon={<PhoneCallIcon size={19} aria-hidden />} />
        <MetricCard label="Đang gọi" value={metrics.activeCalls.toString().padStart(2, '0')} note={`${metrics.callsToday} cuộc gọi hôm nay`} icon={<HeadsetIcon size={19} aria-hidden />} />
        <MetricCard label="Đã xác nhận" value={metrics.confirmedBookings.toString().padStart(2, '0')} note={`Tỷ lệ chuyển đổi ${metrics.conversionRate}%`} icon={<CheckCircleIcon size={19} aria-hidden />} />
        <MetricCard label="Agent hỗ trợ" value={`${metrics.agentAssistRate}%`} note="Tỷ lệ cuộc gọi có tự động hóa" icon={<TrendUpIcon size={19} aria-hidden />} />
      </section>

      {snapshot.alerts.length > 0 ? (
        <section aria-label="Cảnh báo vận hành" className="mt-6 grid gap-3 md:grid-cols-2">
          {snapshot.alerts.map((alert) => (
            <div key={alert.id} className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${alertClass(alert.severity)}`}>
              <BellIcon size={18} aria-hidden />
              <span><strong className="font-semibold">{severityLabel(alert.severity)}.</strong> {alert.message}</span>
            </div>
          ))}
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <CallQueue queue={snapshot.queue} />
        <ActiveCallList calls={snapshot.activeCalls} />
      </div>
      <div className="mt-6">
        <DepartureList departures={snapshot.departures} />
      </div>
    </div>
  )
}

function formatFreshness(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}

function formatWait(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? `${minutes} phút` : `${seconds} giây`
}

function severityLabel(severity: OperationsDashboardSnapshot['alerts'][number]['severity']): string {
  return severity === 'danger' ? 'Khẩn cấp' : severity === 'warning' ? 'Cần chú ý' : 'Thông tin'
}

function alertClass(severity: OperationsDashboardSnapshot['alerts'][number]['severity']): string {
  if (severity === 'danger') return 'border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]'
  if (severity === 'warning') return 'border-[var(--warning)]/20 bg-[var(--warning-soft)] text-[var(--warning)]'
  return 'border-[var(--action)]/20 bg-[var(--action-soft)] text-[var(--action)]'
}
