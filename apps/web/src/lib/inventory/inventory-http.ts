import type { BookingDraft, OperatorActor } from '@ordervoice/contracts'
import { holdSeatsCommandSchema } from '@ordervoice/contracts'
import { z, ZodError } from 'zod'
import { getOperatorActor, requireOperatorRole } from '../auth/operator-actor'
import {
  confirmBookingWithHold,
  createDemoConfirmationDependencies,
  createNeonConfirmationDependencies,
  type ConfirmBookingCommand,
} from '../booking/confirm-booking'
import { createInventoryRepository, type InventoryRepository } from './inventory-repository'

export type InventoryHttpDependencies = {
  getActor: () => OperatorActor
  getRepository: () => InventoryRepository
  confirm?: (command: ConfirmBookingCommand, actor: OperatorActor) => Promise<BookingDraft>
}

export type TripContext = { params: Promise<{ tripId: string }> }
export type HoldContext = { params: Promise<{ holdId: string }> }
export type BookingContext = { params: Promise<{ sessionCode: string }> }

const defaultDependencies: InventoryHttpDependencies = {
  getActor: () => getOperatorActor(process.env),
  getRepository: () => createInventoryRepository(),
  confirm: (command, actor) => confirmBookingWithHold(command, actor,
    process.env.OPERATOR_DEMO_MODE === 'true' && !process.env.DATABASE_URL?.trim()
      ? createDemoConfirmationDependencies()
      : createNeonConfirmationDependencies(),
  ),
}

const blockSchema = z.object({
  seatCodes: z.array(z.string().min(1)).min(1),
  blocked: z.boolean(),
}).strict()
const releaseSchema = z.object({ reason: z.string().min(1) }).strict()
const confirmSchema = z.object({
  bookingDraftId: z.string().min(1),
  holdId: z.string().min(1),
  acceptedSummaryHash: z.string().min(1),
  idempotencyKey: z.string().min(1),
  expectedRevision: z.number().int().nonnegative(),
}).strict()

export async function getTripInventory(
  _request: Request,
  context: TripContext,
  dependencies: InventoryHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handle(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care', 'read-only'])
    return json(await dependencies.getRepository().getTripInventory(
      (await context.params).tripId,
      new Date().toISOString(),
    ))
  })
}

export async function blockTripSeats(
  request: Request,
  context: TripContext,
  dependencies: InventoryHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handle(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher'])
    const body = blockSchema.parse(await request.json())
    const seats = await dependencies.getRepository().setBlocked(
      (await context.params).tripId,
      body.seatCodes,
      body.blocked,
      actor,
      new Date().toISOString(),
    )
    return json({ seats })
  })
}

export async function holdSeats(
  request: Request,
  dependencies: InventoryHttpDependencies = defaultDependencies,
): Promise<Response> {
  let tripId: string | undefined
  try {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
    const command = holdSeatsCommandSchema.parse(await request.json())
    tripId = command.tripId
    const hold = await dependencies.getRepository().hold(command, actor, new Date().toISOString())
    return json({ hold }, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'SEAT_NOT_AVAILABLE' && tripId) {
      const fresh = await dependencies.getRepository().getTripInventory(tripId, new Date().toISOString())
      return json({ error: 'SEAT_NOT_AVAILABLE', inventoryRevision: fresh.revision }, 409)
    }
    return inventoryError(error)
  }
}

export async function renewHold(
  _request: Request,
  context: HoldContext,
  dependencies: InventoryHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handle(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
    const hold = await dependencies.getRepository().renew(
      (await context.params).holdId, actor, new Date().toISOString(),
    )
    return json({ hold })
  })
}

export async function releaseHold(
  request: Request,
  context: HoldContext,
  dependencies: InventoryHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handle(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
    const body = releaseSchema.parse(await request.json())
    const hold = await dependencies.getRepository().release(
      (await context.params).holdId, actor, new Date().toISOString(), body.reason,
    )
    return json({ hold })
  })
}

export async function confirmHeldBooking(
  request: Request,
  context: BookingContext,
  dependencies: InventoryHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handle(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
    if (!dependencies.confirm) throw new Error('CONFIRMATION_PERSISTENCE_UNAVAILABLE')
    const body = confirmSchema.parse(await request.json())
    const booking = await dependencies.confirm({
      ...body,
      sessionCode: (await context.params).sessionCode,
    }, actor)
    return json({ booking })
  })
}

export function inventoryError(error: unknown): Response {
  if (error instanceof SyntaxError || error instanceof ZodError) return json({ error: 'INVALID_INVENTORY_REQUEST' }, 400)
  const code = error instanceof Error ? error.message : 'INVENTORY_REQUEST_FAILED'
  const status = code === 'FORBIDDEN'
    ? 403
    : ['SEAT_NOT_AVAILABLE', 'INVENTORY_VERSION_CONFLICT', 'BOOKING_VERSION_CONFLICT', 'IDEMPOTENCY_CONFLICT', 'HOLD_SCOPE_CONFLICT'].includes(code)
      ? 409
      : code === 'HOLD_EXPIRED' || code === 'HOLD_MAX_DURATION'
        ? 410
        : code === 'OPERATOR_AUTH_UNCONFIGURED' || code === 'CONFIRMATION_PERSISTENCE_UNAVAILABLE'
          ? 503
          : code === 'HOLD_NOT_FOUND' || code === 'SEAT_NOT_FOUND'
            ? 404
            : 400
  return json({ error: code }, status)
}

async function handle(action: () => Promise<Response>): Promise<Response> {
  try {
    return await action()
  } catch (error) {
    return inventoryError(error)
  }
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
