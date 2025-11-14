import { db } from '../db';
import crypto from 'crypto';
import { eq, desc, sql } from 'drizzle-orm';
import { users, transactions, limboGames, balances } from '@shared/schema';
import { randomUUID } from 'crypto';
import { getHouseEdge } from './rtp-helper';
import { storage } from '../storage';

// SHA256 hash function
function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// HMAC-SHA256 function
function hmacSHA256(key: string, message: string): string {
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

// Convert first 13 hex bytes to 52-bit integer for randomness
function hexToR(digest: string): number {
  const slice = digest.slice(0, 13 * 2); // First 13 bytes (26 hex chars)
  const n = parseInt(slice, 16);
  return (n + 1) / Math.pow(2, 52);
}

// Calculate limbo multiplier based on provably fair algorithm
export async function calculateLimboMultiplier(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): Promise<number> {
  const message = `${clientSeed}:${nonce}`;
  const digest = hmacSHA256(serverSeed, message);
  const r = hexToR(digest);
  
  // Calculate raw multiplier with dynamic house edge
  const houseEdge = await getHouseEdge('LIMBO') / 100; // Convert percentage to decimal
  const raw = (1 - houseEdge) / r;
  
  // Floor to 2 decimal places for fairness
  const hitMultiplier = Math.max(1.0, Math.floor(raw * 100) / 100);
  
  return hitMultiplier;
}

// Get current nonce for user
async function getUserNonce(userId: string): Promise<number> {
  const [lastGame] = await db
    .select()
    .from(limboGames)
    .where(eq(limboGames.userId, userId))
    .orderBy(desc(limboGames.createdAt))
    .limit(1);

  return lastGame ? lastGame.nonce + 1 : 0;
}

// Play limbo game
export async function playLimbo(
  userId: string,
  betAmount: number,
  targetMultiplier: number,
  clientSeedValue?: string
) {
  // Validate inputs
  if (betAmount <= 0) {
    throw new Error('Invalid bet amount');
  }

  if (targetMultiplier < 1.01 || targetMultiplier > 1000000) {
    throw new Error('Target multiplier must be between 1.01 and 1,000,000');
  }

  // Convert bet to cents for storage (balance is stored in cents)
  const betInCents = Math.round(betAmount * 100);

  // Start transaction
  return await db.transaction(async (tx) => {
    // Check balance
    const [user] = await tx.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('User not found');
    }

    const [userBalance] = await tx
      .select()
      .from(balances)
      .where(eq(balances.userId, userId));

    const userBalanceMode = user.balanceMode || 'GC';
    
    if (userBalanceMode === 'SC') {
      // SC Mode: Check Sweeps Cash balance
      const sweepsCashBalance = Number(userBalance?.sweepsCashTotal) || 0;
      const sweepsCashBalanceInCents = Math.floor(sweepsCashBalance * 100);
      
      if (sweepsCashBalanceInCents < betInCents) {
        throw new Error('Insufficient sweeps cash balance');
      }
    } else {
      // GC Mode: Check regular balance
      if (!userBalance || userBalance.available < betInCents) {
        throw new Error('Insufficient balance');
      }
    }

    // Generate seeds and nonce
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = sha256(serverSeed);
    const clientSeed = clientSeedValue || `limbo-${Date.now()}`;
    const nonce = await getUserNonce(userId);

    // Calculate result
    const hitMultiplier = await calculateLimboMultiplier(
      serverSeed,
      clientSeed,
      nonce
    );

    // Determine win/loss
    const win = hitMultiplier >= targetMultiplier;
    const profitInCents = win ? Math.round(betInCents * targetMultiplier - betInCents) : -betInCents;
    const payoutInCents = win ? Math.round(betInCents * targetMultiplier) : 0;

    // Deduct bet from balance based on mode
    if (userBalanceMode === 'SC') {
      // SC Mode: Update Sweeps Cash balance
      const totalChange = -(betInCents / 100); // Convert cents to dollars for deduction
      const redeemableChange = -(betInCents / 100); // Deduct from redeemable for bet
      
      await storage.updateSweepsCashBalance(userId, { totalChange, redeemableChange });
    } else {
      // GC Mode: Update regular balance
      await tx
        .update(balances)
        .set({
          available: sql`${balances.available} - ${betInCents}`
        })
        .where(eq(balances.userId, userId));
    }

    // Record limbo game
    const gameId = randomUUID();
    await tx
      .insert(limboGames)
      .values({
        id: gameId,
        userId,
        amount: betAmount.toString(),
        targetMultiplier: targetMultiplier.toFixed(2),
        hitMultiplier: hitMultiplier.toFixed(2),
        win,
        chance: Math.min(99 / targetMultiplier, 99).toFixed(2),
        payout: (payoutInCents / 100).toString(),
        profit: (profitInCents / 100).toString(),
        serverSeedHash,
        serverSeed,
        clientSeed,
        nonce
      });

    // Record transaction for bet
    await tx.insert(transactions).values({
      userId,
      type: 'BET',
      amount: betInCents,
      meta: { 
        gameType: 'limbo',
        gameId
      }
    });

    // Add winnings if won
    if (win && payoutInCents > 0) {
      if (userBalanceMode === 'SC') {
        // SC Mode: Add payout to Sweeps Cash balance
        const payoutChange = payoutInCents / 100; // Convert cents to dollars
        const redeemableChange = payoutInCents / 100; // Full payout is redeemable
        
        await storage.updateSweepsCashBalance(userId, { 
          totalChange: payoutChange, 
          redeemableChange 
        });
      } else {
        // GC Mode: Add payout to regular balance
        await tx
          .update(balances)
          .set({
            available: sql`${balances.available} + ${payoutInCents}`
          })
          .where(eq(balances.userId, userId));
      }

      await tx.insert(transactions).values({
        userId,
        type: 'PAYOUT',
        amount: payoutInCents,
        meta: { 
          gameType: 'limbo',
          gameId
        }
      });
    }

    // Get updated balance
    const [newBalance] = await tx
      .select()
      .from(balances)
      .where(eq(balances.userId, userId));
    
    // Record bet for live feed (outside of transaction to use storage method)
    await storage.createBet({
      userId,
      game: 'LIMBO',
      amount: betInCents,
      result: win ? 'WIN' : 'LOSE',
      profit: profitInCents,
      nonce: nonce,
      gameMode: userBalanceMode === 'SC' ? 'real' : 'fun' // Map balance mode to gameMode
    });

    return {
      betId: gameId,
      targetMultiplier,
      hitMultiplier,
      win,
      profit: profitInCents / 100, // Convert back to credits for display
      payout: payoutInCents / 100, // Convert back to credits for display
      chance: Math.min(99 / targetMultiplier, 99),
      serverSeedHash,
      clientSeed,
      nonce,
      balance: newBalance.available / 100 // Convert cents back to credits for display
    };
  });
}

// Get recent limbo bets
export async function getRecentLimboBets(userId?: string, limit: number = 20) {
  const query = db
    .select({
      id: limboGames.id,
      userId: limboGames.userId,
      username: users.username,
      amount: limboGames.amount,
      targetMultiplier: limboGames.targetMultiplier,
      hitMultiplier: limboGames.hitMultiplier,
      win: limboGames.win,
      profit: limboGames.profit,
      nonce: limboGames.nonce,
      createdAt: limboGames.createdAt
    })
    .from(limboGames)
    .leftJoin(users, sql`${limboGames.userId}::uuid = ${users.id}`)
    .orderBy(desc(limboGames.createdAt))
    .limit(limit);

  if (userId) {
    return query.where(eq(limboGames.userId, userId));
  }

  return query;
}

// Get current seed info
export async function getCurrentSeedInfo(userId: string) {
  const nonce = await getUserNonce(userId);
  const serverSeedHash = sha256(`limbo-server-${userId}-${Date.now()}`);
  
  return {
    serverSeedHash,
    nonce
  };
}