CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"trip_id" text NOT NULL,
	"call_id" text,
	"passenger_name" text NOT NULL,
	"phone" text NOT NULL,
	"seat_codes" jsonb NOT NULL,
	"total_fare_vnd" integer NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hotline" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"provider" text NOT NULL,
	"amount_vnd" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" text PRIMARY KEY NOT NULL,
	"operator_id" text NOT NULL,
	"origin_city" text NOT NULL,
	"destination_city" text NOT NULL,
	"duration_minutes" integer,
	"active" text DEFAULT 'yes' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seats" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"code" text NOT NULL,
	"deck" text,
	"status" text DEFAULT 'available' NOT NULL,
	"held_by_call_id" text,
	"hold_expires_at" timestamp with time zone,
	"booking_id" integer
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" text PRIMARY KEY NOT NULL,
	"route_id" text NOT NULL,
	"departure_at" timestamp with time zone NOT NULL,
	"arrival_at" timestamp with time zone,
	"vehicle_type" text NOT NULL,
	"price_vnd" integer NOT NULL,
	"pickup_point" text NOT NULL,
	"dropoff_point" text NOT NULL,
	"active" text DEFAULT 'yes' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_code_unique" ON "bookings" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_idempotency_unique" ON "bookings" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_reference_unique" ON "payments" USING btree ("provider","reference");--> statement-breakpoint
CREATE INDEX "routes_origin_destination_idx" ON "routes" USING btree ("origin_city","destination_city");--> statement-breakpoint
CREATE UNIQUE INDEX "seats_trip_code_unique" ON "seats" USING btree ("trip_id","code");--> statement-breakpoint
CREATE INDEX "seats_trip_status_idx" ON "seats" USING btree ("trip_id","status");--> statement-breakpoint
CREATE INDEX "trips_route_departure_idx" ON "trips" USING btree ("route_id","departure_at");