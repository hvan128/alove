import {
  CHART_EMPTY_LABEL,
  CHART_TRACK_VAR,
  formatChartCount,
  formatChartPercent,
} from './chart-tone'

const VIEW_W = 1000
const ROW_H = 44
const BAR_H = 10
/** Tâm thanh nằm dưới dòng nhãn (cao 20px) một khoảng thở 4px. */
const BAR_CENTER = 29

/**
 * Phễu là thang BẬC chứ không phải các hạng mục ngang hàng, nên màu đi theo
 * một dải cùng sắc nhạt dần thay vì năm hue khác nhau: mắt đọc được thứ tự
 * ngay trong màu. Đáy dừng ở 72%: dưới mức đó bậc cuối tụt xuống ~2,5:1 với
 * nền, thủng ngưỡng 3:1 mà WCAG 1.4.11 đòi cho thành phần đồ hoạ.
 */
function stepColor(index: number, total: number): string {
  const ratio = total <= 1 ? 0 : index / (total - 1)
  const weight = Math.round(100 - ratio * 28)
  return `color-mix(in srgb, var(--chart-1) ${weight}%, var(--surface))`
}

export function FunnelBars({
  steps,
  ariaLabel,
}: {
  steps: { label: string; count: number }[]
  ariaLabel: string
}) {
  const rows = steps.map((step) => ({
    label: step.label,
    count: Number.isFinite(step.count) && step.count > 0 ? step.count : 0,
  }))
  const head = rows[0]?.count ?? 0
  const isEmpty = rows.length === 0 || head <= 0
  const height = Math.max(rows.length, 1) * ROW_H - (ROW_H - BAR_CENTER - BAR_H / 2)

  // Bậc sau không bao giờ dài hơn bậc trước: dữ liệu lệch (đếm trễ, sự kiện
  // đến sau) không được phép vẽ ra một cái phễu phình ra giữa chừng.
  const ratios = rows.map((_row, index) =>
    rows
      .slice(0, index + 1)
      .reduce(
        (ceiling, row) =>
          Math.min(ceiling, Math.max(0, Math.min(1, head > 0 ? row.count / head : 0))),
        1,
      ),
  )

  if (isEmpty) {
    return (
      <figure className="m-0">
        <svg
          role="img"
          aria-label={ariaLabel}
          width="100%"
          height={ROW_H}
          viewBox={`0 0 ${VIEW_W} ${ROW_H}`}
          preserveAspectRatio="none"
          className="block"
        >
          <title>{ariaLabel}</title>
          <line
            x1={0}
            x2={VIEW_W}
            y1={ROW_H / 2}
            y2={ROW_H / 2}
            stroke={CHART_TRACK_VAR}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            aria-hidden
          />
        </svg>
        <figcaption className="mt-2 text-metric text-[var(--muted)]">{CHART_EMPTY_LABEL}</figcaption>
      </figure>
    )
  }

  return (
    <figure className="m-0">
      {/* Đệm ngang bằng nửa chiều cao thanh để đầu bo tròn (nét không co giãn)
          không bị viewBox cắt mất ở hai mép. */}
      <div className="relative" style={{ height, paddingInline: BAR_H / 2 }}>
        <div className="absolute inset-y-0" style={{ left: BAR_H / 2, right: BAR_H / 2 }}>
          <svg
            role="img"
            aria-label={ariaLabel}
            width="100%"
            height={height}
            viewBox={`0 0 ${VIEW_W} ${height}`}
            preserveAspectRatio="none"
            className="block"
          >
            <title>{ariaLabel}</title>
            {rows.map((row, index) => {
              const y = index * ROW_H + BAR_CENTER
              return (
                <g key={row.label}>
                  <line
                    x1={0}
                    x2={VIEW_W}
                    y1={y}
                    y2={y}
                    stroke={CHART_TRACK_VAR}
                    strokeWidth={BAR_H}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    aria-hidden
                  />
                  <line
                    x1={0}
                    x2={(ratios[index] ?? 0) * VIEW_W}
                    y1={y}
                    y2={y}
                    stroke={stepColor(index, rows.length)}
                    strokeWidth={BAR_H}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>{`${row.label} — ${formatChartCount(row.count)} (${formatChartPercent(row.count, head)})`}</title>
                  </line>
                </g>
              )
            })}
          </svg>
        </div>

        <ol className="relative m-0 list-none p-0">
          {rows.map((row, index) => (
            <li
              key={row.label}
              className="absolute inset-x-0 flex items-baseline justify-between gap-3"
              style={{ top: index * ROW_H }}
            >
              <span className="min-w-0 truncate text-ui text-[var(--ink)]">{row.label}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                <span className="text-ui font-medium tabular-nums text-[var(--ink)]">
                  {formatChartCount(row.count)}
                </span>
                <span className="text-metric tabular-nums text-[var(--muted)]">
                  {formatChartPercent(row.count, head)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  )
}
