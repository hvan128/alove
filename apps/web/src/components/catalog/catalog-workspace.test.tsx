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
  branches: [],
  stops: [],
  routes: [{ id: 'sg-dl', origin: 'Sài Gòn', destination: 'Đà Lạt', stopIds: [] }],
  vehicleTemplates: [],
  vehicles: [{ id: 'bus-1', label: 'Xe 01', templateId: 'missing-template', active: true }],
  fares: [{ id: 'fare-1', routeId: 'sg-dl', priceVnd: 350_000 }],
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

    expect(await screen.findByText('Dòng 2 · INVALID_ARRIVAL_AT')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Áp dụng dòng hợp lệ' })).toBeDisabled()
  })
})
