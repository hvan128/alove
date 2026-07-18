import { describe, expect, it } from 'vitest'
import { createOperationsRepository, seededOperations } from './operations-repository'

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
})
