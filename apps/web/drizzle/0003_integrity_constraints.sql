DROP INDEX "booking_snapshots_call_sequence_idx";--> statement-breakpoint
DROP INDEX "call_turns_call_sequence_idx";--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_snapshots_call_sequence_unique" ON "booking_snapshots" USING btree ("call_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "call_turns_call_sequence_unique" ON "call_turns" USING btree ("call_id","sequence");--> statement-breakpoint
ALTER TABLE "booking_snapshots" ADD CONSTRAINT "booking_snapshots_status_check" CHECK ("booking_snapshots"."status" in ('collecting', 'trip_proposed', 'awaiting_confirmation', 'confirmed'));--> statement-breakpoint
ALTER TABLE "booking_snapshots" ADD CONSTRAINT "booking_snapshots_sequence_positive_check" CHECK ("booking_snapshots"."sequence" > 0);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" in ('pending_payment', 'paid', 'cancelled'));--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_total_fare_nonnegative_check" CHECK ("bookings"."total_fare_vnd" >= 0);--> statement-breakpoint
ALTER TABLE "call_turns" ADD CONSTRAINT "call_turns_role_check" CHECK ("call_turns"."role" in ('customer', 'agent'));--> statement-breakpoint
ALTER TABLE "call_turns" ADD CONSTRAINT "call_turns_sequence_positive_check" CHECK ("call_turns"."sequence" > 0);--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_channel_check" CHECK ("calls"."channel" in ('phone', 'web'));--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_status_check" CHECK ("calls"."status" in ('active', 'ended'));--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_status_check" CHECK ("payments"."status" in ('pending', 'succeeded', 'failed'));--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_nonnegative_check" CHECK ("payments"."amount_vnd" >= 0);--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_active_check" CHECK ("routes"."active" in ('yes', 'no'));--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_duration_positive_check" CHECK ("routes"."duration_minutes" is null or "routes"."duration_minutes" > 0);--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_deck_check" CHECK ("seats"."deck" is null or "seats"."deck" in ('lower', 'upper'));--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_status_check" CHECK ("seats"."status" in ('available', 'held', 'booked'));--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_hold_shape_check" CHECK (
    ("seats"."status" = 'held' and "seats"."held_by_call_id" is not null and "seats"."hold_expires_at" is not null and "seats"."booking_id" is null)
    or ("seats"."status" = 'booked' and "seats"."booking_id" is not null and "seats"."held_by_call_id" is null and "seats"."hold_expires_at" is null)
    or ("seats"."status" = 'available' and "seats"."booking_id" is null and "seats"."held_by_call_id" is null and "seats"."hold_expires_at" is null)
  );--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_active_check" CHECK ("trips"."active" in ('yes', 'no'));--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_price_positive_check" CHECK ("trips"."price_vnd" > 0);--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_arrival_after_departure_check" CHECK ("trips"."arrival_at" is null or "trips"."arrival_at" > "trips"."departure_at");
