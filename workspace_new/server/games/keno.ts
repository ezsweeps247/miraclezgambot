import * as crypto from "crypto";
import { db } from "../db";
import { kenoGames, balances, transactions, users } from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";
import Decimal from "decimal.js";
import { getHouseEdge } from "./rtp-helper";
import { storage } from "../storage";

// Keno payout multipliers based on picks and hits
const KENO_PAYOUTS: Record<string, Record<number, Record<number, number>>> = {
  classic: {
    1: { 0: 0, 1: 3.96 },
    2: { 0: 0, 1: 1, 2: 9 },
    3: { 0: 0, 1: 0.45, 2: 2.5, 3: 25 },
    4: { 0: 0, 1: 0.25, 2: 1.5, 3: 5, 4: 80 },
    5: { 0: 0, 1: 0, 2: 0.6, 3: 3, 4: 20, 5: 150 },
    6: { 0: 0, 1: 0, 2: 0.4, 3: 1.6, 4: 12, 5: 50, 6: 500 },
    7: { 0: 0, 1: 0, 2: 0.4, 3: 1, 4: 4, 5: 20, 6: 100, 7: 1000 },
    8: { 0: 0, 1: 0, 2: 0, 3: 0.6, 4: 2, 5: 10, 6: 50, 7: 200, 8: 2000 },
    9: { 0: 0, 1: 0, 2: 0, 3: 0.3, 4: 1, 5: 6, 6: 25, 7: 100, 8: 500, 9: 4000 },
    10: { 0: 0, 1: 0, 2: 0, 3: 0.3, 4: 0.6, 5: 3, 6: 12, 7: 50, 8: 250, 9: 1500, 10: 10000 },
  },
  low: {
    1: { 0: 0, 1: 3.96 },
    2: { 0: 0, 1: 1.5, 2: 5.5 },
    3: { 0: 0, 1: 0.8, 2: 2, 3: 12 },
    4: { 0: 0, 1: 0.5, 2: 1.5, 3: 3.5, 4: 35 },
    5: { 0: 0, 1: 0.3, 2: 0.8, 3: 2.5, 4: 12, 5: 70 },
    6: { 0: 0, 1: 0.2, 2: 0.5, 3: 1.5, 4: 8, 5: 30, 6: 200 },
    7: { 0: 0, 1: 0.2, 2: 0.5, 3: 1, 4: 3, 5: 15, 6: 60, 7: 400 },
    8: { 0: 0, 1: 0, 2: 0.3, 3: 0.8, 4: 2, 5: 8, 6: 35, 7: 120, 8: 800 },
    9: { 0: 0, 1: 0, 2: 0.2, 3: 0.5, 4: 1.2, 5: 5, 6: 20, 7: 70, 8: 300, 9: 1600 },
    10: { 0: 0, 1: 0, 2: 0.2, 3: 0.4, 4: 0.8, 5: 3, 6: 10, 7: 40, 8: 150, 9: 900, 10: 3200 },
  },
  medium: {
    1: { 0: 0, 1: 3.96 },
    2: { 0: 0, 1: 0.8, 2: 11 },
    3: { 0: 0, 1: 0.3, 2: 3, 3: 38 },
    4: { 0: 0, 1: 0.2, 2: 2, 3: 8, 4: 120 },
    5: { 0: 0, 1: 0, 2: 0.5, 3: 4, 4: 30, 5: 250 },
    6: { 0: 0, 1: 0, 2: 0.3, 3: 2, 4: 18, 5: 80, 6: 800 },
    7: { 0: 0, 1: 0, 2: 0.3, 3: 1.2, 4: 6, 5: 35, 6: 180, 7: 1600 },
    8: { 0: 0, 1: 0, 2: 0, 3: 0.5, 4: 3, 5: 15, 6: 80, 7: 400, 8: 3200 },
    9: { 0: 0, 1: 0, 2: 0, 3: 0.2, 4: 1.5, 5: 8, 6: 40, 7: 180, 8: 900, 9: 6400 },
    10: { 0: 0, 1: 0, 2: 0, 3: 0.2, 4: 0.5, 5: 4, 6: 20, 7: 90, 8: 450, 9: 2500, 10: 15000 },
  },
  high: {
    1: { 0: 0, 1: 3.96 },
    2: { 0: 0, 1: 0.5, 2: 18 },
    3: { 0: 0, 1: 0.2, 2: 3.5, 3: 75 },
    4: { 0: 0, 1: 0, 2: 2, 3: 15, 4: 300 },
    5: { 0: 0, 1: 0, 2: 0.3, 3: 5, 4: 55, 5: 600 },
    6: { 0: 0, 1: 0, 2: 0.2, 3: 2.5, 4: 30, 5: 180, 6: 1800 },
    7: { 0: 0, 1: 0, 2: 0.2, 3: 1.5, 4: 10, 5: 70, 6: 400, 7: 3600 },
    8: { 0: 0, 1: 0, 2: 0, 3: 0.3, 4: 5, 5: 30, 6: 180, 7: 900, 8: 7200 },
    9: { 0: 0, 1: 0, 2: 0, 3: 0.2, 4: 2, 5: 15, 6: 90, 7: 400, 8: 2000, 9: 14400 },
    10: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0.3, 5: 8, 6: 40, 7: 200, 8: 1000, 9: 5000, 10: 30000 },
  },
};

