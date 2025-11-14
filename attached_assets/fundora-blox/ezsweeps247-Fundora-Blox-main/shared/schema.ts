import { pgTable, text, serial, integer, boolean, timestamp, json, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const highScores = pgTable("high_scores", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  score: integer("score").notNull(),
  blocksStacked: integer("blocks_stacked").notNull(),
  highestRow: integer("highest_row").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHighScoreSchema = createInsertSchema(highScores).pick({
  playerName: true,
  score: true,
  blocksStacked: true,
  highestRow: true,
});

export type InsertHighScore = z.infer<typeof insertHighScoreSchema>;
export type HighScore = typeof highScores.$inferSelect;

// API Keys for external platform integration
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  name: true,
  webhookUrl: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// Game sessions for tracking individual games
export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  apiKeyId: integer("api_key_id").references(() => apiKeys.id),
  externalPlayerId: text("external_player_id"),
  playerName: text("player_name"),
  initialCredits: decimal("initial_credits", { precision: 10, scale: 2 }).notNull(),
  stake: text("stake").notNull(),
  score: integer("score"),
  prize: decimal("prize", { precision: 10, scale: 2 }),
  prizeType: text("prize_type"),
  blocksStacked: integer("blocks_stacked"),
  highestRow: integer("highest_row"),
  status: text("status").notNull().default('active'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).pick({
  externalPlayerId: true,
  playerName: true,
  initialCredits: true,
  stake: true,
});

export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameSession = typeof gameSessions.$inferSelect;

// Game history for real-time feed display
export const gameHistory = pgTable("game_history", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull().default('Anonymous'),
  score: integer("score").notNull(),
  stake: text("stake").notNull(),
  prize: decimal("prize", { precision: 10, scale: 2 }),
  prizeType: text("prize_type"),
  blocksStacked: integer("blocks_stacked").notNull(),
  highestRow: integer("highest_row").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGameHistorySchema = createInsertSchema(gameHistory).pick({
  playerName: true,
  score: true,
  stake: true,
  prize: true,
  prizeType: true,
  blocksStacked: true,
  highestRow: true,
});

export type InsertGameHistory = z.infer<typeof insertGameHistorySchema>;
export type GameHistory = typeof gameHistory.$inferSelect;

// Player credits for credit management
export const playerCredits = pgTable("player_credits", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("api_key_id").references(() => apiKeys.id).notNull(),
  externalPlayerId: text("external_player_id").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Credit transactions for audit trail
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  playerCreditId: integer("player_credit_id").references(() => playerCredits.id).notNull(),
  type: text("type").notNull(), // 'load', 'redeem', 'stake', 'prize'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  reference: text("reference"), // session token or external reference
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlayerCreditSchema = createInsertSchema(playerCredits).pick({
  apiKeyId: true,
  externalPlayerId: true,
  balance: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).pick({
  playerCreditId: true,
  type: true,
  amount: true,
  balanceBefore: true,
  balanceAfter: true,
  reference: true,
  metadata: true,
});

export type InsertPlayerCredit = z.infer<typeof insertPlayerCreditSchema>;
export type PlayerCredit = typeof playerCredits.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
