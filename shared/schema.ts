import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, bigint, integer, decimal, timestamp, boolean, jsonb, uuid, serial, unique, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Telegram Auth (nullable for web users)
  telegramId: bigint("telegram_id", { mode: "number" }).unique(),
  // Web Auth (nullable for Telegram users)
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  // Web3 Auth (nullable for non-Web3 users)
  walletAddress: varchar("wallet_address", { length: 255 }).unique(),
  // Google OAuth (nullable for non-Google users)
  googleId: varchar("google_id", { length: 255 }).unique(),
  // Shared Fields
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  referralCode: varchar("referral_code", { length: 20 }),
  referredBy: varchar("referred_by", { length: 20 }),
  kycVerified: boolean("kyc_verified").default(false).notNull(),
  kycRequiredAt: timestamp("kyc_required_at"),
  riskLevel: text("risk_level", { enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }).default("LOW"),
  // VIP Fields
  vipLevel: text("vip_level", { 
    enum: ["UNRANKED", "WOOD", "BRONZE", "SILVER", "GOLD", "PLATINUM", "JADE", "SAPPHIRE", "RUBY", "DIAMOND"] 
  }).default("UNRANKED").notNull(),
  vipExperience: bigint("vip_experience", { mode: "number" }).default(0).notNull(),
  vipLevelReachedAt: timestamp("vip_level_reached_at"),
  // Responsible Gaming Fields
  isInSelfExclusion: boolean("is_in_self_exclusion").default(false).notNull(),
  isInCoolingOff: boolean("is_in_cooling_off").default(false).notNull(),
  selfExclusionUntil: timestamp("self_exclusion_until"),
  selfExclusionType: text("self_exclusion_type", { enum: ["TEMPORARY", "PERMANENT"] }),
  coolingOffUntil: timestamp("cooling_off_until"),
  lastSessionStart: timestamp("last_session_start"),
  totalSessionTime: bigint("total_session_time", { mode: "number" }).default(0), // in seconds
  // Balance Mode Preference
  balanceMode: text("balance_mode", { enum: ["GC", "SC"] }).default("GC").notNull(), // GC = Gold Credits, SC = Sweeps Cash
  // Avatar Preferences
  avatarType: text("avatar_type").default("default").notNull(), // Avatar selection identifier
  avatarBackgroundColor: text("avatar_background_color").default("#9333ea").notNull(), // Hex color code
  // User Preferences
  soundEnabled: boolean("sound_enabled").default(true).notNull(),
  lastLoginDate: date("last_login_date"),
  loginStreak: integer("login_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  // SC Streak Fields
  scStreakCount: integer("sc_streak_count").default(0).notNull(),
  lastScClaimDate: date("last_sc_claim_date"),
  longestScStreak: integer("longest_sc_streak").default(0).notNull(),
  // Daily Wheel Spinner
  lastWheelSpinDate: date("last_wheel_spin_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] }).default("ADMIN").notNull(),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  jwtId: text("jwt_id").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const balances = pgTable("balances", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  available: bigint("available", { mode: "number" }).default(0).notNull(),
  locked: bigint("locked", { mode: "number" }).default(0).notNull(),
  currency: text("currency").default("SC").notNull(),
  // Sweeps Cash (SC) balances
  sweepsCashTotal: decimal("sweeps_cash_total", { precision: 10, scale: 2 }).default("0.00").notNull(),
  sweepsCashRedeemable: decimal("sweeps_cash_redeemable", { precision: 10, scale: 2 }).default("0.00").notNull(),
});

export const vaultEntries = pgTable("vault_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency", { enum: ["GC", "SC"] }).notNull(),
  status: text("status", { enum: ["STASHED", "RELEASED", "CANCELLED"] }).default("STASHED").notNull(),
  autoReleaseAt: timestamp("auto_release_at"),
  releasedAt: timestamp("released_at"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  username: text("username").notNull(),
  message: text("message").notNull(),
  userLevel: text("user_level", { enum: ["REGULAR", "VIP", "ADMIN"] }).default("REGULAR").notNull(),
  isSystemMessage: boolean("is_system_message").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cryptoWallets = pgTable("crypto_wallets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  currency: text("currency", { enum: ["BTC", "ETH", "USDT", "LTC", "DOGE"] }).notNull(),
  address: text("address").notNull(),
  privateKey: text("private_key"), // Encrypted
  balance: decimal("balance", { precision: 18, scale: 8 }).default("0").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cryptoDeposits = pgTable("crypto_deposits", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  currency: text("currency", { enum: ["BTC", "ETH", "USDT", "LTC", "DOGE"] }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  address: text("address").notNull(),
  txHash: text("tx_hash"),
  status: text("status", { enum: ["PENDING", "CONFIRMED", "FAILED"] }).default("PENDING").notNull(),
  confirmations: integer("confirmations").default(0).notNull(),
  requiredConfirmations: integer("required_confirmations").default(3).notNull(),
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 8 }), // Crypto to credits rate
  creditsAmount: bigint("credits_amount", { mode: "number" }), // Final credits received
  createdAt: timestamp("created_at").defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at"),
});

