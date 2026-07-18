import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createOperationsRepository, seededOperations } from '@/lib/operations/operations-repository'
import { OperationsDashboard } from './operations-dashboard'

describe('OperationsDashboard', () => {
  it('renders KPIs, queue, departures, freshness and accessible actions', async () => {
    const snapshot = await createOperationsRepository({}, seededOperations())
      .getDashboard('2026-07-18T10:00:00.000Z')

    render(<OperationsDashboard snapshot={snapshot} />)

    expect(screen.getByRole('heading', { name: /chào buổi sáng/iu })).toBeVisible()
    expect(screen.getByText('04')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Nhận cuộc gọi DEMO42' }))
      .toHaveAttribute('href', '/staff?session=DEMO42')
    expect(screen.getByText('Agent tự động · collecting')).toBeVisible()
    expect(screen.getByText(/cập nhật lúc/iu)).toBeVisible()
    expect(screen.getByRole('progressbar', { name: /Sài Gòn → Đà Lạt/iu }))
      .toHaveAttribute('aria-valuenow', '29')
  })
})
