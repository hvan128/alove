import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'
import { FieldEvidence } from './field-evidence'

describe('shared UI primitives', () => {
  it('exposes a disabled-action reason and evidence quote accessibly', () => {
    render(
      <>
        <Button disabled disabledReason="Cần duyệt đơn trước">Xuất ERP nháp</Button>
        <FieldEvidence quote="12 thùng cà phê Arabica" confidence={0.94} />
      </>,
    )

    expect(screen.getByRole('button', { name: 'Xuất ERP nháp' })).toBeDisabled()
    expect(screen.getByText('Cần duyệt đơn trước')).toBeVisible()
    expect(screen.getByText(/12 thùng cà phê Arabica/u)).toBeVisible()
  })
})
