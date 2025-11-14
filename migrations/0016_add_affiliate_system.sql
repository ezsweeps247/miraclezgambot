-- Migration: Add Affiliate and Referral System
-- Created: 2025-08-15

-- Create affiliates table
CREATE TABLE IF NOT EXISTS "affiliates" (
  "id" varchar PRIMARY KEY,
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "referral_code" varchar(20) NOT NULL UNIQUE,
  "tier" varchar DEFAULT 'BRONZE',
  "commission_rate" decimal(5,4) DEFAULT '0.0500',
  "total_referrals" integer DEFAULT 0,
  "active_referrals" integer DEFAULT 0,
  "total_commission_earned" decimal(20,8) DEFAULT '0',
  "total_commission_paid" decimal(20,8) DEFAULT '0',
  "available_commission" decimal(20,8) DEFAULT '0',
  "status" varchar DEFAULT 'ACTIVE',
  "joined_at" timestamp DEFAULT now(),
  "last_activity_at" timestamp DEFAULT now()
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS "referrals" (
  "id" varchar PRIMARY KEY,
  "affiliate_id" varchar NOT NULL REFERENCES "affiliates"("id"),
  "referred_user_id" varchar NOT NULL REFERENCES "users"("id"),
  "referral_code" varchar(20) NOT NULL,
  "tier" integer DEFAULT 1,
  "status" varchar DEFAULT 'PENDING',
  "first_deposit_amount" decimal(20,8),
  "first_deposit_at" timestamp,
  "total_deposits" decimal(20,8) DEFAULT '0',
  "total_wagered" decimal(20,8) DEFAULT '0',
  "lifetime_value" decimal(20,8) DEFAULT '0',
  "last_activity_at" timestamp,
  "referred_at" timestamp DEFAULT now()
);

-- Create commissions table
CREATE TABLE IF NOT EXISTS "commissions" (
  "id" varchar PRIMARY KEY,
  "affiliate_id" varchar NOT NULL REFERENCES "affiliates"("id"),
  "referral_id" varchar NOT NULL REFERENCES "referrals"("id"),
  "transaction_id" varchar REFERENCES "transactions"("id"),
  "bet_id" varchar REFERENCES "bets"("id"),
  "type" varchar NOT NULL,
  "base_amount" decimal(20,8) NOT NULL,
  "commission_rate" decimal(5,4) NOT NULL,
  "commission_amount" decimal(20,8) NOT NULL,
  "tier" integer DEFAULT 1,
  "status" varchar DEFAULT 'PENDING',
  "description" text,
  "earned_at" timestamp DEFAULT now(),
  "approved_at" timestamp,
  "paid_at" timestamp
);

-- Create commission_payouts table
CREATE TABLE IF NOT EXISTS "commission_payouts" (
  "id" varchar PRIMARY KEY,
  "affiliate_id" varchar NOT NULL REFERENCES "affiliates"("id"),
  "amount" decimal(20,8) NOT NULL,
  "commission_ids" text NOT NULL,
  "method" varchar NOT NULL,
  "wallet_address" varchar,
  "transaction_hash" varchar,
  "status" varchar DEFAULT 'PENDING',
  "requested_at" timestamp DEFAULT now(),
  "processed_at" timestamp,
  "completed_at" timestamp,
  "notes" text
);

-- Create affiliate_tiers table
CREATE TABLE IF NOT EXISTS "affiliate_tiers" (
  "id" varchar PRIMARY KEY,
  "name" varchar(50) NOT NULL UNIQUE,
  "required_referrals" integer NOT NULL,
  "required_volume" decimal(20,8) NOT NULL,
  "commission_rate" decimal(5,4) NOT NULL,
  "bonus_rate" decimal(5,4) DEFAULT '0',
  "perks" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

-- Create referral_links table
CREATE TABLE IF NOT EXISTS "referral_links" (
  "id" varchar PRIMARY KEY,
  "affiliate_id" varchar NOT NULL REFERENCES "affiliates"("id"),
  "name" varchar(100) NOT NULL,
  "url" varchar(500) NOT NULL,
  "referral_code" varchar(20) NOT NULL,
  "campaign" varchar(100),
  "source" varchar(100),
  "medium" varchar(100),
  "clicks" integer DEFAULT 0,
  "conversions" integer DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_affiliates_user_id" ON "affiliates"("user_id");
CREATE INDEX IF NOT EXISTS "idx_affiliates_referral_code" ON "affiliates"("referral_code");
CREATE INDEX IF NOT EXISTS "idx_affiliates_status" ON "affiliates"("status");

CREATE INDEX IF NOT EXISTS "idx_referrals_affiliate_id" ON "referrals"("affiliate_id");
CREATE INDEX IF NOT EXISTS "idx_referrals_referred_user_id" ON "referrals"("referred_user_id");
CREATE INDEX IF NOT EXISTS "idx_referrals_referral_code" ON "referrals"("referral_code");
CREATE INDEX IF NOT EXISTS "idx_referrals_status" ON "referrals"("status");

CREATE INDEX IF NOT EXISTS "idx_commissions_affiliate_id" ON "commissions"("affiliate_id");
CREATE INDEX IF NOT EXISTS "idx_commissions_referral_id" ON "commissions"("referral_id");
CREATE INDEX IF NOT EXISTS "idx_commissions_status" ON "commissions"("status");
CREATE INDEX IF NOT EXISTS "idx_commissions_type" ON "commissions"("type");
CREATE INDEX IF NOT EXISTS "idx_commissions_earned_at" ON "commissions"("earned_at");

CREATE INDEX IF NOT EXISTS "idx_commission_payouts_affiliate_id" ON "commission_payouts"("affiliate_id");
CREATE INDEX IF NOT EXISTS "idx_commission_payouts_status" ON "commission_payouts"("status");

CREATE INDEX IF NOT EXISTS "idx_referral_links_affiliate_id" ON "referral_links"("affiliate_id");
CREATE INDEX IF NOT EXISTS "idx_referral_links_referral_code" ON "referral_links"("referral_code");

-- Insert default affiliate tiers
INSERT INTO "affiliate_tiers" ("id", "name", "required_referrals", "required_volume", "commission_rate", "bonus_rate", "perks") VALUES
('tier_bronze', 'BRONZE', 0, '0', '0.0500', '0', '["Basic commission tracking", "Monthly payouts"]'),
('tier_silver', 'SILVER', 10, '10000', '0.0750', '0.0100', '["Higher commission rate", "Bi-weekly payouts", "Performance dashboard"]'),
('tier_gold', 'GOLD', 25, '50000', '0.1000', '0.0200', '["Premium commission rate", "Weekly payouts", "Advanced analytics", "Dedicated support"]'),
('tier_platinum', 'PLATINUM', 50, '150000', '0.1250', '0.0300', '["Elite commission rate", "Daily payouts", "Custom tracking links", "Priority support", "Monthly bonuses"]'),
('tier_diamond', 'DIAMOND', 100, '500000', '0.1500', '0.0500', '["Maximum commission rate", "Instant payouts", "White-label options", "Account manager", "Revenue sharing", "Exclusive events"]');

-- Add referral_code column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_code') THEN
    ALTER TABLE "users" ADD COLUMN "referral_code" varchar(20);
  END IF;
END $$;

-- Add referred_by column to users table if it doesn't exist  
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by') THEN
    ALTER TABLE "users" ADD COLUMN "referred_by" varchar(20);
  END IF;
END $$;

-- Create index on users referral columns
CREATE INDEX IF NOT EXISTS "idx_users_referral_code" ON "users"("referral_code");
CREATE INDEX IF NOT EXISTS "idx_users_referred_by" ON "users"("referred_by");