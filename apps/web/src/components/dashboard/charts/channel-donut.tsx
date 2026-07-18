import {
  CHART_EMPTY_LABEL,
  CHART_TONE_VAR,
  CHART_TRACK_VAR,
  formatChartCount,
  formatChartPercent,
  type ChartTone,
} from './chart-tone'

const SIZE = 148
const STROKE = 18
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS
/** Khe hở màu nền giữa hai cung — tách lát bằng khoảng trắng, không bằng viền. */
const GAP = 2

export function ChannelDonut({
  slices,
  ariaLabel,
}: {
  slices: { label: string; value: number; tone: ChartTone }[]
  ariaLabel: string
}) {
  const rows = slices.map((slice) => ({
    ...slice,
    value: Number.isFinite(slice.value) && slice.value > 0 ? slice.value : 0,
  }))
  const total = rows.reduce((sum, slice) => sum + slice.value, 0)
  const drawn = rows.filter((slice) => slice.value > 0)
  const isEmpty = total <= 0
  const gap = drawn.length > 1 ? GAP : 0

  // Điểm bắt đầu của mỗi cung là tổng tỉ lệ của các cung trước nó. Tính bằng
  // prefix-sum thuần thay vì biến chạy để render không phụ thuộc thứ tự gọi.
  const arcs = drawn.map((slice, index) => {
    const fraction = slice.value / total
    const start = drawn.slice(0, index).reduce((sum, prev) => sum + prev.value, 0) / total
    return {
      ...slice,
      length: Math.max(fraction * CIRC - gap, 0.5),
      rotation: -90 + start * 360,
    }
  })

  return (
    <figure className="m-0 flex flex-wrap items-center gap-x-7 gap-y-4">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          role="img"
          aria-label={ariaLabel}
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          className="block"
        >
          <title>{ariaLabel}</title>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={CHART_TRACK_VAR}
            strokeWidth={isEmpty ? STROKE : 1}
            aria-hidden
          />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={CHART_TONE_VAR[arc.tone]}
              strokeWidth={STROKE}
              strokeDasharray={`${arc.length} ${Math.max(CIRC - arc.length, 0)}`}
              transform={`rotate(${arc.rotation} ${SIZE / 2} ${SIZE / 2})`}
            >
              <title>{`${arc.label} — ${formatChartCount(arc.value)} (${formatChartPercent(arc.value, total)})`}</title>
            </circle>
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-section font-semibold tabular-nums tracking-tight text-[var(--ink)]">
            {isEmpty ? '—' : formatChartCount(total)}
          </span>
          <span className="text-metric text-[var(--muted)]">lượt gọi</span>
        </div>
      </div>

      {isEmpty ? (
        <figcaption className="text-metric text-[var(--muted)]">{CHART_EMPTY_LABEL}</figcaption>
      ) : (
        <ul className="m-0 min-w-40 flex-1 list-none space-y-2 p-0">
          {rows.map((slice) => (
            <li key={slice.label} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: CHART_TONE_VAR[slice.tone] }}
              />
              <span className="min-w-0 flex-1 truncate text-ui text-[var(--ink)]">{slice.label}</span>
              <span className="shrink-0 text-ui font-medium tabular-nums text-[var(--ink)]">
                {formatChartCount(slice.value)}
              </span>
              <span className="w-9 shrink-0 text-right text-metric tabular-nums text-[var(--muted)]">
                {formatChartPercent(slice.value, total)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}
