import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

describe('shared UI primitives', () => {
  it('exposes a disabled-action reason accessibly', () => {
    render(
      <Button disabled disabledReason="Cần đủ thông tin hành khách">Xác nhận vé</Button>,
    )

    expect(screen.getByRole('button', { name: 'Xác nhận vé' })).toBeDisabled()
    expect(screen.getByText('Cần đủ thông tin hành khách')).toBeVisible()
  })
})
