import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OperationsShell } from './operations-shell'

describe('OperationsShell', () => {
  it('shows role-scoped navigation and non-durable label', () => {
    render(
      <OperationsShell actor={{ id: 'demo-admin', role: 'admin', demo: true }} mode="memory">
        <div>Body</div>
      </OperationsShell>,
    )

    expect(screen.getByRole('link', { name: 'Tổng quan' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Tuyến & chuyến' })).toBeVisible()
    expect(screen.getByText('Mô phỏng · không bền vững')).toBeVisible()
  })

  it('hides admin links from customer-care', () => {
    render(
      <OperationsShell actor={{ id: 'staff-1', role: 'customer-care', demo: false }} mode="neon">
        <div />
      </OperationsShell>,
    )

    expect(screen.queryByRole('link', { name: 'Tuyến & chuyến' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Xe & sơ đồ ghế' })).not.toBeInTheDocument()
  })
})