// House edge will be fetched dynamically from database

// Store user commitments in memory (in production, use Redis)
const userCommitments = new Map<string, {
  serverSeed: Buffer;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}>();

// Generate random numbers using provably fair algorithm
function generateKenoNumbers(
  serverSeed: Buffer,
  clientSeed: string,
  nonce: number,
  count: number = 10
): number[] {
  const numbers: number[] = [];
  let counter = 0;
  
  while (numbers.length < count) {
    const hmac = crypto.createHmac("sha512", serverSeed);
    hmac.update(`${clientSeed}:${nonce}:${counter}`);
    const hash = hmac.digest("hex");
    
    // Use 5 characters at a time to generate numbers (reduces bias)
    for (let i = 0; i < hash.length - 4 && numbers.length < count; i += 5) {
      const hex = hash.substr(i, 5);
      const num = parseInt(hex, 16);
      const normalized = (num % 40) + 1; // 1-40 range
      
      if (!numbers.includes(normalized)) {
        numbers.push(normalized);
      }
    }
    counter++;
  }
  
  return numbers.sort((a, b) => a - b);
}

// Get or create user nonce
async function getUserNonce(userId: string): Promise<number> {
  // Handle anonymous users
  if (!userId || userId === 'anonymous' || userId.startsWith('sess:')) {
    return 0;
  }
  
  const lastGame = await db.select({ nonce: kenoGames.nonce })
    .from(kenoGames)
    .where(eq(kenoGames.userId, userId))
    .orderBy(desc(kenoGames.played_at))
    .limit(1);
  
  return lastGame.length > 0 ? (lastGame[0].nonce || 0) + 1 : 0;
}

// Generate next commitment
export async function generateNextCommitment(userId: string) {
  const serverSeed = crypto.randomBytes(32);
  const serverSeedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");
  const clientSeed = crypto.randomBytes(16).toString("hex");
  const nonce = await getUserNonce(userId);
  
  const commitment = {
    serverSeed,
    serverSeedHash,
    clientSeed,
    nonce
  };
  
  userCommitments.set(userId, commitment);
  
  return {
    serverSeedHash,
    clientSeed,
    nonce
  };
}

