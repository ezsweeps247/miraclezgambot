CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'ADMIN' NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "affiliate_tiers" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"required_referrals" integer NOT NULL,
	"required_volume" numeric(20, 8) NOT NULL,
	"commission_rate" numeric(5, 4) NOT NULL,
	"bonus_rate" numeric(5, 4) DEFAULT '0',
	"perks" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "affiliate_tiers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "affiliates" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"referral_code" varchar(20) NOT NULL,
	"tier" varchar DEFAULT 'BRONZE',
	"commission_rate" numeric(5, 4) DEFAULT '0.0500',
	"total_referrals" integer DEFAULT 0,
	"active_referrals" integer DEFAULT 0,
	"total_commission_earned" numeric(20, 8) DEFAULT '0',
	"total_commission_paid" numeric(20, 8) DEFAULT '0',
	"available_commission" numeric(20, 8) DEFAULT '0',
	"status" varchar DEFAULT 'ACTIVE',
	"joined_at" timestamp DEFAULT now(),
	"last_activity_at" timestamp DEFAULT now(),
	CONSTRAINT "affiliates_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "aml_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"check_type" text NOT NULL,
	"result" text NOT NULL,
	"risk_score" integer,
	"details" jsonb,
	"triggered_by" text,
	"reviewed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "balances" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"available" bigint DEFAULT 0 NOT NULL,
	"locked" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'CREDITS' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game" text NOT NULL,
	"amount" bigint NOT NULL,
	"result" text NOT NULL,
	"profit" bigint NOT NULL,
	"nonce" integer NOT NULL,
	"server_seed_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_seeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"seed" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_payouts" (
	"id" varchar PRIMARY KEY NOT NULL,
	"affiliate_id" varchar NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"affiliate_id" varchar NOT NULL,
	"referral_id" varchar NOT NULL,
	"transaction_id" uuid,
	"bet_id" uuid,
	"type" varchar NOT NULL,
	"base_amount" numeric(20, 8) NOT NULL,
	"commission_rate" numeric(5, 4) NOT NULL,
	"commission_amount" numeric(20, 8) NOT NULL,
	"tier" integer DEFAULT 1,
	"status" varchar DEFAULT 'PENDING',
	"description" text,
	"earned_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "compliance_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_type" text NOT NULL,
	"user_id" uuid,
	"transaction_id" uuid,
	"details" jsonb NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"filed_by" uuid,
	"filed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cooling_off_periods" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"duration" varchar NOT NULL,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp NOT NULL,
	"reason" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "crash_cashes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"cashout_multiplier" numeric(12, 8) NOT NULL,
	"amount" bigint NOT NULL,
	"profit" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crash_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_seed_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"start_at" timestamp,
	"end_at" timestamp,
	"crash_point" numeric(12, 8),
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crypto_deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"address" text NOT NULL,
	"tx_hash" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"confirmations" integer DEFAULT 0 NOT NULL,
	"required_confirmations" integer DEFAULT 3 NOT NULL,
	"exchange_rate" numeric(18, 8),
	"credits_amount" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "crypto_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"address" text NOT NULL,
	"private_key" text,
	"balance" numeric(18, 8) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crypto_withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"to_address" text NOT NULL,
	"tx_hash" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"exchange_rate" numeric(18, 8),
	"credits_amount" bigint NOT NULL,
	"network_fee" numeric(18, 8),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dice_bets" (
	"bet_id" uuid PRIMARY KEY NOT NULL,
	"side" text NOT NULL,
	"target" numeric(5, 2) NOT NULL,
	"roll" numeric(5, 2) NOT NULL,
	"payout_multiplier" numeric(12, 8) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gaming_sessions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"total_wagered" numeric(20, 8) DEFAULT '0',
	"net_win_loss" numeric(20, 8) DEFAULT '0',
	"games_played" integer DEFAULT 0,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "kyc_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verification_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"document_path" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"metadata" jsonb,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"review_notes" text
);
--> statement-breakpoint
CREATE TABLE "kyc_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"risk_level" text DEFAULT 'LOW' NOT NULL,
	"personal_info" jsonb,
	"required_documents" jsonb,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" uuid,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reality_checks" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"session_id" varchar NOT NULL,
	"triggered_at" timestamp DEFAULT now(),
	"session_duration_minutes" integer NOT NULL,
	"total_wagered" numeric(20, 8) NOT NULL,
	"user_response" varchar,
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "referral_links" (
	"id" varchar PRIMARY KEY NOT NULL,
	"affiliate_id" varchar NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" varchar PRIMARY KEY NOT NULL,
	"affiliate_id" varchar NOT NULL,
	"referred_user_id" uuid NOT NULL,
	"referral_code" varchar(20) NOT NULL,
	"tier" integer DEFAULT 1,
	"status" varchar DEFAULT 'PENDING',
	"first_deposit_amount" numeric(20, 8),
	"first_deposit_at" timestamp,
	"total_deposits" numeric(20, 8) DEFAULT '0',
	"total_wagered" numeric(20, 8) DEFAULT '0',
	"lifetime_value" numeric(20, 8) DEFAULT '0',
	"last_activity_at" timestamp,
	"referred_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "responsible_gaming_limits" (
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
--> statement-breakpoint
CREATE TABLE "self_exclusions" (
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
--> statement-breakpoint
CREATE TABLE "server_seeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hash" text NOT NULL,
	"revealed_seed" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"rotated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"jwt_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_jwt_id_unique" UNIQUE("jwt_id")
);
--> statement-breakpoint
CREATE TABLE "slot_spins" (
	"bet_id" uuid PRIMARY KEY NOT NULL,
	"reels" jsonb NOT NULL,
	"paylines_hit" integer NOT NULL,
	"payout" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" bigint NOT NULL,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_id" bigint NOT NULL,
	"username" text,
	"first_name" text,
	"last_name" text,
	"referral_code" varchar(20),
	"referred_by" varchar(20),
	"kyc_verified" boolean DEFAULT false NOT NULL,
	"kyc_required_at" timestamp,
	"risk_level" text DEFAULT 'LOW',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id")
);
--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aml_checks" ADD CONSTRAINT "aml_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aml_checks" ADD CONSTRAINT "aml_checks_reviewed_by_admins_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balances" ADD CONSTRAINT "balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_server_seed_id_server_seeds_id_fk" FOREIGN KEY ("server_seed_id") REFERENCES "public"."server_seeds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_seeds" ADD CONSTRAINT "client_seeds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_reports" ADD CONSTRAINT "compliance_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_reports" ADD CONSTRAINT "compliance_reports_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_reports" ADD CONSTRAINT "compliance_reports_filed_by_admins_id_fk" FOREIGN KEY ("filed_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cooling_off_periods" ADD CONSTRAINT "cooling_off_periods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crash_cashes" ADD CONSTRAINT "crash_cashes_round_id_crash_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."crash_rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crash_cashes" ADD CONSTRAINT "crash_cashes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crash_rounds" ADD CONSTRAINT "crash_rounds_server_seed_id_server_seeds_id_fk" FOREIGN KEY ("server_seed_id") REFERENCES "public"."server_seeds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_deposits" ADD CONSTRAINT "crypto_deposits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_wallets" ADD CONSTRAINT "crypto_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_withdrawals" ADD CONSTRAINT "crypto_withdrawals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_bets" ADD CONSTRAINT "dice_bets_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gaming_sessions" ADD CONSTRAINT "gaming_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_verification_id_kyc_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."kyc_verifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_reviewed_by_admins_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reality_checks" ADD CONSTRAINT "reality_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reality_checks" ADD CONSTRAINT "reality_checks_session_id_gaming_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."gaming_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsible_gaming_limits" ADD CONSTRAINT "responsible_gaming_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "self_exclusions" ADD CONSTRAINT "self_exclusions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_spins" ADD CONSTRAINT "slot_spins_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;