import { CHART_GRID_VAR, CHART_TONE_VAR, sanitizeSeries, type ChartTone } from './chart-tone'

/**
 * Sparkline sống trong thẻ KPI: không trục, không nhãn, không lưới — con số
 * lớn bên cạnh mới là nội dung, đường này chỉ nói "đang lên hay đang xuống".
 * Gốc trục luôn là 0 nên độ dốc không bị phóng đại bằng cách cắt đáy.
 */
const VIEW_W = 100
const VIEW_H = 32

export function Sparkline({
  points,
  tone,
  ariaLabel,
}: {
  points: number[]
  tone: ChartTone
  ariaLabel: string
}) {
  const values = sanitizeSeries(points, points.length)
  const peak = values.reduce((max, value) => Math.max(max, value), 0)
  const isEmpty = values.length < 2 || peak <= 0
  const color = CHART_TONE_VAR[tone]

  const coords = values.map((value, index) => ({
    x: (index / Math.max(values.length - 1, 1)) * VIEW_W,
    y: VIEW_H - (value / (peak || 1)) * (VIEW_H - 3) - 1.5,
  }))
  const line = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width="100%"
      height={VIEW_H}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      className="block"
    >
      <title>{ariaLabel}</title>
      {isEmpty ? (
        <line
          x1={0}
          x2={VIEW_W}
          y1={VIEW_H - 1.5}
          y2={VIEW_H - 1.5}
          stroke={CHART_GRID_VAR}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          aria-hidden
        />
      ) : (
        <g>
          <path
            d={`${line} L ${VIEW_W} ${VIEW_H} L 0 ${VIEW_H} Z`}
            fill={color}
            fillOpacity={0.1}
            aria-hidden
          />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}
    </svg>
  )
}
