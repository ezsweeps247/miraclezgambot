import { db } from './db';
import { jackpotPools, jackpotContributions, jackpotWinners, transactions } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { randomUUID, randomInt, createHash } from 'crypto';
import { storage } from './storage';
import { broadcastJackpotUpdate, broadcastJackpotWin } from './jackpot-websocket';

interface JackpotContribution {
  poolId: string;
  amount: Decimal;
}

interface JackpotWinResult {
  won: boolean;
  tier?: string;
  amount?: Decimal;
  poolId?: string;
}

// Jackpot win probabilities (1 in X chance)
const JACKPOT_ODDS = {
  MINI: 10000,    // 1 in 10,000
  MINOR: 50000,   // 1 in 50,000
  MAJOR: 250000,  // 1 in 250,000
  MEGA: 1000000   // 1 in 1,000,000
};

// Minimum bet amounts to qualify for each tier
const MIN_BET_FOR_TIER = {
  MINI: 1,
  MINOR: 10,
  MAJOR: 50,
  MEGA: 100
};

// Tiered contribution percentages (more optimal distribution)
const CONTRIBUTION_PERCENTAGES = {
  MINI: 0.15,   // 0.15% to MINI
  MINOR: 0.20,  // 0.20% to MINOR
  MAJOR: 0.10,  // 0.10% to MAJOR
  MEGA: 0.05    // 0.05% to MEGA
};

// Bet multiplier cap for weighted odds (max 5x better chance)
const MAX_BET_MULTIPLIER = 5;

/**
 * Generate cryptographically secure random number for jackpot roll
 * Returns true if jackpot won based on provably fair RNG
 */
function rollForJackpot(odds: number, betMultiplier: number = 1): { won: boolean; rollValue: number; threshold: number } {
  // Apply bet multiplier to improve odds (capped at 5x)
  const effectiveMultiplier = Math.min(betMultiplier, MAX_BET_MULTIPLIER);
  const adjustedOdds = Math.floor(odds / effectiveMultiplier);
  
  // Use crypto.randomInt for provably fair randomness
  const rollValue = randomInt(0, adjustedOdds);
  const threshold = 0; // Win on exactly 0
  
  return {
    won: rollValue === threshold,
    rollValue,
    threshold
  };
}

/**
 * Process jackpot contributions for a bet
 */
export async function processJackpotContributions(
  userId: string,
  betAmount: Decimal,
  currency: 'GC' | 'SC',
  gameType: string,
  broadcast: (data: any) => void
): Promise<JackpotContribution[]> {
  const contributions: JackpotContribution[] = [];

  try {
    // Get all jackpot pools for the currency
    const pools = await db
      .select()
      .from(jackpotPools)
      .where(eq(jackpotPools.currency, currency));

    for (const pool of pools) {
      // Use tiered contribution percentage instead of pool's percentage
      const tierPercentage = CONTRIBUTION_PERCENTAGES[pool.tier as keyof typeof CONTRIBUTION_PERCENTAGES] || 0.5;
      const contributionPercent = new Decimal(tierPercentage).div(100);
      const contributionAmount = betAmount.mul(contributionPercent);

      if (contributionAmount.gt(0)) {
        // Update pool amount
        await db
          .update(jackpotPools)
          .set({
            currentAmount: sql`${jackpotPools.currentAmount} + ${contributionAmount.toString()}`,
            updatedAt: new Date()
          })
          .where(eq(jackpotPools.id, pool.id));

        // Record contribution
        await db.insert(jackpotContributions).values({
          jackpotPoolId: pool.id,
          userId,
          amount: contributionAmount.toString(),
          gameName: gameType
        });

        contributions.push({
          poolId: pool.id,
          amount: contributionAmount
        });

        // Broadcast updated jackpot amount
        await broadcastJackpotUpdate(pool.id, broadcast);
      }
    }
  } catch (error) {
    console.error('Error processing jackpot contributions:', error);
  }

  return contributions;
}

