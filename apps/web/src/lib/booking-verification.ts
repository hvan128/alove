import { z } from 'zod'

import {
  BOOKING_SNAPSHOT_SCHEMA_VERSION,
  bookingSnapshotSchema,
  type BookingSnapshot,
} from './call-contract'

export const verifiedBookingSchema = z.object({
  schemaVersion: z.literal(BOOKING_SNAPSHOT_SCHEMA_VERSION),
  status: z.literal('confirmed'),
  bookingCode: z.string().min(1).max(40),
  origin: z.string().min(1).max(120),
  destination: z.string().min(1).max(120),
  travelDateLabel: z.string().min(1).max(80),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/u),
  vehicleType: z.string().min(1).max(160),
  pickupPoint: z.string().min(1).max(240),
  dropoffPoint: z.string().min(1).max(240),
  seats: z.array(z.string().min(1).max(40)).min(1).max(20),
  passengerCount: z.number().int().min(1).max(20),
  totalFareVnd: z.number().int().positive(),
}).strict()

export type VerifiedBooking = z.infer<typeof verifiedBookingSchema>

/** Validate the full authoritative snapshot before removing direct identifiers. */
export function createVerifiedBooking(snapshot: BookingSnapshot): VerifiedBooking {
  const parsed = bookingSnapshotSchema.parse(snapshot)
  if (
    parsed.status !== 'confirmed'
    || !parsed.bookingCode
    || !parsed.origin
    || !parsed.destination
    || !parsed.travelDateLabel
    || !parsed.selectedTrip
    || !parsed.passengerCount
    || !parsed.totalFareVnd
  ) {
    throw new Error('Verification requires a complete confirmed booking snapshot.')
  }

  return verifiedBookingSchema.parse({
    schemaVersion: BOOKING_SNAPSHOT_SCHEMA_VERSION,
    status: parsed.status,
    bookingCode: parsed.bookingCode,
    origin: parsed.origin,
    destination: parsed.destination,
    travelDateLabel: parsed.travelDateLabel,
    departureTime: parsed.selectedTrip.departureTime,
    vehicleType: parsed.selectedTrip.vehicleType,
    pickupPoint: parsed.selectedTrip.pickupPoint,
    dropoffPoint: parsed.selectedTrip.dropoffPoint,
    seats: parsed.seats,
    passengerCount: parsed.passengerCount,
    totalFareVnd: parsed.totalFareVnd,
  })
}
