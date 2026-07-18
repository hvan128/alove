DROP INDEX "booking_snapshots_call_code_unique";--> statement-breakpoint
ALTER TABLE "booking_snapshots" ADD COLUMN "event_id" text;--> statement-breakpoint
ALTER TABLE "booking_snapshots" ADD COLUMN "sequence" bigint;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "confirmation_text" text;--> statement-breakpoint
ALTER TABLE "call_turns" ADD COLUMN "event_id" text;--> statement-breakpoint
ALTER TABLE "call_turns" ADD COLUMN "sequence" bigint;--> statement-breakpoint
UPDATE "booking_snapshots"
SET "event_id" = concat('pre-event-', "id"::text),
    "sequence" = "id"
WHERE "event_id" IS NULL OR "sequence" IS NULL;--> statement-breakpoint
UPDATE "call_turns"
SET "event_id" = concat('pre-event-', "id"::text),
    "sequence" = "id"
WHERE "event_id" IS NULL OR "sequence" IS NULL;--> statement-breakpoint
UPDATE "bookings"
SET "confirmation_text" = 'migrated:no-transcript-evidence'
WHERE "confirmation_text" IS NULL;--> statement-breakpoint
ALTER TABLE "booking_snapshots" ALTER COLUMN "event_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_snapshots" ALTER COLUMN "sequence" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "confirmation_text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "call_turns" ALTER COLUMN "event_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "call_turns" ALTER COLUMN "sequence" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_snapshots_call_event_unique" ON "booking_snapshots" USING btree ("call_id","event_id");--> statement-breakpoint
CREATE INDEX "booking_snapshots_call_sequence_idx" ON "booking_snapshots" USING btree ("call_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "call_turns_call_event_unique" ON "call_turns" USING btree ("call_id","event_id");--> statement-breakpoint
CREATE INDEX "call_turns_call_sequence_idx" ON "call_turns" USING btree ("call_id","sequence");
