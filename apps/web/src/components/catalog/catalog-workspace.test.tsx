import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CatalogVersion } from '@ordervoice/contracts'
import { describe, expect, it } from 'vitest'
import { CatalogWorkspace } from './catalog-workspace'

const draftWithIssue: CatalogVersion = {
  id: 'catalog-2',
  version: 2,
  revision: 0,
  status: 'draft',
  effectiveFrom: '2026-07-19T00:00:00.000Z',
  publishedAt: null,
  publishedBy: null,
  branches: [{ id: 'branch-sg', name: 'Sài Gòn' }],
  stops: [
    { id: 'stop-sg', name: 'Bến xe Miền Đông mới', branchId: 'branch-sg' },
    { id: 'stop-dl', name: 'Bến xe Đà Lạt', branchId: 'branch-sg' },
  ],
  routes: [{
    id: 'sg-dl',
    origin: 'Sài Gòn',
    destination: 'Đà Lạt',
    stops: [
      { stopId: 'stop-sg', role: 'pickup', sequence: 0, offsetMinutes: 0 },
      { stopId: 'stop-dl', role: 'dropoff', sequence: 1, offsetMinutes: 450 },
    ],
  }],
  seatClasses: [{ id: 'class-bed', name: 'Giường nằm', priceMultiplierBps: 10_000 }],
  vehicleTemplates: [],
  vehicles: [{ id: 'bus-1', label: 'Xe 01', templateId: 'missing-template', active: true }],
  fares: [{
    id: 'fare-1',
    routeId: 'sg-dl',
    priceVnd: 350_000,
    seatClassId: null,
    effectiveFrom: null,
    effectiveTo: null,
  }],
  schedules: [],
  trips: [],
}

describe('CatalogWorkspace', () => {
  it('blocks publish while validation has blocking issues', () => {
    render(<CatalogWorkspace initial={draftWithIssue} actorRole="admin" />)

    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled()
    expect(screen.getByText('Mẫu xe không tồn tại.')).toBeVisible()
  })

  it('previews CSV errors without applying rows', async () => {
    const user = userEvent.setup()
    render(<CatalogWorkspace initial={draftWithIssue} actorRole="admin" />)
    const csv = [
      'kind,id,routeId,vehicleId,fareId,departureAt,arrivalAt',
      'trip,t-2,sg-dl,bus-1,fare-1,2026-07-20T10:00:00.000Z,invalid',
    ].join('\n')

    await user.upload(screen.getByLabelText('Nhập CSV'), new File([csv], 'trips.csv', { type: 'text/csv' }))

    expect(await screen.findByText('INVALID_ARRIVAL_AT')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Áp dụng dòng hợp lệ' })).toBeDisabled()
  })

  it('exposes the F-13 seat class and schedule tabs', async () => {
    const user = userEvent.setup()
    render(<CatalogWorkspace initial={draftWithIssue} actorRole="admin" />)

    await user.click(screen.getByRole('tab', { name: 'Loại ghế' }))
    expect(screen.getByDisplayValue('Giường nằm')).toBeVisible()
    expect(screen.getByDisplayValue('10000')).toBeVisible()

    await user.click(screen.getByRole('tab', { name: 'Lịch chạy' }))
    expect(screen.getByText('Chưa có lịch chạy.')).toBeVisible()
  })

  it('shows route pickup and drop-off roles', async () => {
    const user = userEvent.setup()
    render(<CatalogWorkspace initial={draftWithIssue} actorRole="admin" />)

    await user.click(screen.getByRole('tab', { name: 'Tuyến' }))

    expect(screen.getByDisplayValue('stop-sg:pickup:0 | stop-dl:dropoff:450')).toBeVisible()
    expect(screen.getByText('1 điểm đón · 1 điểm trả')).toBeVisible()
  })
})
