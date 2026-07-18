import type { OperationsDashboardSnapshot } from '@/lib/operations/operations-repository'
import { BusIcon, ClockIcon } from '@phosphor-icons/react/dist/ssr'

export function DepartureList({ departures }: { departures: OperationsDashboardSnapshot['departures'] }) {
  return (
    <section aria-labelledby="departures-title" className="rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-5 shadow-[var(--metric-shadow)] sm:p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Hôm nay</p>
        <h2 id="departures-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Chuyến sắp khởi hành</h2>
      </div>
      <div className="mt-5 divide-y divide-[var(--divider)]">
        {departures.map((departure) => {
          const occupied = departure.booked + departure.held
          const occupiedRate = departure.capacity === 0 ? 0 : Math.round((occupied / departure.capacity) * 100)
          return (
            <article key={departure.tripId} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold tracking-[-0.02em]">{departure.routeLabel}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1"><ClockIcon size={14} aria-hidden />{formatDeparture(departure.departureAt)}</span>
                    <span className="inline-flex items-center gap-1"><BusIcon size={14} aria-hidden />{departure.vehicleLabel}</span>
                  </p>
                </div>
                <p className="text-sm font-medium tabular-nums">{departure.available} ghế trống</p>
              </div>
              <div className="mt-4">
                <div
                  role="progressbar"
                  aria-label={`${departure.routeLabel}: ${occupied} trên ${departure.capacity} ghế đã giữ hoặc đặt`}
                  aria-valuemin={0}
                  aria-valuemax={departure.capacity}
                  aria-valuenow={occupied}
                  className="h-2 overflow-hidden rounded-full bg-[var(--divider)]"
                >
                  <div className="h-full rounded-full bg-[var(--action)]" style={{ width: `${occupiedRate}%` }} />
                </div>
                <p className="mt-2 text-xs text-[var(--subtle)]">{departure.booked} đã đặt · {departure.held} đang giữ · {departure.capacity} tổng</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function formatDeparture(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}
