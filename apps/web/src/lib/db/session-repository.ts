import type { RoomEvent } from '@ordervoice/contracts'
import { roomEventSchema } from '@ordervoice/contracts'
import {
  bookingAuditEvents,
  busBookings,
  busCallEvents,
  busCallMessages,
  busCalls,
  getDb,
} from '@ordervoice/db'
import { asc, eq } from 'drizzle-orm'

export type SessionRepositoryMode = 'memory' | 'neon'
export type AppendEventResult = { stored: boolean; duplicate: boolean }

export type SessionRepository = {
  mode: SessionRepositoryMode
  append: (event: RoomEvent) => Promise<AppendEventResult>
  list: (sessionCode: string) => Promise<RoomEvent[]>
}

type MemoryEventStore = Map<string, Map<string, RoomEvent>>
type RepositoryDependencies = { memory?: MemoryEventStore }
type RepositoryEnvironment = Record<string, string | undefined>

const sharedMemory: MemoryEventStore = new Map()

export function createSessionRepository(
  environment: RepositoryEnvironment = process.env,
  dependencies: RepositoryDependencies = {},
): SessionRepository {
  const databaseUrl = environment.DATABASE_URL?.trim()
  if (!databaseUrl) return createMemoryRepository(dependencies.memory ?? sharedMemory)
  return createNeonRepository()
}

function createMemoryRepository(memory: MemoryEventStore): SessionRepository {
  return {
    mode: 'memory',
    async append(event) {
      const parsed = roomEventSchema.parse(event)
      if (parsed.type === 'transcript.partial') return { stored: false, duplicate: false }
      let session = memory.get(parsed.sessionCode)
      if (!session) {
        session = new Map()
        memory.set(parsed.sessionCode, session)
      }
      if (session.has(parsed.eventId)) return { stored: false, duplicate: true }
      session.set(parsed.eventId, parsed)
      return { stored: true, duplicate: false }
    },
    async list(sessionCode) {
      const normalized = normalizeSessionCode(sessionCode)
      return [...(memory.get(normalized)?.values() ?? [])]
        .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
    },
  }
}

function createNeonRepository(): SessionRepository {
  const database = getDb()
  return {
    mode: 'neon',
    async append(event) {
      const parsed = roomEventSchema.parse(event)
      if (parsed.type === 'transcript.partial') return { stored: false, duplicate: false }
      const occurredAt = new Date(parsed.occurredAt)

      await database.insert(busCalls).values({
        id: parsed.sessionCode,
        mode: parsed.type === 'staff.preferences' ? parsed.mode : 'human',
        status: parsed.type === 'session.status' ? parsed.state : 'waiting',
        transport: parsed.type === 'session.status' ? parsed.transport : 'local',
        startedAt: occurredAt,
        updatedAt: occurredAt,
      }).onConflictDoNothing()

      const inserted = await database.insert(busCallEvents).values({
        id: `${parsed.sessionCode}:${parsed.eventId}`,
        callId: parsed.sessionCode,
        eventId: parsed.eventId,
        eventType: parsed.type,
        payload: parsed,
        occurredAt,
      }).onConflictDoNothing().returning({ id: busCallEvents.id })
      if (inserted.length === 0) return { stored: false, duplicate: true }

      await materializeEvent(database, parsed, occurredAt)
      return { stored: true, duplicate: false }
    },
    async list(sessionCode) {
      const normalized = normalizeSessionCode(sessionCode)
      const rows = await database.select({ payload: busCallEvents.payload })
        .from(busCallEvents)
        .where(eq(busCallEvents.callId, normalized))
        .orderBy(asc(busCallEvents.occurredAt), asc(busCallEvents.createdAt))
      return rows.flatMap((row) => {
        const parsed = roomEventSchema.safeParse(row.payload)
        return parsed.success ? [parsed.data] : []
      })
    },
  }
}

type Database = ReturnType<typeof getDb>