/**
 * Check if user wins a jackpot
 */
export async function checkJackpotWin(
  userId: string,
  betAmount: Decimal,
  currency: 'GC' | 'SC',
  gameType: string,
  broadcast: (data: any) => void
): Promise<JackpotWinResult> {
  try {
    // Get all pools for this currency
    const pools = await db
      .select()
      .from(jackpotPools)
      .where(eq(jackpotPools.currency, currency));

    // Check each tier from highest to lowest
    const tiers: Array<'MEGA' | 'MAJOR' | 'MINOR' | 'MINI'> = ['MEGA', 'MAJOR', 'MINOR', 'MINI'];
    
    for (const tier of tiers) {
      // Check if bet amount qualifies for this tier
      if (betAmount.lt(MIN_BET_FOR_TIER[tier])) {
        continue;
      }

      const pool = pools.find(p => p.tier === tier);
      if (!pool) continue;

      // Calculate bet multiplier for weighted odds
      const minBet = MIN_BET_FOR_TIER[tier];
      const betMultiplier = betAmount.toNumber() / minBet;

      // Roll for jackpot win using cryptographic RNG
      const roll = rollForJackpot(JACKPOT_ODDS[tier], betMultiplier);
      
      if (roll.won) {
        // JACKPOT WON!
        const winAmount = new Decimal(pool.currentAmount);

        // Get user for username
        const user = await storage.getUser(userId);
        if (!user) continue;

        // Record jackpot win with audit trail
        await db.insert(jackpotWinners).values({
          jackpotPoolId: pool.id,
          userId,
          amountWon: winAmount.toString(),
          gameName: gameType,
          currency,
          metadata: {
            rollValue: roll.rollValue,
            threshold: roll.threshold,
            baseOdds: JACKPOT_ODDS[tier],
            betAmount: betAmount.toString(),
            betMultiplier: betMultiplier.toFixed(2),
            effectiveOdds: Math.floor(JACKPOT_ODDS[tier] / Math.min(betMultiplier, MAX_BET_MULTIPLIER)),
            timestamp: new Date().toISOString()
          }
        });

        // Calculate new seed amount with progressive growth
        const currentSeed = new Decimal(pool.seedAmount);
        const growthRate = new Decimal(pool.seedGrowthRate || 0.02); // Default 2% growth
        const newSeedAmount = currentSeed.mul(new Decimal(1).plus(growthRate));

        await db
          .update(jackpotPools)
          .set({
            currentAmount: newSeedAmount.toString(),
            seedAmount: newSeedAmount.toString(), // Update seed for next win
            lastWonAt: new Date(),
            lastWinnerId: userId,
            lastWinAmount: winAmount.toString(),
            totalWinCount: pool.totalWinCount + 1,
            updatedAt: new Date()
          })
          .where(eq(jackpotPools.id, pool.id));

        // Credit user's balance via transaction
        await db.insert(transactions).values({
          userId,
          type: 'PAYOUT', // Using PAYOUT as JACKPOT_WIN not in enum
          amount: winAmount.toNumber(),
          meta: {
            tier,
            gameType,
            poolId: pool.id,
            jackpotWin: true,
            currency
          }
        });

        // Update user balance
        const currentBalance = await storage.getBalance(userId);
        if (currentBalance && currentBalance.currency === currency) {
          await storage.updateBalance(
            userId,
            currentBalance.available + winAmount.toNumber(),
            currentBalance.locked
          );
        }

        // Broadcast jackpot win
        broadcastJackpotWin(
          userId,
          user.username || user.firstName || 'Anonymous',
          tier,
          currency,
          winAmount.toString(),
          broadcast
        );

        // Broadcast updated pool amount
        await broadcastJackpotUpdate(pool.id, broadcast);

        return {
          won: true,
          tier,
          amount: winAmount,
          poolId: pool.id
        };
      }
    }
  } catch (error) {
    console.error('Error checking jackpot win:', error);
  }

  return { won: false };
}
