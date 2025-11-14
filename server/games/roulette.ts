import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  users,
  serverSeeds,
  transactions,
  rouletteSpins,
  balances,
  type RouletteSpinInsert
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { generateServerSeed } from './provably-fair';
import { authenticateJWT, type AuthenticatedRequest } from '../auth';

interface AuthRequest extends Request {
  user?: { userId: string };
}

const router = Router();

// Roulette number properties
const ROULETTE_NUMBERS = {
  0: { color: 'green', row: 0, column: 0, dozen: 0, half: 0, evenOdd: 'zero', redBlack: 'green' },
  1: { color: 'red', row: 1, column: 1, dozen: 1, half: 1, evenOdd: 'odd', redBlack: 'red' },
  2: { color: 'black', row: 2, column: 2, dozen: 1, half: 1, evenOdd: 'even', redBlack: 'black' },
  3: { color: 'red', row: 3, column: 3, dozen: 1, half: 1, evenOdd: 'odd', redBlack: 'red' },
  4: { color: 'black', row: 1, column: 1, dozen: 1, half: 1, evenOdd: 'even', redBlack: 'black' },
  5: { color: 'red', row: 2, column: 2, dozen: 1, half: 1, evenOdd: 'odd', redBlack: 'red' },
  6: { color: 'black', row: 3, column: 3, dozen: 1, half: 1, evenOdd: 'even', redBlack: 'black' },
  7: { color: 'red', row: 1, column: 1, dozen: 1, half: 1, evenOdd: 'odd', redBlack: 'red' },
  8: { color: 'black', row: 2, column: 2, dozen: 1, half: 1, evenOdd: 'even', redBlack: 'black' },
  9: { color: 'red', row: 3, column: 3, dozen: 1, half: 1, evenOdd: 'odd', redBlack: 'red' },
  10: { color: 'black', row: 1, column: 1, dozen: 1, half: 1, evenOdd: 'even', redBlack: 'black' },
  11: { color: 'black', row: 2, column: 2, dozen: 1, half: 1, evenOdd: 'odd', redBlack: 'black' },
  12: { color: 'red', row: 3, column: 3, dozen: 1, half: 1, evenOdd: 'even', redBlack: 'red' },
  13: { color: 'black', row: 1, column: 1, dozen: 2, half: 1, evenOdd: 'odd', redBlack: 'black' },
  14: { color: 'red', row: 2, column: 2, dozen: 2, half: 1, evenOdd: 'even', redBlack: 'red' },
  15: { color: 'black', row: 3, column: 3, dozen: 2, half: 1, evenOdd: 'odd', redBlack: 'black' },
  16: { color: 'red', row: 1, column: 1, dozen: 2, half: 1, evenOdd: 'even', redBlack: 'red' },
  17: { color: 'black', row: 2, column: 2, dozen: 2, half: 1, evenOdd: 'odd', redBlack: 'black' },
  18: { color: 'red', row: 3, column: 3, dozen: 2, half: 1, evenOdd: 'even', redBlack: 'red' },
  19: { color: 'red', row: 1, column: 1, dozen: 2, half: 2, evenOdd: 'odd', redBlack: 'red' },
  20: { color: 'black', row: 2, column: 2, dozen: 2, half: 2, evenOdd: 'even', redBlack: 'black' },
  21: { color: 'red', row: 3, column: 3, dozen: 2, half: 2, evenOdd: 'odd', redBlack: 'red' },
  22: { color: 'black', row: 1, column: 1, dozen: 2, half: 2, evenOdd: 'even', redBlack: 'black' },
  23: { color: 'red', row: 2, column: 2, dozen: 2, half: 2, evenOdd: 'odd', redBlack: 'red' },
  24: { color: 'black', row: 3, column: 3, dozen: 2, half: 2, evenOdd: 'even', redBlack: 'black' },
  25: { color: 'red', row: 1, column: 1, dozen: 3, half: 2, evenOdd: 'odd', redBlack: 'red' },
  26: { color: 'black', row: 2, column: 2, dozen: 3, half: 2, evenOdd: 'even', redBlack: 'black' },
  27: { color: 'red', row: 3, column: 3, dozen: 3, half: 2, evenOdd: 'odd', redBlack: 'red' },
  28: { color: 'black', row: 1, column: 1, dozen: 3, half: 2, evenOdd: 'even', redBlack: 'black' },
  29: { color: 'black', row: 2, column: 2, dozen: 3, half: 2, evenOdd: 'odd', redBlack: 'black' },
  30: { color: 'red', row: 3, column: 3, dozen: 3, half: 2, evenOdd: 'even', redBlack: 'red' },
  31: { color: 'black', row: 1, column: 1, dozen: 3, half: 2, evenOdd: 'odd', redBlack: 'black' },
  32: { color: 'red', row: 2, column: 2, dozen: 3, half: 2, evenOdd: 'even', redBlack: 'red' },
  33: { color: 'black', row: 3, column: 3, dozen: 3, half: 2, evenOdd: 'odd', redBlack: 'black' },
  34: { color: 'red', row: 1, column: 1, dozen: 3, half: 2, evenOdd: 'even', redBlack: 'red' },
  35: { color: 'black', row: 2, column: 2, dozen: 3, half: 2, evenOdd: 'odd', redBlack: 'black' },
  36: { color: 'red', row: 3, column: 3, dozen: 3, half: 2, evenOdd: 'even', redBlack: 'red' }
} as const;

