CREATE TABLE "booking_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"status" text NOT NULL,
	"booking_code" text,
	"total_fare_vnd" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_turns" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_id" text NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text DEFAULT 'web' NOT NULL,
	"caller_number" text,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "booking_snapshots" ADD CONSTRAINT "booking_snapshots_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_turns" ADD CONSTRAINT "call_turns_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_snapshots_call_code_unique" ON "booking_snapshots" USING btree ("call_id","booking_code");