import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ChannelDonut } from './channel-donut'
import { FunnelBars } from './funnel-bars'
import { Sparkline } from './sparkline'
import { TrendChart } from './trend-chart'

/**
 * NaN trong thuộc tính SVG không làm React ném lỗi — nó chỉ lặng lẽ xoá mất
 * hình. Nên mọi ca kiểm đều soi lại toàn bộ thuộc tính thay vì chỉ xem có
 * render được hay không.
 */
function expectNoNaN(container: HTMLElement) {
  for (const node of container.querySelectorAll('*')) {
    // NamedNodeMap không iterable theo spec, phải qua Array.from.
    for (const attribute of Array.from(node.attributes)) {
      expect(attribute.value, `${node.nodeName}[${attribute.name}]`).not.toContain('NaN')
    }
  }
}

const LABELS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00']
const SERIES = [
  { name: 'Cuộc gọi', tone: 'action' as const, points: [4, 9, 6, 14, 11, 18, 12] },
  { name: 'Chốt vé', tone: 'success' as const, points: [1, 4, 3, 8, 6, 11, 7] },
]

describe('TrendChart', () => {
  it('vẽ đủ chuỗi, có nhãn trợ năng và legend kèm chữ', () => {
    const { container } = render(
      <TrendChart labels={LABELS} series={SERIES} ariaLabel="Cuộc gọi theo giờ" />,
    )

    expect(screen.getByRole('img', { name: 'Cuộc gọi theo giờ' })).toBeInTheDocument()
    // Tên chuỗi xuất hiện hai lần: legend nhìn được và bảng ẩn cho screen reader,
    // nên phải soi đúng legend thay vì tìm chung cả cây.
    const legend = within(container.querySelector('figure > ul') as HTMLElement)
    expect(legend.getByText('Cuộc gọi')).toBeVisible()
    expect(legend.getByText('Chốt vé')).toBeVisible()
    expect(container.querySelectorAll('path[stroke]')).toHaveLength(SERIES.length)
    expectNoNaN(container)
  })

  it('kèm bảng chữ ẩn để screen reader đọc được giá trị từng mốc', () => {
    // <svg role="img"> là một hình duy nhất với screen reader — các <title> con
    // trong tooltip không bao giờ được đọc tới.
    render(<TrendChart labels={LABELS} series={SERIES} ariaLabel="Cuộc gọi theo giờ" />)

    const table = screen.getByRole('table', { name: 'Cuộc gọi theo giờ' })
    expect(within(table).getByRole('rowheader', { name: '10:00' })).toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(LABELS.length + 1)
  })

  it('lấy nhãn trục X thưa thay vì nhồi hết 24 mốc', () => {
    const labels = Array.from({ length: 24 }, (_, hour) => `${hour}:00`)
    const { container } = render(
      <TrendChart
        labels={labels}
        series={[{ name: 'Cuộc gọi', tone: 'action', points: labels.map((_, i) => i) }]}
        ariaLabel="Cuộc gọi 24 giờ"
      />,
    )

    const axis = container.querySelectorAll('figure > div:last-child > span')
    expect(axis.length).toBeLessThanOrEqual(5)
    expect(axis.length).toBeGreaterThan(0)
    expectNoNaN(container)
  })

  it('không vỡ với mảng rỗng', () => {
    const { container } = render(<TrendChart labels={[]} series={[]} ariaLabel="Chưa có gọi" />)

    expect(screen.getByRole('img', { name: 'Chưa có gọi' })).toBeInTheDocument()
    expect(screen.getByText('Chưa có dữ liệu')).toBeVisible()
    expectNoNaN(container)
  })

  it('không chia cho 0 khi mọi giá trị đều bằng 0', () => {
    const { container } = render(
      <TrendChart
        labels={['T2', 'T3', 'T4']}
        series={[{ name: 'Cuộc gọi', tone: 'action', points: [0, 0, 0] }]}
        ariaLabel="Tuần trống"
      />,
    )

    expect(screen.getByText('Chưa có dữ liệu')).toBeVisible()
    expectNoNaN(container)
  })

  it('chịu được chuỗi chỉ có một mốc', () => {
    const { container } = render(
      <TrendChart
        labels={['08:00']}
        series={[{ name: 'Cuộc gọi', tone: 'action', points: [5] }]}
        ariaLabel="Một mốc"
      />,
    )

    expectNoNaN(container)
  })
})

