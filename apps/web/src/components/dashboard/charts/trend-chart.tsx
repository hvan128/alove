import {
  CHART_EMPTY_LABEL,
  CHART_GRID_VAR,
  CHART_TONE_VAR,
  formatChartCount,
  niceCeil,
  pickTickIndexes,
  sanitizeSeries,
  type ChartTone,
} from './chart-tone'

export type TrendSeries = { name: string; tone: ChartTone; points: number[] }

/**
 * Hệ toạ độ trong: rộng cố định 1000 đơn vị, cao đúng bằng số px của prop
 * height. Kết hợp preserveAspectRatio="none" thì trục dọc là 1:1 với px (nét
 * và khoảng cách dọc luôn đúng) còn trục ngang co giãn theo container. Nét vẽ
 * dùng vector-effect="non-scaling-stroke" nên không bị kéo dày mỏng theo.
 */
const VIEW_W = 1000

/**
 * Đệm dọc trong viewBox: đường lưới biên và đỉnh đường cong (nét 2px) nằm đúng
 * y=0 / y=height sẽ bị SVG xén mất một nửa, khiến biên trông nhạt hơn hẳn.
 */
const PAD = 3

type Point = { x: number; y: number }

/**
 * Nội suy Hermite đơn điệu (Fritsch–Carlson): đường cong mềm nhưng KHÔNG vọt
 * xuống dưới 0 hay lên trên đỉnh giữa hai mốc — biểu đồ đếm cuộc gọi mà vẽ
 * thành âm thì là nói dối.
 */
