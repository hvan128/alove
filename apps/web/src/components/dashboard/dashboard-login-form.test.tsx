import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DashboardLoginForm } from './dashboard-login-form'

describe('DashboardLoginForm', () => {
  it('requires an access key without exposing a public autofill shortcut', () => {
    render(<DashboardLoginForm action={vi.fn()} />)

    expect(screen.getByLabelText('Khóa truy cập')).toBeRequired()
    expect(screen.getByRole('button', { name: 'Vào màn hình vận hành' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /key demo/u })).not.toBeInTheDocument()
  })
})
