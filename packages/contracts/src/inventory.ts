import { z } from 'zod'

export const tripSeatStateSchema = z.enum(['available', 'held', 'booked', 'blocked'])

export const tripSeatSchema = z.object({
  tripId: z.string().min(1),
  seatCode: z.string().min(1),
  state: tripSeatStateSchema,
  revision: z.number().int().nonnegative(),
  activeHoldId: z.string().min(1).nullable(),
  bookingId: z.string().min(1).nullable(),
}).strict()

export const seatHoldStatusSchema = z.enum(['active', 'released', 'expired', 'consumed'])

export const seatHoldSchema = z.object({
  id: z.string().min(1),
  sessionCode: z.string().regex(/^[A-Z0-9]{4,12}$/u),
  bookingDraftId: z.string().min(1),
  tripId: z.string().min(1),
  seatCodes: z.array(z.string().min(1)).min(1),
  actorId: z.string().min(1),
  status: seatHoldStatusSchema,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  maxExpiresAt: z.string().datetime(),
  releasedAt: z.string().datetime().nullable(),
  consumedAt: z.string().datetime().nullable(),
}).strict()

export const holdSeatsCommandSchema = z.object({
  sessionCode: z.string().regex(/^[A-Z0-9]{4,12}$/u),
  bookingDraftId: z.string().min(1),
  tripId: z.string().min(1),
  seatCodes: z.array(z.string().min(1)).min(1),
  expectedInventoryRevision: z.number().int().nonnegative(),
}).strict()

export type TripSeat = z.infer<typeof tripSeatSchema>
export type SeatHold = z.infer<typeof seatHoldSchema>
export type HoldSeatsCommand = z.infer<typeof holdSeatsCommandSchema>