describe('Sparkline', () => {
  it('vẽ đường và có nhãn trợ năng', () => {
    const { container } = render(
      <Sparkline points={[3, 5, 4, 9, 7]} tone="violet" ariaLabel="Xu hướng doanh thu 7 ngày" />,
    )

    expect(screen.getByRole('img', { name: 'Xu hướng doanh thu 7 ngày' })).toBeInTheDocument()
    expect(container.querySelector('path[stroke]')).not.toBeNull()
    expectNoNaN(container)
  })

  it('không vỡ với mảng rỗng hoặc toàn số 0', () => {
    const empty = render(<Sparkline points={[]} tone="action" ariaLabel="Chưa có" />)
    expectNoNaN(empty.container)

    const zeros = render(<Sparkline points={[0, 0, 0, 0]} tone="action" ariaLabel="Toàn 0" />)
    expect(zeros.container.querySelector('path')).toBeNull()
    expectNoNaN(zeros.container)
  })
})

describe('FunnelBars', () => {
  const STEPS = [
    { label: 'Bắt máy', count: 320 },
    { label: 'Đã đề xuất chuyến', count: 214 },
    { label: 'Chờ xác nhận', count: 138 },
    { label: 'Đã giữ vé', count: 96 },
  ]

  it('vẽ đúng số bậc kèm nhãn, số và % so với bậc đầu', () => {
    const { container } = render(<FunnelBars steps={STEPS} ariaLabel="Phễu đặt vé" />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(STEPS.length)
    expect(within(items[0]!).getByText('320')).toBeVisible()
    expect(within(items[0]!).getByText('100%')).toBeVisible()
    expect(within(items[3]!).getByText('30%')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Phễu đặt vé' })).toBeInTheDocument()
    expectNoNaN(container)
  })

  it('không để bậc sau dài hơn bậc trước dù dữ liệu lệch', () => {
    const { container } = render(
      <FunnelBars
        steps={[
          { label: 'Bắt máy', count: 100 },
          { label: 'Đề xuất', count: 140 },
          { label: 'Giữ vé', count: 20 },
        ]}
        ariaLabel="Phễu lệch"
      />,
    )

    const widths = [...container.querySelectorAll('line[stroke-linecap="round"]')]
      .filter((line) => line.getAttribute('stroke') !== 'var(--chart-track)')
      .map((line) => Number(line.getAttribute('x2')))

    expect(widths).toHaveLength(3)
    for (let i = 1; i < widths.length; i += 1) {
      expect(widths[i]!).toBeLessThanOrEqual(widths[i - 1]!)
    }
    expectNoNaN(container)
  })

  it('không vỡ với mảng rỗng hoặc bậc đầu bằng 0', () => {
    const empty = render(<FunnelBars steps={[]} ariaLabel="Phễu trống" />)
    expect(within(empty.container).getByText('Chưa có dữ liệu')).toBeVisible()
    expectNoNaN(empty.container)

    const zeros = render(
      <FunnelBars steps={[{ label: 'Bắt máy', count: 0 }]} ariaLabel="Phễu 0" />,
    )
    expectNoNaN(zeros.container)
  })
})

describe('ChannelDonut', () => {
  const SLICES = [
    { label: 'Tổng đài', value: 180, tone: 'action' as const },
    { label: 'Web call', value: 96, tone: 'success' as const },
    { label: 'Zalo', value: 44, tone: 'violet' as const },
  ]

  it('hiện tổng ở lỗ giữa và legend có chữ, số, %', () => {
    const { container } = render(<ChannelDonut slices={SLICES} ariaLabel="Kênh vào cuộc gọi" />)

    expect(screen.getByRole('img', { name: 'Kênh vào cuộc gọi' })).toBeInTheDocument()
    expect(screen.getByText('320')).toBeVisible()
    expect(screen.getByText('Web call')).toBeVisible()
    expect(screen.getByText('30%')).toBeVisible()
    expect(container.querySelectorAll('circle[stroke-dasharray]')).toHaveLength(SLICES.length)
    expectNoNaN(container)
  })

  it('không vỡ với mảng rỗng hoặc tổng bằng 0', () => {
    const empty = render(<ChannelDonut slices={[]} ariaLabel="Chưa có kênh" />)
    expect(within(empty.container).getByText('Chưa có dữ liệu')).toBeVisible()
    expectNoNaN(empty.container)

    const zeros = render(
      <ChannelDonut
        slices={[{ label: 'Tổng đài', value: 0, tone: 'action' }]}
        ariaLabel="Kênh 0"
      />,
    )
    expect(zeros.container.querySelector('circle[stroke-dasharray]')).toBeNull()
    expectNoNaN(zeros.container)
  })
})