function smoothPath(points: Point[]): string {
  const first = points[0]
  if (!first) return ''
  if (points.length === 1) return `M ${first.x} ${first.y}`

  const deltas: number[] = []
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]
    const b = points[i + 1]
    if (!a || !b) continue
    const dx = b.x - a.x
    deltas.push(dx === 0 ? 0 : (b.y - a.y) / dx)
  }

  const slopes: number[] = []
  for (let i = 0; i < points.length; i += 1) {
    const prev = deltas[i - 1]
    const cur = deltas[i]
    if (i === 0) slopes.push(deltas[0] ?? 0)
    else if (i === points.length - 1) slopes.push(deltas[deltas.length - 1] ?? 0)
    else if (prev === undefined || cur === undefined || prev * cur <= 0) slopes.push(0)
    else {
      const avg = (prev + cur) / 2
      const limit = 3 * Math.min(Math.abs(prev), Math.abs(cur))
      slopes.push(Math.sign(avg) * Math.min(Math.abs(avg), limit))
    }
  }

  let path = `M ${first.x} ${first.y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]
    const b = points[i + 1]
    const sa = slopes[i]
    const sb = slopes[i + 1]
    if (!a || !b || sa === undefined || sb === undefined) continue
    const dx = (b.x - a.x) / 3
    path += ` C ${a.x + dx} ${a.y + sa * dx}`
    path += ` ${b.x - dx} ${b.y - sb * dx}`
    path += ` ${b.x} ${b.y}`
  }
  return path
}

export function TrendChart({
  labels,
  series,
  ariaLabel,
  height = 180,
}: {
  labels: string[]
  series: TrendSeries[]
  ariaLabel: string
  height?: number
}) {
  const length = labels.length
  const rows = series.map((entry) => ({
    ...entry,
    points: sanitizeSeries(entry.points, length),
  }))
  const peak = rows.reduce(
    (max, entry) => entry.points.reduce((inner, value) => Math.max(inner, value), max),
    0,
  )
  const isEmpty = length === 0 || rows.length === 0 || peak <= 0
  const top = niceCeil(peak)
  const midTick = top / 2
  const gridFractions = [0, 0.5, 1]

  const xAt = (index: number) => (length <= 1 ? VIEW_W / 2 : (index / (length - 1)) * VIEW_W)
  const plotH = Math.max(height - PAD * 2, 1)
  const yAt = (value: number) => PAD + (1 - value / top) * plotH
  const gridYAt = (fraction: number) => PAD + fraction * plotH

  // Một chuỗi thì tô nền dưới đường cho dễ đọc khối lượng; từ hai chuỗi trở lên
  // các mảng tô chồng nhau sẽ đục, nên chỉ còn đường.
  const withArea = rows.length === 1

  return (
    <figure className="m-0 flex flex-col gap-3">
      <ul className="m-0 flex list-none flex-wrap items-center gap-x-5 gap-y-1.5 p-0">
        {rows.map((entry) => {
          const latest = entry.points[length - 1] ?? 0
          return (
            <li key={entry.name} className="flex items-center gap-2 text-metric">
              <span
                aria-hidden
                className="h-0.5 w-3.5 shrink-0 rounded-full"
                style={{ background: CHART_TONE_VAR[entry.tone] }}
              />
              <span className="text-[var(--muted)]">{entry.name}</span>
              <span className="font-medium tabular-nums text-[var(--ink)]">
                {formatChartCount(latest)}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="flex items-stretch gap-3">
        <div className="relative w-9 shrink-0" style={{ height }} aria-hidden>
          {[top, midTick, 0].map((tick, index) =>
            index === 1 && !Number.isInteger(midTick) ? null : (
              <span
                key={tick}
                className="absolute right-0 -translate-y-1/2 text-metric tabular-nums text-[var(--muted)]"
                style={{ top: gridYAt(gridFractions[index] ?? 0) }}
              >
                {isEmpty && index !== 2 ? '' : formatChartCount(tick)}
              </span>
            ),
          )}
        </div>

        {/* Đệm ngang 1px: đầu bo tròn của nét không co giãn ở x=0 và x=VIEW_W
            cũng bị viewBox cắt mất một nửa nếu dán sát mép. */}
        <div className="relative min-w-0 flex-1 px-px">
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

            {gridFractions.map((fraction) => (
              <line
                key={fraction}
                x1={0}
                x2={VIEW_W}
                y1={gridYAt(fraction)}
                y2={gridYAt(fraction)}
                stroke={CHART_GRID_VAR}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                aria-hidden
              />
            ))}

            {!isEmpty &&
              rows.map((entry) => {
                const coords = entry.points.map((value, index) => ({
                  x: xAt(index),
                  y: yAt(value),
                }))
                const line = smoothPath(coords)
                const tone = CHART_TONE_VAR[entry.tone]
                const head = coords[0]
                const tail = coords[coords.length - 1]
                if (!head || !tail) return null

                // Một mốc duy nhất không thành đường: vẽ thành chấm bằng nét
                // tròn để không rơi vào path rỗng.
                if (coords.length === 1) {
                  return (
                    <line
                      key={entry.name}
                      x1={head.x}
                      x2={head.x}
                      y1={head.y}
                      y2={head.y}
                      stroke={tone}
                      strokeWidth={7}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  )
                }

                return (
                  <g key={entry.name}>
                    {withArea ? (
                      <path
                        d={`${line} L ${tail.x} ${yAt(0)} L ${head.x} ${yAt(0)} Z`}
                        fill={tone}
                        fillOpacity={0.1}
                        aria-hidden
                      />
                    ) : null}
                    <path
                      d={line}
                      fill="none"
                      stroke={tone}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                )
              })}

            {/* Cột trong suốt phủ từng mốc: tooltip gốc của trình duyệt, không
                cần JS và vẫn chạy khi hydrate lỗi. */}
            {!isEmpty && length > 0
              ? labels.map((label, index) => {
                  const band = length <= 1 ? VIEW_W : VIEW_W / (length - 1)
                  const left = Math.max(0, xAt(index) - band / 2)
                  const width = Math.min(band, VIEW_W - left)
                  const readout = rows
                    .map((entry) => `${entry.name} ${formatChartCount(entry.points[index] ?? 0)}`)
                    .join(' · ')
                  return (
                    <rect
                      key={label + String(index)}
                      x={left}
                      y={0}
                      width={width}
                      height={height}
                      fill="transparent"
                      aria-hidden
                    >
                      <title>{`${label} — ${readout}`}</title>
                    </rect>
                  )
                })
              : null}
          </svg>

          {isEmpty ? (
            <p className="absolute inset-0 m-0 flex items-center justify-center text-metric text-[var(--muted)]">
              {CHART_EMPTY_LABEL}
            </p>
          ) : null}
        </div>
      </div>

      {/* Số của từng mốc chỉ nằm trong tooltip của <rect aria-hidden>, mà screen
          reader coi cả <svg role="img"> là một hình duy nhất nên không đọc tới.
          Bảng ẩn này là bản đọc song song, không đổi gì phần nhìn. */}
      {isEmpty ? null : (
        <table className="sr-only">
          <caption>{ariaLabel}</caption>
          <thead>
            <tr>
              <th scope="col">Mốc</th>
              {rows.map((entry) => (
                <th scope="col" key={entry.name}>
                  {entry.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((label, index) => (
              <tr key={label + String(index)}>
                <th scope="row">{label}</th>
                {rows.map((entry) => (
                  <td key={entry.name}>{formatChartCount(entry.points[index] ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="relative ml-12 h-4">
        {isEmpty
          ? null
          : pickTickIndexes(length).map((index) => {
              const ratio = length <= 1 ? 0.5 : index / (length - 1)
              const alignment =
                ratio === 0 ? 'translateX(0)' : ratio === 1 ? 'translateX(-100%)' : 'translateX(-50%)'
              return (
                <span
                  key={labels[index] + String(index)}
                  className="absolute top-0 whitespace-nowrap text-metric tabular-nums text-[var(--muted)]"
                  style={{ left: `${ratio * 100}%`, transform: alignment }}
                >
                  {labels[index]}
                </span>
              )
            })}
      </div>
    </figure>
  )
}