async function materializeEvent(database: Database, event: RoomEvent, occurredAt: Date) {
  if (event.type === 'session.status') {
    await database.update(busCalls).set({
      status: event.state,
      transport: event.transport,
      valseaState: event.valsea,
      agentState: event.agent === 'speaking' ? 'speaking' : event.agent,
      endedAt: event.state === 'ended' ? occurredAt : null,
      updatedAt: occurredAt,
    }).where(eq(busCalls.id, event.sessionCode))
    return
  }
  if (event.type === 'agent.state') {
    await database.update(busCalls).set({
      agentState: event.state,
      updatedAt: occurredAt,
    }).where(eq(busCalls.id, event.sessionCode))
    return
  }
  if (event.type === 'staff.preferences') {
    await database.update(busCalls).set({
      mode: event.mode,
      transcriptLanguage: event.transcriptLanguage,
      updatedAt: occurredAt,
    }).where(eq(busCalls.id, event.sessionCode))
    return
  }
  if (event.type === 'staff.end_call') {
    await database.update(busCalls).set({
      status: 'ended',
      endedAt: occurredAt,
      updatedAt: occurredAt,
    }).where(eq(busCalls.id, event.sessionCode))
    return
  }
  if (event.type === 'transcript.final') {
    await database.insert(busCallMessages).values({
      id: event.message.id,
      callId: event.sessionCode,
      providerEventId: event.eventId,
      role: event.message.role,
      channel: event.message.channel,
      text: event.message.text,
      language: event.message.language,
      translations: event.message.translations,
      confidence: event.message.confidence,
      startedAtMs: event.message.startedAtMs,
      endedAtMs: event.message.endedAtMs,
      final: true,
      createdAt: occurredAt,
    }).onConflictDoNothing()
    return
  }
  if (event.type !== 'booking.snapshot') return

  const booking = event.booking
  await database.insert(busBookings).values({
    id: booking.id,
    callId: event.sessionCode,
    status: booking.status,
    runtimeProfile: booking.runtimeProfile,
    catalogVersionId: booking.catalogVersionId,
    tripId: booking.tripId,
    seatHoldId: booking.seatHoldId,
    origin: booking.origin,
    destination: booking.destination,
    travelDateLabel: booking.travelDateLabel,
    timeWindow: booking.timeWindow,
    passengerCount: booking.passengerCount,
    selectedTrip: booking.selectedTrip,
    seats: booking.seats,
    passengerName: booking.passengerName,
    phone: booking.phone,
    pickupPoint: booking.pickupPoint,
    dropoffPoint: booking.dropoffPoint,
    vehiclePreference: booking.vehiclePreference,
    paymentMethod: booking.paymentMethod,
    note: booking.note,
    totalFareVnd: booking.totalFareVnd,
    bookingCode: booking.bookingCode,
    evidenceMessageIds: booking.evidenceMessageIds,
    fieldEvidence: booking.fieldEvidence,
    confirmedFields: booking.confirmedFields,
    reviewItems: booking.reviewItems,
    revision: event.revision,
    updatedAt: occurredAt,
  }).onConflictDoUpdate({
    target: busBookings.callId,
    set: {
      status: booking.status,
      runtimeProfile: booking.runtimeProfile,
      catalogVersionId: booking.catalogVersionId,
      tripId: booking.tripId,
      seatHoldId: booking.seatHoldId,
      origin: booking.origin,
      destination: booking.destination,
      travelDateLabel: booking.travelDateLabel,
      timeWindow: booking.timeWindow,
      passengerCount: booking.passengerCount,
      selectedTrip: booking.selectedTrip,
      seats: booking.seats,
      passengerName: booking.passengerName,
      phone: booking.phone,
      pickupPoint: booking.pickupPoint,
      dropoffPoint: booking.dropoffPoint,
      vehiclePreference: booking.vehiclePreference,
      paymentMethod: booking.paymentMethod,
      note: booking.note,
      totalFareVnd: booking.totalFareVnd,
      bookingCode: booking.bookingCode,
      evidenceMessageIds: booking.evidenceMessageIds,
      fieldEvidence: booking.fieldEvidence,
      confirmedFields: booking.confirmedFields,
      reviewItems: booking.reviewItems,
      revision: event.revision,
      updatedAt: occurredAt,
    },
  })
  await database.update(busCalls).set({
    revision: event.revision,
    updatedAt: occurredAt,
  }).where(eq(busCalls.id, event.sessionCode))
  await database.insert(bookingAuditEvents).values({
    id: `audit-${event.sessionCode}-${event.eventId}`,
    bookingId: booking.id,
    actor: booking.status === 'confirmed' ? 'staff' : 'system',
    eventType: booking.status === 'confirmed' ? 'booking.confirmed' : 'booking.snapshot',
    payload: {
      revision: event.revision,
      confirmedFields: booking.confirmedFields,
      reviewItems: booking.reviewItems,
    },
    createdAt: occurredAt,
  }).onConflictDoNothing()
}

export function normalizeSessionCode(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/gu, '')
  if (!/^[A-Z0-9]{4,12}$/u.test(normalized)) {
    throw new Error('Mã phiên phải gồm 4 đến 12 chữ cái hoặc chữ số.')
  }
  return normalized
}
