/**
 * Bảng màu chuỗi dữ liệu cho dashboard.
 *
 * Tone là *danh tính* của chuỗi, không phải độ lớn: một chuỗi giữ nguyên tone
 * kể cả khi bị lọc bớt hay tụt hạng, để người đọc đã học "màu này là doanh thu"
 * thì không bị đổi nghĩa. Thứ tự slot chart-1..chart-5 là cố định và không bao
 * giờ được sinh thêm hue mới — quá 5 chuỗi thì gộp phần đuôi vào "Khác".
 *
 * Token thật khai báo trong globals.css cho cả light lẫn dark; ở đây chỉ trỏ
 * tên biến nên component không bao giờ chạm tới hex.
 */
export type ChartTone = 'action' | 'success' | 'violet' | 'warning' | 'muted'

export const CHART_TONE_VAR: Record<ChartTone, string> = {
  action: 'var(--chart-1)',
  success: 'var(--chart-2)',
  violet: 'var(--chart-3)',
  warning: 'var(--chart-4)',
  muted: 'var(--chart-5)',
}

/** Đường lưới và trục: lùi hẳn về sau, chỉ hơn nền đúng một bậc. */
export const CHART_GRID_VAR = 'var(--chart-grid)'

/** Nền của thanh chưa đầy (funnel, meter) — phải đọc được cả hai theme. */
export const CHART_TRACK_VAR = 'var(--chart-track)'

/** Chữ hiển thị khi chưa có số liệu, gom một chỗ để mọi biểu đồ nói giống nhau. */
export const CHART_EMPTY_LABEL = 'Chưa có dữ liệu'

/**
 * Số nguyên kiểu Việt Nam ("12.480"). Biểu đồ chỉ đếm lượt nên không cần phần
 * thập phân; tiền tệ đã có dashboard-format lo.
 */
export function formatChartCount(value: number): string {
  const rounded = Math.round(Number.isFinite(value) ? value : 0)
  const sign = rounded < 0 ? '-' : ''
  return sign + Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/gu, '.')
}

/** Tỉ lệ 0..1 -> "42%". Mẫu bằng 0 thì trả 0% thay vì NaN. */
export function formatChartPercent(part: number, whole: number): string {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return '0%'
  return `${Math.round((part / whole) * 100)}%`
}

/**
 * Nấc trần "đẹp" cho trục dọc. Thang 1/2/5 quá thưa: đỉnh 21 bị đẩy lên 50 nên
 * đường cong chỉ chiếm 42% chiều cao khung, nhìn như biểu đồ rỗng. Thang dày
 * hơn kéo đỉnh lên sát trần mà nhãn vẫn là số nhẩm được.
 */
const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

/**
 * Làm tròn trần lên mốc "đẹp" để nhãn trục là số người đọc nhẩm được, thay vì
 * 1373. Luôn ≥ 1 nên chia cho nó không bao giờ ra NaN.
 *
 * Trục chỉ vẽ ba vạch 0 / giữa / trần, nên trần phải chia đôi ra số nguyên —
 * nếu không vạch giữa mất nhãn và người đọc không còn mốc nào để ước lượng.
 */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1
  const exponent = Math.floor(Math.log10(value))
  const base = 10 ** exponent
  const scaled = value / base
  for (const step of NICE_STEPS) {
    if (scaled > step) continue
    const top = step * base
    if (Number.isInteger(top / 2)) return top
  }
  return 10 * base
}

/** Ép mảng số về đúng độ dài, loại NaN/Infinity/âm — chặn NaN rò vào SVG. */
export function sanitizeSeries(points: readonly number[], length: number): number[] {
  return Array.from({ length }, (_, index) => {
    const raw = points[index]
    return raw !== undefined && Number.isFinite(raw) && raw > 0 ? raw : 0
  })
}

/**
 * Chọn ~5 mốc nhãn trục X. 24 nhãn giờ nhồi cạnh nhau thì không ai đọc, nên
 * lấy thưa và để tooltip gánh phần còn lại.
 */
export function pickTickIndexes(length: number, maxTicks = 5): number[] {
  if (length <= 0) return []
  if (length <= maxTicks) return Array.from({ length }, (_, index) => index)
  const picked = new Set<number>()
  for (let step = 0; step < maxTicks; step += 1) {
    picked.add(Math.round((step * (length - 1)) / (maxTicks - 1)))
  }
  return [...picked].sort((a, b) => a - b)
}
