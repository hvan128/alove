ALTER TABLE "bookings" ADD COLUMN "verification_snapshot_required" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Historical bookings without an archived confirmed snapshot cannot be
-- reconstructed truthfully from mutable trip/route rows. Preserve them as
-- legacy-unverifiable; every booking inserted after this migration keeps the
-- default true and the compatibility trigger must fill its snapshot.
UPDATE "bookings"
SET "verification_snapshot_required" = false
WHERE "verification_snapshot" IS NULL;