// Bet types and their payouts
const BET_PAYOUTS = {
  straight: 35,     // Single number
  split: 17,        // Two numbers
  street: 11,       // Three numbers in a row
  corner: 8,        // Four numbers
  line: 5,          // Six numbers (two rows)
  column: 2,        // Column bet
  dozen: 2,         // Dozen bet
  color: 1,         // Red or Black
  even_odd: 1,      // Even or Odd
  high_low: 1,      // 1-18 or 19-36
};

interface Bet {
  type: string;
  value: any;       // The value depends on bet type
  amount: number;
}

function hmacSHA256(key: string, message: string): string {
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

function generateRouletteNumber(serverSeed: string, clientSeed: string, nonce: number): number {
  const hash = hmacSHA256(serverSeed, `${clientSeed}:${nonce}`);
  // Use first 8 hex chars to avoid overflow
  const slice = hash.slice(0, 8);
  const num = parseInt(slice, 16);
  return num % 37; // 0-36 for European roulette
}

function calculateWinnings(bets: Bet[], winningNumber: number): number {
  let totalWin = 0;
  const props = ROULETTE_NUMBERS[winningNumber as keyof typeof ROULETTE_NUMBERS];
  
  for (const bet of bets) {
    let won = false;
    let payout = 0;
    
    switch (bet.type) {
      case 'straight':
        // Single number bet
        won = bet.value === winningNumber;
        payout = BET_PAYOUTS.straight;
        break;
        
      case 'split':
        // Two adjacent numbers (e.g., "1-2" or "1-4")
        const splitNums = bet.value.split('-').map(Number);
        won = splitNums.includes(winningNumber);
        payout = BET_PAYOUTS.split;
        break;
        
      case 'street':
        // Three numbers in a row (e.g., "1-2-3")
        const streetNums = bet.value.split('-').map(Number);
        won = streetNums.includes(winningNumber);
        payout = BET_PAYOUTS.street;
        break;
        
      case 'corner':
        // Four numbers meeting at a corner (e.g., "1-2-4-5")
        const cornerNums = bet.value.split('-').map(Number);
        won = cornerNums.includes(winningNumber);
        payout = BET_PAYOUTS.corner;
        break;
        
      case 'line':
        // Six numbers across two rows (e.g., "1-2-3-4-5-6")
        const lineNums = bet.value.split('-').map(Number);
        won = lineNums.includes(winningNumber);
        payout = BET_PAYOUTS.line;
        break;
        
      case 'column':
        won = winningNumber > 0 && props.column === bet.value;
        payout = BET_PAYOUTS.column;
        break;
        
      case 'dozen':
        won = winningNumber > 0 && props.dozen === bet.value;
        payout = BET_PAYOUTS.dozen;
        break;
        
      case 'color':
        won = props.color === bet.value;
        payout = BET_PAYOUTS.color;
        break;
        
      case 'even_odd':
        if (bet.value === 'even') {
          won = winningNumber > 0 && winningNumber % 2 === 0;
        } else {
          won = winningNumber % 2 === 1;
        }
        payout = BET_PAYOUTS.even_odd;
        break;
        
      case 'high_low':
        if (bet.value === 'low') {
          won = winningNumber >= 1 && winningNumber <= 18;
        } else {
          won = winningNumber >= 19 && winningNumber <= 36;
        }
        payout = BET_PAYOUTS.high_low;
        break;
    }
    
    if (won) {
      totalWin += bet.amount * (payout + 1); // +1 for return of original bet
    }
  }
  
  return totalWin;
}

// Spin the roulette
router.post('/spin', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { bets, clientSeed } = req.body as { bets: Bet[], clientSeed: string };
  
  if (!bets || !Array.isArray(bets) || bets.length === 0) {
    return res.status(400).json({ error: 'Invalid bets' });
  }
  
  // Calculate total bet amount
  const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
  
  // Get user's balance mode preference
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }
  
  // Check balance based on user's preferred mode
  const [userBalance] = await db.select().from(balances).where(eq(balances.userId, userId));
  if (!userBalance) {
    return res.status(400).json({ error: 'Balance not found' });
  }
  
  const userBalanceMode = user.balanceMode || 'GC';
  const totalBetInCents = Math.round(totalBet * 100);
  
  if (userBalanceMode === 'SC') {
    // SC Mode: Check Sweeps Cash balance
    const sweepsCashBalance = Number(userBalance.sweepsCashTotal) || 0;
    const sweepsCashBalanceInCents = Math.floor(sweepsCashBalance * 100);
    
    if (sweepsCashBalanceInCents < totalBetInCents) {
      return res.status(400).json({ error: 'Insufficient sweeps cash balance' });
    }
  } else {
    // GC Mode: Check regular balance
    if (userBalance.available < totalBetInCents) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
  }
  
  try {
    // Get or create active seed
    let [activeSeed] = await db.select()
      .from(serverSeeds)
      .where(eq(serverSeeds.active, true))
      .limit(1);
    
    if (!activeSeed) {
      // Create a new active seed
      const newSeedValue = generateServerSeed();
      const seedHash = crypto.createHash('sha256').update(newSeedValue).digest('hex');
      const [createdSeed] = await db.insert(serverSeeds).values({
        hash: seedHash,
        revealedSeed: newSeedValue,
        active: true
      }).returning();
      activeSeed = createdSeed;
    }
    
    // Get nonce (number of spins with this seed)
    const [nonceResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rouletteSpins)
      .where(and(
        eq(rouletteSpins.userId, userId),
        eq(rouletteSpins.serverSeedHash, activeSeed.hash)
      ));
    const nonce = nonceResult?.count || 0;
    
    // Generate winning number
    const serverSeed = activeSeed.revealedSeed || crypto.randomBytes(32).toString('hex');
    const winningNumber = generateRouletteNumber(serverSeed, clientSeed, nonce);
    
    // Calculate winnings
    const totalWin = calculateWinnings(bets, winningNumber);
    const profit = totalWin - totalBet;
    const profitInCents = Math.round(profit * 100);
    const totalWinInCents = Math.round(totalWin * 100);
    
    // Update balance based on user's preferred mode
    let newBalance: number;
    if (userBalanceMode === 'SC') {
      // SC Mode: Update Sweeps Cash balance
      const { storage } = await import('../storage');
      
      // First, deduct the bet
      const totalChange = -totalBetInCents / 100; // Convert cents to dollars for deduction
      const redeemableChange = -totalBetInCents / 100; // Deduct from redeemable for bet
      await storage.updateSweepsCashBalance(userId, { totalChange, redeemableChange });
      
      // Then, add winnings if any
      if (totalWinInCents > 0) {
        const winningsChange = totalWinInCents / 100; // Convert cents to dollars
        const winningsRedeemableChange = totalWinInCents / 100; // Full winnings are redeemable
        await storage.updateSweepsCashBalance(userId, { 
          totalChange: winningsChange, 
          redeemableChange: winningsRedeemableChange 
        });
      }
      
      // Get updated balance for response (approximate)
      const updatedBalance = await db.select().from(balances).where(eq(balances.userId, userId));
      newBalance = updatedBalance[0]?.available || 0;
    } else {
      // GC Mode: Update regular balance
      newBalance = userBalance.available - totalBetInCents + totalWinInCents;
      await db.update(balances)
        .set({ available: newBalance })
        .where(eq(balances.userId, userId));
    }
    
    // Record the spin
    const spinData: RouletteSpinInsert = {
      userId,
      serverSeedHash: activeSeed.hash,
      clientSeed,
      nonce,
      bets: JSON.stringify(bets),
      result: winningNumber,
      betAmount: Math.round(totalBet * 100),
      payout: Math.round(totalWin * 100),
      profit: Math.round(profit * 100)
    };
    
    const [spin] = await db.insert(rouletteSpins)
      .values(spinData)
      .returning();
    
    // Record transactions
    // Always record the bet transaction
    await db.insert(transactions).values({
      userId,
      type: 'BET',
      amount: totalBetInCents,
      meta: {
        game: 'roulette',
        gameId: spin.id,
        winningNumber,
        bets
      }
    });
    
    // Record payout transaction if there are winnings
    if (totalWinInCents > 0) {
      await db.insert(transactions).values({
        userId,
        type: 'PAYOUT',
        amount: totalWinInCents,
        meta: {
          game: 'roulette',
          gameId: spin.id,
          winningNumber,
          bets,
          payout: totalWin
        }
      });
    }
    
    res.json({
      id: spin.id,
      winningNumber,
      winningColor: ROULETTE_NUMBERS[winningNumber as keyof typeof ROULETTE_NUMBERS].color,
      bets,
      totalBet,
      totalWin,
      profit,
      balance: newBalance / 100,
      serverSeedHash: activeSeed.hash,
      clientSeed,
      nonce
    });
  } catch (error: any) {
    console.error('Roulette spin error:', error);
    res.status(500).json({ error: 'Failed to process spin' });
  }
});

