import type {
  BookingDraft,
  HoldSeatsCommand,
  OperatorActor,
  SeatHold,
} from '@ordervoice/contracts'

const HOLD_MS = 10 * 60_000
const MAX_HOLD_MS = 30 * 60_000

export function createSeatHold(
  command: HoldSeatsCommand,
  actor: OperatorActor,
  now: string,
): SeatHold {
  const start = Date.parse(now)
  return {
    id: `hold-${command.sessionCode}-${start}`,
    sessionCode: command.sessionCode,
    bookingDraftId: command.bookingDraftId,
    tripId: command.tripId,
    seatCodes: [...new Set(command.seatCodes)].sort(),
    actorId: actor.id,
    status: 'active',
    createdAt: now,
    expiresAt: new Date(start + HOLD_MS).toISOString(),
    maxExpiresAt: new Date(start + MAX_HOLD_MS).toISOString(),
    releasedAt: null,
    consumedAt: null,
  }
}

export function renewSeatHold(hold: SeatHold, now: string): SeatHold {
  if (hold.status !== 'active' || Date.parse(now) >= Date.parse(hold.expiresAt)) {
    throw new Error('HOLD_EXPIRED')
  }
  const nextExpiry = Date.parse(now) + HOLD_MS
  if (nextExpiry > Date.parse(hold.maxExpiresAt)) throw new Error('HOLD_MAX_DURATION')
  return { ...structuredClone(hold), expiresAt: new Date(nextExpiry).toISOString() }
}

export function releaseSeatHold(hold: SeatHold, now: string): SeatHold {
  if (hold.status !== 'active') return structuredClone(hold)
  return { ...structuredClone(hold), status: 'released', releasedAt: now }
}

export function expireSeatHold(hold: SeatHold, now: string): SeatHold {
  if (hold.status !== 'active' || Date.parse(now) < Date.parse(hold.expiresAt)) {
    return structuredClone(hold)
  }
  return { ...structuredClone(hold), status: 'expired', releasedAt: now }
}

export function assertHoldCanConfirm(hold: SeatHold, draft: BookingDraft, now: string): void {
  if (hold.status !== 'active' || Date.parse(now) >= Date.parse(hold.expiresAt)) {
    throw new Error('HOLD_EXPIRED')
  }
  const heldSeats = [...hold.seatCodes].sort().join('|')
  const draftSeats = [...draft.seats].sort().join('|')
  if (
    hold.bookingDraftId !== draft.id
    || hold.tripId !== draft.tripId
    || hold.id !== draft.seatHoldId
    || heldSeats !== draftSeats
  ) {
    throw new Error('HOLD_SCOPE_CONFLICT')
  }
}
