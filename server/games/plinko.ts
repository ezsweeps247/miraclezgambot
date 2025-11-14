import crypto from 'crypto';
import { db } from '../db';
import { users, balances, transactions } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getHouseEdge } from './rtp-helper';
import { storage } from '../storage';
import { updateBonusWagering } from '../bonus-integration';

interface PlinkoResult {
  path: number[];
  finalPosition: number;
  multiplier: number;
  payout: number;
  profit: number;
}

// Binomial coefficient
function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let res = 1;
  for (let i = 1; i <= k; i++) res = (res * (n - k + i)) / i;
  return res;
}

// Generate paytable based on rows and risk
async function generatePaytable(rows: number, risk: string): Promise<number[]> {
  // Preset paytables for exact visual match
  const PRESETS: Record<number, Record<string, number[]>> = {
    8: {
      low: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
      medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
      high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    },
    9: {
      low: [5.6, 2.0, 1.6, 1.0, 0.7, 0.7, 1.0, 1.6, 2.0, 5.6],
      medium: [18, 4, 1.7, 0.9, 0.5, 0.5, 0.9, 1.7, 4, 18],
      high: [43, 7, 2, 0.6, 0.2, 0.2, 0.6, 2, 7, 43],
    },
    10: {
      low: [8.9, 3, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3, 8.9],
      medium: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
      high: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
    },
    11: {
      low: [8.4, 3, 1.9, 1.3, 1.0, 0.7, 0.7, 1.0, 1.3, 1.9, 3, 8.4],
      medium: [24, 6, 3, 1.8, 1.0, 0.5, 0.5, 1.0, 1.8, 3, 6, 24],
      high: [120, 14, 5.2, 1.4, 0.4, 0.2, 0.2, 0.4, 1.4, 5.2, 14, 120],
    },
    12: {
      low: [10, 3, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3, 10],
      medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
      high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
    },
    13: {
      low: [8.1, 4, 3, 1.9, 1.2, 0.9, 0.7, 0.7, 0.9, 1.2, 1.9, 3, 4, 8.1],
      medium: [43, 13, 6, 3, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3, 6, 13, 43],
      high: [284, 41, 12, 4, 1.1, 0.2, 0.2, 0.2, 0.2, 1.1, 4, 12, 41, 284],
    },
    14: {
      low: [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1.0, 0.5, 1.0, 1.1, 1.3, 1.4, 1.9, 4, 7.1],
      medium: [58, 15, 7, 4, 1.9, 1.0, 0.5, 0.2, 0.5, 1.0, 1.9, 4, 7, 15, 58],
      high: [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 56, 420],
    },
    15: {
      low: [15, 8, 3, 2, 1.5, 1.1, 1.0, 0.7, 0.7, 1.0, 1.1, 1.5, 2, 3, 8, 15],
      medium: [88, 18, 11, 5, 3, 1.3, 0.5, 0.3, 0.3, 0.5, 1.3, 3, 5, 11, 18, 88],
      high: [620, 83, 27, 8, 3, 0.5, 0.2, 0.2, 0.2, 0.2, 0.5, 3, 8, 27, 83, 620],
    },
    16: {
      low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
      medium: [110, 41, 10, 5, 3, 1.5, 1.0, 0.3, 0.3, 0.3, 1.0, 1.5, 3, 5, 10, 41, 110],
      high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
    },
  };

  const preset = PRESETS[rows]?.[risk];
  if (preset && preset.length === rows + 1) return preset;

  // Fallback generation
  const lam = risk === "low" ? 0.28 : risk === "medium" ? 0.53 : 0.85;
  const weights: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const d = Math.abs(i - rows / 2);
    weights.push(Math.exp(lam * d));
  }
  const sumW = weights.reduce((a, b) => a + b, 0);
  const twoPow = Math.pow(2, rows);
  const houseEdge = await getHouseEdge('PLINKO') / 100; // Convert percentage to decimal
  const raw: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const p = binom(rows, i) / twoPow;
    raw.push((weights[i] / p) * ((1 - houseEdge) / sumW));
  }
  return raw;
}