export const cryptoWithdrawals = pgTable("crypto_withdrawals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  currency: text("currency", { enum: ["BTC", "ETH", "USDT", "LTC", "DOGE"] }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  toAddress: text("to_address").notNull(),
  txHash: text("tx_hash"),
  status: text("status", { enum: ["PENDING", "PROCESSING", "SENT", "CONFIRMED", "FAILED"] }).default("PENDING").notNull(),
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 8 }), // Credits to crypto rate
  creditsAmount: bigint("credits_amount", { mode: "number" }).notNull(), // Credits deducted
  networkFee: decimal("network_fee", { precision: 18, scale: 8 }), // Network transaction fee
  isInstant: boolean("is_instant").default(false).notNull(), // Was this processed instantly?
  riskScore: integer("risk_score"), // Risk score at time of withdrawal
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// Instant Withdrawal Settings
export const instantWithdrawalSettings = pgTable("instant_withdrawal_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  enabled: boolean("enabled").default(true).notNull(),
  minVipLevel: text("min_vip_level", { 
    enum: ["UNRANKED", "WOOD", "BRONZE", "SILVER", "GOLD", "PLATINUM", "JADE", "SAPPHIRE", "RUBY", "DIAMOND"] 
  }).default("JADE").notNull(),
  requireKyc: boolean("require_kyc").default(true).notNull(),
  maxAmountPerWithdrawal: decimal("max_amount_per_withdrawal", { precision: 10, scale: 2 }).default("500.00").notNull(),
  maxAmountPer24h: decimal("max_amount_per_24h", { precision: 10, scale: 2 }).default("2000.00").notNull(),
  maxRiskScore: integer("max_risk_score").default(30).notNull(), // Max risk score allowed for instant
  minAccountAgeDays: integer("min_account_age_days").default(7).notNull(),
  minTotalWagered: decimal("min_total_wagered", { precision: 10, scale: 2 }).default("1000.00").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Withdrawal Statistics (for risk scoring)
export const userWithdrawalStats = pgTable("user_withdrawal_stats", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  totalWithdrawals: integer("total_withdrawals").default(0).notNull(),
  successfulWithdrawals: integer("successful_withdrawals").default(0).notNull(),
  failedWithdrawals: integer("failed_withdrawals").default(0).notNull(),
  totalWithdrawnAmount: decimal("total_withdrawn_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  last24hWithdrawnAmount: decimal("last_24h_withdrawn_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  last24hWithdrawalCount: integer("last_24h_withdrawal_count").default(0).notNull(),
  lastWithdrawalAt: timestamp("last_withdrawal_at"),
  averageWithdrawalAmount: decimal("average_withdrawal_amount", { precision: 10, scale: 2 }).default("0.00"),
  riskScore: integer("risk_score").default(0).notNull(), // 0-100 score
  isEligibleForInstant: boolean("is_eligible_for_instant").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tipping system
export const tips = pgTable("tips", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: uuid("from_user_id").references(() => users.id).notNull(),
  toUserId: uuid("to_user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: text("type", { enum: ["DEPOSIT", "WITHDRAW", "BET", "PAYOUT", "REFUND", "VIP_REWARD", "DAILY_LOGIN", "VAULT_STASH", "VAULT_RELEASE", "RAKEBACK_EARNED", "RAKEBACK_WITHDRAWAL", "ADMIN_CREDIT", "ADMIN_DEBIT"] }).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serverSeeds = pgTable("server_seeds", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  hash: text("hash").notNull(),
  revealedSeed: text("revealed_seed"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  rotatedAt: timestamp("rotated_at"),
});

export const clientSeeds = pgTable("client_seeds", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  seed: text("seed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bets = pgTable("bets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  game: text("game"),
  amount: bigint("amount", { mode: "number" }).notNull(),
  result: text("result", { enum: ["WIN", "LOSE", "CASHED"] }).notNull(),
  profit: bigint("profit", { mode: "number" }).notNull(),
  nonce: integer("nonce"),
  serverSeedId: uuid("server_seed_id").references(() => serverSeeds.id),
  potential_win: bigint("potential_win", { mode: "number" }),
  gameMode: text("game_mode", { enum: ["real", "fun"] }).default("fun").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const slotSpins = pgTable("slot_spins", {
  betId: uuid("bet_id").primaryKey().references(() => bets.id),
  reels: jsonb("reels").notNull(),
  paylinesHit: integer("paylines_hit").notNull(),
  payout: bigint("payout", { mode: "number" }).notNull(),
});

export const crashRounds = pgTable("crash_rounds", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  serverSeedId: uuid("server_seed_id").references(() => serverSeeds.id).notNull(),
  hash: text("hash").notNull(),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  crashPoint: decimal("crash_point", { precision: 12, scale: 8 }),
  status: text("status", { enum: ["PENDING", "RUNNING", "ENDED"] }).default("PENDING").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const crashCashes = pgTable("crash_cashes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  roundId: uuid("round_id").references(() => crashRounds.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  cashoutMultiplier: decimal("cashout_multiplier", { precision: 12, scale: 8 }).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  profit: bigint("profit", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// KYC/AML Tables
export const kycVerifications = pgTable("kyc_verifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  status: text("status", { enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "REQUIRES_ADDITIONAL_INFO"] }).default("PENDING").notNull(),
  riskLevel: text("risk_level", { enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }).default("LOW").notNull(),
  personalInfo: jsonb("personal_info"), // Stores personal information
  requiredDocuments: jsonb("required_documents"), // Array of required document types
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: uuid("reviewed_by").references(() => admins.id),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kycDocuments = pgTable("kyc_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  verificationId: uuid("verification_id").references(() => kycVerifications.id).notNull(),
  documentType: text("document_type", { 
    enum: ["PASSPORT", "DRIVERS_LICENSE", "NATIONAL_ID", "PROOF_OF_ADDRESS", "BANK_STATEMENT", "UTILITY_BILL"] 
  }).notNull(),
  documentPath: text("document_path").notNull(), // Object storage path
  status: text("status", { enum: ["PENDING", "APPROVED", "REJECTED"] }).default("PENDING").notNull(),
  metadata: jsonb("metadata"), // Document-specific metadata (number, expiry, etc.)
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  reviewNotes: text("review_notes"),
});

export const amlChecks = pgTable("aml_checks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  checkType: text("check_type", { enum: ["TRANSACTION_MONITORING", "SANCTIONS_CHECK", "PEP_CHECK", "ADVERSE_MEDIA"] }).notNull(),
  result: text("result", { enum: ["PASS", "FAIL", "WARNING", "MANUAL_REVIEW"] }).notNull(),
  riskScore: integer("risk_score"), // 0-100 scale
  details: jsonb("details"), // Check-specific details
  triggeredBy: text("triggered_by"), // What triggered this check
  reviewedBy: uuid("reviewed_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const complianceReports = pgTable("compliance_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reportType: text("report_type", { enum: ["SUSPICIOUS_ACTIVITY", "LARGE_TRANSACTION", "REGULATORY_FILING"] }).notNull(),
  userId: uuid("user_id").references(() => users.id),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  details: jsonb("details").notNull(),
  status: text("status", { enum: ["DRAFT", "SUBMITTED", "REVIEWED", "CLOSED"] }).default("DRAFT").notNull(),
  filedBy: uuid("filed_by").references(() => admins.id),
  filedAt: timestamp("filed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Game Settings Table
export const gameSettings = pgTable("game_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameName: text("game_name", { 
    enum: ["DICE", "SLOTS", "CRASH", "MIRACOASTER", "MINES", "KENO", "PLINKO", "LIMBO", "HILO", "BLACKJACK", "ROULETTE"] 
  }).unique().notNull(),
  rtpMode: text("rtp_mode", { enum: ["HIGH", "MEDIUM", "LOW"] }).default("MEDIUM").notNull(),
  rtpValue: decimal("rtp_value", { precision: 5, scale: 2 }).notNull(), // e.g., 99.00, 96.00, 94.00
  houseEdge: decimal("house_edge", { precision: 5, scale: 2 }).notNull(), // e.g., 1.00, 4.00, 6.00
  updatedBy: uuid("updated_by").references(() => admins.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Blackjack tables
export const blackjackHands = pgTable("blackjack_hands", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  baseBet: bigint("base_bet", { mode: "number" }).notNull(),
  ppBet: bigint("pp_bet", { mode: "number" }).default(0).notNull(),
  plus3Bet: bigint("plus3_bet", { mode: "number" }).default(0).notNull(),
  insuranceBet: bigint("insurance_bet", { mode: "number" }).default(0).notNull(),
  stateJson: jsonb("state_json").notNull(),
  status: text("status", { enum: ["in_play", "settled"] }).notNull(),
  resultSummary: text("result_summary"),
  profit: bigint("profit", { mode: "number" }).default(0),
  serverSeedHash: text("server_seed_hash").notNull(),
  serverSeedRevealed: text("server_seed_revealed"),
  clientSeed: text("client_seed").notNull(),
  handNonce: integer("hand_nonce").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Roulette tables
export const rouletteSpins = pgTable("roulette_spins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  serverSeedHash: text("server_seed_hash").notNull(),
  serverSeedRevealed: text("server_seed_revealed"),
  clientSeed: text("client_seed").notNull(),
  nonce: integer("nonce").notNull(),
  bets: jsonb("bets").notNull(), // Store all bets as JSON
  result: integer("result").notNull(), // Winning number 0-36
  betAmount: bigint("bet_amount", { mode: "number" }).notNull(),
  payout: bigint("payout", { mode: "number" }).notNull(),
  profit: bigint("profit", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRouletteSpinSchema = createInsertSchema(rouletteSpins);
export type RouletteSpinInsert = z.infer<typeof insertRouletteSpinSchema>;
export type RouletteSpin = typeof rouletteSpins.$inferSelect;

// Deposit Bonus Tables
export const depositBonuses = pgTable("deposit_bonuses", {
  id: serial("id").primaryKey(),
  bonusType: text("bonus_type", { enum: ["first_deposit", "second_deposit", "third_deposit"] }).notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(), // e.g., 20.00, 25.00, 30.00
  minDeposit: decimal("min_deposit", { precision: 10, scale: 2 }).notNull(), // minimum deposit amount
  wageringMultiplier: integer("wagering_multiplier").notNull(), // e.g., 15x
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userBonuses = pgTable("user_bonuses", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  bonusId: integer("bonus_id").references(() => depositBonuses.id).notNull(),
  depositId: uuid("deposit_id").references(() => transactions.id), // Link to specific deposit transaction
  depositAmount: decimal("deposit_amount", { precision: 20, scale: 8 }).notNull(),
  bonusAmount: decimal("bonus_amount", { precision: 20, scale: 8 }).notNull(),
  wageringRequirement: decimal("wagering_requirement", { precision: 20, scale: 8 }).notNull(),
  wageredAmount: decimal("wagered_amount", { precision: 20, scale: 8 }).default("0").notNull(),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  status: text("status", { enum: ["active", "completed", "expired"] }).default("active").notNull(),
}, (table) => ({
  // Ensure only one bonus per deposit
  depositBonusUnique: unique().on(table.depositId),
  // Ensure only one active bonus per user per bonus type per day
  userDailyBonusUnique: unique().on(table.userId, table.bonusId, table.claimedAt)
}));

export const userDailyDeposits = pgTable("user_daily_deposits", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  depositDate: date("deposit_date").notNull(),
  depositCount: integer("deposit_count").default(0).notNull(),
  lastDepositAt: timestamp("last_deposit_at").notNull(),
}, (table) => ({
  userDateUnique: unique().on(table.userId, table.depositDate)
}));

// New table for pending bonus selections
export const pendingBonusSelections = pgTable("pending_bonus_selections", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  bonusType: text("bonus_type", { enum: ["first_deposit", "second_deposit", "third_deposit"] }).notNull(),
  bonusId: integer("bonus_id").references(() => depositBonuses.id).notNull(),
  expectedDepositAmount: decimal("expected_deposit_amount", { precision: 10, scale: 2 }),
  status: text("status", { enum: ["pending", "applied", "expired"] }).default("pending").notNull(),
  selectedAt: timestamp("selected_at").defaultNow().notNull(),
  appliedAt: timestamp("applied_at"),
  expiredAt: timestamp("expired_at"),
  depositId: uuid("deposit_id").references(() => transactions.id), // Links to actual deposit when applied
  sessionId: text("session_id"), // Store session ID to link selection to user session
}, (table) => ({
  // Only one pending selection per user at a time
  userPendingUnique: unique("user_pending_unique").on(table.userId, table.status)
}));

// New table for tracking bonus reset history
export const bonusResetHistory = pgTable("bonus_reset_history", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  balanceAtReset: decimal("balance_at_reset", { precision: 20, scale: 8 }).notNull(),
  previousBonusId: integer("previous_bonus_id").references(() => depositBonuses.id),
  previousBonusStatus: text("previous_bonus_status", { enum: ["active", "completed", "expired"] }),
  newBonusId: integer("new_bonus_id").references(() => depositBonuses.id),
  resetType: text("reset_type", { enum: ["auto_low_balance", "manual_reset", "bonus_expired"] }).notNull(),
  resetAt: timestamp("reset_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // Additional data about the reset
});

// Insert schemas for deposit bonus tables
export const insertDepositBonusSchema = createInsertSchema(depositBonuses).omit({
  id: true,
  createdAt: true,
});

export const insertUserBonusSchema = createInsertSchema(userBonuses).omit({
  id: true,
  claimedAt: true,
});

export const insertUserDailyDepositSchema = createInsertSchema(userDailyDeposits).omit({
  id: true,
});

export const insertPendingBonusSelectionSchema = createInsertSchema(pendingBonusSelections).omit({
  id: true,
  selectedAt: true,
});

export const insertBonusResetHistorySchema = createInsertSchema(bonusResetHistory).omit({
  id: true,
  resetAt: true,
});

// Types for deposit bonus tables
export type DepositBonus = typeof depositBonuses.$inferSelect;
export type InsertDepositBonus = z.infer<typeof insertDepositBonusSchema>;

export type UserBonus = typeof userBonuses.$inferSelect;
export type InsertUserBonus = z.infer<typeof insertUserBonusSchema>;

export type UserDailyDeposit = typeof userDailyDeposits.$inferSelect;
export type InsertUserDailyDeposit = z.infer<typeof insertUserDailyDepositSchema>;

export type PendingBonusSelection = typeof pendingBonusSelections.$inferSelect;
export type InsertPendingBonusSelection = z.infer<typeof insertPendingBonusSelectionSchema>;

export type BonusResetHistory = typeof bonusResetHistory.$inferSelect;
export type InsertBonusResetHistory = z.infer<typeof insertBonusResetHistorySchema>;

// Progressive Jackpot Tables
export const jackpotPools = pgTable("jackpot_pools", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tier: text("tier", { enum: ["MINI", "MINOR", "MAJOR", "MEGA"] }).notNull(),
  currentAmount: decimal("current_amount", { precision: 20, scale: 2 }).default("0.00").notNull(),
  seedAmount: decimal("seed_amount", { precision: 20, scale: 2 }).notNull(),
  contributionPercentage: decimal("contribution_percentage", { precision: 5, scale: 4 }).notNull(), // e.g., 0.0050 = 0.5%
  seedGrowthRate: decimal("seed_growth_rate", { precision: 5, scale: 4 }).default("0.0200").notNull(), // 2% growth per win
  currency: text("currency", { enum: ["GC", "SC"] }).notNull(),
  gameEligibility: text("game_eligibility").array(), // Array of game names, null = all games
  lastWonAt: timestamp("last_won_at"),
  lastWinnerId: uuid("last_winner_id").references(() => users.id),
  lastWinAmount: decimal("last_win_amount", { precision: 20, scale: 2 }),
  totalWinCount: integer("total_win_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueTierCurrency: unique().on(table.tier, table.currency),
}));

export const jackpotContributions = pgTable("jackpot_contributions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  jackpotPoolId: uuid("jackpot_pool_id").references(() => jackpotPools.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  betId: uuid("bet_id").references(() => bets.id),
  amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
  gameName: text("game_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jackpotWinners = pgTable("jackpot_winners", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  jackpotPoolId: uuid("jackpot_pool_id").references(() => jackpotPools.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  amountWon: decimal("amount_won", { precision: 20, scale: 2 }).notNull(),
  gameName: text("game_name").notNull(),
  betId: uuid("bet_id").references(() => bets.id),
  currency: text("currency", { enum: ["GC", "SC"] }).notNull(),
  wonAt: timestamp("won_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // Audit trail: roll values, odds, bet multiplier
});

// Insert schemas for jackpot tables
export const insertJackpotPoolSchema = createInsertSchema(jackpotPools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJackpotContributionSchema = createInsertSchema(jackpotContributions).omit({
  id: true,
  createdAt: true,
});

export const insertJackpotWinnerSchema = createInsertSchema(jackpotWinners).omit({
  id: true,
  wonAt: true,
});

// Types for jackpot tables
export type JackpotPool = typeof jackpotPools.$inferSelect;
export type InsertJackpotPool = z.infer<typeof insertJackpotPoolSchema>;

export type JackpotContribution = typeof jackpotContributions.$inferSelect;
export type InsertJackpotContribution = z.infer<typeof insertJackpotContributionSchema>;

export type JackpotWinner = typeof jackpotWinners.$inferSelect;
export type InsertJackpotWinner = z.infer<typeof insertJackpotWinnerSchema>;

// VIP System Tables
export const vipLevels = pgTable("vip_levels", {
  id: serial("id").primaryKey(),
  level: text("level", { 
    enum: ["UNRANKED", "WOOD", "BRONZE", "SILVER", "GOLD", "PLATINUM", "JADE", "SAPPHIRE", "RUBY", "DIAMOND"] 
  }).unique().notNull(),
  experienceRequired: bigint("experience_required", { mode: "number" }).notNull(),
  levelOrder: integer("level_order").unique().notNull(), // 0 for UNRANKED, 1 for WOOD, etc.
  color: text("color").notNull(), // Hex color for UI display
  icon: text("icon"), // Icon identifier
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vipBenefits = pgTable("vip_benefits", {
  id: serial("id").primaryKey(),
  level: text("level", { 
    enum: ["UNRANKED", "WOOD", "BRONZE", "SILVER", "GOLD", "PLATINUM", "JADE", "SAPPHIRE", "RUBY", "DIAMOND"] 
  }).notNull(),
  benefitType: text("benefit_type", { 
    enum: ["INSTANT_RAKEBACK", "WEEKLY_BONUS", "LEVEL_UP_BONUS", "RANK_UP_BONUS", "MONTHLY_BONUS", "BONUS_INCREASE", "VIP_HOST", "MIRACLEZ_EVENTS"] 
  }).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }), // Percentage or amount value
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vipProgress = pgTable("vip_progress", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).unique().notNull(),
  currentLevel: text("current_level", { 
    enum: ["UNRANKED", "WOOD", "BRONZE", "SILVER", "GOLD", "PLATINUM", "JADE", "SAPPHIRE", "RUBY", "DIAMOND"] 
  }).default("UNRANKED").notNull(),
  nextLevel: text("next_level", { 
    enum: ["WOOD", "BRONZE", "SILVER", "GOLD", "PLATINUM", "JADE", "SAPPHIRE", "RUBY", "DIAMOND"] 
  }),
  currentExperience: bigint("current_experience", { mode: "number" }).default(0).notNull(),
  requiredExperience: bigint("required_experience", { mode: "number" }).notNull(),
  progressPercentage: decimal("progress_percentage", { precision: 5, scale: 2 }).default("0.00").notNull(),
  lastLevelUpAt: timestamp("last_level_up_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vipRewards = pgTable("vip_rewards", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  rewardType: text("reward_type", { 
    enum: ["INSTANT_RAKEBACK", "WEEKLY_BONUS", "LEVEL_UP_BONUS", "RANK_UP_BONUS", "MONTHLY_BONUS"] 
  }).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  vipLevel: text("vip_level", { 
    enum: ["UNRANKED", "WOOD", "BRONZE", "SILVER", "GOLD", "PLATINUM", "JADE", "SAPPHIRE", "RUBY", "DIAMOND"] 
  }).notNull(),
  claimedAt: timestamp("claimed_at"),
  expiresAt: timestamp("expires_at"),
  status: text("status", { enum: ["PENDING", "CLAIMED", "EXPIRED"] }).default("PENDING").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Daily Login System Tables
export const dailyLoginRewards = pgTable("daily_login_rewards", {
  id: serial("id").primaryKey(),
  day: integer("day").unique().notNull(), // 1-7
  goldCoins: bigint("gold_coins", { mode: "number" }).notNull(),
  sweepCoins: decimal("sweep_coins", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userDailyLogins = pgTable("user_daily_logins", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastLoginDate: date("last_login_date"),
  lastClaimDate: date("last_claim_date"),
  nextResetAt: timestamp("next_reset_at").notNull(),
  totalClaims: integer("total_claims").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userUnique: unique().on(table.userId)
}));

export const dailyLoginClaims = pgTable("daily_login_claims", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  day: integer("day").notNull(), // 1-7
  rewardId: integer("reward_id").references(() => dailyLoginRewards.id).notNull(),
  goldCoinsAwarded: bigint("gold_coins_awarded", { mode: "number" }).notNull(),
  sweepCoinsAwarded: decimal("sweep_coins_awarded", { precision: 10, scale: 2 }).notNull(),
  claimDate: date("claim_date").notNull(),
  streakAtClaim: integer("streak_at_claim").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Top Up Bonus System Tables
export const userTopUpBonus = pgTable("user_top_up_bonus", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  lastClaimAt: timestamp("last_claim_at"),
  nextAvailableAt: timestamp("next_available_at"),
  totalClaims: integer("total_claims").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userUnique: unique().on(table.userId)
}));

export const topUpBonusClaims = pgTable("top_up_bonus_claims", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  goldCoinsAwarded: bigint("gold_coins_awarded", { mode: "number" }).notNull(),
  claimDateTime: timestamp("claim_date_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for VIP tables
export const insertVipLevelSchema = createInsertSchema(vipLevels).omit({
  id: true,
  createdAt: true,
});

export const insertVipBenefitSchema = createInsertSchema(vipBenefits).omit({
  id: true,
  createdAt: true,
});

export const insertVipProgressSchema = createInsertSchema(vipProgress).omit({
  id: true,
  updatedAt: true,
});

export const insertVipRewardSchema = createInsertSchema(vipRewards).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for Daily Login tables
export const insertDailyLoginRewardSchema = createInsertSchema(dailyLoginRewards).omit({
  id: true,
  createdAt: true,
});

export const insertUserDailyLoginSchema = createInsertSchema(userDailyLogins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyLoginClaimSchema = createInsertSchema(dailyLoginClaims).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for Top Up Bonus tables
export const insertUserTopUpBonusSchema = createInsertSchema(userTopUpBonus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTopUpBonusClaimSchema = createInsertSchema(topUpBonusClaims).omit({
  id: true,
  createdAt: true,
});

// Types for VIP tables
export type VipLevel = typeof vipLevels.$inferSelect;
export type InsertVipLevel = z.infer<typeof insertVipLevelSchema>;

export type VipBenefit = typeof vipBenefits.$inferSelect;
export type InsertVipBenefit = z.infer<typeof insertVipBenefitSchema>;

export type VipProgress = typeof vipProgress.$inferSelect;
export type InsertVipProgress = z.infer<typeof insertVipProgressSchema>;

export type VipReward = typeof vipRewards.$inferSelect;
export type InsertVipReward = z.infer<typeof insertVipRewardSchema>;

// Types for Daily Login tables
export type DailyLoginReward = typeof dailyLoginRewards.$inferSelect;
export type InsertDailyLoginReward = z.infer<typeof insertDailyLoginRewardSchema>;

export type UserDailyLogin = typeof userDailyLogins.$inferSelect;
export type InsertUserDailyLogin = z.infer<typeof insertUserDailyLoginSchema>;

export type DailyLoginClaim = typeof dailyLoginClaims.$inferSelect;
export type InsertDailyLoginClaim = z.infer<typeof insertDailyLoginClaimSchema>;

// Types for Top Up Bonus tables
export type UserTopUpBonus = typeof userTopUpBonus.$inferSelect;
export type InsertUserTopUpBonus = z.infer<typeof insertUserTopUpBonusSchema>;

export type TopUpBonusClaim = typeof topUpBonusClaims.$inferSelect;
export type InsertTopUpBonusClaim = z.infer<typeof insertTopUpBonusClaimSchema>;

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  balance: one(balances, { fields: [users.id], references: [balances.userId] }),
  sessions: many(sessions),
  transactions: many(transactions),
  bets: many(bets),
  clientSeeds: many(clientSeeds),
  crashCashes: many(crashCashes),
  userBonuses: many(userBonuses),
  userDailyDeposits: many(userDailyDeposits),
  pendingBonusSelections: many(pendingBonusSelections),
  bonusResetHistory: many(bonusResetHistory),
  vipProgress: one(vipProgress, { fields: [users.id], references: [vipProgress.userId] }),
  vipRewards: many(vipRewards),
}));

export const balancesRelations = relations(balances, ({ one }) => ({
  user: one(users, { fields: [balances.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
}));

export const vipProgressRelations = relations(vipProgress, ({ one }) => ({
  user: one(users, { fields: [vipProgress.userId], references: [users.id] }),
}));

export const vipRewardsRelations = relations(vipRewards, ({ one }) => ({
  user: one(users, { fields: [vipRewards.userId], references: [users.id] }),
}));

export const betsRelations = relations(bets, ({ one }) => ({
  user: one(users, { fields: [bets.userId], references: [users.id] }),
  serverSeed: one(serverSeeds, { fields: [bets.serverSeedId], references: [serverSeeds.id] }),
  slotSpin: one(slotSpins, { fields: [bets.id], references: [slotSpins.betId] }),
}));

export const serverSeedsRelations = relations(serverSeeds, ({ many }) => ({
  bets: many(bets),
  crashRounds: many(crashRounds),
}));

export const clientSeedsRelations = relations(clientSeeds, ({ one }) => ({
  user: one(users, { fields: [clientSeeds.userId], references: [users.id] }),
}));

// Keno tables
export const kenoGames = pgTable("keno_games", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  bet_amount: decimal("bet_amount", { precision: 20, scale: 8 }).notNull(),
  picks: integer("picks").array().notNull(), // User's selected numbers (1-40)
  drawnNumbers: integer("drawn_numbers").array().notNull(), // Numbers drawn by the system
  hits: integer("hits").notNull(), // How many numbers matched
  risk: varchar("risk", { enum: ["classic", "low", "medium", "high"] }).notNull(),
  multiplier: decimal("multiplier", { precision: 10, scale: 4 }).notNull(),
  payout: decimal("payout", { precision: 20, scale: 8 }).notNull(),
  profit: decimal("profit", { precision: 20, scale: 8 }).notNull(),
  serverSeedHash: varchar("server_seed_hash").notNull(),
  serverSeed: varchar("server_seed").notNull(),
  clientSeed: varchar("client_seed").notNull(),
  nonce: integer("nonce").notNull(),
  played_at: timestamp("played_at").defaultNow().notNull(),
});

// Limbo tables
export const limboGames = pgTable("limbo_games", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  targetMultiplier: decimal("target_multiplier", { precision: 10, scale: 2 }).notNull(),
  hitMultiplier: decimal("hit_multiplier", { precision: 10, scale: 2 }).notNull(),
  win: boolean("win").notNull(),
  chance: decimal("chance", { precision: 5, scale: 2 }).notNull(),
  payout: decimal("payout", { precision: 20, scale: 8 }).notNull(),
  profit: decimal("profit", { precision: 20, scale: 8 }).notNull(),
  serverSeedHash: varchar("server_seed_hash").notNull(),
  serverSeed: varchar("server_seed").notNull(),
  clientSeed: varchar("client_seed").notNull(),
  nonce: integer("nonce").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fundora Blox tables
export const fundoraBloxGames = pgTable("fundora_blox_games", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  betId: uuid("bet_id").references(() => bets.id), // Nullable for FREE mode
  stake: bigint("stake", { mode: "number" }).notNull(), // Amount in cents (integer)
  highestRow: integer("highest_row").notNull(),
  blocksStacked: integer("blocks_stacked").notNull(),
  prize: bigint("prize", { mode: "number" }), // Amount in cents (integer), nullable if no prize won
  prizeType: text("prize_type", { enum: ["cash", "points"] }), // Nullable if no prize
  balanceMode: text("balance_mode", { enum: ["GC", "SC"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kenoGamesRelations = relations(kenoGames, ({ one }) => ({
  user: one(users, { fields: [kenoGames.userId], references: [users.id] }),
}));

export const limboGamesRelations = relations(limboGames, ({ one }) => ({
  user: one(users, { fields: [limboGames.userId], references: [users.id] }),
}));

export const fundoraBloxGamesRelations = relations(fundoraBloxGames, ({ one }) => ({
  user: one(users, { fields: [fundoraBloxGames.userId], references: [users.id] }),
  bet: one(bets, { fields: [fundoraBloxGames.betId], references: [bets.id] }),
}));

export const slotSpinsRelations = relations(slotSpins, ({ one }) => ({
  bet: one(bets, { fields: [slotSpins.betId], references: [bets.id] }),
}));

export const crashRoundsRelations = relations(crashRounds, ({ one, many }) => ({
  serverSeed: one(serverSeeds, { fields: [crashRounds.serverSeedId], references: [serverSeeds.id] }),
  cashes: many(crashCashes),
}));

export const crashCashesRelations = relations(crashCashes, ({ one }) => ({
  round: one(crashRounds, { fields: [crashCashes.roundId], references: [crashRounds.id] }),
  user: one(users, { fields: [crashCashes.userId], references: [users.id] }),
}));

// Bonus table relations
export const depositBonusesRelations = relations(depositBonuses, ({ many }) => ({
  userBonuses: many(userBonuses),
}));

export const userBonusesRelations = relations(userBonuses, ({ one }) => ({
  user: one(users, { fields: [userBonuses.userId], references: [users.id] }),
  depositBonus: one(depositBonuses, { fields: [userBonuses.bonusId], references: [depositBonuses.id] }),
}));

export const userDailyDepositsRelations = relations(userDailyDeposits, ({ one }) => ({
  user: one(users, { fields: [userDailyDeposits.userId], references: [users.id] }),
}));

export const pendingBonusSelectionsRelations = relations(pendingBonusSelections, ({ one }) => ({
  user: one(users, { fields: [pendingBonusSelections.userId], references: [users.id] }),
  depositBonus: one(depositBonuses, { fields: [pendingBonusSelections.bonusId], references: [depositBonuses.id] }),
  deposit: one(transactions, { fields: [pendingBonusSelections.depositId], references: [transactions.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertBalanceSchema = createInsertSchema(balances);

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertBetSchema = createInsertSchema(bets).omit({
  id: true,
  createdAt: true,
});


export const insertKenoGameSchema = createInsertSchema(kenoGames).omit({
  id: true,
  played_at: true,
});

export const insertLimboGameSchema = createInsertSchema(limboGames).omit({
  id: true,
  createdAt: true,
});

export const insertFundoraBloxGameSchema = createInsertSchema(fundoraBloxGames).omit({
  id: true,
  createdAt: true,
});

export const insertSlotSpinSchema = createInsertSchema(slotSpins);

export const insertCrashRoundSchema = createInsertSchema(crashRounds).omit({
  id: true,
  createdAt: true,
});

export const insertCrashCashSchema = createInsertSchema(crashCashes).omit({
  id: true,
  createdAt: true,
});

export const insertServerSeedSchema = createInsertSchema(serverSeeds).omit({
  id: true,
  createdAt: true,
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
});

export const insertClientSeedSchema = createInsertSchema(clientSeeds).omit({
  id: true,
  createdAt: true,
});

export const insertVaultEntrySchema = createInsertSchema(vaultEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});



// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Balance = typeof balances.$inferSelect;
export type InsertBalance = z.infer<typeof insertBalanceSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Bet = typeof bets.$inferSelect;
export type InsertBet = z.infer<typeof insertBetSchema>;


export type SlotSpin = typeof slotSpins.$inferSelect;
export type InsertSlotSpin = z.infer<typeof insertSlotSpinSchema>;

export type CrashRound = typeof crashRounds.$inferSelect;
export type InsertCrashRound = z.infer<typeof insertCrashRoundSchema>;

export type CrashCash = typeof crashCashes.$inferSelect;
export type InsertCrashCash = z.infer<typeof insertCrashCashSchema>;

export type ServerSeed = typeof serverSeeds.$inferSelect;
export type InsertServerSeed = z.infer<typeof insertServerSeedSchema>;

export type ClientSeed = typeof clientSeeds.$inferSelect;
export type InsertClientSeed = z.infer<typeof insertClientSeedSchema>;

export type VaultEntry = typeof vaultEntries.$inferSelect;
export type InsertVaultEntry = z.infer<typeof insertVaultEntrySchema>;

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type LimboGame = typeof limboGames.$inferSelect;
export type InsertLimboGame = z.infer<typeof insertLimboGameSchema>;

export type FundoraBloxGame = typeof fundoraBloxGames.$inferSelect;
export type InsertFundoraBloxGame = z.infer<typeof insertFundoraBloxGameSchema>;

// User wallets table for wallet connections
export const userWallets = pgTable("user_wallets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  walletType: varchar("wallet_type", { length: 50 }).notNull(), // metamask, trust-wallet, etc.
  address: varchar("address", { length: 100 }).notNull(),
  signature: text("signature"), // Wallet signature for verification
  status: text("status", { enum: ["connected", "disconnected"] }).default("connected").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserWallet: unique().on(table.userId, table.address),
}));

export const insertUserWalletSchema = createInsertSchema(userWallets).omit({
  id: true,
  connectedAt: true,
  lastUsedAt: true,
});

export type UserWallet = typeof userWallets.$inferSelect;
export type InsertUserWallet = z.infer<typeof insertUserWalletSchema>;

// Tips types
export const insertTipSchema = createInsertSchema(tips).omit({
  id: true,
  createdAt: true,
});

export type Tip = typeof tips.$inferSelect;
export type InsertTip = z.infer<typeof insertTipSchema>;

export type CryptoWallet = typeof cryptoWallets.$inferSelect;
export type InsertCryptoWallet = typeof cryptoWallets.$inferInsert;

export type CryptoDeposit = typeof cryptoDeposits.$inferSelect;
export type InsertCryptoDeposit = typeof cryptoDeposits.$inferInsert;

export type CryptoWithdrawal = typeof cryptoWithdrawals.$inferSelect;
export type InsertCryptoWithdrawal = typeof cryptoWithdrawals.$inferInsert;

// KYC/AML Schema Types
export const insertKycVerificationSchema = createInsertSchema(kycVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertKycDocumentSchema = createInsertSchema(kycDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertAmlCheckSchema = createInsertSchema(amlChecks).omit({
  id: true,
  createdAt: true,
});

export const insertComplianceReportSchema = createInsertSchema(complianceReports).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type KycVerification = typeof kycVerifications.$inferSelect;
export type InsertKycVerification = z.infer<typeof insertKycVerificationSchema>;

export type KycDocument = typeof kycDocuments.$inferSelect;
export type InsertKycDocument = z.infer<typeof insertKycDocumentSchema>;

export type AmlCheck = typeof amlChecks.$inferSelect;
export type InsertAmlCheck = z.infer<typeof insertAmlCheckSchema>;

export type ComplianceReport = typeof complianceReports.$inferSelect;
export type InsertComplianceReport = z.infer<typeof insertComplianceReportSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Responsible Gaming Tables
export const responsibleGamingLimits = pgTable("responsible_gaming_limits", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type", { enum: ["DAILY_DEPOSIT", "WEEKLY_DEPOSIT", "MONTHLY_DEPOSIT", "DAILY_LOSS", "WEEKLY_LOSS", "MONTHLY_LOSS", "SESSION_TIME", "SESSION_LOSS"] }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 8 }),
  timeMinutes: integer("time_minutes"),
  isActive: boolean("is_active").default(true),
  requestedAt: timestamp("requested_at").defaultNow(),
  activeFrom: timestamp("active_from").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
});

export const selfExclusions = pgTable("self_exclusions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type", { enum: ["TEMPORARY", "PERMANENT"] }).notNull(),
  reason: text("reason"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  requestedAt: timestamp("requested_at").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
});

export const gamingSessions = pgTable("gaming_sessions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  totalWagered: decimal("total_wagered", { precision: 20, scale: 8 }).default("0"),
  netWinLoss: decimal("net_win_loss", { precision: 20, scale: 8 }).default("0"),
  gamesSessions: integer("games_played").default(0),
  isActive: boolean("is_active").default(true),
});

// User Favorites - Track which games users have marked as favorites
export const userFavorites = pgTable("user_favorites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  gameName: text("game_name").notNull(), // e.g., "crash", "slots", "roulette", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserGame: unique().on(table.userId, table.gameName), // Prevent duplicate favorites
}));

export const coolingOffPeriods = pgTable("cooling_off_periods", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  duration: varchar("duration", { enum: ["24H", "48H", "7D", "30D"] }).notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time").notNull(),
  reason: text("reason"),
  isActive: boolean("is_active").default(true),
});

export const realityChecks = pgTable("reality_checks", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  triggeredAt: timestamp("triggered_at").defaultNow(),
  sessionDuration: integer("session_duration_minutes").notNull(),
  totalWagered: decimal("total_wagered", { precision: 20, scale: 8 }).notNull(),
  userResponse: varchar("user_response", { enum: ["CONTINUE", "BREAK", "STOP"] }),
  respondedAt: timestamp("responded_at"),
});

// Responsible Gaming Schema Types
export const insertResponsibleGamingLimitSchema = createInsertSchema(responsibleGamingLimits).omit({
  id: true,
  requestedAt: true,
  lastModified: true,
});

export const insertSelfExclusionSchema = createInsertSchema(selfExclusions).omit({
  id: true,
  requestedAt: true,
  lastModified: true,
});

export const insertGamingSessionSchema = createInsertSchema(gamingSessions).omit({
  id: true,
  startTime: true,
});

export const insertCoolingOffPeriodSchema = createInsertSchema(coolingOffPeriods).omit({
  id: true,
  startTime: true,
});

export const insertRealityCheckSchema = createInsertSchema(realityChecks).omit({
  id: true,
  triggeredAt: true,
});

export type ResponsibleGamingLimit = typeof responsibleGamingLimits.$inferSelect;
export type InsertResponsibleGamingLimit = z.infer<typeof insertResponsibleGamingLimitSchema>;

export type SelfExclusion = typeof selfExclusions.$inferSelect;
export type InsertSelfExclusion = z.infer<typeof insertSelfExclusionSchema>;

export type GamingSession = typeof gamingSessions.$inferSelect;
export type InsertGamingSession = z.infer<typeof insertGamingSessionSchema>;

export type CoolingOffPeriod = typeof coolingOffPeriods.$inferSelect;
export type InsertCoolingOffPeriod = z.infer<typeof insertCoolingOffPeriodSchema>;

export type RealityCheck = typeof realityChecks.$inferSelect;
export type InsertRealityCheck = z.infer<typeof insertRealityCheckSchema>;

// Affiliate and Referral System Tables
export const affiliates = pgTable("affiliates", {
  id: varchar("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  referralCode: varchar("referral_code", { length: 20 }).notNull().unique(),
  tier: varchar("tier", { enum: ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] }).default("BRONZE"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).default("0.0500"), // 5% default
  totalReferrals: integer("total_referrals").default(0),
  activeReferrals: integer("active_referrals").default(0),
  totalCommissionEarned: decimal("total_commission_earned", { precision: 20, scale: 8 }).default("0"),
  totalCommissionPaid: decimal("total_commission_paid", { precision: 20, scale: 8 }).default("0"),
  availableCommission: decimal("available_commission", { precision: 20, scale: 8 }).default("0"),
  status: varchar("status", { enum: ["ACTIVE", "SUSPENDED", "BANNED"] }).default("ACTIVE"),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey(),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  referredUserId: uuid("referred_user_id").notNull().references(() => users.id),
  referralCode: varchar("referral_code", { length: 20 }).notNull(),
  tier: integer("tier").default(1), // 1 = direct referral, 2 = second tier, etc.
  status: varchar("status", { enum: ["PENDING", "ACTIVE", "INACTIVE"] }).default("PENDING"),
  firstDepositAmount: decimal("first_deposit_amount", { precision: 20, scale: 8 }),
  firstDepositAt: timestamp("first_deposit_at"),
  totalDeposits: decimal("total_deposits", { precision: 20, scale: 8 }).default("0"),
  totalWagered: decimal("total_wagered", { precision: 20, scale: 8 }).default("0"),
  lifetimeValue: decimal("lifetime_value", { precision: 20, scale: 8 }).default("0"),
  lastActivityAt: timestamp("last_activity_at"),
  referredAt: timestamp("referred_at").defaultNow(),
});

export const commissions = pgTable("commissions", {
  id: varchar("id").primaryKey(),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  referralId: varchar("referral_id").notNull().references(() => referrals.id),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  betId: uuid("bet_id").references(() => bets.id),
  type: varchar("type", { enum: ["DEPOSIT", "WAGERING", "LOSS", "REVENUE_SHARE", "CPA"] }).notNull(),
  baseAmount: decimal("base_amount", { precision: 20, scale: 8 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 20, scale: 8 }).notNull(),
  tier: integer("tier").default(1),
  status: varchar("status", { enum: ["PENDING", "APPROVED", "PAID", "CANCELLED"] }).default("PENDING"),
  description: text("description"),
  earnedAt: timestamp("earned_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
});

export const commissionPayouts = pgTable("commission_payouts", {
  id: varchar("id").primaryKey(),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
  commissionIds: text("commission_ids").notNull(), // JSON array of commission IDs
  method: varchar("method", { enum: ["BALANCE_CREDIT", "CRYPTO", "BANK_TRANSFER"] }).notNull(),
  walletAddress: varchar("wallet_address"),
  transactionHash: varchar("transaction_hash"),
  status: varchar("status", { enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] }).default("PENDING"),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

export const affiliateTiers = pgTable("affiliate_tiers", {
  id: varchar("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  requiredReferrals: integer("required_referrals").notNull(),
  requiredVolume: decimal("required_volume", { precision: 20, scale: 8 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull(),
  bonusRate: decimal("bonus_rate", { precision: 5, scale: 4 }).default("0"),
  perks: text("perks"), // JSON array of perks
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referralLinks = pgTable("referral_links", {
  id: varchar("id").primaryKey(),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  name: varchar("name", { length: 100 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  referralCode: varchar("referral_code", { length: 20 }).notNull(),
  campaign: varchar("campaign", { length: 100 }),
  source: varchar("source", { length: 100 }),
  medium: varchar("medium", { length: 100 }),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Affiliate Schema Types
export const insertAffiliateSchema = createInsertSchema(affiliates).omit({
  id: true,
  joinedAt: true,
  lastActivityAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  referredAt: true,
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({
  id: true,
  earnedAt: true,
});

export const insertCommissionPayoutSchema = createInsertSchema(commissionPayouts).omit({
  id: true,
  requestedAt: true,
});

export const insertAffiliateTierSchema = createInsertSchema(affiliateTiers).omit({
  id: true,
  createdAt: true,
});

export const insertReferralLinkSchema = createInsertSchema(referralLinks).omit({
  id: true,
  createdAt: true,
});

export type Affiliate = typeof affiliates.$inferSelect;
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;

export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;

export type CommissionPayout = typeof commissionPayouts.$inferSelect;
export type InsertCommissionPayout = z.infer<typeof insertCommissionPayoutSchema>;

export type AffiliateTier = typeof affiliateTiers.$inferSelect;
export type InsertAffiliateTier = z.infer<typeof insertAffiliateTierSchema>;

export type ReferralLink = typeof referralLinks.$inferSelect;
export type InsertReferralLink = z.infer<typeof insertReferralLinkSchema>;

// Hi-Lo Game Tables
export const hiloRounds = pgTable("hilo_rounds", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  stake: decimal("stake", { precision: 20, scale: 8 }).default("0"),
  prediction: varchar("prediction", { enum: ["higher", "lower", "equal"] }),
  startCard: integer("start_card").notNull(),
  nextCard: integer("next_card"),
  multiplier: decimal("multiplier", { precision: 10, scale: 4 }).default("0"),
  win: boolean("win").default(false),
  profit: decimal("profit", { precision: 20, scale: 8 }).default("0"),
  serverSeedHash: varchar("server_seed_hash", { length: 64 }).notNull(),
  serverSeedRevealed: varchar("server_seed_revealed", { length: 64 }),
  clientSeed: varchar("client_seed", { length: 64 }).notNull(),
  roundNonce: integer("round_nonce").notNull(),
  drawHistory: jsonb("draw_history").$type<number[]>().default([]),
  status: varchar("status", { enum: ["in_play", "settled"] }).default("in_play"),
  runtime: jsonb("runtime"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Hi-Lo Schema Types
export const insertHiloRoundSchema = createInsertSchema(hiloRounds).omit({
  id: true,
  createdAt: true,
});

export type HiloRound = typeof hiloRounds.$inferSelect;
export type InsertHiloRound = z.infer<typeof insertHiloRoundSchema>;

// Footer Links Table
export const footerLinks = pgTable('footer_links', {
  id: serial('id').primaryKey(),
  section: text('section', { enum: ['support', 'platform', 'policy', 'community'] }).notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  url: varchar('url', { length: 255 }),
  orderIndex: integer('order_index').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Redemption Codes System
export const redemptionCodes = pgTable('redemption_codes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 32 }).unique().notNull(), // Cryptographically secure code
  scAmount: decimal('sc_amount', { precision: 10, scale: 2 }).default('0.00').notNull(), // Sweeps Cash amount
  gcAmount: bigint('gc_amount', { mode: 'number' }).default(0).notNull(), // Gold Credits amount  
  maxUses: integer('max_uses').default(1).notNull(), // How many times code can be used total
  perUserLimit: integer('per_user_limit').default(1).notNull(), // How many times per user
  usedCount: integer('used_count').default(0).notNull(), // Current usage count
  expiresAt: timestamp('expires_at'), // Optional expiration
  minVipLevel: text('min_vip_level', { 
    enum: ['UNRANKED', 'WOOD', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'JADE', 'SAPPHIRE', 'RUBY', 'DIAMOND'] 
  }), // Optional minimum VIP level requirement
  createdBy: uuid('created_by').references(() => admins.id).notNull(), // Admin who created it
  isActive: boolean('is_active').default(true).notNull(),
  notes: text('notes'), // Admin notes about the code
  scWageringMultiplier: integer('sc_wagering_multiplier').default(0).notNull(), // SC wagering requirement multiplier
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const redemptionCodeUsages = pgTable('redemption_code_usages', {
  id: serial('id').primaryKey(),
  codeId: integer('code_id').references(() => redemptionCodes.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  scCredited: decimal('sc_credited', { precision: 10, scale: 2 }).default('0.00').notNull(),
  gcCredited: bigint('gc_credited', { mode: 'number' }).default(0).notNull(),
  redeemedAt: timestamp('redeemed_at').defaultNow().notNull(),
  ipHash: varchar('ip_hash', { length: 64 }), // Hashed IP for audit trails
  userAgentHash: varchar('user_agent_hash', { length: 64 }), // Hashed User-Agent for audit
}, (table) => ({
  // Index for per-user count queries (removed unique to allow multiple uses per user within perUserLimit)
  userCodeIdx: index().on(table.userId, table.codeId),
  userIdx: index().on(table.userId),
  codeIdx: index().on(table.codeId),
}));

// Site Settings Table
export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  settingKey: varchar('setting_key', { length: 100 }).unique().notNull(),
  settingValue: text('setting_value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedByAdminId: uuid('updated_by_admin_id').references(() => admins.id),
});

// Admin users table
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  fullName: varchar('full_name', { length: 100 }),
  role: varchar('role', { length: 50 }).default('admin').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

// Footer Link Schema Types
export const insertFooterLinkSchema = createInsertSchema(footerLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FooterLink = typeof footerLinks.$inferSelect;
export type InsertFooterLink = z.infer<typeof insertFooterLinkSchema>;

// Site Settings types and schemas
export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true,
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;

// Admin activity logs
export const adminLogs = pgTable('admin_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').references(() => admins.id).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  targetUserId: varchar('target_user_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;

// Game Settings Schema Types  
export const insertGameSettingsSchema = createInsertSchema(gameSettings).omit({
  id: true,
  updatedAt: true,
});

export type GameSettings = typeof gameSettings.$inferSelect;
export type InsertGameSettings = z.infer<typeof insertGameSettingsSchema>;

// User Favorites types and schemas
export const insertUserFavoriteSchema = createInsertSchema(userFavorites).omit({
  id: true,
  createdAt: true,
});

export type UserFavorite = typeof userFavorites.$inferSelect;
export type InsertUserFavorite = z.infer<typeof insertUserFavoriteSchema>;

// Redemption Codes Schema Types
export const insertRedemptionCodeSchema = createInsertSchema(redemptionCodes).omit({
  id: true,
  usedCount: true,
  createdAt: true,
});

export const insertRedemptionCodeUsageSchema = createInsertSchema(redemptionCodeUsages).omit({
  id: true,
  redeemedAt: true,
});

export type RedemptionCode = typeof redemptionCodes.$inferSelect;
export type InsertRedemptionCode = z.infer<typeof insertRedemptionCodeSchema>;

export type RedemptionCodeUsage = typeof redemptionCodeUsages.$inferSelect;
export type InsertRedemptionCodeUsage = z.infer<typeof insertRedemptionCodeUsageSchema>;

// Rakeback System Tables
export const rakebackBalances = pgTable("rakeback_balances", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).default("0.00").notNull(),
  lastCalculatedAt: timestamp("last_calculated_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rakebackTransactions = pgTable("rakeback_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: text("type", { enum: ["EARNED", "WITHDRAWAL", "ADJUSTMENT"] }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  // GGR calculation metadata for earned rakeback
  ggrAmount: decimal("ggr_amount", { precision: 10, scale: 2 }), // Total GGR amount that generated this rakeback
  ggrPercentage: decimal("ggr_percentage", { precision: 5, scale: 2 }), // Percentage used (e.g., 5.00%)
  ggrPeriodStart: timestamp("ggr_period_start"), // Start of period for GGR calculation
  ggrPeriodEnd: timestamp("ggr_period_end"), // End of period for GGR calculation
  // Related transaction reference
  relatedTransactionId: uuid("related_transaction_id").references(() => transactions.id),
  // Withdrawal metadata
  withdrawnToBalance: text("withdrawn_to_balance", { enum: ["SC", "GC"] }), // Which balance the rakeback was withdrawn to
  status: text("status", { enum: ["PENDING", "COMPLETED", "FAILED"] }).default("COMPLETED").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create insert schemas for rakeback tables
export const insertRakebackBalanceSchema = createInsertSchema(rakebackBalances).omit({
  updatedAt: true,
  createdAt: true,
});

export const insertRakebackTransactionSchema = createInsertSchema(rakebackTransactions).omit({
  id: true,
  createdAt: true,
});

// Types for rakeback tables
export type RakebackBalance = typeof rakebackBalances.$inferSelect;
export type InsertRakebackBalance = z.infer<typeof insertRakebackBalanceSchema>;

export type RakebackTransaction = typeof rakebackTransactions.$inferSelect;
export type InsertRakebackTransaction = z.infer<typeof insertRakebackTransactionSchema>;

// Tournaments System Tables
export const tournaments = pgTable("tournaments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  game: text("game", { 
    enum: ["DICE", "SLOTS", "CRASH", "PLINKO", "MINES", "KENO", "LIMBO", "HILO", "BLACKJACK", "ROULETTE", "ALL"] 
  }).notNull(),
  entryFee: decimal("entry_fee", { precision: 10, scale: 2 }).default("0.00").notNull(),
  entryCurrency: text("entry_currency", { enum: ["GC", "SC"] }).default("GC").notNull(),
  prizePool: decimal("prize_pool", { precision: 10, scale: 2 }).default("0.00").notNull(),
  prizeCurrency: text("prize_currency", { enum: ["GC", "SC"] }).default("GC").notNull(),
  maxParticipants: integer("max_participants"),
  minParticipants: integer("min_participants").default(2).notNull(),
  status: text("status", { 
    enum: ["UPCOMING", "ACTIVE", "FINISHED", "CANCELLED"] 
  }).default("UPCOMING").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  leaderboardType: text("leaderboard_type", { 
    enum: ["HIGHEST_MULTIPLIER", "HIGHEST_WIN", "TOTAL_WAGERED", "TOTAL_PROFIT"] 
  }).default("HIGHEST_WIN").notNull(),
  vipLevelRequired: text("vip_level_required", { 
    enum: ["UNRANKED", "WOOD", "BRONZE", "SILVER", "GOLD", "PLATINUM", "JADE", "SAPPHIRE", "RUBY", "DIAMOND"] 
  }),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurringSchedule: text("recurring_schedule"), // cron-like schedule
  bannerImage: text("banner_image"),
  createdBy: uuid("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tournamentEntries = pgTable("tournament_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: uuid("tournament_id").references(() => tournaments.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  score: decimal("score", { precision: 18, scale: 2 }).default("0.00").notNull(),
  rank: integer("rank"),
  totalWagered: decimal("total_wagered", { precision: 18, scale: 2 }).default("0.00").notNull(),
  totalProfit: decimal("total_profit", { precision: 18, scale: 2 }).default("0.00").notNull(),
  highestMultiplier: decimal("highest_multiplier", { precision: 10, scale: 2 }).default("0.00").notNull(),
  highestWin: decimal("highest_win", { precision: 18, scale: 2 }).default("0.00").notNull(),
  gamesPlayed: integer("games_played").default(0).notNull(),
  prizeWon: decimal("prize_won", { precision: 10, scale: 2 }),
  prizeClaimed: boolean("prize_claimed").default(false).notNull(),
  prizeClaimedAt: timestamp("prize_claimed_at"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => ({
  uniqueEntry: unique().on(table.tournamentId, table.userId),
}));

export const tournamentPrizes = pgTable("tournament_prizes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: uuid("tournament_id").references(() => tournaments.id).notNull(),
  rank: integer("rank").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency", { enum: ["GC", "SC"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniquePrize: unique().on(table.tournamentId, table.rank),
}));

// Tournament schema types
export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTournamentEntrySchema = createInsertSchema(tournamentEntries).omit({
  id: true,
  joinedAt: true,
});

export const insertTournamentPrizeSchema = createInsertSchema(tournamentPrizes).omit({
  id: true,
  createdAt: true,
});

export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;

export type TournamentEntry = typeof tournamentEntries.$inferSelect;
export type InsertTournamentEntry = z.infer<typeof insertTournamentEntrySchema>;

export type TournamentPrize = typeof tournamentPrizes.$inferSelect;
export type InsertTournamentPrize = z.infer<typeof insertTournamentPrizeSchema>;

// ============ NEW ADVANCED FEATURES SCHEMAS ============

// Player Tags & Segmentation
export const playerTags = pgTable("player_tags", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  tag: text("tag").notNull(), // e.g., "VIP", "High Roller", "Problem Gambler", "Whale"
  tagType: text("tag_type", { enum: ["MANUAL", "AUTO"] }).default("MANUAL").notNull(),
  addedBy: uuid("added_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserTag: unique().on(table.userId, table.tag),
}));

// Player Notes (Admin Notes)
export const playerNotes = pgTable("player_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  note: text("note").notNull(),
  addedBy: uuid("added_by").references(() => admins.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Session Analytics
export const sessionAnalytics = pgTable("session_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  sessionStart: timestamp("session_start").notNull(),
  sessionEnd: timestamp("session_end"),
  duration: integer("duration"), // in seconds
  gamesPlayed: integer("games_played").default(0).notNull(),
  totalWagered: bigint("total_wagered", { mode: "number" }).default(0).notNull(),
  totalProfit: bigint("total_profit", { mode: "number" }).default(0).notNull(),
  deviceInfo: jsonb("device_info"), // Browser, OS, etc.
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AML Risk Flags
export const amlRiskFlags = pgTable("aml_risk_flags", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  riskScore: integer("risk_score").notNull(), // 0-100
  flagType: text("flag_type", { enum: ["HIGH_VOLUME", "UNUSUAL_PATTERN", "RAPID_DEPOSITS", "CROSS_BORDER", "MULTIPLE_ACCOUNTS"] }).notNull(),
  description: text("description"),
  isResolved: boolean("is_resolved").default(false).notNull(),
  resolvedBy: uuid("resolved_by").references(() => admins.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Device Fingerprints (for multi-account detection)
export const deviceFingerprints = pgTable("device_fingerprints", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  fingerprint: text("fingerprint").notNull(), // Hash of device characteristics
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  screenResolution: text("screen_resolution"),
  timezone: text("timezone"),
  language: text("language"),
  lastSeen: timestamp("last_seen").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// IP Blacklist
export const ipBlacklist = pgTable("ip_blacklist", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull().unique(),
  reason: text("reason"),
  addedBy: uuid("added_by").references(() => admins.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Withdrawal Approvals Workflow
export const withdrawalApprovals = pgTable("withdrawal_approvals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: uuid("transaction_id").references(() => transactions.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency", { enum: ["GC", "SC", "BTC", "ETH", "USDT"] }).notNull(),
  status: text("status", { enum: ["PENDING", "LEVEL1_APPROVED", "LEVEL2_APPROVED", "APPROVED", "REJECTED"] }).default("PENDING").notNull(),
  approvedBy: uuid("approved_by").references(() => admins.id),
  rejectedBy: uuid("rejected_by").references(() => admins.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// Push Notifications
export const pushNotifications = pgTable("push_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type", { enum: ["PROMO", "ALERT", "INFO", "BONUS"] }).notNull(),
  targetSegment: text("target_segment"), // e.g., "VIP", "High Rollers", "All"
  status: text("status", { enum: ["PENDING", "SENT", "FAILED"] }).default("PENDING").notNull(),
  sentBy: uuid("sent_by").references(() => admins.id).notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Marketing Campaigns
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", { enum: ["BONUS", "FREE_SPINS", "CASHBACK", "TOURNAMENT"] }).notNull(),
  targetSegment: text("target_segment"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  config: jsonb("config"), // Campaign-specific configuration
  createdBy: uuid("created_by").references(() => admins.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cashback Programs
export const cashbackPrograms = pgTable("cashback_programs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  period: text("period", { enum: ["DAILY", "WEEKLY", "MONTHLY"] }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalLoss: decimal("total_loss", { precision: 10, scale: 2 }).notNull(),
  cashbackPercentage: decimal("cashback_percentage", { precision: 5, scale: 2 }).notNull(),
  cashbackAmount: decimal("cashback_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["PENDING", "PAID", "CANCELLED"] }).default("PENDING").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comp Points (Loyalty System)
export const compPoints = pgTable("comp_points", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  totalPoints: integer("total_points").default(0).notNull(),
  availablePoints: integer("available_points").default(0).notNull(),
  lifetimeEarned: integer("lifetime_earned").default(0).notNull(),
  tier: text("tier", { enum: ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] }).default("BRONZE").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const compPointsTransactions = pgTable("comp_points_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  points: integer("points").notNull(), // positive for earn, negative for redeem
  type: text("type", { enum: ["EARNED", "REDEEMED", "EXPIRED", "ADJUSTED"] }).notNull(),
  description: text("description"),
  relatedBetId: uuid("related_bet_id").references(() => bets.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Support Tickets
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  category: text("category", { enum: ["TECHNICAL", "BILLING", "GAME_ISSUE", "ACCOUNT", "OTHER"] }).notNull(),
  priority: text("priority", { enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] }).default("MEDIUM").notNull(),
  status: text("status", { enum: ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"] }).default("OPEN").notNull(),
  assignedTo: uuid("assigned_to").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: uuid("ticket_id").references(() => supportTickets.id).notNull(),
  senderId: uuid("sender_id").notNull(), // Can be user or admin
  senderType: text("sender_type", { enum: ["USER", "ADMIN"] }).notNull(),
  message: text("message").notNull(),
  attachments: jsonb("attachments"), // Array of attachment URLs
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Live Chat System
export const liveChatSessions = pgTable("live_chat_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  agentId: uuid("agent_id").references(() => admins.id),
  status: text("status", { enum: ["WAITING", "ACTIVE", "CLOSED"] }).default("WAITING").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  rating: integer("rating"), // 1-5 stars
  feedback: text("feedback"),
});

export const liveChatMessages = pgTable("live_chat_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").references(() => liveChatSessions.id).notNull(),
  senderId: uuid("sender_id").notNull(),
  senderType: text("sender_type", { enum: ["USER", "AGENT", "SYSTEM"] }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin Roles & Permissions (RBAC)
export const adminPermissions = pgTable("admin_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: uuid("admin_id").references(() => admins.id).notNull(),
  permission: text("permission").notNull(), // e.g., "users.view", "users.edit", "finance.approve_withdrawal"
  granted: boolean("granted").default(true).notNull(),
  grantedBy: uuid("granted_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueAdminPermission: unique().on(table.adminId, table.permission),
}));

// Export history for reports
export const reportExports = pgTable("report_exports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  exportedBy: uuid("exported_by").references(() => admins.id).notNull(),
  reportType: text("report_type").notNull(), // "users", "transactions", "revenue", etc.
  filters: jsonb("filters"),
  fileUrl: text("file_url"),
  status: text("status", { enum: ["PROCESSING", "COMPLETED", "FAILED"] }).default("PROCESSING").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Game Provider Management
export const gameProviders = pgTable("game_providers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  apiKey: text("api_key"), // Encrypted
  apiEndpoint: text("api_endpoint"),
  isActive: boolean("is_active").default(true).notNull(),
  config: jsonb("config"), // Provider-specific configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Progressive Jackpots
export const progressiveJackpots = pgTable("progressive_jackpots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  games: jsonb("games"), // Array of game IDs that contribute
  currentAmount: decimal("current_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  seedAmount: decimal("seed_amount", { precision: 12, scale: 2 }).notNull(),
  contributionRate: decimal("contribution_rate", { precision: 5, scale: 4 }).notNull(), // e.g., 0.01 = 1%
  lastWonAt: timestamp("last_won_at"),
  lastWonBy: uuid("last_won_by").references(() => users.id),
  lastWonAmount: decimal("last_won_amount", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Alert System for Admins
export const adminAlerts = pgTable("admin_alerts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: text("alert_type", { enum: ["HIGH_WITHDRAWAL", "SUSPICIOUS_ACTIVITY", "SYSTEM_ERROR", "KYC_PENDING", "AML_FLAG"] }).notNull(),
  severity: text("severity", { enum: ["INFO", "WARNING", "CRITICAL"] }).default("INFO").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedUserId: uuid("related_user_id").references(() => users.id),
  relatedEntity: text("related_entity"), // "transaction", "bet", "user", etc.
  relatedEntityId: uuid("related_entity_id"),
  isRead: boolean("is_read").default(false).notNull(),
  isResolved: boolean("is_resolved").default(false).notNull(),
  resolvedBy: uuid("resolved_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Email Campaigns (Phase 2)
export const emailCampaigns = pgTable("email_campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(), // HTML email content
  targetSegment: text("target_segment"), // "ALL", "VIP", "HIGH_ROLLERS", "INACTIVE", etc.
  status: text("status", { enum: ["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED"] }).default("DRAFT").notNull(),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  totalRecipients: integer("total_recipients").default(0).notNull(),
  successfulSends: integer("successful_sends").default(0).notNull(),
  failedSends: integer("failed_sends").default(0).notNull(),
  opens: integer("opens").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  createdBy: uuid("created_by").references(() => admins.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailCampaignRecipients = pgTable("email_campaign_recipients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid("campaign_id").references(() => emailCampaigns.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  email: text("email").notNull(),
  status: text("status", { enum: ["PENDING", "SENT", "DELIVERED", "OPENED", "CLICKED", "BOUNCED", "FAILED"] }).default("PENDING").notNull(),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// IP Whitelist (Phase 2)
export const ipWhitelist = pgTable("ip_whitelist", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull().unique(),
  description: text("description"),
  addedBy: uuid("added_by").references(() => admins.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Live Game Sessions (Phase 2)
export const liveGameSessions = pgTable("live_game_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  game: text("game").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  totalBets: integer("total_bets").default(0).notNull(),
  totalWagered: decimal("total_wagered", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalWon: decimal("total_won", { precision: 12, scale: 2 }).default("0.00").notNull(),
  netProfit: decimal("net_profit", { precision: 12, scale: 2 }).default("0.00").notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  highestBet: decimal("highest_bet", { precision: 12, scale: 2 }).default("0.00").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
});

// Player Behavior Profiles (Phase 3)
export const playerBehaviorProfiles = pgTable("player_behavior_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).unique().notNull(),
  // Session Metrics
  totalSessions: integer("total_sessions").default(0).notNull(),
  avgSessionDuration: integer("avg_session_duration").default(0).notNull(), // in seconds
  lastSessionDate: timestamp("last_session_date"),
  // Betting Behavior
  totalBets: integer("total_bets").default(0).notNull(),
  avgBetSize: decimal("avg_bet_size", { precision: 12, scale: 2 }).default("0.00").notNull(),
  maxBetSize: decimal("max_bet_size", { precision: 12, scale: 2 }).default("0.00").notNull(),
  favoriteGames: jsonb("favorite_games"), // Array of game names with play count
  // Financial Metrics
  lifetimeWagered: decimal("lifetime_wagered", { precision: 12, scale: 2 }).default("0.00").notNull(),
  lifetimeWon: decimal("lifetime_won", { precision: 12, scale: 2 }).default("0.00").notNull(),
  lifetimeDeposits: decimal("lifetime_deposits", { precision: 12, scale: 2 }).default("0.00").notNull(),
  lifetimeWithdrawals: decimal("lifetime_withdrawals", { precision: 12, scale: 2 }).default("0.00").notNull(),
  netRevenue: decimal("net_revenue", { precision: 12, scale: 2 }).default("0.00").notNull(), // House profit from player
  // Engagement Metrics
  daysActive: integer("days_active").default(0).notNull(),
  loginFrequency: decimal("login_frequency", { precision: 5, scale: 2 }).default("0.00").notNull(), // logins per week
  churnRisk: text("churn_risk", { enum: ["LOW", "MEDIUM", "HIGH"] }).default("LOW").notNull(),
  lastActiveDate: timestamp("last_active_date"),
  // Value Classification
  playerValue: text("player_value", { enum: ["LOW", "MEDIUM", "HIGH", "VIP", "WHALE"] }).default("LOW").notNull(),
  lifetimeValue: decimal("lifetime_value", { precision: 12, scale: 2 }).default("0.00").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Risk Assessments (Phase 3)
export const riskAssessments = pgTable("risk_assessments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  riskScore: integer("risk_score").default(0).notNull(), // 0-100 scale
  riskLevel: text("risk_level", { enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }).default("LOW").notNull(),
  riskFactors: jsonb("risk_factors"), // Array of detected risk indicators
  // Specific Risk Flags
  hasMultipleAccounts: boolean("has_multiple_accounts").default(false).notNull(),
  hasChargeback: boolean("has_chargeback").default(false).notNull(),
  hasSuspiciousPatterns: boolean("has_suspicious_patterns").default(false).notNull(),
  hasVpnUsage: boolean("has_vpn_usage").default(false).notNull(),
  hasRapidBetting: boolean("has_rapid_betting").default(false).notNull(),
  // Investigation
  isUnderReview: boolean("is_under_review").default(false).notNull(),
  reviewedBy: uuid("reviewed_by").references(() => admins.id),
  reviewNotes: text("review_notes"),
  actionTaken: text("action_taken"), // "NONE", "WARNING", "LIMIT_SET", "SUSPENDED", "BANNED"
  actionDate: timestamp("action_date"),
  // Monitoring
  monitoringLevel: text("monitoring_level", { enum: ["NORMAL", "ENHANCED", "STRICT"] }).default("NORMAL").notNull(),
  lastAssessmentDate: timestamp("last_assessment_date").defaultNow().notNull(),
  nextReviewDate: timestamp("next_review_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Player Segments (Phase 3)
export const playerSegments = pgTable("player_segments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  // Behavioral Segments
  segmentType: text("segment_type", { 
    enum: ["NEW_PLAYER", "CASUAL", "REGULAR", "HIGH_ROLLER", "WHALE", "INACTIVE", "AT_RISK", "BONUS_HUNTER", "RECREATIONAL", "PROFESSIONAL"] 
  }).notNull(),
  assignedDate: timestamp("assigned_date").defaultNow().notNull(),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).default("0.00").notNull(), // 0-100
  // Segment Criteria Met
  criteriaData: jsonb("criteria_data"), // JSON with specific criteria that triggered segment
  // Marketing Preferences
  preferredChannel: text("preferred_channel"), // "EMAIL", "PUSH", "IN_APP", "SMS"
  bestContactTime: text("best_contact_time"), // Time of day player is most active
  // Automated Campaigns
  includeInAutoCampaigns: boolean("include_in_auto_campaigns").default(true).notNull(),
  excludedFrom: jsonb("excluded_from"), // Array of campaign IDs to exclude
  lastCampaignDate: timestamp("last_campaign_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Fraud Alerts (Phase 3)
export const fraudAlerts = pgTable("fraud_alerts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  alertType: text("alert_type", { 
    enum: ["MULTI_ACCOUNT", "BONUS_ABUSE", "COLLUSION", "PATTERN_ANOMALY", "CHARGEBACK", "STOLEN_CARD", "VPN_DETECTED", "RAPID_WITHDRAWAL", "SUSPICIOUS_WIN_RATE", "CHIP_DUMPING"] 
  }).notNull(),
  severity: text("severity", { enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }).default("MEDIUM").notNull(),
  description: text("description").notNull(),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  // Evidence
  evidenceData: jsonb("evidence_data"), // JSON with supporting evidence (IPs, patterns, etc.)
  relatedUsers: jsonb("related_users"), // Array of potentially related user IDs
  relatedTransactions: jsonb("related_transactions"), // Array of transaction IDs
  // Investigation Status
  status: text("status", { enum: ["NEW", "INVESTIGATING", "CONFIRMED", "FALSE_POSITIVE", "RESOLVED"] }).default("NEW").notNull(),
  assignedTo: uuid("assigned_to").references(() => admins.id),
  investigationNotes: text("investigation_notes"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: uuid("resolved_by").references(() => admins.id),
  // Actions Taken
  actionsTaken: jsonb("actions_taken"), // Array of action objects
  autoActioned: boolean("auto_actioned").default(false).notNull(),
  requiresManualReview: boolean("requires_manual_review").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============= PHASE 4A: PAYMENT & TRANSACTION MANAGEMENT =============

// Withdrawal Queue (Phase 4A)
export const withdrawalQueue = pgTable("withdrawal_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency", { enum: ["GC", "SC", "BTC", "ETH", "USDT", "LTC", "DOGE"] }).notNull(),
  withdrawalMethod: text("withdrawal_method", { enum: ["CRYPTO", "BANK_TRANSFER", "PAYPAL", "CHECK"] }).notNull(),
  destinationAddress: text("destination_address").notNull(),
  status: text("status", { enum: ["PENDING", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED", "CANCELLED"] }).default("PENDING").notNull(),
  // KYC & Verification
  kycVerified: boolean("kyc_verified").default(false).notNull(),
  kycDocuments: jsonb("kyc_documents"),
  verificationNotes: text("verification_notes"),
  // Processing
  priority: integer("priority").default(0).notNull(), // Higher number = higher priority
  processingStartedAt: timestamp("processing_started_at"),
  completedAt: timestamp("completed_at"),
  txHash: text("tx_hash"), // For crypto withdrawals
  // Review & Approval
  reviewedBy: uuid("reviewed_by").references(() => admins.id),
  reviewNotes: text("review_notes"),
  approvedBy: uuid("approved_by").references(() => admins.id),
  rejectionReason: text("rejection_reason"),
  // Risk Assessment
  riskScore: integer("risk_score").default(0).notNull(),
  flaggedForReview: boolean("flagged_for_review").default(false).notNull(),
  flagReason: text("flag_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment Provider Status (Phase 4A)
export const paymentProviderStatus = pgTable("payment_provider_status", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  providerName: text("provider_name").notNull().unique(),
  providerType: text("provider_type", { enum: ["CRYPTO", "FIAT", "PAYMENT_GATEWAY"] }).notNull(),
  status: text("status", { enum: ["ONLINE", "DEGRADED", "OFFLINE", "MAINTENANCE"] }).default("ONLINE").notNull(),
  // Health Metrics
  uptime: decimal("uptime", { precision: 5, scale: 2 }).default("100.00").notNull(), // Percentage
  avgResponseTime: integer("avg_response_time").default(0).notNull(), // ms
  lastHealthCheck: timestamp("last_health_check").defaultNow().notNull(),
  // Transaction Metrics
  totalTransactions: integer("total_transactions").default(0).notNull(),
  successfulTransactions: integer("successful_transactions").default(0).notNull(),
  failedTransactions: integer("failed_transactions").default(0).notNull(),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  // Volume
  dailyVolume: decimal("daily_volume", { precision: 12, scale: 2 }).default("0.00").notNull(),
  monthlyVolume: decimal("monthly_volume", { precision: 12, scale: 2 }).default("0.00").notNull(),
  // Configuration
  isActive: boolean("is_active").default(true).notNull(),
  apiEndpoint: text("api_endpoint"),
  lastError: text("last_error"),
  lastErrorAt: timestamp("last_error_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Transaction Disputes (Phase 4A)
export const transactionDisputes = pgTable("transaction_disputes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: uuid("transaction_id").notNull(), // References transactions table
  userId: uuid("user_id").references(() => users.id).notNull(),
  disputeType: text("dispute_type", { 
    enum: ["CHARGEBACK", "UNAUTHORIZED", "DUPLICATE", "INCORRECT_AMOUNT", "SERVICE_NOT_RECEIVED", "OTHER"] 
  }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  status: text("status", { 
    enum: ["OPEN", "UNDER_REVIEW", "AWAITING_RESPONSE", "RESOLVED_FAVOR_USER", "RESOLVED_FAVOR_MERCHANT", "CLOSED"] 
  }).default("OPEN").notNull(),
  // Details
  description: text("description").notNull(),
  userEvidence: jsonb("user_evidence"),
  merchantEvidence: jsonb("merchant_evidence"),
  // Processing
  assignedTo: uuid("assigned_to").references(() => admins.id),
  priority: text("priority", { enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] }).default("MEDIUM").notNull(),
  deadlineDate: timestamp("deadline_date"),
  // Resolution
  resolution: text("resolution"),
  resolutionAmount: decimal("resolution_amount", { precision: 12, scale: 2 }),
  resolvedBy: uuid("resolved_by").references(() => admins.id),
  resolvedAt: timestamp("resolved_at"),
  // External References
  paymentProviderDisputeId: text("payment_provider_dispute_id"),
  caseFiled: boolean("case_filed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Crypto Wallet Monitoring (Phase 4A)
export const cryptoWalletMonitoring = pgTable("crypto_wallet_monitoring", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  walletType: text("wallet_type", { enum: ["HOT", "COLD", "DEPOSIT", "WITHDRAWAL"] }).notNull(),
  currency: text("currency", { enum: ["BTC", "ETH", "USDT", "LTC", "DOGE"] }).notNull(),
  address: text("address").notNull().unique(),
  // Balance Tracking
  currentBalance: decimal("current_balance", { precision: 18, scale: 8 }).default("0").notNull(),
  pendingBalance: decimal("pending_balance", { precision: 18, scale: 8 }).default("0").notNull(),
  lastBalanceCheck: timestamp("last_balance_check").defaultNow().notNull(),
  // Thresholds & Alerts
  lowBalanceThreshold: decimal("low_balance_threshold", { precision: 18, scale: 8 }),
  highBalanceThreshold: decimal("high_balance_threshold", { precision: 18, scale: 8 }),
  alertOnLowBalance: boolean("alert_on_low_balance").default(true).notNull(),
  alertOnHighBalance: boolean("alert_on_high_balance").default(true).notNull(),
  // Activity Metrics
  totalDeposits: integer("total_deposits").default(0).notNull(),
  totalWithdrawals: integer("total_withdrawals").default(0).notNull(),
  lastTransactionHash: text("last_transaction_hash"),
  lastTransactionAt: timestamp("last_transaction_at"),
  // Security
  isActive: boolean("is_active").default(true).notNull(),
  requiresMultiSig: boolean("requires_multi_sig").default(false).notNull(),
  lastAuditDate: timestamp("last_audit_date"),
  securityNotes: text("security_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============= PHASE 4B: MARKETING & GROWTH =============
// NOTE: Affiliates and Tournaments tables already exist earlier in schema

// Promotional Calendar (Phase 4B)
export const promotionalCalendar = pgTable("promotional_calendar", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignName: text("campaign_name").notNull(),
  campaignType: text("campaign_type", { 
    enum: ["DEPOSIT_BONUS", "FREE_SPINS", "CASHBACK", "VIP_EXCLUSIVE", "TOURNAMENT", "SPECIAL_EVENT", "SEASONAL"] 
  }).notNull(),
  status: text("status", { enum: ["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] }).default("DRAFT").notNull(),
  // Schedule
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  timezone: text("timezone").default("UTC").notNull(),
  // Targeting
  targetSegments: jsonb("target_segments"), // Array of player segment IDs
  targetVipLevels: jsonb("target_vip_levels"),
  targetCountries: jsonb("target_countries"),
  excludedUsers: jsonb("excluded_users"),
  // Offer Details
  offerDetails: jsonb("offer_details"), // Bonus amount, wagering requirements, etc.
  termsAndConditions: text("terms_and_conditions"),
  // Budget & Limits
  budget: decimal("budget", { precision: 12, scale: 2 }),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0).notNull(),
  maxRedemptionsPerUser: integer("max_redemptions_per_user").default(1).notNull(),
  // Marketing
  bannerImage: text("banner_image"),
  promotionalText: text("promotional_text"),
  emailTemplate: text("email_template"),
  pushNotificationText: text("push_notification_text"),
  // Automation
  autoActivate: boolean("auto_activate").default(false).notNull(),
  autoDeactivate: boolean("auto_deactivate").default(true).notNull(),
  notifyUsers: boolean("notify_users").default(true).notNull(),
  // Performance
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  conversions: integer("conversions").default(0).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).default("0.00").notNull(),
  roi: decimal("roi", { precision: 10, scale: 2 }).default("0.00").notNull(),
  createdBy: uuid("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Retention Campaigns (Phase 4B)
export const retentionCampaigns = pgTable("retention_campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignName: text("campaign_name").notNull(),
  campaignType: text("campaign_type", { 
    enum: ["WIN_BACK", "REACTIVATION", "CHURN_PREVENTION", "ENGAGEMENT_BOOST", "LOYALTY_REWARD"] 
  }).notNull(),
  status: text("status", { enum: ["ACTIVE", "PAUSED", "COMPLETED", "DRAFT"] }).default("DRAFT").notNull(),
  // Trigger Conditions
  triggerType: text("trigger_type", { 
    enum: ["INACTIVITY_DAYS", "BALANCE_LOW", "LOGIN_FREQUENCY", "DEPOSIT_DECLINE", "MANUAL"] 
  }).notNull(),
  triggerValue: integer("trigger_value"), // e.g., 7 days inactive
  // Targeting
  targetSegments: jsonb("target_segments"),
  targetInactiveDays: integer("target_inactive_days"),
  minLastDeposit: decimal("min_last_deposit", { precision: 10, scale: 2 }),
  // Offer
  offerType: text("offer_type", { enum: ["BONUS", "FREE_CREDITS", "CASHBACK", "PERSONALIZED"] }).notNull(),
  offerAmount: decimal("offer_amount", { precision: 10, scale: 2 }),
  offerPercentage: decimal("offer_percentage", { precision: 5, scale: 2 }),
  // Delivery
  deliveryChannel: text("delivery_channel", { enum: ["EMAIL", "PUSH", "IN_APP", "SMS"] }).notNull(),
  messageTemplate: text("message_template"),
  subject: text("subject"),
  // Performance Metrics
  targetedUsers: integer("targeted_users").default(0).notNull(),
  messagesDelivered: integer("messages_delivered").default(0).notNull(),
  openRate: decimal("open_rate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  clickRate: decimal("click_rate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  playersReactivated: integer("players_reactivated").default(0).notNull(),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0.00").notNull(),
  // Automation
  isAutomated: boolean("is_automated").default(false).notNull(),
  runFrequency: text("run_frequency"), // "DAILY", "WEEKLY", "MONTHLY"
  lastRunDate: timestamp("last_run_date"),
  nextRunDate: timestamp("next_run_date"),
  createdBy: uuid("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============= PHASE 4C: ADVANCED VIP & PERSONALIZATION =============

// VIP Tier Configuration (Phase 4C)
export const vipTierConfiguration = pgTable("vip_tier_configuration", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tierLevel: text("tier_level", { 
    enum: ["UNRANKED", "WOOD", "BRONZE", "SILVER", "GOLD", "PLATINUM", "JADE", "SAPPHIRE", "RUBY", "DIAMOND"] 
  }).unique().notNull(),
  // Requirements
  experienceRequired: bigint("experience_required", { mode: "number" }).notNull(),
  wageringRequired: decimal("wagering_required", { precision: 12, scale: 2 }).default("0.00").notNull(),
  depositRequired: decimal("deposit_required", { precision: 12, scale: 2 }).default("0.00").notNull(),
  // Benefits
  rakebackPercentage: decimal("rakeback_percentage", { precision: 5, scale: 2 }).default("0.00").notNull(),
  depositBonusMultiplier: decimal("deposit_bonus_multiplier", { precision: 5, scale: 2 }).default("1.00").notNull(),
  wageringRequirementReduction: decimal("wagering_requirement_reduction", { precision: 5, scale: 2 }).default("0.00").notNull(),
  withdrawalLimitIncrease: decimal("withdrawal_limit_increase", { precision: 12, scale: 2 }).default("0.00").notNull(),
  // Special Perks
  customSupport: boolean("custom_support").default(false).notNull(),
  dedicatedManager: boolean("dedicated_manager").default(false).notNull(),
  exclusiveTournaments: boolean("exclusive_tournaments").default(false).notNull(),
  birthdayBonus: decimal("birthday_bonus", { precision: 10, scale: 2 }).default("0.00").notNull(),
  monthlyBonus: decimal("monthly_bonus", { precision: 10, scale: 2 }).default("0.00").notNull(),
  // Display
  tierColor: text("tier_color").default("#9333ea").notNull(),
  tierIcon: text("tier_icon"),
  tierBadge: text("tier_badge"),
  displayOrder: integer("display_order").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Personalized Offers (Phase 4C)
export const personalizedOffers = pgTable("personalized_offers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  offerType: text("offer_type", { 
    enum: ["DEPOSIT_BONUS", "CASHBACK", "FREE_CREDITS", "VIP_UPGRADE", "CUSTOM"] 
  }).notNull(),
  status: text("status", { enum: ["ACTIVE", "CLAIMED", "EXPIRED", "CANCELLED"] }).default("ACTIVE").notNull(),
  // Offer Details
  title: text("title").notNull(),
  description: text("description").notNull(),
  offerAmount: decimal("offer_amount", { precision: 10, scale: 2 }),
  offerPercentage: decimal("offer_percentage", { precision: 5, scale: 2 }),
  currency: text("currency", { enum: ["GC", "SC"] }).default("GC").notNull(),
  // Conditions
  minDeposit: decimal("min_deposit", { precision: 10, scale: 2 }),
  wageringRequirement: integer("wagering_requirement").default(1).notNull(),
  maxBonusAmount: decimal("max_bonus_amount", { precision: 10, scale: 2 }),
  validGames: jsonb("valid_games"),
  // Timing
  expiresAt: timestamp("expires_at").notNull(),
  claimedAt: timestamp("claimed_at"),
  // Personalization
  generatedBy: text("generated_by", { enum: ["MANUAL", "AI_RECOMMENDATION", "TRIGGER", "VIP_TIER"] }).notNull(),
  aiConfidenceScore: decimal("ai_confidence_score", { precision: 5, scale: 2 }),
  targetedReason: text("targeted_reason"),
  // Tracking
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  createdBy: uuid("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// High Roller Profiles (Phase 4C)
export const highRollerProfiles = pgTable("high_roller_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).unique().notNull(),
  classification: text("classification", { enum: ["HIGH_ROLLER", "WHALE", "SUPER_WHALE"] }).notNull(),
  // Financial Metrics
  lifetimeDeposits: decimal("lifetime_deposits", { precision: 12, scale: 2 }).default("0.00").notNull(),
  lifetimeWagered: decimal("lifetime_wagered", { precision: 12, scale: 2 }).default("0.00").notNull(),
  avgBetSize: decimal("avg_bet_size", { precision: 12, scale: 2 }).default("0.00").notNull(),
  largestWin: decimal("largest_win", { precision: 12, scale: 2 }).default("0.00").notNull(),
  largestLoss: decimal("largest_loss", { precision: 12, scale: 2 }).default("0.00").notNull(),
  currentMonthWagered: decimal("current_month_wagered", { precision: 12, scale: 2 }).default("0.00").notNull(),
  // Account Manager
  accountManager: uuid("account_manager").references(() => admins.id),
  specialPerks: jsonb("special_perks"),
  customLimits: jsonb("custom_limits"),
  // Preferences
  preferredGames: jsonb("preferred_games"),
  preferredContactMethod: text("preferred_contact_method"),
  bestContactTime: text("best_contact_time"),
  // Relationship Management
  lastContactDate: timestamp("last_contact_date"),
  nextScheduledContact: timestamp("next_scheduled_contact"),
  relationshipNotes: text("relationship_notes"),
  specialRequests: text("special_requests"),
  // Risk & Compliance
  sourceOfFunds: text("source_of_funds"),
  fundingVerified: boolean("funding_verified").default(false).notNull(),
  enhancedDueDiligence: boolean("enhanced_due_diligence").default(false).notNull(),
  lastReviewDate: timestamp("last_review_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Loyalty Reward Catalog (Phase 4C)
export const loyaltyRewardCatalog = pgTable("loyalty_reward_catalog", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  rewardName: text("reward_name").notNull(),
  rewardType: text("reward_type", { 
    enum: ["BONUS_CREDITS", "CASHBACK", "FREE_SPINS", "VIP_POINTS", "PHYSICAL_ITEM", "EXPERIENCE", "CUSTOM"] 
  }).notNull(),
  category: text("category", { enum: ["GAMING", "LIFESTYLE", "EXCLUSIVE", "MERCHANDISE"] }).notNull(),
  // Cost & Value
  pointsCost: integer("points_cost").notNull(),
  cashValue: decimal("cash_value", { precision: 10, scale: 2 }),
  currency: text("currency", { enum: ["GC", "SC", "USD"] }),
  // Eligibility
  minVipLevel: text("min_vip_level"),
  maxRedemptionsPerUser: integer("max_redemptions_per_user"),
  totalAvailable: integer("total_available"),
  totalRedeemed: integer("total_redeemed").default(0).notNull(),
  // Display
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  termsAndConditions: text("terms_and_conditions"),
  // Availability
  isActive: boolean("is_active").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  availableFrom: timestamp("available_from"),
  availableUntil: timestamp("available_until"),
  // Fulfillment
  fulfillmentType: text("fulfillment_type", { enum: ["INSTANT", "MANUAL", "SCHEDULED"] }).default("INSTANT").notNull(),
  fulfillmentInstructions: text("fulfillment_instructions"),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============= PHASE 4D: COMPLIANCE & SECURITY =============
// NOTE: KYC Documents table already exists earlier in schema

// Regulatory Reports (Phase 4D)
export const regulatoryReports = pgTable("regulatory_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reportType: text("report_type", { 
    enum: ["AML", "TAX", "GAMING_AUTHORITY", "FINANCIAL", "SUSPICIOUS_ACTIVITY", "PLAYER_PROTECTION", "MONTHLY_SUMMARY", "ANNUAL_AUDIT"] 
  }).notNull(),
  reportPeriod: text("report_period").notNull(), // e.g., "2025-Q1", "2025-01"
  jurisdiction: text("jurisdiction").notNull(),
  status: text("status", { enum: ["DRAFT", "GENERATING", "READY", "SUBMITTED", "ARCHIVED"] }).default("DRAFT").notNull(),
  // Report Data
  reportData: jsonb("report_data").notNull(),
  reportSummary: text("report_summary"),
  // Files
  reportFileUrl: text("report_file_url"),
  reportFormat: text("report_format", { enum: ["PDF", "CSV", "XML", "JSON"] }).default("PDF").notNull(),
  // Metadata
  generatedBy: uuid("generated_by").references(() => admins.id),
  generatedAt: timestamp("generated_at"),
  submittedBy: uuid("submitted_by").references(() => admins.id),
  submittedAt: timestamp("submitted_at"),
  // Compliance
  regulatoryBody: text("regulatory_body"),
  submissionMethod: text("submission_method"),
  confirmationNumber: text("confirmation_number"),
  // Audit Trail
  version: integer("version").default(1).notNull(),
  previousVersion: uuid("previous_version"),
  changeLog: jsonb("change_log"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Audit Trail (Phase 4D)
export const auditTrail = pgTable("audit_trail", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Who
  actorType: text("actor_type", { enum: ["ADMIN", "USER", "SYSTEM", "API"] }).notNull(),
  actorId: uuid("actor_id"),
  actorName: text("actor_name"),
  // What
  action: text("action").notNull(), // e.g., "USER_UPDATED", "WITHDRAWAL_APPROVED", "BONUS_CREATED"
  resourceType: text("resource_type").notNull(), // e.g., "USER", "TRANSACTION", "BONUS"
  resourceId: text("resource_id"),
  // Details
  description: text("description").notNull(),
  changesBefore: jsonb("changes_before"),
  changesAfter: jsonb("changes_after"),
  metadata: jsonb("metadata"),
  // Context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  requestId: text("request_id"),
  // Severity & Classification
  severity: text("severity", { enum: ["INFO", "WARNING", "CRITICAL"] }).default("INFO").notNull(),
  category: text("category", { 
    enum: ["USER_MANAGEMENT", "FINANCIAL", "SECURITY", "COMPLIANCE", "SYSTEM", "GAME_MANAGEMENT"] 
  }).notNull(),
  // Security
  requiresFollowUp: boolean("requires_follow_up").default(false).notNull(),
  reviewedBy: uuid("reviewed_by").references(() => admins.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  actorIdx: index("audit_actor_idx").on(table.actorId),
  resourceIdx: index("audit_resource_idx").on(table.resourceType, table.resourceId),
  createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
}));

// Admin MFA Settings (Phase 4D)
export const adminMfaSettings = pgTable("admin_mfa_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: uuid("admin_id").references(() => admins.id).unique().notNull(),
  // MFA Configuration
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  mfaMethod: text("mfa_method", { enum: ["TOTP", "SMS", "EMAIL", "BACKUP_CODES"] }),
  totpSecret: text("totp_secret"), // Encrypted
  phoneNumber: text("phone_number"),
  // Backup Codes
  backupCodes: jsonb("backup_codes"), // Encrypted array of backup codes
  backupCodesUsed: integer("backup_codes_used").default(0).notNull(),
  // Security
  lastMfaVerification: timestamp("last_mfa_verification"),
  failedAttempts: integer("failed_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  // Trust Management
  trustedDevices: jsonb("trusted_devices"), // Array of device fingerprints
  requireMfaForSensitiveActions: boolean("require_mfa_for_sensitive_actions").default(true).notNull(),
  // Recovery
  recoveryEmail: text("recovery_email"),
  recoveryPhone: text("recovery_phone"),
  lastRecoveryUsed: timestamp("last_recovery_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


// =============================================
// PHASE 5: ADVANCED CASINO OPERATIONS (CONTINUED)
// Note: liveChatSessions and gameProviders already defined in Phase 4
// =============================================

// Game Categories (Phase 5A)
export const gameCategories = pgTable("game_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  iconUrl: text("icon_url"),
  parentId: uuid("parent_id"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isVisible: boolean("is_visible").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  gameCount: integer("game_count").default(0).notNull(),
  totalPlays: bigint("total_plays", { mode: "number" }).default(0).notNull(),
  tags: jsonb("tags"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Content Schedule (Phase 5A)
export const contentSchedule = pgTable("content_schedule", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  contentType: text("content_type", { 
    enum: ["GAME_RELEASE", "PROMOTION", "EVENT", "TOURNAMENT", "MAINTENANCE", "ANNOUNCEMENT"] 
  }).notNull(),
  description: text("description"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  endsAt: timestamp("ends_at"),
  status: text("status", { enum: ["DRAFT", "SCHEDULED", "PUBLISHED", "CANCELLED"] }).default("DRAFT").notNull(),
  publishedAt: timestamp("published_at"),
  targetAudience: text("target_audience", { enum: ["ALL", "NEW_USERS", "VIP_ONLY", "CUSTOM"] }).default("ALL").notNull(),
  metadata: jsonb("metadata"),
  createdBy: uuid("created_by").references(() => admins.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Game Metrics (Phase 5A)
export const gameMetrics = pgTable("game_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameName: text("game_name").notNull(),
  providerId: uuid("provider_id").references(() => gameProviders.id),
  periodType: text("period_type", { enum: ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"] }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalPlays: bigint("total_plays", { mode: "number" }).default(0).notNull(),
  uniquePlayers: integer("unique_players").default(0).notNull(),
  totalWagered: decimal("total_wagered", { precision: 18, scale: 2 }).default("0.00").notNull(),
  totalWon: decimal("total_won", { precision: 18, scale: 2 }).default("0.00").notNull(),
  netRevenue: decimal("net_revenue", { precision: 18, scale: 2 }).default("0.00").notNull(),
  actualRtp: decimal("actual_rtp", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Help Desk Tickets (Phase 5B)
export const helpDeskTickets = pgTable("help_desk_tickets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: text("ticket_number").unique().notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  assignedTo: uuid("assigned_to").references(() => admins.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["NEW", "OPEN", "PENDING", "RESOLVED", "CLOSED"] }).default("NEW").notNull(),
  priority: text("priority", { enum: ["LOW", "NORMAL", "HIGH", "URGENT"] }).default("NORMAL").notNull(),
  category: text("category", { enum: ["ACCOUNT", "PAYMENT", "GAMEPLAY", "TECHNICAL"] }).notNull(),
  responses: jsonb("responses"),
  satisfactionRating: integer("satisfaction_rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Customer Surveys (Phase 5B)
export const customerSurveys = pgTable("customer_surveys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  surveyType: text("survey_type", { enum: ["NPS", "CSAT", "FEEDBACK", "CUSTOM"] }).notNull(),
  questions: jsonb("questions").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  targetAudience: text("target_audience", { enum: ["ALL", "NEW_USERS", "VIP_ONLY"] }).default("ALL").notNull(),
  responses: integer("responses").default(0).notNull(),
  averageScore: decimal("average_score", { precision: 5, scale: 2 }),
  createdBy: uuid("created_by").references(() => admins.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// NPS Responses (Phase 5B)
export const npsResponses = pgTable("nps_responses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: uuid("survey_id").references(() => customerSurveys.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  score: integer("score").notNull(),
  category: text("category", { enum: ["DETRACTOR", "PASSIVE", "PROMOTER"] }).notNull(),
  feedback: text("feedback"),
  followUpRequested: boolean("follow_up_requested").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Performance Snapshots (Phase 5C)
export const performanceSnapshots = pgTable("performance_snapshots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  snapshotType: text("snapshot_type", { enum: ["REAL_TIME", "HOURLY", "DAILY", "WEEKLY", "MONTHLY"] }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalUsers: integer("total_users").default(0).notNull(),
  activeUsers: integer("active_users").default(0).notNull(),
  totalDeposits: decimal("total_deposits", { precision: 18, scale: 2 }).default("0.00").notNull(),
  totalWithdrawals: decimal("total_withdrawals", { precision: 18, scale: 2 }).default("0.00").notNull(),
  grossGamingRevenue: decimal("gross_gaming_revenue", { precision: 18, scale: 2 }).default("0.00").notNull(),
  netGamingRevenue: decimal("net_gaming_revenue", { precision: 18, scale: 2 }).default("0.00").notNull(),
  averageRtp: decimal("average_rtp", { precision: 5, scale: 2 }),
  systemUptime: decimal("system_uptime", { precision: 5, scale: 2 }).default("100.00").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Predictive Models (Phase 5C)
export const predictiveModels = pgTable("predictive_models", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  modelType: text("model_type", { enum: ["CHURN_PREDICTION", "LTV_PREDICTION", "FRAUD_DETECTION"] }).notNull(),
  version: text("version").notNull(),
  algorithm: text("algorithm"),
  features: jsonb("features").notNull(),
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }),
  status: text("status", { enum: ["TRAINING", "DEPLOYED", "DEPRECATED"] }).default("TRAINING").notNull(),
  deployedAt: timestamp("deployed_at"),
  totalPredictions: bigint("total_predictions", { mode: "number" }).default(0).notNull(),
  createdBy: uuid("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cohort Data (Phase 5C)
export const cohortData = pgTable("cohort_data", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cohortName: text("cohort_name").notNull(),
  cohortType: text("cohort_type", { enum: ["REGISTRATION", "FIRST_DEPOSIT", "VIP_LEVEL"] }).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  totalUsers: integer("total_users").default(0).notNull(),
  retentionDay7: decimal("retention_day_7", { precision: 5, scale: 2 }),
  retentionDay30: decimal("retention_day_30", { precision: 5, scale: 2 }),
  totalRevenue: decimal("total_revenue", { precision: 18, scale: 2 }).default("0.00").notNull(),
  averageRevenuePerUser: decimal("average_revenue_per_user", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Revenue Forecasts (Phase 5C)
export const revenueForecasts = pgTable("revenue_forecasts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  forecastName: text("forecast_name").notNull(),
  forecastType: text("forecast_type", { enum: ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"] }).notNull(),
  forecastPeriod: date("forecast_period").notNull(),
  predictedRevenue: decimal("predicted_revenue", { precision: 18, scale: 2 }).notNull(),
  confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }),
  modelId: uuid("model_id").references(() => predictiveModels.id),
  actualRevenue: decimal("actual_revenue", { precision: 18, scale: 2 }),
  variance: decimal("variance", { precision: 18, scale: 2 }),
  generatedBy: uuid("generated_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Staff Members (Phase 5D)
export const staffMembers = pgTable("staff_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: uuid("admin_id").references(() => admins.id).unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").unique().notNull(),
  phone: text("phone"),
  department: text("department", { enum: ["SUPPORT", "COMPLIANCE", "FRAUD", "VIP", "TECHNICAL"] }).notNull(),
  position: text("position").notNull(),
  status: text("status", { enum: ["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"] }).default("ACTIVE").notNull(),
  hireDate: date("hire_date").notNull(),
  permissions: jsonb("permissions"),
  performanceRating: decimal("performance_rating", { precision: 3, scale: 2 }),
  ticketsHandled: integer("tickets_handled").default(0).notNull(),
  createdBy: uuid("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Shift Schedules (Phase 5D)
export const shiftSchedules = pgTable("shift_schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: uuid("staff_id").references(() => staffMembers.id).notNull(),
  shiftDate: date("shift_date").notNull(),
  shiftType: text("shift_type", { enum: ["DAY", "EVENING", "NIGHT", "ON_CALL"] }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status", { enum: ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED"] }).default("SCHEDULED").notNull(),
  clockInTime: timestamp("clock_in_time"),
  clockOutTime: timestamp("clock_out_time"),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Task Assignments (Phase 5D)
export const taskAssignments = pgTable("task_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  taskType: text("task_type", { enum: ["TICKET", "PROJECT", "MAINTENANCE", "REVIEW"] }).notNull(),
  priority: text("priority", { enum: ["LOW", "NORMAL", "HIGH", "URGENT"] }).default("NORMAL").notNull(),
  assignedTo: uuid("assigned_to").references(() => staffMembers.id).notNull(),
  assignedBy: uuid("assigned_by").references(() => admins.id).notNull(),
  status: text("status", { enum: ["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"] }).default("TODO").notNull(),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  tags: jsonb("tags"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// System Health Logs (Phase 5D)
export const systemHealthLogs = pgTable("system_health_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
  service: text("service", { enum: ["API", "DATABASE", "WEBSOCKET", "PAYMENT", "GAME_ENGINE"] }).notNull(),
  component: text("component"),
  status: text("status", { enum: ["HEALTHY", "DEGRADED", "DOWN", "MAINTENANCE"] }).notNull(),
  responseTime: integer("response_time"),
  cpuUsage: decimal("cpu_usage", { precision: 5, scale: 2 }),
  memoryUsage: decimal("memory_usage", { precision: 5, scale: 2 }),
  errorCount: integer("error_count").default(0).notNull(),
  errorMessages: jsonb("error_messages"),
  alertTriggered: boolean("alert_triggered").default(false).notNull(),
  alertSeverity: text("alert_severity", { enum: ["INFO", "WARNING", "ERROR", "CRITICAL"] }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========================================
// PHASE 6: ADVANCED CASINO INTELLIGENCE & ENGAGEMENT
// ========================================

// ========== PHASE 6A: SOCIAL & COMMUNITY ==========

// Leaderboards Management
export const leaderboards = pgTable("leaderboards", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  leaderboardType: text("leaderboard_type", { enum: ["WAGERED", "WINS", "PROFIT", "STREAK", "CUSTOM"] }).notNull(),
  gameFilter: text("game_filter"),
  timeframe: text("timeframe", { enum: ["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"] }).notNull(),
  status: text("status", { enum: ["ACTIVE", "PAUSED", "ENDED"] }).default("ACTIVE").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  prizePool: jsonb("prize_pool"),
  minBetAmount: decimal("min_bet_amount", { precision: 10, scale: 2 }),
  maxParticipants: integer("max_participants"),
  displayOrder: integer("display_order").default(0).notNull(),
  createdBy: uuid("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Achievements System
export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  badgeIcon: text("badge_icon"),
  achievementType: text("achievement_type", { enum: ["FIRST_BET", "WIN_STREAK", "TOTAL_WAGERED", "GAME_SPECIFIC", "VIP_MILESTONE", "SOCIAL"] }).notNull(),
  category: text("category", { enum: ["GAMING", "SOCIAL", "VIP", "FINANCIAL"] }).notNull(),
  triggerCondition: jsonb("trigger_condition").notNull(),
  rewardType: text("reward_type", { enum: ["COINS", "BONUS", "BADGE_ONLY"] }).notNull(),
  rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }),
  rarity: text("rarity", { enum: ["COMMON", "RARE", "EPIC", "LEGENDARY"] }).default("COMMON").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdBy: uuid("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Player Achievements (junction table)
export const playerAchievements = pgTable("player_achievements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  achievementId: uuid("achievement_id").references(() => achievements.id).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  notificationSent: boolean("notification_sent").default(false).notNull(),
  metadata: jsonb("metadata"),
});

// Social Feed
export const socialFeed = pgTable("social_feed", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  feedType: text("feed_type", { enum: ["BIG_WIN", "ACHIEVEMENT", "VIP_UPGRADE", "LEADERBOARD", "CUSTOM"] }).notNull(),
  title: text("title").notNull(),
  content: text("content"),
  gameContext: text("game_context"),
  winAmount: decimal("win_amount", { precision: 10, scale: 2 }),
  multiplier: decimal("multiplier", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  visibility: text("visibility", { enum: ["PUBLIC", "FRIENDS", "PRIVATE"] }).default("PUBLIC").notNull(),
  isApproved: boolean("is_approved").default(true).notNull(),
  approvedBy: uuid("approved_by").references(() => admins.id),
  likeCount: integer("like_count").default(0).notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Community Events
export const communityEvents = pgTable("community_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  eventType: text("event_type", { enum: ["TOURNAMENT", "CHALLENGE", "PROMOTION", "SPECIAL"] }).notNull(),
  gameType: text("game_type"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  entryFee: decimal("entry_fee", { precision: 10, scale: 2 }),
  prizeStructure: jsonb("prize_structure"),
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").default(0).notNull(),
  status: text("status", { enum: ["UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"] }).default("UPCOMING").notNull(),
  requirements: jsonb("requirements"),
  bannerImage: text("banner_image"),
  createdBy: uuid("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== PHASE 6B: MOBILE & PLATFORM ==========

// Mobile App Configuration
export const mobileAppConfig = pgTable("mobile_app_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: text("platform", { enum: ["IOS", "ANDROID", "WEB"] }).notNull(),
  appVersion: text("app_version").notNull(),
  minSupportedVersion: text("min_supported_version").notNull(),
  forceUpdateRequired: boolean("force_update_required").default(false).notNull(),
  maintenanceMode: boolean("maintenance_mode").default(false).notNull(),
  maintenanceMessage: text("maintenance_message"),
  featureFlags: jsonb("feature_flags"),
  deepLinkConfig: jsonb("deep_link_config"),
  splashScreenUrl: text("splash_screen_url"),
  appStoreUrl: text("app_store_url"),
  playStoreUrl: text("play_store_url"),
  isActive: boolean("is_active").default(true).notNull(),
  updatedBy: uuid("updated_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Push Notification Campaigns (Advanced)
export const pushNotificationCampaigns = pgTable("push_notification_campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  message: text("message").notNull(),
  notificationType: text("notification_type", { enum: ["PROMOTIONAL", "TRANSACTIONAL", "ALERT", "REMINDER"] }).notNull(),
  targetAudience: text("target_audience", { enum: ["ALL", "VIP", "SEGMENT", "INDIVIDUAL"] }).notNull(),
  targetSegmentId: uuid("target_segment_id"),
  targetUserId: uuid("target_user_id").references(() => users.id),
  scheduledFor: timestamp("scheduled_for"),
  status: text("status", { enum: ["DRAFT", "SCHEDULED", "SENT", "FAILED"] }).default("DRAFT").notNull(),
  sentCount: integer("sent_count").default(0).notNull(),
  deliveredCount: integer("delivered_count").default(0).notNull(),
  clickedCount: integer("clicked_count").default(0).notNull(),
  deepLink: text("deep_link"),
  imageUrl: text("image_url"),
  actionButtons: jsonb("action_buttons"),
  expiresAt: timestamp("expires_at"),
  createdBy: uuid("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at"),
});

// API Management
export const apiManagement = pgTable("api_management", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  apiName: text("api_name").notNull(),
  apiKey: text("api_key").unique().notNull(),
  apiSecret: text("api_secret").notNull(),
  provider: text("provider").notNull(),
  apiType: text("api_type", { enum: ["INTEGRATION", "WEBHOOK", "THIRD_PARTY", "INTERNAL"] }).notNull(),
  permissions: jsonb("permissions").notNull(),
  rateLimit: integer("rate_limit").default(1000).notNull(),
  rateLimitWindow: text("rate_limit_window", { enum: ["MINUTE", "HOUR", "DAY"] }).default("HOUR").notNull(),
  currentUsage: integer("current_usage").default(0).notNull(),
  ipWhitelist: jsonb("ip_whitelist"),
  isActive: boolean("is_active").default(true).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdBy: uuid("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Platform Analytics
export const platformAnalytics = pgTable("platform_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  platform: text("platform", { enum: ["WEB", "IOS", "ANDROID", "TELEGRAM"] }).notNull(),
  metricType: text("metric_type", { enum: ["SESSION", "USER_ACTION", "PERFORMANCE", "ERROR"] }).notNull(),
  activeUsers: integer("active_users").default(0).notNull(),
  newUsers: integer("new_users").default(0).notNull(),
  sessionCount: integer("session_count").default(0).notNull(),
  avgSessionDuration: integer("avg_session_duration"),
  bounceRate: decimal("bounce_rate", { precision: 5, scale: 2 }),
  crashRate: decimal("crash_rate", { precision: 5, scale: 2 }),
  pageViews: integer("page_views").default(0).notNull(),
  errorCount: integer("error_count").default(0).notNull(),
  deviceBreakdown: jsonb("device_breakdown"),
  geographicData: jsonb("geographic_data"),
  metadata: jsonb("metadata"),
});

// ========== PHASE 6C: FINANCIAL INTELLIGENCE ==========

// Banking Integration
export const bankingIntegration = pgTable("banking_integration", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  bankName: text("bank_name").notNull(),
  accountType: text("account_type", { enum: ["CHECKING", "SAVINGS"] }).notNull(),
  accountNumber: text("account_number").notNull(),
  routingNumber: text("routing_number").notNull(),
  accountHolderName: text("account_holder_name").notNull(),
  verificationStatus: text("verification_status", { enum: ["PENDING", "VERIFIED", "FAILED", "REJECTED"] }).default("PENDING").notNull(),
  verificationMethod: text("verification_method", { enum: ["MICRO_DEPOSIT", "INSTANT", "MANUAL"] }),
  plaidAccessToken: text("plaid_access_token"),
  plaidItemId: text("plaid_item_id"),
  isDefault: boolean("is_default").default(false).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  lastVerifiedAt: timestamp("last_verified_at"),
  verifiedBy: uuid("verified_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tax Reporting
export const taxReporting = pgTable("tax_reporting", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  taxYear: integer("tax_year").notNull(),
  formType: text("form_type", { enum: ["1099_MISC", "W2G", "1099_K"] }).notNull(),
  totalWinnings: decimal("total_winnings", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalWithholding: decimal("total_withholding", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalWithdrawals: decimal("total_withdrawals", { precision: 12, scale: 2 }).default("0.00").notNull(),
  reportableAmount: decimal("reportable_amount", { precision: 12, scale: 2 }).notNull(),
  federalWithholding: decimal("federal_withholding", { precision: 12, scale: 2 }).default("0.00").notNull(),
  stateWithholding: decimal("state_withholding", { precision: 12, scale: 2 }).default("0.00").notNull(),
  filingStatus: text("filing_status", { enum: ["DRAFT", "FILED", "AMENDED", "REJECTED"] }).default("DRAFT").notNull(),
  documentUrl: text("document_url"),
  irsSent: boolean("irs_sent").default(false).notNull(),
  irsSentDate: timestamp("irs_sent_date"),
  playerNotified: boolean("player_notified").default(false).notNull(),
  notifiedAt: timestamp("notified_at"),
  generatedBy: uuid("generated_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Financial Forecasting
export const financialForecasting = pgTable("financial_forecasting", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  forecastPeriod: date("forecast_period").notNull(),
  forecastType: text("forecast_type", { enum: ["REVENUE", "CASHFLOW", "PROFIT", "EXPENSE"] }).notNull(),
  timeframe: text("timeframe", { enum: ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"] }).notNull(),
  predictedAmount: decimal("predicted_amount", { precision: 15, scale: 2 }).notNull(),
  actualAmount: decimal("actual_amount", { precision: 15, scale: 2 }),
  variance: decimal("variance", { precision: 15, scale: 2 }),
  variancePercent: decimal("variance_percent", { precision: 5, scale: 2 }),
  confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }).default("0.80").notNull(),
  modelUsed: text("model_used", { enum: ["LINEAR_REGRESSION", "ARIMA", "PROPHET", "ML_ENSEMBLE"] }).notNull(),
  inputFactors: jsonb("input_factors"),
  seasonalAdjustment: boolean("seasonal_adjustment").default(false).notNull(),
  notes: text("notes"),
  generatedBy: uuid("generated_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Accounting Integration
export const accountingIntegration = pgTable("accounting_integration", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider", { enum: ["QUICKBOOKS", "XERO", "FRESHBOOKS", "SAGE"] }).notNull(),
  companyId: text("company_id").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  realmId: text("realm_id"),
  syncEnabled: boolean("sync_enabled").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  syncFrequency: text("sync_frequency", { enum: ["REALTIME", "HOURLY", "DAILY", "WEEKLY"] }).default("DAILY").notNull(),
  accountMappings: jsonb("account_mappings"),
  transactionCount: integer("transaction_count").default(0).notNull(),
  lastError: text("last_error"),
  status: text("status", { enum: ["ACTIVE", "ERROR", "DISCONNECTED", "PAUSED"] }).default("ACTIVE").notNull(),
  configuredBy: uuid("configured_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== PHASE 6D: PLAYER LIFECYCLE ==========

// Player Lifetime Value (LTV)
export const playerLtv = pgTable("player_ltv", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).unique().notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  totalDeposits: decimal("total_deposits", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalWithdrawals: decimal("total_withdrawals", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalWagered: decimal("total_wagered", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalWinnings: decimal("total_winnings", { precision: 12, scale: 2 }).default("0.00").notNull(),
  netRevenue: decimal("net_revenue", { precision: 12, scale: 2 }).default("0.00").notNull(),
  currentLtv: decimal("current_ltv", { precision: 12, scale: 2 }).default("0.00").notNull(),
  predictedLtv: decimal("predicted_ltv", { precision: 12, scale: 2 }),
  ltvTier: text("ltv_tier", { enum: ["LOW", "MEDIUM", "HIGH", "VIP", "WHALE"] }),
  daysSinceFirstDeposit: integer("days_since_first_deposit").default(0).notNull(),
  avgSessionValue: decimal("avg_session_value", { precision: 10, scale: 2 }),
  purchaseFrequency: decimal("purchase_frequency", { precision: 5, scale: 2 }),
  churnRisk: decimal("churn_risk", { precision: 5, scale: 2 }),
  retentionProbability: decimal("retention_probability", { precision: 5, scale: 2 }),
  lastActivityDate: timestamp("last_activity_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Churn Prevention
export const churnPrevention = pgTable("churn_prevention", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).notNull(),
  riskLevel: text("risk_level", { enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }).notNull(),
  indicators: jsonb("indicators").notNull(),
  daysSinceLastActivity: integer("days_since_last_activity").notNull(),
  activityDecline: decimal("activity_decline", { precision: 5, scale: 2 }),
  recommendedActions: jsonb("recommended_actions"),
  interventionType: text("intervention_type", { enum: ["EMAIL", "PUSH", "BONUS", "PERSONALIZED_OFFER", "VIP_OUTREACH"] }),
  interventionStatus: text("intervention_status", { enum: ["PENDING", "SENT", "ENGAGED", "IGNORED"] }),
  interventionSentAt: timestamp("intervention_sent_at"),
  playerResponse: text("player_response"),
  wasSuccessful: boolean("was_successful"),
  notes: text("notes"),
  assignedTo: uuid("assigned_to").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Win/Loss Management
export const winLossManagement = pgTable("win_loss_management", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  periodType: text("period_type", { enum: ["DAILY", "WEEKLY", "MONTHLY", "SESSION"] }).notNull(),
  totalBets: integer("total_bets").default(0).notNull(),
  totalWagered: decimal("total_wagered", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalWon: decimal("total_won", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalLost: decimal("total_lost", { precision: 12, scale: 2 }).default("0.00").notNull(),
  netWinLoss: decimal("net_win_loss", { precision: 12, scale: 2 }).default("0.00").notNull(),
  biggestWin: decimal("biggest_win", { precision: 12, scale: 2 }),
  biggestLoss: decimal("biggest_loss", { precision: 12, scale: 2 }),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }),
  avgBetSize: decimal("avg_bet_size", { precision: 10, scale: 2 }),
  sessionCount: integer("session_count").default(0).notNull(),
  responsibleGamingFlags: jsonb("responsible_gaming_flags"),
  limitReached: boolean("limit_reached").default(false).notNull(),
  limitType: text("limit_type", { enum: ["DAILY", "WEEKLY", "MONTHLY", "SESSION"] }),
  alertSent: boolean("alert_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Player Health Scoring
export const playerHealthScoring = pgTable("player_health_scoring", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).unique().notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }).notNull(),
  healthStatus: text("health_status", { enum: ["EXCELLENT", "GOOD", "FAIR", "POOR", "CRITICAL"] }).notNull(),
  engagementScore: decimal("engagement_score", { precision: 5, scale: 2 }).notNull(),
  financialHealthScore: decimal("financial_health_score", { precision: 5, scale: 2 }).notNull(),
  behaviorScore: decimal("behavior_score", { precision: 5, scale: 2 }).notNull(),
  socialScore: decimal("social_score", { precision: 5, scale: 2 }),
  responsibleGamingScore: decimal("responsible_gaming_score", { precision: 5, scale: 2 }).notNull(),
  trendDirection: text("trend_direction", { enum: ["IMPROVING", "STABLE", "DECLINING"] }).notNull(),
  scoreComponents: jsonb("score_components").notNull(),
  redFlags: jsonb("red_flags"),
  recommendations: jsonb("recommendations"),
  lastReviewedBy: uuid("last_reviewed_by").references(() => admins.id),
  nextReviewDate: timestamp("next_review_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================
// PHASE 7: ADVANCED GAME OPERATIONS, COMMUNICATION, BI & DEVOPS
// =============================================

// ========== PHASE 7A: ADVANCED GAME OPERATIONS & RNG ==========

// Game Testing & QA
export const gameTesting = pgTable("game_testing", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameName: text("game_name").notNull(),
  testType: text("test_type", { enum: ["UNIT", "INTEGRATION", "REGRESSION", "LOAD", "SECURITY"] }).notNull(),
  testEnvironment: text("test_environment", { enum: ["DEV", "STAGING", "PRODUCTION"] }).notNull(),
  status: text("status", { enum: ["PLANNED", "IN_PROGRESS", "PASSED", "FAILED", "BLOCKED"] }).default("PLANNED").notNull(),
  testCases: jsonb("test_cases").notNull(),
  passedCases: integer("passed_cases").default(0).notNull(),
  failedCases: integer("failed_cases").default(0).notNull(),
  bugsFound: integer("bugs_found").default(0).notNull(),
  bugDetails: jsonb("bug_details"),
  coverage: decimal("coverage", { precision: 5, scale: 2 }),
  executionTime: integer("execution_time"), // in seconds
  testResults: jsonb("test_results"),
  testerNotes: text("tester_notes"),
  assignedTo: uuid("assigned_to").references(() => admins.id),
  completedBy: uuid("completed_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// RNG Verification
export const rngVerification = pgTable("rng_verification", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameName: text("game_name").notNull(),
  verificationType: text("verification_type", { enum: ["CHI_SQUARE", "KOLMOGOROV_SMIRNOV", "DIEHARD", "NIST", "FULL_AUDIT"] }).notNull(),
  sampleSize: integer("sample_size").notNull(),
  testDate: timestamp("test_date").defaultNow().notNull(),
  chiSquareStatistic: decimal("chi_square_statistic", { precision: 10, scale: 4 }),
  pValue: decimal("p_value", { precision: 10, scale: 8 }),
  degreesOfFreedom: integer("degrees_of_freedom"),
  passed: boolean("passed").notNull(),
  confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }).default("0.95").notNull(),
  randomnessScore: decimal("randomness_score", { precision: 5, scale: 2 }),
  distributionAnalysis: jsonb("distribution_analysis"),
  sequenceTests: jsonb("sequence_tests"),
  certificationBody: text("certification_body"),
  certificateNumber: text("certificate_number"),
  certificateUrl: text("certificate_url"),
  expiresAt: timestamp("expires_at"),
  verifiedBy: uuid("verified_by").references(() => admins.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Game Session Logs
export const gameSessionLogs = pgTable("game_session_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  gameName: text("game_name").notNull(),
  sessionId: text("session_id").notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  totalBets: integer("total_bets").default(0).notNull(),
  totalWagered: decimal("total_wagered", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalWon: decimal("total_won", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalLost: decimal("total_lost", { precision: 12, scale: 2 }).default("0.00").notNull(),
  netResult: decimal("net_result", { precision: 12, scale: 2 }).default("0.00").notNull(),
  largestBet: decimal("largest_bet", { precision: 12, scale: 2 }),
  largestWin: decimal("largest_win", { precision: 12, scale: 2 }),
  gameEvents: jsonb("game_events"),
  sessionMetadata: jsonb("session_metadata"),
  deviceInfo: jsonb("device_info"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  exitReason: text("exit_reason", { enum: ["NORMAL", "TIMEOUT", "DISCONNECT", "ERROR"] }),
});

// Game Configuration Management
export const gameConfiguration = pgTable("game_configuration", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gameName: text("game_name").notNull(),
  configVersion: text("config_version").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  minBet: decimal("min_bet", { precision: 10, scale: 2 }).notNull(),
  maxBet: decimal("max_bet", { precision: 10, scale: 2 }).notNull(),
  defaultBet: decimal("default_bet", { precision: 10, scale: 2 }).notNull(),
  rtp: decimal("rtp", { precision: 5, scale: 2 }).notNull(), // Return to Player %
  volatility: text("volatility", { enum: ["LOW", "MEDIUM", "HIGH", "VERY_HIGH"] }).notNull(),
  maxWinMultiplier: decimal("max_win_multiplier", { precision: 10, scale: 2 }),
  gameRules: jsonb("game_rules").notNull(),
  payoutTable: jsonb("payout_table"),
  bonusFeatures: jsonb("bonus_features"),
  gameVariants: jsonb("game_variants"),
  restrictedRegions: text("restricted_regions").array(),
  vipLevelRequired: text("vip_level_required"),
  maintenanceMode: boolean("maintenance_mode").default(false).notNull(),
  maintenanceMessage: text("maintenance_message"),
  configuredBy: uuid("configured_by").references(() => admins.id),
  activatedBy: uuid("activated_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  activatedAt: timestamp("activated_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== PHASE 7B: PLAYER COMMUNICATION & ENGAGEMENT ==========

// In-App Messaging
export const inAppMessages = pgTable("in_app_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientId: uuid("recipient_id").references(() => users.id).notNull(),
  senderId: uuid("sender_id").references(() => admins.id).notNull(),
  messageType: text("message_type", { enum: ["INFO", "WARNING", "PROMOTION", "SUPPORT", "SYSTEM"] }).notNull(),
  priority: text("priority", { enum: ["LOW", "NORMAL", "HIGH", "URGENT"] }).default("NORMAL").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  ctaText: text("cta_text"),
  ctaUrl: text("cta_url"),
  imageUrl: text("image_url"),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  isArchived: boolean("is_archived").default(false).notNull(),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notification Preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).unique().notNull(),
  emailEnabled: boolean("email_enabled").default(true).notNull(),
  smsEnabled: boolean("sms_enabled").default(false).notNull(),
  pushEnabled: boolean("push_enabled").default(true).notNull(),
  inAppEnabled: boolean("in_app_enabled").default(true).notNull(),
  promotionalEmails: boolean("promotional_emails").default(true).notNull(),
  transactionalEmails: boolean("transactional_emails").default(true).notNull(),
  gameUpdates: boolean("game_updates").default(true).notNull(),
  bonusAlerts: boolean("bonus_alerts").default(true).notNull(),
  vipRewards: boolean("vip_rewards").default(true).notNull(),
  winLossAlerts: boolean("win_loss_alerts").default(false).notNull(),
  depositReminders: boolean("deposit_reminders").default(true).notNull(),
  responsibleGamingAlerts: boolean("responsible_gaming_alerts").default(true).notNull(),
  weeklyDigest: boolean("weekly_digest").default(true).notNull(),
  quietHoursStart: text("quiet_hours_start"), // HH:MM format
  quietHoursEnd: text("quiet_hours_end"), // HH:MM format
  timezone: text("timezone").default("UTC").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Player Feedback
export const playerFeedback = pgTable("player_feedback", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  feedbackType: text("feedback_type", { enum: ["BUG_REPORT", "FEATURE_REQUEST", "GAME_REVIEW", "GENERAL", "COMPLAINT"] }).notNull(),
  category: text("category", { enum: ["GAMEPLAY", "UI_UX", "PAYMENT", "SUPPORT", "PERFORMANCE", "OTHER"] }).notNull(),
  gameName: text("game_name"),
  rating: integer("rating"), // 1-5 stars
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  screenshots: text("screenshots").array(),
  deviceInfo: jsonb("device_info"),
  status: text("status", { enum: ["NEW", "REVIEWED", "IN_PROGRESS", "RESOLVED", "CLOSED", "WONT_FIX"] }).default("NEW").notNull(),
  priority: text("priority", { enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }),
  assignedTo: uuid("assigned_to").references(() => admins.id),
  adminResponse: text("admin_response"),
  respondedAt: timestamp("responded_at"),
  respondedBy: uuid("responded_by").references(() => admins.id),
  isPublic: boolean("is_public").default(false).notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Communication Logs
export const communicationLogs = pgTable("communication_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  communicationType: text("communication_type", { enum: ["EMAIL", "SMS", "PUSH", "IN_APP", "PHONE"] }).notNull(),
  direction: text("direction", { enum: ["INBOUND", "OUTBOUND"] }).notNull(),
  channel: text("channel").notNull(),
  subject: text("subject"),
  content: text("content"),
  status: text("status", { enum: ["SENT", "DELIVERED", "READ", "FAILED", "BOUNCED"] }).notNull(),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  failureReason: text("failure_reason"),
  initiatedBy: uuid("initiated_by").references(() => admins.id),
  campaignId: uuid("campaign_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========== PHASE 7C: BUSINESS INTELLIGENCE & REPORTING ==========

// Executive Dashboard
export const executiveDashboard = pgTable("executive_dashboard", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  periodType: text("period_type", { enum: ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"] }).notNull(),
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }).default("0.00").notNull(),
  totalDeposits: decimal("total_deposits", { precision: 15, scale: 2 }).default("0.00").notNull(),
  totalWithdrawals: decimal("total_withdrawals", { precision: 15, scale: 2 }).default("0.00").notNull(),
  totalWagered: decimal("total_wagered", { precision: 15, scale: 2 }).default("0.00").notNull(),
  totalPayouts: decimal("total_payouts", { precision: 15, scale: 2 }).default("0.00").notNull(),
  netGamingRevenue: decimal("net_gaming_revenue", { precision: 15, scale: 2 }).default("0.00").notNull(),
  activeUsers: integer("active_users").default(0).notNull(),
  newUsers: integer("new_users").default(0).notNull(),
  returningUsers: integer("returning_users").default(0).notNull(),
  totalBets: integer("total_bets").default(0).notNull(),
  avgBetSize: decimal("avg_bet_size", { precision: 10, scale: 2 }),
  avgSessionDuration: integer("avg_session_duration"),
  houseEdge: decimal("house_edge", { precision: 5, scale: 2 }),
  playerRetention: decimal("player_retention", { precision: 5, scale: 2 }),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }),
  topGames: jsonb("top_games"),
  topRegions: jsonb("top_regions"),
  kpiMetrics: jsonb("kpi_metrics"),
});

// Custom KPI Tracking
export const customKpiTracking = pgTable("custom_kpi_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  kpiName: text("kpi_name").notNull(),
  kpiCategory: text("kpi_category", { enum: ["FINANCIAL", "OPERATIONAL", "CUSTOMER", "MARKETING", "COMPLIANCE"] }).notNull(),
  measurementUnit: text("measurement_unit").notNull(),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).notNull(),
  previousValue: decimal("previous_value", { precision: 15, scale: 2 }),
  percentChange: decimal("percent_change", { precision: 5, scale: 2 }),
  trendDirection: text("trend_direction", { enum: ["UP", "DOWN", "STABLE"] }),
  status: text("status", { enum: ["ON_TARGET", "AT_RISK", "OFF_TARGET", "EXCEEDED"] }).notNull(),
  period: text("period", { enum: ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] }).notNull(),
  calculationFormula: text("calculation_formula"),
  dataSource: text("data_source"),
  isActive: boolean("is_active").default(true).notNull(),
  alertThreshold: decimal("alert_threshold", { precision: 15, scale: 2 }),
  alertEmails: text("alert_emails").array(),
  createdBy: uuid("created_by").references(() => admins.id),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export Management
export const exportManagement = pgTable("export_management", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  exportName: text("export_name").notNull(),
  exportType: text("export_type", { enum: ["USER_DATA", "TRANSACTIONS", "GAME_LOGS", "ANALYTICS", "COMPLIANCE", "CUSTOM"] }).notNull(),
  format: text("format", { enum: ["CSV", "XLSX", "JSON", "PDF", "XML"] }).notNull(),
  schedule: text("schedule", { enum: ["MANUAL", "HOURLY", "DAILY", "WEEKLY", "MONTHLY"] }).default("MANUAL").notNull(),
  scheduledTime: text("scheduled_time"), // HH:MM format
  dateRange: jsonb("date_range"),
  filters: jsonb("filters"),
  columns: text("columns").array(),
  recipients: text("recipients").array(),
  status: text("status", { enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] }).default("PENDING").notNull(),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"), // in bytes
  rowCount: integer("row_count"),
  errorMessage: text("error_message"),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdBy: uuid("created_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Data Warehouse Sync
export const dataWarehouseSync = pgTable("data_warehouse_sync", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  syncName: text("sync_name").notNull(),
  warehouseProvider: text("warehouse_provider", { enum: ["SNOWFLAKE", "REDSHIFT", "BIGQUERY", "DATABRICKS"] }).notNull(),
  syncType: text("sync_type", { enum: ["FULL", "INCREMENTAL", "DELTA"] }).notNull(),
  sourceTable: text("source_table").notNull(),
  destinationTable: text("destination_table").notNull(),
  status: text("status", { enum: ["IDLE", "RUNNING", "COMPLETED", "FAILED", "PAUSED"] }).default("IDLE").notNull(),
  recordsSynced: integer("records_synced").default(0).notNull(),
  recordsFailed: integer("records_failed").default(0).notNull(),
  dataVolumeBytes: bigint("data_volume_bytes", { mode: "number" }).default(0).notNull(),
  syncDuration: integer("sync_duration"), // in seconds
  lastSyncAt: timestamp("last_sync_at"),
  nextSyncAt: timestamp("next_sync_at"),
  syncFrequency: text("sync_frequency", { enum: ["REALTIME", "EVERY_5MIN", "HOURLY", "DAILY"] }).default("HOURLY").notNull(),
  transformationRules: jsonb("transformation_rules"),
  errorLogs: jsonb("error_logs"),
  isActive: boolean("is_active").default(true).notNull(),
  configuredBy: uuid("configured_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========== PHASE 7D: SYSTEM ADMINISTRATION & DEVOPS ==========

// Server Monitoring
export const serverMonitoring = pgTable("server_monitoring", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  serverName: text("server_name").notNull(),
  serverType: text("server_type", { enum: ["WEB", "API", "DATABASE", "CACHE", "QUEUE", "WORKER"] }).notNull(),
  status: text("status", { enum: ["HEALTHY", "DEGRADED", "DOWN", "MAINTENANCE"] }).notNull(),
  cpuUsage: decimal("cpu_usage", { precision: 5, scale: 2 }),
  memoryUsage: decimal("memory_usage", { precision: 5, scale: 2 }),
  diskUsage: decimal("disk_usage", { precision: 5, scale: 2 }),
  networkIn: bigint("network_in", { mode: "number" }), // bytes
  networkOut: bigint("network_out", { mode: "number" }), // bytes
  activeConnections: integer("active_connections"),
  requestsPerSecond: integer("requests_per_second"),
  avgResponseTime: integer("avg_response_time"), // in ms
  errorRate: decimal("error_rate", { precision: 5, scale: 2 }),
  uptime: integer("uptime"), // in seconds
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  alerts: jsonb("alerts"),
  metrics: jsonb("metrics"),
});

// Deployment Management
export const deploymentManagement = pgTable("deployment_management", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  deploymentName: text("deployment_name").notNull(),
  version: text("version").notNull(),
  environment: text("environment", { enum: ["DEV", "STAGING", "PRODUCTION"] }).notNull(),
  deploymentType: text("deployment_type", { enum: ["RELEASE", "HOTFIX", "ROLLBACK", "PATCH"] }).notNull(),
  status: text("status", { enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "ROLLED_BACK"] }).default("PENDING").notNull(),
  changelogUrl: text("changelog_url"),
  gitCommitHash: text("git_commit_hash"),
  gitBranch: text("git_branch"),
  buildNumber: text("build_number"),
  deploymentStrategy: text("deployment_strategy", { enum: ["BLUE_GREEN", "CANARY", "ROLLING", "ALL_AT_ONCE"] }),
  progressPercentage: integer("progress_percentage").default(0).notNull(),
  affectedServices: text("affected_services").array(),
  preDeploymentChecks: jsonb("pre_deployment_checks"),
  postDeploymentChecks: jsonb("post_deployment_checks"),
  healthChecksPassed: boolean("health_checks_passed"),
  deploymentLogs: jsonb("deployment_logs"),
  errorLogs: jsonb("error_logs"),
  rollbackReason: text("rollback_reason"),
  deployedBy: uuid("deployed_by").references(() => admins.id),
  approvedBy: uuid("approved_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

// Feature Flags
export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  flagKey: text("flag_key").unique().notNull(),
  flagName: text("flag_name").notNull(),
  description: text("description"),
  flagType: text("flag_type", { enum: ["BOOLEAN", "VARIANT", "PERCENTAGE", "USER_SEGMENT"] }).notNull(),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  defaultValue: jsonb("default_value"),
  variants: jsonb("variants"),
  rolloutPercentage: integer("rollout_percentage").default(0).notNull(),
  targetSegments: text("target_segments").array(),
  targetUsers: text("target_users").array(),
  excludedUsers: text("excluded_users").array(),
  environment: text("environment", { enum: ["DEV", "STAGING", "PRODUCTION", "ALL"] }).default("ALL").notNull(),
  isPermanent: boolean("is_permanent").default(false).notNull(),
  expiresAt: timestamp("expires_at"),
  tags: text("tags").array(),
  dependencies: text("dependencies").array(),
  metricsTracked: jsonb("metrics_tracked"),
  abTestConfig: jsonb("ab_test_config"),
  createdBy: uuid("created_by").references(() => admins.id),
  lastModifiedBy: uuid("last_modified_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Error Tracking
export const errorTracking = pgTable("error_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  errorType: text("error_type", { enum: ["EXCEPTION", "CRASH", "API_ERROR", "DATABASE_ERROR", "TIMEOUT", "VALIDATION"] }).notNull(),
  severity: text("severity", { enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }).notNull(),
  errorMessage: text("error_message").notNull(),
  errorCode: text("error_code"),
  stackTrace: text("stack_trace"),
  environment: text("environment", { enum: ["DEV", "STAGING", "PRODUCTION"] }).notNull(),
  platform: text("platform", { enum: ["WEB", "IOS", "ANDROID", "API", "BACKEND"] }).notNull(),
  userId: uuid("user_id").references(() => users.id),
  sessionId: text("session_id"),
  requestUrl: text("request_url"),
  requestMethod: text("request_method"),
  requestBody: jsonb("request_body"),
  responseStatus: integer("response_status"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceInfo: jsonb("device_info"),
  appVersion: text("app_version"),
  occurrenceCount: integer("occurrence_count").default(1).notNull(),
  firstOccurrence: timestamp("first_occurrence").defaultNow().notNull(),
  lastOccurrence: timestamp("last_occurrence").defaultNow().notNull(),
  status: text("status", { enum: ["NEW", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "IGNORED"] }).default("NEW").notNull(),
  assignedTo: uuid("assigned_to").references(() => admins.id),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  context: jsonb("context"),
  tags: text("tags").array(),
});

// =============================================
// PHASE 8: AI-POWERED INTELLIGENCE & PLATFORM OPTIMIZATION
// =============================================

// AI & Machine Learning - AI Player Insights
export const aiPlayerInsights = pgTable("ai_player_insights", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  insightType: text("insight_type", { enum: ["BEHAVIOR_PATTERN", "SPENDING_PATTERN", "GAME_PREFERENCE", "SESSION_PATTERN", "RISK_INDICATOR"] }).notNull(),
  insightCategory: text("insight_category", { enum: ["ENGAGEMENT", "MONETIZATION", "RETENTION", "RISK", "PERSONALIZATION"] }).notNull(),
  severity: text("severity", { enum: ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] }).default("INFO").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).notNull(),
  mlModel: text("ml_model").notNull(),
  modelVersion: text("model_version").notNull(),
  dataPoints: jsonb("data_points"),
  features: jsonb("features"),
  predictions: jsonb("predictions"),
  recommendations: jsonb("recommendations"),
  isActioned: boolean("is_actioned").default(false).notNull(),
  actionTaken: text("action_taken"),
  actionedAt: timestamp("actioned_at"),
  actionedBy: uuid("actioned_by").references(() => admins.id),
  validUntil: timestamp("valid_until"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI & Machine Learning - Predictive Behavior Modeling
export const predictiveBehaviorModeling = pgTable("predictive_behavior_modeling", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  modelType: text("model_type", { enum: ["CHURN_PREDICTION", "LTV_FORECAST", "SPEND_PREDICTION", "GAME_PREFERENCE", "SESSION_DURATION"] }).notNull(),
  predictionTimeframe: text("prediction_timeframe", { enum: ["24_HOURS", "7_DAYS", "30_DAYS", "90_DAYS", "1_YEAR"] }).notNull(),
  churnProbability: decimal("churn_probability", { precision: 5, scale: 2 }),
  predictedLtv: decimal("predicted_ltv", { precision: 10, scale: 2 }),
  predictedSpend: decimal("predicted_spend", { precision: 10, scale: 2 }),
  predictedSessionCount: integer("predicted_session_count"),
  predictedGamesPlayed: text("predicted_games_played").array(),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).notNull(),
  modelAccuracy: decimal("model_accuracy", { precision: 5, scale: 2 }),
  trainingDataSize: integer("training_data_size"),
  featureImportance: jsonb("feature_importance"),
  actualOutcome: jsonb("actual_outcome"),
  predictionAccurate: boolean("prediction_accurate"),
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// AI & Machine Learning - Automated Risk Scoring
export const automatedRiskScoring = pgTable("automated_risk_scoring", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).notNull(),
  riskLevel: text("risk_level", { enum: ["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH", "CRITICAL"] }).notNull(),
  riskCategory: text("risk_category", { enum: ["FRAUD", "AML", "PROBLEM_GAMBLING", "ACCOUNT_TAKEOVER", "BONUS_ABUSE"] }).notNull(),
  riskFactors: jsonb("risk_factors").notNull(),
  anomaliesDetected: jsonb("anomalies_detected"),
  flaggedBehaviors: text("flagged_behaviors").array(),
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }).notNull(),
  modelUsed: text("model_used").notNull(),
  triggerEvents: jsonb("trigger_events"),
  comparisonToBaseline: jsonb("comparison_to_baseline"),
  recommendedActions: jsonb("recommended_actions"),
  autoActionsTriggered: jsonb("auto_actions_triggered"),
  manualReviewRequired: boolean("manual_review_required").default(false).notNull(),
  reviewedBy: uuid("reviewed_by").references(() => admins.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  status: text("status", { enum: ["ACTIVE", "CLEARED", "ESCALATED", "MONITORING"] }).default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI & Machine Learning - Smart Recommendations Engine
export const smartRecommendations = pgTable("smart_recommendations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  recommendationType: text("recommendation_type", { enum: ["GAME", "BONUS", "TOURNAMENT", "VIP_OFFER", "CONTENT"] }).notNull(),
  recommendedItem: text("recommended_item").notNull(),
  recommendedItemType: text("recommended_item_type").notNull(),
  recommendationReason: text("recommendation_reason").notNull(),
  relevanceScore: decimal("relevance_score", { precision: 5, scale: 2 }).notNull(),
  algorithmUsed: text("algorithm_used", { enum: ["COLLABORATIVE_FILTERING", "CONTENT_BASED", "HYBRID", "DEEP_LEARNING", "CONTEXTUAL"] }).notNull(),
  personalizationFactors: jsonb("personalization_factors"),
  contextData: jsonb("context_data"),
  abTestGroup: text("ab_test_group"),
  displayPriority: integer("display_priority").default(1).notNull(),
  isDisplayed: boolean("is_displayed").default(false).notNull(),
  displayedAt: timestamp("displayed_at"),
  isClicked: boolean("is_clicked").default(false).notNull(),
  clickedAt: timestamp("clicked_at"),
  isConverted: boolean("is_converted").default(false).notNull(),
  convertedAt: timestamp("converted_at"),
  conversionValue: decimal("conversion_value", { precision: 10, scale: 2 }),
  feedbackScore: integer("feedback_score"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Advanced Security & Compliance - Multi-Layer Authentication
export const multiLayerAuth = pgTable("multi_layer_auth", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  authMethod: text("auth_method", { enum: ["PASSWORD", "BIOMETRIC", "2FA_TOTP", "2FA_SMS", "2FA_EMAIL", "DEVICE_FINGERPRINT", "HARDWARE_TOKEN"] }).notNull(),
  authProvider: text("auth_provider"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  deviceId: text("device_id"),
  deviceFingerprint: text("device_fingerprint"),
  biometricType: text("biometric_type", { enum: ["FACE_ID", "TOUCH_ID", "FINGERPRINT", "IRIS_SCAN"] }),
  totpSecret: text("totp_secret"),
  backupCodes: text("backup_codes").array(),
  usedBackupCodes: text("used_backup_codes").array(),
  phoneNumber: text("phone_number"),
  phoneVerified: boolean("phone_verified").default(false).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  trustScore: decimal("trust_score", { precision: 5, scale: 2 }),
  lastUsedAt: timestamp("last_used_at"),
  lastSuccessAt: timestamp("last_success_at"),
  lastFailureAt: timestamp("last_failure_at"),
  failureCount: integer("failure_count").default(0).notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Advanced Security & Compliance - Advanced Fraud Prevention
export const advancedFraudPrevention = pgTable("advanced_fraud_prevention", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
  fraudType: text("fraud_type", { enum: ["PAYMENT_FRAUD", "IDENTITY_THEFT", "ACCOUNT_TAKEOVER", "BONUS_ABUSE", "MULTI_ACCOUNTING", "COLLUSION", "AUTOMATED_PLAY"] }).notNull(),
  detectionMethod: text("detection_method", { enum: ["RULE_BASED", "ML_MODEL", "PATTERN_ANALYSIS", "ANOMALY_DETECTION", "PEER_COMPARISON", "MANUAL_REVIEW"] }).notNull(),
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).notNull(),
  fraudIndicators: jsonb("fraud_indicators").notNull(),
  relatedAccounts: text("related_accounts").array(),
  relatedDevices: text("related_devices").array(),
  relatedIps: text("related_ips").array(),
  suspiciousPatterns: jsonb("suspicious_patterns"),
  evidenceCollected: jsonb("evidence_collected"),
  automaticActionTaken: text("automatic_action_taken", { enum: ["NONE", "FLAG", "SUSPEND", "BLOCK", "LIMIT", "REVIEW_REQUIRED"] }),
  caseStatus: text("case_status", { enum: ["NEW", "INVESTIGATING", "CONFIRMED_FRAUD", "FALSE_POSITIVE", "CLOSED"] }).default("NEW").notNull(),
  investigator: uuid("investigator").references(() => admins.id),
  investigationNotes: text("investigation_notes"),
  resolution: text("resolution"),
  financialImpact: decimal("financial_impact", { precision: 10, scale: 2 }),
  recoveredAmount: decimal("recovered_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Advanced Security & Compliance - Compliance Automation
export const complianceAutomation = pgTable("compliance_automation", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  complianceType: text("compliance_type", { enum: ["KYC", "AML", "RESPONSIBLE_GAMING", "TAX_REPORTING", "REGULATORY_FILING", "DATA_PRIVACY", "AGE_VERIFICATION"] }).notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  regulatoryBody: text("regulatory_body"),
  automationRule: text("automation_rule").notNull(),
  triggerCondition: jsonb("trigger_condition").notNull(),
  checkFrequency: text("check_frequency", { enum: ["REAL_TIME", "HOURLY", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"] }).notNull(),
  lastCheckAt: timestamp("last_check_at"),
  nextCheckAt: timestamp("next_check_at"),
  checkStatus: text("check_status", { enum: ["PENDING", "IN_PROGRESS", "PASSED", "FAILED", "REQUIRES_REVIEW"] }),
  affectedEntities: jsonb("affected_entities"),
  complianceScore: decimal("compliance_score", { precision: 5, scale: 2 }),
  violations: jsonb("violations"),
  remedialActions: jsonb("remedial_actions"),
  autoReportGenerated: boolean("auto_report_generated").default(false).notNull(),
  reportPath: text("report_path"),
  filedWithRegulator: boolean("filed_with_regulator").default(false).notNull(),
  filingReference: text("filing_reference"),
  filedAt: timestamp("filed_at"),
  reviewedBy: uuid("reviewed_by").references(() => admins.id),
  approvedBy: uuid("approved_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Advanced Security & Compliance - Security Incident Response
export const securityIncidents = pgTable("security_incidents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentType: text("incident_type", { enum: ["DATA_BREACH", "DDOS_ATTACK", "SQL_INJECTION", "XSS_ATTACK", "UNAUTHORIZED_ACCESS", "MALWARE", "PHISHING", "API_ABUSE"] }).notNull(),
  severity: text("severity", { enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }).notNull(),
  status: text("status", { enum: ["DETECTED", "INVESTIGATING", "CONTAINED", "ERADICATED", "RECOVERED", "CLOSED"] }).default("DETECTED").notNull(),
  detectedBy: text("detected_by", { enum: ["AUTOMATED_SYSTEM", "MANUAL_REVIEW", "USER_REPORT", "THIRD_PARTY"] }).notNull(),
  affectedSystems: text("affected_systems").array(),
  affectedUsers: text("affected_users").array(),
  attackVector: text("attack_vector"),
  sourceIp: text("source_ip"),
  sourceCountry: text("source_country"),
  threatActor: text("threat_actor"),
  incidentTimeline: jsonb("incident_timeline"),
  detectionDetails: jsonb("detection_details"),
  impactAssessment: jsonb("impact_assessment"),
  containmentActions: jsonb("containment_actions"),
  eradicationSteps: jsonb("eradication_steps"),
  recoveryPlan: jsonb("recovery_plan"),
  lessonsLearned: text("lessons_learned"),
  preventiveMeasures: jsonb("preventive_measures"),
  incidentCommander: uuid("incident_commander").references(() => admins.id),
  responseTeam: text("response_team").array(),
  externalParties: jsonb("external_parties"),
  regulatoryNotification: boolean("regulatory_notification").default(false).notNull(),
  userNotification: boolean("user_notification").default(false).notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  containedAt: timestamp("contained_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Content & Brand Management - Dynamic Content Management
export const dynamicContent = pgTable("dynamic_content", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contentType: text("content_type", { enum: ["BANNER", "POPUP", "CAROUSEL", "LANDING_PAGE", "EMAIL", "PUSH_NOTIFICATION", "IN_APP_MESSAGE"] }).notNull(),
  contentKey: text("content_key").unique().notNull(),
  title: text("title").notNull(),
  contentBody: text("content_body"),
  contentHtml: text("content_html"),
  contentJson: jsonb("content_json"),
  mediaUrls: text("media_urls").array(),
  ctaText: text("cta_text"),
  ctaUrl: text("cta_url"),
  targetingRules: jsonb("targeting_rules"),
  personalizationTags: text("personalization_tags").array(),
  displayConditions: jsonb("display_conditions"),
  priority: integer("priority").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  publishedAt: timestamp("published_at"),
  expiresAt: timestamp("expires_at"),
  abTestVariant: text("ab_test_variant"),
  impressionCount: integer("impression_count").default(0).notNull(),
  clickCount: integer("click_count").default(0).notNull(),
  conversionCount: integer("conversion_count").default(0).notNull(),
  createdBy: uuid("created_by").references(() => admins.id),
  lastModifiedBy: uuid("last_modified_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Content & Brand Management - Brand Asset Library
export const brandAssetLibrary = pgTable("brand_asset_library", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  assetType: text("asset_type", { enum: ["LOGO", "ICON", "IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "FONT", "COLOR_PALETTE", "TEMPLATE"] }).notNull(),
  assetCategory: text("asset_category", { enum: ["BRANDING", "MARKETING", "GAME_ASSETS", "UI_ELEMENTS", "SOCIAL_MEDIA", "EMAIL", "LEGAL"] }).notNull(),
  assetName: text("asset_name").notNull(),
  assetDescription: text("asset_description"),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  fileFormat: text("file_format").notNull(),
  fileDimensions: text("file_dimensions"),
  colorScheme: text("color_scheme").array(),
  tags: text("tags").array(),
  usageGuidelines: text("usage_guidelines"),
  licenseInfo: text("license_info"),
  isApproved: boolean("is_approved").default(false).notNull(),
  approvedBy: uuid("approved_by").references(() => admins.id),
  approvedAt: timestamp("approved_at"),
  version: text("version").default("1.0").notNull(),
  previousVersionId: uuid("previous_version_id"),
  downloadCount: integer("download_count").default(0).notNull(),
  lastDownloadedAt: timestamp("last_downloaded_at"),
  uploadedBy: uuid("uploaded_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Content & Brand Management - Multi-Language Management
export const multiLanguageContent = pgTable("multi_language_content", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contentKey: text("content_key").notNull(),
  languageCode: text("language_code").notNull(),
  countryCode: text("country_code"),
  locale: text("locale").notNull(),
  contentType: text("content_type", { enum: ["UI_TEXT", "EMAIL", "SMS", "PUSH", "PAGE_CONTENT", "GAME_TEXT", "LEGAL", "HELP_CENTER"] }).notNull(),
  originalText: text("original_text"),
  translatedText: text("translated_text").notNull(),
  translationStatus: text("translation_status", { enum: ["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "NEEDS_UPDATE"] }).default("DRAFT").notNull(),
  translationMethod: text("translation_method", { enum: ["MANUAL", "MACHINE", "HYBRID", "PROFESSIONAL_SERVICE"] }),
  translatorId: uuid("translator_id").references(() => admins.id),
  reviewerId: uuid("reviewer_id").references(() => admins.id),
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  contextNotes: text("context_notes"),
  glossaryTerms: jsonb("glossary_terms"),
  characterLimit: integer("character_limit"),
  isRtl: boolean("is_rtl").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueContentLanguage: unique().on(table.contentKey, table.languageCode),
}));

// Content & Brand Management - Promotional Content Scheduler
export const promotionalContentScheduler = pgTable("promotional_content_scheduler", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignName: text("campaign_name").notNull(),
  campaignType: text("campaign_type", { enum: ["BONUS", "TOURNAMENT", "GAME_LAUNCH", "SEASONAL", "VIP_EXCLUSIVE", "GENERAL_PROMO"] }).notNull(),
  contentId: uuid("content_id").references(() => dynamicContent.id),
  channels: text("channels", { enum: ["WEB", "EMAIL", "SMS", "PUSH", "IN_APP", "SOCIAL"] }).array().notNull(),
  targetAudience: jsonb("target_audience"),
  scheduledStartTime: timestamp("scheduled_start_time").notNull(),
  scheduledEndTime: timestamp("scheduled_end_time"),
  timezone: text("timezone").default("UTC").notNull(),
  recurringPattern: text("recurring_pattern", { enum: ["NONE", "DAILY", "WEEKLY", "MONTHLY", "CUSTOM"] }).default("NONE").notNull(),
  customSchedule: jsonb("custom_schedule"),
  priority: integer("priority").default(1).notNull(),
  status: text("status", { enum: ["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] }).default("DRAFT").notNull(),
  autoPublish: boolean("auto_publish").default(true).notNull(),
  autoUnpublish: boolean("auto_unpublish").default(true).notNull(),
  sentCount: integer("sent_count").default(0).notNull(),
  deliveredCount: integer("delivered_count").default(0).notNull(),
  openCount: integer("open_count").default(0).notNull(),
  clickCount: integer("click_count").default(0).notNull(),
  conversionCount: integer("conversion_count").default(0).notNull(),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  spentAmount: decimal("spent_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  createdBy: uuid("created_by").references(() => admins.id),
  lastModifiedBy: uuid("last_modified_by").references(() => admins.id),
  publishedAt: timestamp("published_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Platform Optimization & Performance - Performance Analytics
export const performanceAnalytics = pgTable("performance_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: text("metric_type", { enum: ["API_RESPONSE_TIME", "PAGE_LOAD_TIME", "DATABASE_QUERY", "CACHE_HIT_RATE", "ERROR_RATE", "THROUGHPUT", "LATENCY"] }).notNull(),
  endpoint: text("endpoint"),
  method: text("method", { enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] }),
  responseTime: decimal("response_time", { precision: 10, scale: 2 }).notNull(),
  statusCode: integer("status_code"),
  queryTime: decimal("query_time", { precision: 10, scale: 2 }),
  cacheHit: boolean("cache_hit"),
  region: text("region"),
  server: text("server"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  hourBucket: timestamp("hour_bucket").notNull(),
  dayBucket: date("day_bucket").notNull(),
  avgResponseTime: decimal("avg_response_time", { precision: 10, scale: 2 }),
  p50ResponseTime: decimal("p50_response_time", { precision: 10, scale: 2 }),
  p95ResponseTime: decimal("p95_response_time", { precision: 10, scale: 2 }),
  p99ResponseTime: decimal("p99_response_time", { precision: 10, scale: 2 }),
  requestCount: integer("request_count").default(1).notNull(),
  errorCount: integer("error_count").default(0).notNull(),
  slowQueryThreshold: decimal("slow_query_threshold", { precision: 10, scale: 2 }),
  isSlowQuery: boolean("is_slow_query").default(false).notNull(),
  bottleneckDetected: boolean("bottleneck_detected").default(false).notNull(),
  optimizationSuggestions: jsonb("optimization_suggestions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  hourBucketIdx: index("perf_hour_bucket_idx").on(table.hourBucket),
  dayBucketIdx: index("perf_day_bucket_idx").on(table.dayBucket),
  endpointIdx: index("perf_endpoint_idx").on(table.endpoint),
}));

// Platform Optimization & Performance - Database Optimization
export const databaseOptimization = pgTable("database_optimization", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  optimizationType: text("optimization_type", { enum: ["QUERY_OPTIMIZATION", "INDEX_RECOMMENDATION", "SCHEMA_ANALYSIS", "VACUUM_ANALYSIS", "STATISTICS_UPDATE", "PARTITION_RECOMMENDATION"] }).notNull(),
  tableName: text("table_name"),
  queryText: text("query_text"),
  executionPlan: jsonb("execution_plan"),
  executionTime: decimal("execution_time", { precision: 10, scale: 2 }),
  rowsAffected: integer("rows_affected"),
  indexSuggestions: jsonb("index_suggestions"),
  currentIndexes: jsonb("current_indexes"),
  tableSize: bigint("table_size", { mode: "number" }),
  indexSize: bigint("index_size", { mode: "number" }),
  bloatPercentage: decimal("bloat_percentage", { precision: 5, scale: 2 }),
  fragmentationLevel: text("fragmentation_level", { enum: ["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"] }),
  optimizationPriority: text("optimization_priority", { enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] }).default("MEDIUM").notNull(),
  estimatedImpact: text("estimated_impact", { enum: ["MINOR", "MODERATE", "SIGNIFICANT", "MAJOR"] }),
  recommendations: jsonb("recommendations"),
  implementationScript: text("implementation_script"),
  isImplemented: boolean("is_implemented").default(false).notNull(),
  implementedBy: uuid("implemented_by").references(() => admins.id),
  implementedAt: timestamp("implemented_at"),
  performanceBefore: jsonb("performance_before"),
  performanceAfter: jsonb("performance_after"),
  improvementPercentage: decimal("improvement_percentage", { precision: 5, scale: 2 }),
  rollbackScript: text("rollback_script"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Platform Optimization & Performance - CDN & Caching Management
export const cdnCachingManagement = pgTable("cdn_caching_management", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  resourceType: text("resource_type", { enum: ["STATIC_ASSET", "API_RESPONSE", "PAGE_CONTENT", "IMAGE", "VIDEO", "SCRIPT", "STYLESHEET"] }).notNull(),
  resourcePath: text("resource_path").notNull(),
  cdnProvider: text("cdn_provider", { enum: ["CLOUDFLARE", "AKAMAI", "FASTLY", "AWS_CLOUDFRONT", "CUSTOM"] }),
  cacheStrategy: text("cache_strategy", { enum: ["NO_CACHE", "PRIVATE", "PUBLIC", "IMMUTABLE", "MAX_AGE", "STALE_WHILE_REVALIDATE"] }).notNull(),
  cacheTtl: integer("cache_ttl"),
  cacheKey: text("cache_key"),
  hitCount: integer("hit_count").default(0).notNull(),
  missCount: integer("miss_count").default(0).notNull(),
  hitRate: decimal("hit_rate", { precision: 5, scale: 2 }),
  bandwidthSaved: bigint("bandwidth_saved", { mode: "number" }),
  avgResponseTime: decimal("avg_response_time", { precision: 10, scale: 2 }),
  region: text("region"),
  isCompressed: boolean("is_compressed").default(false).notNull(),
  compressionType: text("compression_type", { enum: ["GZIP", "BROTLI", "DEFLATE", "NONE"] }),
  compressionRatio: decimal("compression_ratio", { precision: 5, scale: 2 }),
  isPurged: boolean("is_purged").default(false).notNull(),
  lastPurgedAt: timestamp("last_purged_at"),
  purgeReason: text("purge_reason"),
  invalidationPattern: text("invalidation_pattern"),
  autoInvalidate: boolean("auto_invalidate").default(false).notNull(),
  invalidationRules: jsonb("invalidation_rules"),
  performanceMetrics: jsonb("performance_metrics"),
  costMetrics: jsonb("cost_metrics"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  resourcePathIdx: index("cdn_resource_path_idx").on(table.resourcePath),
  regionIdx: index("cdn_region_idx").on(table.region),
}));

// Platform Optimization & Performance - Load Balancer Configuration
export const loadBalancerConfig = pgTable("load_balancer_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  configName: text("config_name").unique().notNull(),
  balancerType: text("balancer_type", { enum: ["APPLICATION", "NETWORK", "GATEWAY", "CLASSIC"] }).notNull(),
  algorithm: text("algorithm", { enum: ["ROUND_ROBIN", "LEAST_CONNECTIONS", "IP_HASH", "WEIGHTED_ROUND_ROBIN", "LEAST_RESPONSE_TIME"] }).notNull(),
  targetServers: jsonb("target_servers").notNull(),
  healthCheckConfig: jsonb("health_check_config"),
  healthCheckInterval: integer("health_check_interval").default(30).notNull(),
  healthyThreshold: integer("healthy_threshold").default(3).notNull(),
  unhealthyThreshold: integer("unhealthy_threshold").default(2).notNull(),
  timeout: integer("timeout").default(5).notNull(),
  stickySession: boolean("sticky_session").default(false).notNull(),
  sessionAffinityType: text("session_affinity_type", { enum: ["NONE", "SOURCE_IP", "COOKIE", "HTTP_HEADER"] }),
  sslTermination: boolean("ssl_termination").default(false).notNull(),
  sslCertificates: jsonb("ssl_certificates"),
  connectionDraining: boolean("connection_draining").default(true).notNull(),
  drainingTimeout: integer("draining_timeout").default(300).notNull(),
  failoverConfig: jsonb("failover_config"),
  autoScalingEnabled: boolean("auto_scaling_enabled").default(false).notNull(),
  minInstances: integer("min_instances").default(2).notNull(),
  maxInstances: integer("max_instances").default(10).notNull(),
  scaleUpThreshold: decimal("scale_up_threshold", { precision: 5, scale: 2 }),
  scaleDownThreshold: decimal("scale_down_threshold", { precision: 5, scale: 2 }),
  activeConnections: integer("active_connections").default(0).notNull(),
  requestsPerSecond: decimal("requests_per_second", { precision: 10, scale: 2 }),
  avgResponseTime: decimal("avg_response_time", { precision: 10, scale: 2 }),
  errorRate: decimal("error_rate", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").default(true).notNull(),
  lastHealthCheckAt: timestamp("last_health_check_at"),
  createdBy: uuid("created_by").references(() => admins.id),
  lastModifiedBy: uuid("last_modified_by").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// PlayerPass1155 NFT Tables
// Wallets table - links user accounts to their wallet addresses
export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  chainId: integer("chain_id").notNull(), // Chain ID (e.g., 84532 for Base Sepolia)
  address: varchar("address", { length: 255 }).notNull(), // Wallet address
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userChainIdx: index("wallets_user_chain_idx").on(table.userId, table.chainId),
  addressIdx: index("wallets_address_idx").on(table.address),
}));

// NFT Mints table - tracks all mints with salt for replay protection
export const nftMints = pgTable("nft_mints", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  address: varchar("address", { length: 255 }).notNull(), // Recipient address
  tokenId: integer("token_id").notNull(), // Token ID (e.g., 1 for Player Pass)
  amount: integer("amount").notNull(), // Amount to mint
  salt: varchar("salt", { length: 255 }).notNull().unique(), // Unique salt for replay protection
  txHash: varchar("tx_hash", { length: 255 }), // Transaction hash after mint
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("nft_mints_user_idx").on(table.userId),
  saltIdx: index("nft_mints_salt_idx").on(table.salt),
  txHashIdx: index("nft_mints_tx_hash_idx").on(table.txHash),
}));

// NFT Rewards table - defines reward policies for NFT holders
export const nftRewards = pgTable("nft_rewards", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  externalPlayerId: text("external_player_id"), // Optional external player ID
  tokenId: integer("token_id").notNull(), // Token ID this reward applies to
  reason: text("reason").notNull(), // Reason for reward (e.g., "first_mint", "game_win")
  scReward: decimal("sc_reward", { precision: 10, scale: 2 }).default("0.00").notNull(), // SC reward amount
  gcReward: decimal("gc_reward", { precision: 10, scale: 2 }).default("0.00").notNull(), // GC reward amount
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenIdIdx: index("nft_rewards_token_id_idx").on(table.tokenId),
  reasonIdx: index("nft_rewards_reason_idx").on(table.reason),
}));

// NFT Inventory Table
export const nftInventory = pgTable("nft_inventory", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  walletAddress: varchar("wallet_address", { length: 255 }).notNull(),
  tokenId: integer("token_id").notNull(),
  balance: bigint("balance", { mode: "number" }).default(0).notNull(),
  chainId: integer("chain_id").notNull(),
  contractAddress: varchar("contract_address", { length: 255 }).notNull(),
  metadata: jsonb("metadata"), // NFT metadata (name, description, image, attributes)
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userWalletTokenIdx: index("nft_inventory_user_wallet_token_idx").on(table.userId, table.walletAddress, table.tokenId),
}));

// NFT Transactions Table
export const nftTransactions = pgTable("nft_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  walletAddress: varchar("wallet_address", { length: 255 }).notNull(),
  transactionHash: varchar("transaction_hash", { length: 255 }).notNull().unique(),
  transactionType: text("transaction_type", { enum: ["MINT", "TRANSFER", "BURN"] }).notNull(),
  tokenId: integer("token_id").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  fromAddress: varchar("from_address", { length: 255 }),
  toAddress: varchar("to_address", { length: 255 }),
  chainId: integer("chain_id").notNull(),
  contractAddress: varchar("contract_address", { length: 255 }).notNull(),
  status: text("status", { enum: ["PENDING", "CONFIRMED", "FAILED"] }).default("PENDING").notNull(),
  confirmations: integer("confirmations").default(0).notNull(),
  blockNumber: bigint("block_number", { mode: "number" }),
  metadata: jsonb("metadata"), // Additional transaction data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("nft_transactions_user_idx").on(table.userId),
  txHashIdx: index("nft_transactions_hash_idx").on(table.transactionHash),
}));

// Instant Withdrawal Schemas
export const insertInstantWithdrawalSettings = createInsertSchema(instantWithdrawalSettings).omit({
  id: true,
  updatedAt: true
});
export type InsertInstantWithdrawalSettings = z.infer<typeof insertInstantWithdrawalSettings>;
export type InstantWithdrawalSettings = typeof instantWithdrawalSettings.$inferSelect;

export const insertUserWithdrawalStats = createInsertSchema(userWithdrawalStats).omit({
  updatedAt: true
});
export type InsertUserWithdrawalStats = z.infer<typeof insertUserWithdrawalStats>;
export type UserWithdrawalStats = typeof userWithdrawalStats.$inferSelect;

// PlayerPass1155 NFT Schemas
export const insertWallet = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
});
export type InsertWallet = z.infer<typeof insertWallet>;
export type Wallet = typeof wallets.$inferSelect;

export const insertNFTMint = createInsertSchema(nftMints).omit({
  id: true,
  createdAt: true,
});
export type InsertNFTMint = z.infer<typeof insertNFTMint>;
export type NFTMint = typeof nftMints.$inferSelect;

export const insertNFTReward = createInsertSchema(nftRewards).omit({
  id: true,
  createdAt: true,
});
export type InsertNFTReward = z.infer<typeof insertNFTReward>;
export type NFTReward = typeof nftRewards.$inferSelect;

// NFT Schemas
export const insertNFTInventory = createInsertSchema(nftInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncedAt: true,
});
export type InsertNFTInventory = z.infer<typeof insertNFTInventory>;
export type NFTInventory = typeof nftInventory.$inferSelect;

export const insertNFTTransaction = createInsertSchema(nftTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNFTTransaction = z.infer<typeof insertNFTTransaction>;
export type NFTTransaction = typeof nftTransactions.$inferSelect;