// Get spin history
router.get('/history', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  
  const spins = await db.select({
    id: rouletteSpins.id,
    result: rouletteSpins.result,
    betAmount: rouletteSpins.betAmount,
    payout: rouletteSpins.payout,
    profit: rouletteSpins.profit,
    serverSeedHash: rouletteSpins.serverSeedHash,
    clientSeed: rouletteSpins.clientSeed,
    nonce: rouletteSpins.nonce,
    createdAt: rouletteSpins.createdAt
  })
  .from(rouletteSpins)
  .where(eq(rouletteSpins.userId, userId))
  .orderBy(desc(rouletteSpins.createdAt))
  .limit(50);
  
  res.json(spins.map(spin => ({
    ...spin,
    betAmount: spin.betAmount / 100,
    payout: spin.payout / 100,
    profit: spin.profit / 100,
    color: ROULETTE_NUMBERS[spin.result as keyof typeof ROULETTE_NUMBERS].color
  })));
});

// Get recent winning numbers
router.get('/recent', async (req: Request, res: Response) => {
  const recentSpins = await db.select({
    result: rouletteSpins.result,
    createdAt: rouletteSpins.createdAt
  })
  .from(rouletteSpins)
  .orderBy(desc(rouletteSpins.createdAt))
  .limit(20);
  
  res.json(recentSpins.map(spin => ({
    number: spin.result,
    color: ROULETTE_NUMBERS[spin.result as keyof typeof ROULETTE_NUMBERS].color,
    time: spin.createdAt
  })));
});

export const rouletteRouter = router;