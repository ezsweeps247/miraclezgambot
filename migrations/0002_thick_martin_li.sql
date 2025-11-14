CREATE TABLE "user_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_type" varchar(50) NOT NULL,
	"address" varchar(100) NOT NULL,
	"signature" text,
	"status" text DEFAULT 'connected' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_wallets_user_id_address_unique" UNIQUE("user_id","address")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_in_self_exclusion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_in_cooling_off" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "self_exclusion_until" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "self_exclusion_type" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cooling_off_until" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_session_start" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_session_time" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;