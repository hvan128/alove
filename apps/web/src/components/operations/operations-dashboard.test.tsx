import type { OperatorRole } from '@ordervoice/contracts'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createOperationsRepository, seededOperations } from '@/lib/operations/operations-repository'
import { createOwnershipRepository, seededOwnership } from '@/lib/operations/ownership-repository'
import { OperationsDashboard } from './operations-dashboard'

const dispatcher = { id: 'linh', role: 'dispatcher' as const, demo: false }
const at = '2026-07-18T10:00:00.000Z'

let ownership: ReturnType<typeof createOwnershipRepository>

beforeEach(() => {
  ownership = createOwnershipRepository({}, seededOwnership())
})

const snapshotFor = (query?: string) =>
  createOperationsRepository({}, seededOperations(), ownership)
    .getDashboard(at, query ? { query } : undefined)

const renderDashboard = async (role: OperatorRole = 'dispatcher', query?: string) => {
  const snapshot = await snapshotFor(query)
  render(<OperationsDashboard snapshot={snapshot} role={role} query={query ?? ''} />)
  return snapshot
}

describe('OperationsDashboard', () => {
  it('renders KPIs, queue, departures, freshness and accessible actions', async () => {
    await renderDashboard()

    expect(screen.getByRole('heading', { name: /chào buổi sáng/iu })).toBeVisible()
    expect(screen.getByText('04')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Nhận cuộc gọi DEMO42' })).toBeEnabled()
    expect(screen.getByText(/cập nhật lúc/iu)).toBeVisible()
    expect(screen.getByRole('progressbar', { name: /Sài Gòn → Đà Lạt/iu }))
      .toHaveAttribute('aria-valuenow', '29')
  })

  it('names the owner of a claimed call instead of a generic role word', async () => {
    await ownership.accept('LIVE18', dispatcher, at)
    await renderDashboard()

    const call = screen.getByRole('listitem', { name: /LIVE18/u })
    expect(within(call).getByText(/linh/iu)).toBeVisible()
    expect(within(call).getByText(/dispatcher/iu)).toBeVisible()
  })

  it('marks an unclaimed call as waiting for an owner rather than showing a fake one', async () => {
    await renderDashboard()
    const call = screen.getByRole('listitem', { name: /AUTO12/u })
    expect(within(call).getByText(/chưa có người nhận/iu)).toBeVisible()
  })

  it('shows who holds reply authority with a label, not only a colour', async () => {
    await ownership.accept('LIVE18', dispatcher, at)
    await ownership.delegate('LIVE18', dispatcher, at)
    await renderDashboard()

    const call = screen.getByRole('listitem', { name: /LIVE18/u })
    expect(within(call).getByText('Agent tự động')).toBeVisible()
  })

  it('displays the takeover reason so a supervisor can see why authority moved', async () => {
    await ownership.accept('LIVE18', dispatcher, at)
    await ownership.delegate('LIVE18', dispatcher, at)
    await ownership.takeover('LIVE18', dispatcher, at, 'Agent hiểu sai điểm đón')
    await renderDashboard()

    // Shown on the call row itself, so a supervisor scanning live calls sees it
    // without having to read the audit trail.
    const call = screen.getByRole('listitem', { name: /LIVE18/u })
    expect(within(call).getByText(/Agent hiểu sai điểm đón/u)).toBeVisible()
  })

  it('renders the cross-session audit trail with actor, role and reason', async () => {
    await ownership.accept('LIVE18', dispatcher, at)
    await ownership.delegate('LIVE18', dispatcher, at)
    await ownership.takeover('LIVE18', dispatcher, at, 'Khách yêu cầu gặp người thật')
    await renderDashboard()

    const trail = screen.getByRole('region', { name: /nhật ký/iu })
    expect(within(trail).getAllByRole('listitem')).toHaveLength(3)
    expect(within(trail).getByText(/Khách yêu cầu gặp người thật/u)).toBeVisible()
    expect(within(trail).getAllByText(/linh/iu).length).toBeGreaterThan(0)
  })

  it('offers a search field that submits without JavaScript', async () => {
    await renderDashboard()
    const search = screen.getByRole('searchbox', { name: /tìm/iu })
    expect(search).toHaveAttribute('name', 'q')
    expect(search.closest('form')).toHaveAttribute('action', '/operations')
  })

  it('keeps the current query in the search field', async () => {
    await renderDashboard('dispatcher', 'trip91')
    expect(screen.getByRole('searchbox', { name: /tìm/iu })).toHaveValue('trip91')
  })

  it('tells the operator when a search matched nothing', async () => {
    await renderDashboard('dispatcher', 'khongcogi')
    expect(screen.getByText(/không có cuộc gọi nào khớp/iu)).toBeVisible()
  })

  it('hides every mutating control from a read-only operator', async () => {
    await ownership.accept('LIVE18', dispatcher, at)
    await renderDashboard('read-only')

    expect(screen.queryByRole('button', { name: /nhận cuộc gọi/iu })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /trao quyền agent/iu })).not.toBeInTheDocument()
    // Reading stays available: read-only exists to supervise, not to be blind.
    expect(screen.getByRole('region', { name: /nhật ký/iu })).toBeVisible()
    expect(screen.getByText('04')).toBeVisible()
  })

  it('lets a dispatcher open the focused cockpit for a live call', async () => {
    await ownership.accept('LIVE18', dispatcher, at)
    await renderDashboard()
    expect(screen.getByRole('link', { name: /mở phiên LIVE18/iu }))
      .toHaveAttribute('href', '/staff?session=LIVE18')
  })
})
