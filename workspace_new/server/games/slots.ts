import { storage } from '../storage';
import { generateSlotReels } from './provably-fair';
import { updateBonusWagering } from '../bonus-integration';

export interface SlotsBetRequest {
  amount: number;
}

export interface SlotsBetResult {
  betId: string;
  reels: string[][];
  paylinesHit: number;
  payout: number;
  profit: number;
}

const SYMBOLS = ['🍒', '🍋', '⭐', '🔔', '💎'];
const SYMBOL_WEIGHTS = [30, 25, 20, 15, 10]; // Higher weight = more common

const PAYTABLE: Record<string, number[]> = {
  '💎': [0, 0, 50, 200, 1000],    // Diamond - highest
  '🔔': [0, 0, 25, 100, 500],     // Bell
  '⭐': [0, 0, 15, 50, 250],      // Star
  '🍋': [0, 0, 10, 25, 100],      // Lemon
  '🍒': [0, 0, 5, 15, 50],        // Cherry - lowest
};

function evaluatePaylines(reels: string[][]): { hits: number, multiplier: number } {
  let totalMultiplier = 0;
  let hits = 0;
  
  // Simple 5 horizontal paylines (top, middle, bottom rows)
  const paylines = [
    [0, 0, 0, 0, 0], // Top row
    [1, 1, 1, 1, 1], // Middle row
    [2, 2, 2, 2, 2], // Bottom row
  ];
  
  for (const line of paylines) {
    const symbols = line.map((row, reel) => reels[reel][row]);
    const multiplier = evaluateLine(symbols);
    if (multiplier > 0) {
      hits++;
      totalMultiplier += multiplier;
    }
  }
  
  return { hits, multiplier: totalMultiplier };
}

function evaluateLine(symbols: string[]): number {
  // Count consecutive matching symbols from left
  const firstSymbol = symbols[0];
  let count = 1;
  
  for (let i = 1; i < symbols.length; i++) {
    if (symbols[i] === firstSymbol) {
      count++;
    } else {
      break;
    }
  }
  
  if (count >= 3) {
    // Fix: Array is 0-indexed, so for 3 symbols we need index 2
    return PAYTABLE[firstSymbol]?.[count - 1] || 0;
  }
  
  return 0;
}

export async function playSlots(userId: string, request: SlotsBetRequest): Promise<SlotsBetResult> {
  const { amount } = request;
  
  // Validate input
  if (amount <= 0) throw new Error('Invalid bet amount');
  
  // Get user's balance mode preference
  const user = await storage.getUser(userId);
  if (!user) throw new Error('User not found');
  
  // Check balance based on user's preferred mode
  const balance = await storage.getBalance(userId);
  if (!balance) throw new Error('Balance not found');
  
  const userBalanceMode = user.balanceMode || 'GC';
  const amountInCents = amount * 100;
  
  if (userBalanceMode === 'SC') {
    // SC Mode: Check Sweeps Cash balance
    const sweepsCashBalance = Number(balance.sweepsCashTotal) || 0;
    const sweepsCashBalanceInCents = Math.floor(sweepsCashBalance * 100);
    
    if (sweepsCashBalanceInCents < amountInCents) {
      throw new Error('Insufficient sweeps cash balance');
    }
  } else {
    // GC Mode: Check regular balance
    if (balance.available < amountInCents) {
      throw new Error('Insufficient balance');
    }
  }
  
  // Get provably fair data
  const serverSeed = await storage.getActiveServerSeed();
  if (!serverSeed) throw new Error('No active server seed');
  
  let clientSeed = await storage.getUserClientSeed(userId);
  if (!clientSeed) {
    clientSeed = await storage.createClientSeed({
      userId,
      seed: Math.random().toString(36).substring(2)
    });
  }
  
  const nonce = await storage.getUserNonce(userId);
  
  // Generate reel results
  const reelNumbers = generateSlotReels(serverSeed.revealedSeed || '', clientSeed.seed, nonce);
  const reels = reelNumbers.map(reel => reel.map(num => SYMBOLS[num]));
  
  // Evaluate paylines - returns total multiplier
  const { hits, multiplier } = evaluatePaylines(reels);
  
  // Calculate actual payout: bet amount * multiplier
  const payout = amount * multiplier;
  const profit = payout - amount;
  
  // Update balance based on user's preferred mode
  const profitInCents = profit * 100;
  const payoutInCents = payout * 100;
  
  if (userBalanceMode === 'SC') {
    // SC Mode: Update Sweeps Cash balance
    const totalChange = (payoutInCents - amountInCents) / 100; // Net change: payout - bet
    const redeemableChange = profit > 0 ? (payoutInCents - amountInCents) / 100 : -(amountInCents / 100); // Redeemable change
    
    await storage.updateSweepsCashBalance(userId, { totalChange, redeemableChange });
  } else {
    // GC Mode: Update regular balance  
    const newAvailable = balance.available - amountInCents + payoutInCents;
    await storage.updateBalance(userId, newAvailable, balance.locked);
  }
  
  // Create bet record
  const bet = await storage.createBet({
    userId,
    game: 'SLOTS',
    amount: amountInCents,
    result: profit > 0 ? 'WIN' : 'LOSE',
    profit: profitInCents,
    nonce,
    serverSeedId: serverSeed.id,
    gameMode: userBalanceMode === 'SC' ? 'real' : 'fun' // Map balance mode to gameMode for bet recording
  });
  
  // Create slots-specific record
  await storage.createSlotSpin({
    betId: bet.id,
    reels: reelNumbers,
    paylinesHit: hits,
    payout: payout * 100
  });
  
  // Create transactions
  await storage.createTransaction({
    userId,
    type: 'BET',
    amount: -amount * 100,
    meta: { game: 'SLOTS', betId: bet.id }
  });
  
  if (payout > 0) {
    await storage.createTransaction({
      userId,
      type: 'PAYOUT',
      amount: payout * 100,
      meta: { game: 'SLOTS', betId: bet.id }
    });
  }

  // Update bonus wagering progress
  await updateBonusWagering(userId, amount);
  
  // Process affiliate commission if user has a referrer
  try {
    const { affiliateService } = await import('../affiliate/service');
    await affiliateService.processCommission(userId, bet, 'SLOTS_BET');
  } catch (error) {
    console.error('Error processing affiliate commission:', error);
    // Don't fail the bet if commission processing fails
  }
  
  return {
    betId: bet.id,
    reels,
    paylinesHit: hits,
    payout,
    profit
  };
}
