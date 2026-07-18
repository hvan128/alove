import { beforeEach, describe, expect, it } from 'vitest'
import { createOperationsRepository, seededOperations } from './operations-repository'
import { createOwnershipRepository, seededOwnership } from './ownership-repository'

const dispatcher = { id: 'linh', role: 'dispatcher' as const, demo: false }
const at = '2026-07-18T10:00:00.000Z'

let ownershipMemory: ReturnType<typeof seededOwnership>
let ownership: ReturnType<typeof createOwnershipRepository>

beforeEach(() => {
  ownershipMemory = seededOwnership()
  ownership = createOwnershipRepository({}, ownershipMemory)
})

const dashboard = (state = seededOperations()) => createOperationsRepository({}, state, ownership)

describe('operations dashboard repository', () => {
  it('projects queue, calls, bookings, departures and alerts', async () => {
    const snapshot = await createOperationsRepository({}, seededOperations())
      .getDashboard('2026-07-18T10:00:00.000Z')

    expect(snapshot.metrics).toMatchObject({
      queuedCalls: 4,
      activeCalls: 3,
      confirmedBookings: 18,
    })
    expect(snapshot.departures[0]).toMatchObject({
      tripId: 'trip-1',
      available: 5,
      capacity: 34,
    })
    expect(snapshot.freshAt).toBe('2026-07-18T10:00:00.000Z')
  })

  it('guards empty conversion and assistance denominators', async () => {
    const state = seededOperations()
    state.callsToday = 0
    state.confirmedBookings = 0
    state.assistedCalls = 0

    const snapshot = await createOperationsRepository({}, state)
      .getDashboard('2026-07-18T10:00:00.000Z')

    expect(snapshot.metrics.conversionRate).toBe(0)
    expect(snapshot.metrics.agentAssistRate).toBe(0)
  })

  it('validates report range and projects route load', async () => {
    const repository = createOperationsRepository({}, seededOperations())
    const report = await repository.getReport({
      from: '2026-07-12T00:00:00.000Z',
      to: '2026-07-18T23:59:59.999Z',
    })

    expect(report.totals).toMatchObject({ conversionRate: 75, agentAssistRate: 63 })
    expect(report.routes[0]).toMatchObject({ routeLabel: 'Sài Gòn → Đà Lạt', booked: 26, capacity: 34 })
    await expect(repository.getReport({ from: '2026-01-01T00:00:00.000Z', to: '2026-07-18T00:00:00.000Z' }))
      .rejects.toThrow('REPORT_RANGE_TOO_LARGE')
  })

  it('shows the real owner, delegation and takeover reason on an active call', async () => {
    await ownership.accept('LIVE18', dispatcher, at)
    await ownership.delegate('LIVE18', dispatcher, at)
    await ownership.takeover('LIVE18', dispatcher, at, 'Agent hiểu sai điểm đón')

    const snapshot = await dashboard().getDashboard(at)
    const call = snapshot.activeCalls.find((item) => item.sessionCode === 'LIVE18')

    expect(call).toMatchObject({
      ownerId: 'linh',
      ownerRole: 'dispatcher',
      delegation: 'staff',
      takeoverReason: 'Agent hiểu sai điểm đón',
    })
  })

  it('reports an unclaimed active call as unowned rather than inventing a name', async () => {
    const snapshot = await dashboard().getDashboard(at)
    const call = snapshot.activeCalls.find((item) => item.sessionCode === 'AUTO12')
    expect(call).toMatchObject({ ownerId: null, ownerRole: null, delegation: 'staff', takeoverReason: null })
  })

  it('carries the cross-session audit trail on the snapshot', async () => {
    await ownership.accept('LIVE18', dispatcher, at)
    const snapshot = await dashboard().getDashboard(at)
    expect(snapshot.auditTrail[0]).toMatchObject({
      sessionCode: 'LIVE18',
      eventType: 'call.accepted',
      actorId: 'linh',
    })
  })

  it('searches queue and active calls by session code', async () => {
    const snapshot = await dashboard().getDashboard(at, { query: 'trip91' })
    expect(snapshot.queue.map((call) => call.sessionCode)).toEqual(['TRIP91'])
    expect(snapshot.activeCalls).toHaveLength(0)
  })

  it('searches by route label so a dispatcher can find a corridor', async () => {
    const snapshot = await dashboard().getDashboard(at, { query: 'đà lạt' })
    expect(snapshot.queue.map((call) => call.sessionCode)).toEqual(['DEMO42', 'NIGHT7'])
  })

  it('searches active calls by owner', async () => {
    await ownership.accept('LIVE03', dispatcher, at)
    const snapshot = await dashboard().getDashboard(at, { query: 'linh' })
    expect(snapshot.activeCalls.map((call) => call.sessionCode)).toEqual(['LIVE03'])
  })

  it('keeps metrics on the unfiltered population so search never rewrites the KPIs', async () => {
    const snapshot = await dashboard().getDashboard(at, { query: 'trip91' })
    expect(snapshot.metrics.queuedCalls).toBe(4)
    expect(snapshot.metrics.activeCalls).toBe(3)
  })

  it('never reports a conversion rate above 100 percent', async () => {
    const state = seededOperations()
    // More confirmed bookings than calls today is what an all-time numerator
    // over a same-day denominator produced before the fix.
    state.callsToday = 4
    state.confirmedBookings = 18
    const snapshot = await dashboard(state).getDashboard(at)
    expect(snapshot.metrics.conversionRate).toBeLessThanOrEqual(100)
  })
})
