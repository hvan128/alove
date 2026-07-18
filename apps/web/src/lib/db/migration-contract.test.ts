import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'drizzle/0005_durable_workflow_output.sql'),
  'utf8',
)
const legacyMigration = readFileSync(
  join(process.cwd(), 'drizzle/0006_legacy-verification-exemptions.sql'),
  'utf8',
)
const integrityMigration = readFileSync(
  join(process.cwd(), 'drizzle/0007_verification-snapshot-integrity.sql'),
  'utf8',
)

describe('durable workflow migration rollout', () => {
  it('backfills historical tickets from their confirmed snapshots, not mutable trip prices', () => {
    expect(migration).toContain('WITH confirmed_snapshots AS')
    expect(migration).toContain('confirmed_snapshots.snapshot')
    expect(migration).not.toContain('t.price_vnd')
    expect(migration).toContain("bs.snapshot ->> 'totalFareVnd' = b.total_fare_vnd::text")
  })

  it('keeps the expand migration compatible with the previous web release', () => {
    expect(migration).toContain('bookings_fill_verification_snapshot_before_insert')
    expect(migration).toContain("'priceVnd', NEW.total_fare_vnd / seat_count")
    expect(migration).not.toContain('ALTER COLUMN "verification_snapshot" SET NOT NULL')
  })

  it('marks only unbackfillable historical rows as legacy-unverifiable', () => {
    expect(legacyMigration).toContain('verification_snapshot_required')
    expect(legacyMigration).toContain('WHERE "verification_snapshot" IS NULL')
    expect(legacyMigration).not.toContain('FROM "trips"')
    expect(legacyMigration).not.toContain('FROM "routes"')
  })

  it('enforces snapshots for every required/new booking at the database boundary', () => {
    expect(integrityMigration).toContain('bookings_verification_snapshot_required_check')
    expect(integrityMigration).toContain('not "bookings"."verification_snapshot_required"')
    expect(integrityMigration).toContain('"bookings"."verification_snapshot" is not null')
  })
})
