-- Migration: Add responsible gaming tables
-- Created: 2025-08-15

-- Responsible Gaming Limits table
CREATE TABLE IF NOT EXISTS "responsible_gaming_limits" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"amount" numeric(20, 8),
	"time_minutes" integer,
	"is_active" boolean DEFAULT true,
	"requested_at" timestamp DEFAULT now(),
	"active_from" timestamp DEFAULT now(),
	"last_modified" timestamp DEFAULT now()
);

-- Self Exclusions table
CREATE TABLE IF NOT EXISTS "self_exclusions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"reason" text,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"requested_at" timestamp DEFAULT now(),
	"last_modified" timestamp DEFAULT now()
);

-- Gaming Sessions table
CREATE TABLE IF NOT EXISTS "gaming_sessions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"total_wagered" numeric(20, 8) DEFAULT '0',
	"net_win_loss" numeric(20, 8) DEFAULT '0',
	"games_played" integer DEFAULT 0,
	"is_active" boolean DEFAULT true
);

-- Cooling Off Periods table
CREATE TABLE IF NOT EXISTS "cooling_off_periods" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"duration" varchar NOT NULL,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp NOT NULL,
	"reason" text,
	"is_active" boolean DEFAULT true
);

-- Reality Checks table
CREATE TABLE IF NOT EXISTS "reality_checks" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"session_id" varchar NOT NULL,
	"triggered_at" timestamp DEFAULT now(),
	"session_duration_minutes" integer NOT NULL,
	"total_wagered" numeric(20, 8) NOT NULL,
	"user_response" varchar,
	"responded_at" timestamp
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "responsible_gaming_limits" ADD CONSTRAINT "responsible_gaming_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "self_exclusions" ADD CONSTRAINT "self_exclusions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "gaming_sessions" ADD CONSTRAINT "gaming_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "cooling_off_periods" ADD CONSTRAINT "cooling_off_periods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reality_checks" ADD CONSTRAINT "reality_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reality_checks" ADD CONSTRAINT "reality_checks_session_id_gaming_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "gaming_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "responsible_gaming_limits_user_id_idx" ON "responsible_gaming_limits" ("user_id");
CREATE INDEX IF NOT EXISTS "responsible_gaming_limits_type_idx" ON "responsible_gaming_limits" ("type");
CREATE INDEX IF NOT EXISTS "self_exclusions_user_id_idx" ON "self_exclusions" ("user_id");
CREATE INDEX IF NOT EXISTS "gaming_sessions_user_id_idx" ON "gaming_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "gaming_sessions_is_active_idx" ON "gaming_sessions" ("is_active");
CREATE INDEX IF NOT EXISTS "cooling_off_periods_user_id_idx" ON "cooling_off_periods" ("user_id");
CREATE INDEX IF NOT EXISTS "reality_checks_user_id_idx" ON "reality_checks" ("user_id");
CREATE INDEX IF NOT EXISTS "reality_checks_session_id_idx" ON "reality_checks" ("session_id");