import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppShell } from './app-shell'

describe('AppShell', () => {
  it('keeps customer navigation inside the passenger journey', () => {
    render(<AppShell><main>Nội dung</main></AppShell>)

    expect(screen.getByRole('navigation', { name: 'Điều hướng hành khách' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Web Call' })).toHaveAttribute('href', '/console')
    expect(screen.queryByRole('link', { name: 'Bằng chứng' })).not.toBeInTheDocument()
  })

  it('uses separate navigation for competition review pages', () => {
    render(<AppShell context="review"><main>Nội dung</main></AppShell>)

    expect(screen.getByRole('navigation', { name: 'Điều hướng chấm thi' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Khu vực chấm thi' })).toHaveAttribute('href', '/ban-to-chuc')
    expect(screen.getByRole('link', { name: 'Bằng chứng' })).toHaveAttribute('href', '/evidence')
    expect(screen.queryByRole('link', { name: 'Web Call' })).not.toBeInTheDocument()
  })
})