// Generate deterministic path based on seed
function generatePath(seed: string, rows: number): number[] {
  const path: number[] = [];
  
  // Start from the center peg of the first row
  // First row has 3 pegs, so center is position 1
  let position = 1;
  path.push(position);
  
  // Generate path through remaining rows
  for (let row = 1; row < rows; row++) {
    const hash = crypto.createHash('sha256')
      .update(`${seed}-${row}`)
      .digest('hex');
    
    const byte = parseInt(hash.substr(0, 2), 16);
    const goRight = byte < 128; // 50/50 chance
    
    // In Plinko, when ball hits a peg, it goes either:
    // - Left: same position in next row
    // - Right: position + 1 in next row
    // This is because each row has one more peg than the previous
    
    if (goRight) {
      position = position + 1; // Go right
    } else {
      position = position; // Go left (same position)
    }
    
    // Ensure position is valid for this row
    // Row N has N+3 pegs, so positions are 0 to N+2
    const maxPosition = row + 2;
    position = Math.min(position, maxPosition);
    
    path.push(position);
  }
  
  // The final position determines which multiplier bucket it lands in
  return path;
}

export async function playPlinko(
  userId: string, 
  betAmount: number, 
  rows: number, 
  risk: string
): Promise<PlinkoResult> {
  // Validate inputs
  if (rows < 8 || rows > 16) {
    throw new Error('Invalid number of rows');
  }
  if (!['low', 'medium', 'high'].includes(risk)) {
    throw new Error('Invalid risk level');
  }
  
  const betInCents = Math.round(betAmount * 100);
  
  // Get user's balance mode preference
  const user = await storage.getUser(userId);
  if (!user) throw new Error('User not found');
  
  // Check balance based on user's preferred mode
  const balance = await storage.getBalance(userId);
  if (!balance) throw new Error('Balance not found');
  
  const userBalanceMode = user.balanceMode || 'GC';
  
  if (userBalanceMode === 'SC') {
    // SC Mode: Check Sweeps Cash balance
    const sweepsCashBalance = Number(balance.sweepsCashTotal) || 0;
    const sweepsCashBalanceInCents = Math.floor(sweepsCashBalance * 100);
    
    if (sweepsCashBalanceInCents < betInCents) {
      throw new Error('Insufficient sweeps cash balance');
    }
  } else {
    // GC Mode: Check regular balance
    if (balance.available < betInCents) {
      throw new Error('Insufficient balance');
    }
  }
  
  // Generate seed for this round
  const seed = crypto.randomBytes(32).toString('hex');
  
  // Generate path
  const path = generatePath(seed, rows);
  const finalPosition = path[path.length - 1]; // Final position is the last element
  
  // Get multiplier from paytable
  const paytable = await generatePaytable(rows, risk);
  const multiplier = paytable[finalPosition] || 0;
  
  // Calculate payout
  const payout = Math.round(betInCents * multiplier);
  const profit = payout - betInCents;
  
  // Update balance based on user's preferred mode
  if (userBalanceMode === 'SC') {
    // SC Mode: Update Sweeps Cash balance
    const totalChange = (payout - betInCents) / 100; // Net change: payout - bet
    const redeemableChange = profit > 0 ? (payout - betInCents) / 100 : -(betInCents / 100); // Redeemable change
    
    await storage.updateSweepsCashBalance(userId, { totalChange, redeemableChange });
  } else {
    // GC Mode: Update regular balance  
    const newAvailable = balance.available - betInCents + payout;
    await storage.updateBalance(userId, newAvailable, balance.locked);
  }
  
  // Create bet record using storage layer
  const nonce = Date.now() % 1000000;
  await storage.createBet({
    userId,
    game: 'PLINKO',
    amount: betInCents,
    potential_win: payout,
    result: profit > 0 ? 'WIN' : 'LOSE',
    profit: profit,
    nonce: nonce,
    serverSeedId: null,
    gameMode: userBalanceMode === 'SC' ? 'real' : 'fun'
  });
  
  // Update bonus wagering progress (only once)
  await updateBonusWagering(userId, betAmount);
  
  return {
    path,
    finalPosition,
    multiplier,
    payout: payout / 100,
    profit: profit / 100
  };
}