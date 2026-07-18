CREATE TABLE "booking_webhook_outbox" (
	"event_id" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error_code" text,
	"last_attempt_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_webhook_outbox_attempts_nonnegative_check" CHECK ("booking_webhook_outbox"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "public_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"resets_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "public_rate_limits_count_positive_check" CHECK ("public_rate_limits"."count" > 0)
);
--> statement-breakpoint
CREATE INDEX "booking_webhook_outbox_status_created_idx" ON "booking_webhook_outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "public_rate_limits_resets_at_idx" ON "public_rate_limits" USING btree ("resets_at");