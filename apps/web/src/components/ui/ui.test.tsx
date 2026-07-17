import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'
import { FieldEvidence } from './field-evidence'

describe('shared UI primitives', () => {
  it('exposes a disabled-action reason and evidence quote accessibly', () => {
    render(
      <>
        <Button disabled disabledReason="Cần đủ thông tin hành khách">Xác nhận vé</Button>
        <FieldEvidence quote="Hai vé đi Đà Lạt tối thứ Sáu" confidence={0.94} />
      </>,
    )

    expect(screen.getByRole('button', { name: 'Xác nhận vé' })).toBeDisabled()
    expect(screen.getByText('Cần đủ thông tin hành khách')).toBeVisible()
    expect(screen.getByText(/Hai vé đi Đà Lạt/u)).toBeVisible()
  })
})