// Play Keno
export async function playKeno(
  userId: string,
  betAmount: string,
  picks: number[],
  risk: "classic" | "low" | "medium" | "high",
  clientSeedParam?: string,
  nonceParam?: number
) {
  const bet = new Decimal(betAmount);
  
  // Validate bet amount
  if (bet.lte(0)) {
    throw new Error("Bet amount must be positive");
  }
  
  // Validate picks
  if (picks.length < 1 || picks.length > 10) {
    throw new Error("Must pick between 1 and 10 numbers");
  }
  
  // Validate all picks are between 1 and 40
  if (!picks.every(n => n >= 1 && n <= 40)) {
    throw new Error("All picks must be between 1 and 40");
  }
  
  // Check for duplicates
  if (new Set(picks).size !== picks.length) {
    throw new Error("Duplicate picks not allowed");
  }
  
  // Get commitment
  const commitment = userCommitments.get(userId);
  if (!commitment) {
    throw new Error("No active commitment. Please call /api/keno/next first");
  }
  
  const clientSeed = clientSeedParam || commitment.clientSeed;
  const nonce = nonceParam !== undefined ? nonceParam : commitment.nonce;
  
  // Validate nonce
  if (nonce !== commitment.nonce) {
    throw new Error("Invalid nonce. Expected: " + commitment.nonce);
  }
  
  // Check if this is an anonymous user
  const isAnonymous = !userId || userId === 'anonymous' || userId.startsWith('sess:');
  
  // Only check balance for authenticated users
  if (!isAnonymous) {
    // Get user's balance mode preference
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('User not found');
    }
    
    const [userBalance] = await db
      .select()
      .from(balances)
      .where(eq(balances.userId, userId));
      
    // Convert bet to cents for comparison (balance is stored in cents)
    const betInCents = Math.floor(bet.mul(100).toNumber());
    const userBalanceMode = user.balanceMode || 'GC';
    
    if (userBalanceMode === 'SC') {
      // SC Mode: Check Sweeps Cash balance
      const sweepsCashBalance = Number(userBalance?.sweepsCashTotal) || 0;
      const sweepsCashBalanceInCents = Math.floor(sweepsCashBalance * 100);
      
      if (sweepsCashBalanceInCents < betInCents) {
        throw new Error("Insufficient sweeps cash balance");
      }
    } else {
      // GC Mode: Check regular balance
      if (!userBalance || userBalance.available < betInCents) {
        throw new Error("Insufficient balance");
      }
    }
  }
  
  // Generate drawn numbers
  const drawnNumbers = generateKenoNumbers(commitment.serverSeed, clientSeed, nonce, 10);
  
  // Calculate hits
  const hits = picks.filter(p => drawnNumbers.includes(p)).length;
  
  // Get multiplier from payout table
  const payoutTable = KENO_PAYOUTS[risk];
  const multiplierRaw = payoutTable[picks.length]?.[hits] || 0;
  const houseEdge = await getHouseEdge('KENO') / 100; // Convert percentage to decimal
  const multiplier = new Decimal(multiplierRaw).mul(1 - houseEdge);
  const payout = bet.mul(multiplier);
  const profit = payout.sub(bet);
  
  // Only process database transactions for authenticated users
  if (!isAnonymous) {
    try {
      // Deduct bet (convert to cents/integer)
      const betInCents = Math.floor(bet.mul(100).toNumber());
      
      await db.transaction(async (tx) => {
        // Get user and balance info
        const [user] = await tx.select().from(users).where(eq(users.id, userId));
        const [currentBalance] = await tx
          .select()
          .from(balances)
          .where(eq(balances.userId, userId));
        
        if (!currentBalance || !user) {
          throw new Error("Balance or user not found");
        }
        
        const userBalanceMode = user.balanceMode || 'GC';
        
        if (userBalanceMode === 'SC') {
          // SC Mode: Update Sweeps Cash balance
          const totalChange = -(betInCents / 100); // Convert cents to dollars for deduction
          const redeemableChange = -(betInCents / 100); // Deduct from redeemable for bet
          
          await storage.updateSweepsCashBalance(userId, { totalChange, redeemableChange });
        } else {
          // GC Mode: Update regular balance
          const newAvailable = currentBalance.available - betInCents;
          
          if (newAvailable < 0) {
            throw new Error("Insufficient balance");
          }
          
          // Update balance with new value
          await tx
            .update(balances)
            .set({
              available: newAvailable
            })
            .where(eq(balances.userId, userId));
        }
        
        // Log bet transaction
        await tx.insert(transactions).values({
          userId,
          type: "BET",
          amount: -betInCents,
          meta: { game: "keno", picks: picks.length }
        });
        
        // Create game record
        await tx
          .insert(kenoGames)
          .values({
            userId,
            bet_amount: bet.toString(),
            picks,
            drawnNumbers,
            hits,
            risk,
            multiplier: multiplier.toString(),
            payout: payout.toString(),
            profit: profit.toString(),
            serverSeedHash: commitment.serverSeedHash,
            serverSeed: commitment.serverSeed.toString("hex"),
            clientSeed,
            nonce
          });
        
        // Add payout if won
        let payoutInCents = 0;
        if (payout.gt(0)) {
          payoutInCents = Math.floor(payout.mul(100).toNumber());
          
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
            const finalBalance = (currentBalance.available - betInCents) + payoutInCents;
            
            await tx
              .update(balances)
              .set({
                available: finalBalance
              })
              .where(eq(balances.userId, userId));
          }
            
          // Log payout transaction
          await tx.insert(transactions).values({
            userId,
            type: "PAYOUT",
            amount: payoutInCents,
            meta: { 
              game: "keno", 
              hits, 
              picks: picks.length,
              multiplier: multiplier.toString() 
            }
          });
        }
        
        console.log(`Keno bet processed - User: ${userId}, Bet: ${bet.toString()} credits (${betInCents} cents), Hits: ${hits}, Payout: ${payout.toString()} credits, Previous balance: ${currentBalance.available} cents, Balance mode: ${userBalanceMode}`);
      });
      
      // Record bet for live feed
      const betAmountInCents = Math.floor(bet.mul(100).toNumber());
      const profitInCents = Math.floor(profit.mul(100).toNumber());
      // Get user balance mode for bet record
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const userBalanceMode = user?.balanceMode || 'GC';
      
      await storage.createBet({
        userId,
        game: 'KENO',
        amount: betAmountInCents,
        result: profitInCents > 0 ? 'WIN' : 'LOSE',
        profit: profitInCents,
        nonce: nonce,
        serverSeedId: null,
        potential_win: Math.floor(payout.mul(100).toNumber()),
        gameMode: userBalanceMode === 'SC' ? 'real' : 'fun' // Map balance mode to gameMode
      });
    } catch (error) {
      console.error("Keno transaction error:", error);
      throw error;
    }
  }
  
  // Generate next commitment
  const nextCommitment = await generateNextCommitment(userId);
  
  return {
    roundId: crypto.randomUUID(),
    betAmount: bet.toString(),
    picks,
    drawnNumbers,
    hits,
    risk,
    multiplier: multiplier.toString(),
    payout: payout.toString(),
    profit: profit.toString(),
    serverSeedHash: commitment.serverSeedHash,
    serverSeed: commitment.serverSeed.toString("hex"),
    clientSeed,
    nonce,
    nextServerSeedHash: nextCommitment.serverSeedHash
  };
}

// Verify a past keno round
export async function verifyKeno(
  serverSeedHash: string,
  serverSeed: string,
  clientSeed: string,
  nonce: number
) {
  // Verify hash
  const seedBuffer = Buffer.from(serverSeed, "hex");
  const computedHash = crypto.createHash("sha256").update(seedBuffer).digest("hex");
  const validHash = computedHash === serverSeedHash;
  
  // Generate numbers
  const drawnNumbers = generateKenoNumbers(seedBuffer, clientSeed, nonce, 10);
  
  return {
    validHash,
    drawnNumbers
  };
}