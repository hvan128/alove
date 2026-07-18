import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OperationsReport } from './operations-report'

const report = {
  mode: 'memory' as const,
  freshAt: '2026-07-18T10:00:00.000Z',
  range: { from: '2026-07-12T00:00:00.000Z', to: '2026-07-18T23:59:59.999Z' },
  totals: { calls: 120, confirmed: 101, conversionRate: 84, agentAssistRate: 61 },
  outcomes: [
    { label: 'Đã xác nhận', count: 101 },
    { label: 'Chưa hoàn tất', count: 19 },
  ],
  routes: [
    { routeLabel: 'Sài Gòn → Đà Lạt', booked: 29, capacity: 34 },
    { routeLabel: 'Sài Gòn → Nha Trang', booked: 24, capacity: 40 },
  ],
}

describe('OperationsReport', () => {
  it('shows range, conversion, Agent assist and route load with numeric labels', () => {
    render(<OperationsReport report={report} />)

    expect(screen.getByRole('heading', { name: 'Báo cáo vận hành' })).toBeVisible()
    expect(screen.getByText('84% chuyển đổi')).toBeVisible()
    expect(screen.getByText('61% Agent hỗ trợ')).toBeVisible()
    expect(screen.getByText('Sài Gòn → Đà Lạt · 29/34')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'Tải tuyến Sài Gòn → Đà Lạt' })).toHaveAttribute('aria-valuenow', '29')
  })
})
