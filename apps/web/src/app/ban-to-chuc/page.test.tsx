import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import OrganizerPage from './page'

describe('/ban-to-chuc', () => {
  it('starts with the product overview, then separates each perspective and operator access', () => {
    render(<OrganizerPage />)

    expect(screen.getByRole('heading', { name: /Một lối vào riêng cho ban tổ chức và giám khảo/u })).toBeVisible()
    expect(screen.getByText('Không thuộc luồng hành khách')).toBeVisible()
    expect(screen.getByRole('link', { name: /Xem tổng quan/u })).toHaveAttribute('href', '/what-we-built')
    expect(screen.getByRole('link', { name: /Mở Web Call/u })).toHaveAttribute('href', '/console')
    expect(screen.getByRole('link', { name: /Xem bằng chứng/u })).toHaveAttribute('href', '/evidence')
    expect(screen.getByRole('link', { name: /Mở màn vận hành/u })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByText('Yêu cầu khóa')).toBeVisible()
  })
})
