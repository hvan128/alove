CREATE TABLE "newsletter_subscriptions" (
	"email" text PRIMARY KEY NOT NULL,
	"source" text DEFAULT 'landing_footer' NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscriptions_source_check" CHECK ("newsletter_subscriptions"."source" in ('landing_footer'))
);
