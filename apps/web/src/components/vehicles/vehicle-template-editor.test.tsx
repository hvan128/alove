import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CatalogVersion } from '@ordervoice/contracts'
import { describe, expect, it, vi } from 'vitest'
import { VehicleTemplateEditor } from './vehicle-template-editor'

const template: CatalogVersion['vehicleTemplates'][number] = {
  id: 'limousine-22',
  name: 'Limousine 22 phòng',
  floors: 1,
  seats: [{ code: 'A01', floor: 1, row: 0, column: 1, kind: 'seat', seatClassId: null }],
}

describe('VehicleTemplateEditor', () => {
  it('adds a seat by keyboard and announces duplicate code', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<VehicleTemplateEditor template={template} onSave={onSave} />)

    await user.click(screen.getByRole('gridcell', { name: 'Tầng 1 hàng 1 cột 1: trống' }))
    await user.type(screen.getByLabelText('Mã ghế'), 'A01')
    await user.click(screen.getByRole('button', { name: 'Đặt ghế' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Mã ghế A01 bị trùng')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('derives capacity and saves a valid keyboard edit', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<VehicleTemplateEditor template={template} onSave={onSave} />)

    await user.click(screen.getByRole('gridcell', { name: 'Tầng 1 hàng 1 cột 1: trống' }))
    await user.type(screen.getByLabelText('Mã ghế'), 'A02')
    await user.click(screen.getByRole('button', { name: 'Đặt ghế' }))
    expect(screen.getByText('2 chỗ phục vụ')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Lưu mẫu xe' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ seats: expect.arrayContaining([expect.objectContaining({ code: 'A02' })]) }))
  })
})
