// Định dạng số/thời lượng cho dashboard. Tách riêng khỏi tầng dữ liệu để chart
// và card dùng chung một cách hiển thị, và để test được mà không cần DB.

const VND_GROUPS = /\B(?=(\d{3})+(?!\d))/gu

function safeInt(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0
}

function groupThousands(value: number): string {
  return String(value).replace(VND_GROUPS, '.')
}

// Bỏ số 0 thừa sau dấu phẩy: 1,50 -> 1,5 và 2,00 -> 2.
function trimDecimals(text: string): string {
  if (!text.includes(',')) return text
  return text.replace(/,?0+$/u, '')
}

// Số càng lớn càng ít cần phần thập phân — giữ độ dài chuỗi ổn định trong bảng.
function compact(value: number, unit: string): string {
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${trimDecimals(value.toFixed(digits).replace('.', ','))} ${unit}`
}

export function formatVnd(value: number): string {
  const amount = safeInt(value)
  const sign = amount < 0 ? '-' : ''
  return `${sign}${groupThousands(Math.abs(amount))} đ`
}

export function formatCompactVnd(value: number): string {
  const amount = safeInt(value)
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  if (abs >= 1_000_000_000) return `${sign}${compact(abs / 1_000_000_000, 'tỷ')}`
  if (abs >= 1_000_000) return `${sign}${compact(abs / 1_000_000, 'tr')}`
  if (abs >= 1_000) return `${sign}${compact(abs / 1_000, 'ng')}`
  return `${sign}${abs} đ`
}

// Dạng đọc thành lời, dành cho aria-label — screen reader không đọc được "4:12".
export function formatDurationSec(value: number): string {
  const total = Math.max(0, safeInt(value))
  if (total === 0) return '0 giây'

  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} giờ`)
  if (minutes > 0) parts.push(`${minutes} phút`)
  if (seconds > 0) parts.push(`${seconds} giây`)
  return parts.join(' ')
}

// Dạng đồng hồ, dành cho phần nhìn — ngắn và canh cột đẹp với tabular-nums.
export function formatClock(value: number): string {
  const total = Math.max(0, safeInt(value))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

// Nhận tỉ lệ 0..1 (0.42 -> "42%"), không nhận sẵn số 42.
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(value * 100)}%`
}

// Trả về tỉ lệ thay đổi dạng phân số (0.25 = tăng 25%), dùng chung formatPercent.
// null khi kỳ trước bằng 0 — không có mốc nào để so, UI phải hiện "—" thay vì "+∞%".
export function deltaPercent(d: { current: number; previous: number }): number | null {
  if (d.previous === 0) return null
  if (!Number.isFinite(d.current) || !Number.isFinite(d.previous)) return null
  return (d.current - d.previous) / Math.abs(d.previous)
}
