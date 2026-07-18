import type { OperatorActor } from '@ordervoice/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import { POST } from '@/app/api/seat-holds/route'
import { holdSeats, type InventoryHttpDependencies } from './inventory-http'
import { createInventoryRepository, seededMemoryInventory } from './inventory-repository'

const originalDemoMode = process.env.OPERATOR_DEMO_MODE
const staff: OperatorActor = { id: 'staff-1', role: 'dispatcher', demo: false }

afterEach(() => {
  if (originalDemoMode === undefined) delete process.env.OPERATOR_DEMO_MODE
  else process.env.OPERATOR_DEMO_MODE = originalDemoMode
})

const command = {
  sessionCode: 'DEMO42', bookingDraftId: 'booking-DEMO42', tripId: 'trip-1',
  seatCodes: ['A05'], expectedInventoryRevision: 0,
}

describe('inventory HTTP boundary', () => {
  it('does not accept actor role from JSON', async () => {
    delete process.env.OPERATOR_DEMO_MODE
    const response = await POST(jsonRequest('http://test/api/seat-holds', { ...command, role: 'admin' }))

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: 'OPERATOR_AUTH_UNCONFIGURED' })
  })

  it('maps unavailable seats to 409 with fresh revision', async () => {
    const repository = createInventoryRepository({}, seededMemoryInventory())
    const dependencies: InventoryHttpDependencies = {
      getActor: () => staff,
      getRepository: () => repository,
    }
    await repository.hold(command, staff, new Date().toISOString())

    const response = await holdSeats(
      jsonRequest('http://test/api/seat-holds', { ...command, sessionCode: 'CALL42' }),
      dependencies,
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ error: 'SEAT_NOT_AVAILABLE', inventoryRevision: 1 })
  })
})

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}
