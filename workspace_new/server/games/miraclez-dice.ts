import crypto from 'crypto';
import { storage } from '../storage';
import { getGameRTP } from './rtp-helper';
import { updateBonusWagering } from '../bonus-integration';

interface DiceState {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

// Store active game states per user
const gameStates = new Map<string, DiceState>();

// Sum probabilities for dice
const SUM_COUNTS: { [key: number]: number } = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1
};

// All possible dice combinations
const DICE_PAIRS: [number, number, number][] = (() => {
  const pairs: [number, number, number][] = [];
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      pairs.push([a, b, a + b]);
    }
  }
  return pairs;
})();

function generateRandomHex(length: number): string {
  return crypto.randomBytes(length / 2).toString('hex');
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function hmacSha256(key: string, message: string): string {
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

function calculateWinCount(target: number, side: 'OVER' | 'UNDER'): number {
  let count = 0;
  for (let sum = 2; sum <= 12; sum++) {
    if (side === 'UNDER' && sum < target) count += SUM_COUNTS[sum];
    if (side === 'OVER' && sum > target) count += SUM_COUNTS[sum];
  }
  return count;
}

async function calculateMultiplier(target: number, side: 'OVER' | 'UNDER'): Promise<number> {
  const winCount = calculateWinCount(target, side);
  if (winCount === 0) return 0;
  
  const rtp = await getGameRTP('DICE') / 100; // Convert percentage to decimal
  const probability = winCount / 36;
  const multiplier = rtp / probability;
  return Math.max(1.01, Math.floor(multiplier * 100) / 100);
}

export function getOrCreateGameState(userId: string): DiceState {
  if (!gameStates.has(userId)) {
    const serverSeed = generateRandomHex(64);
    const state: DiceState = {
      serverSeed,
      serverSeedHash: sha256(serverSeed),
      clientSeed: generateRandomHex(16),
      nonce: 0
    };
    gameStates.set(userId, state);
  }
  return gameStates.get(userId)!;
}

export function getNextCommitment(userId: string) {
  const state = getOrCreateGameState(userId);
  return {
    serverSeedHash: state.serverSeedHash,
    clientSeed: state.clientSeed,
    nonce: state.nonce
  };
}

export async function rollDice(
  userId: string,
  betAmount: number,
  target: number,
  side: 'OVER' | 'UNDER',
  clientSeed: string,
  nonce: number,
  gameMode: 'real' | 'fun' = 'fun'
): Promise<{
  diceA: number;
  diceB: number;
  sum: number;
  won: boolean;
  payout: number;
  profit: number;
  serverSeed?: string;
  nextServerSeedHash: string;
}> {
  const state = getOrCreateGameState(userId);
  
  // Verify client seed and nonce match
  if (state.clientSeed !== clientSeed || state.nonce !== nonce) {
    throw new Error('Invalid client seed or nonce');
  }
  
  // Get or create active server seed for provably fair system
  let serverSeedRecord = await storage.getActiveServerSeed();
  if (!serverSeedRecord) {
    // Create a new server seed if none exists
    const newServerSeed = generateRandomHex(64);
    serverSeedRecord = await storage.createServerSeed({
      hash: sha256(newServerSeed),
      revealedSeed: null,
      active: true
    });
  }
  
  // Generate random number using HMAC
  const message = `${clientSeed}:${nonce}:0`;
  const hash = hmacSha256(state.serverSeed, message);
  const randomValue = parseInt(hash.slice(0, 8), 16) >>> 0;
  const pairIndex = randomValue % 36;
  const [diceA, diceB, sum] = DICE_PAIRS[pairIndex];
  
  // Determine win/loss
  const won = side === 'UNDER' ? sum < target : sum > target;
  const multiplier = await calculateMultiplier(target, side);
  
  // Work in cents for precision throughout
  const betInCents = Math.floor(betAmount * 100);
  const payoutInCents = won ? Math.floor(betInCents * multiplier) : 0;
  const profitInCents = payoutInCents - betInCents;
  
  // Update user balance
  const user = await storage.getUser(userId);
  if (!user) throw new Error('User not found');
  
  const balance = await storage.getBalance(userId);
  if (!balance) throw new Error('Balance not found');
  
  // Use user's balance mode preference instead of hardcoded game mode
  const userBalanceMode = user.balanceMode || 'GC';
  
  if (userBalanceMode === 'SC') {
    // SC Mode: Use Sweeps Cash
    const sweepsCashBalance = Number(balance.sweepsCashTotal) || 0;
    const sweepsCashBalanceInCents = Math.floor(sweepsCashBalance * 100);
    
    if (sweepsCashBalanceInCents < betInCents) {
      throw new Error('Insufficient sweeps cash balance');
    }
    
    // Update sweeps cash balance (convert cents to dollars for storage)
    // Deduct bet amount and add payout (net effect = profit, but shows the full transaction)
    const totalChange = (payoutInCents - betInCents) / 100; // Net change: payout - bet
    const redeemableChange = won ? (payoutInCents - betInCents) / 100 : -(betInCents / 100); // Redeemable change
    
    await storage.updateSweepsCashBalance(userId, { totalChange, redeemableChange });
  } else {
    // GC Mode: Use regular balance (Gold Coins)
    if (balance.available < betInCents) {
      throw new Error('Insufficient balance');
    }
    
    // Update regular balance
    const newAvailable = balance.available - betInCents + payoutInCents;
    await storage.updateBalance(userId, newAvailable, balance.locked);
  }
  
  // Record bet with server seed ID
  await storage.createBet({
    userId,
    game: 'miraclez-dice',
    amount: betInCents,
    potential_win: payoutInCents,
    result: won ? 'WIN' : 'LOSE',
    profit: profitInCents,
    nonce: state.nonce,
    serverSeedId: serverSeedRecord.id,
    gameMode: userBalanceMode === 'SC' ? 'real' : 'fun' // Map balance mode to gameMode for bet recording
  });
  
  // Update bonus wagering progress
  await updateBonusWagering(userId, betAmount);
  
  // Increment nonce
  state.nonce++;
  
  // Optionally rotate server seed (e.g., every 100 rolls)
  let nextServerSeedHash = state.serverSeedHash;
  if (state.nonce % 100 === 0) {
    const newServerSeed = generateRandomHex(64);
    const oldServerSeed = state.serverSeed;
    state.serverSeed = newServerSeed;
    state.serverSeedHash = sha256(newServerSeed);
    nextServerSeedHash = state.serverSeedHash;
    
    return {
      diceA,
      diceB,
      sum,
      won,
      payout: payoutInCents / 100, // Convert back to dollars for response
      profit: profitInCents / 100, // Convert back to dollars for response
      serverSeed: oldServerSeed, // Reveal old seed
      nextServerSeedHash
    };
  }
  
  return {
    diceA,
    diceB,
    sum,
    won,
    payout: payoutInCents / 100, // Convert back to dollars for response
    profit: profitInCents / 100, // Convert back to dollars for response
    nextServerSeedHash
  };
}

export async function riskRoll(
  userId: string,
  amount: number,
  selection: number[],
  clientSeed: string,
  nonce: number,
  gameMode: 'real' | 'fun' = 'fun'
): Promise<{
  die: number;
  won: boolean;
  payout: number;
  profit: number;
  nextServerSeedHash: string;
}> {
  if (selection.length !== 3) {
    throw new Error('Must select exactly 3 numbers');
  }
  
  const state = getOrCreateGameState(userId);
  
  // Verify client seed and nonce
  if (state.clientSeed !== clientSeed || state.nonce !== nonce) {
    throw new Error('Invalid client seed or nonce');
  }
  
  // Get or create active server seed for provably fair system
  let serverSeedRecord = await storage.getActiveServerSeed();
  if (!serverSeedRecord) {
    // Create a new server seed if none exists
    const newServerSeed = generateRandomHex(64);
    serverSeedRecord = await storage.createServerSeed({
      hash: sha256(newServerSeed),
      revealedSeed: null,
      active: true
    });
  }
  
  // Generate random die value (1-6)
  const message = `${clientSeed}:${nonce}:0`;
  const hash = hmacSha256(state.serverSeed, message);
  const randomValue = parseInt(hash.slice(0, 8), 16) >>> 0;
  const die = (randomValue % 6) + 1;
  
  // Check if player won (die value in selection)
  const won = selection.includes(die);
  const rtp = await getGameRTP('DICE') / 100; // Convert percentage to decimal
  const riskMultiplier = rtp * 2; // 1.92x
  
  // Work in cents for precision throughout
  const amountInCents = Math.floor(amount * 100);
  const payoutInCents = won ? Math.floor(amountInCents * riskMultiplier) : 0;
  const profitInCents = payoutInCents - amountInCents;
  
  // Update user balance
  const user = await storage.getUser(userId);
  if (!user) throw new Error('User not found');
  
  const balance = await storage.getBalance(userId);
  if (!balance) throw new Error('Balance not found');
  
  // Use user's balance mode preference instead of hardcoded game mode
  const userBalanceMode = user.balanceMode || 'GC';
  
  if (userBalanceMode === 'SC') {
    // SC Mode: Use Sweeps Cash (risking redeemable winnings only)
    const sweepsCashRedeemable = Number(balance.sweepsCashRedeemable) || 0;
    const sweepsCashRedeemableInCents = Math.floor(sweepsCashRedeemable * 100);
    
    if (sweepsCashRedeemableInCents < amountInCents) {
      throw new Error('Insufficient redeemable sweeps cash balance to risk');
    }
    
    // Update sweeps cash balance (convert cents to dollars for storage)
    const totalChange = (payoutInCents - amountInCents) / 100; // Net change: payout - bet
    const redeemableChange = (payoutInCents - amountInCents) / 100; // Net change to redeemable (win/lose the risked amount)
    
    await storage.updateSweepsCashBalance(userId, { totalChange, redeemableChange });
  } else {
    // GC Mode: Use regular balance (Gold Coins, risking winnings)
    if (balance.available < amountInCents) {
      throw new Error('Insufficient balance to risk');
    }
    
    // Update regular balance (risking existing balance)
    const newAvailable = balance.available - amountInCents + payoutInCents;
    await storage.updateBalance(userId, newAvailable, balance.locked);
  }
  
  // Record bet with server seed ID
  await storage.createBet({
    userId,
    game: 'miraclez-dice-risk',
    amount: amountInCents,
    potential_win: payoutInCents,
    result: won ? 'WIN' : 'LOSE',
    profit: profitInCents,
    nonce: state.nonce,
    serverSeedId: serverSeedRecord.id,
    gameMode: userBalanceMode === 'SC' ? 'real' : 'fun' // Map balance mode to gameMode for bet recording
  });
  
  // Increment nonce
  state.nonce++;
  
  return {
    die,
    won,
    payout: payoutInCents / 100, // Convert back to dollars for response
    profit: profitInCents / 100, // Convert back to dollars for response
    nextServerSeedHash: state.serverSeedHash
  };
}

export async function takeWinnings(userId: string, amount: number): Promise<void> {
  // This function is called when player wants to take their winnings
  // The balance has already been updated during the roll
  // This is just for tracking purposes
  
  const user = await storage.getUser(userId);
  if (!user) throw new Error('User not found');
  
  // Get or create active server seed
  let serverSeedRecord = await storage.getActiveServerSeed();
  if (!serverSeedRecord) {
    // Create a new server seed if none exists
    const newServerSeed = generateRandomHex(64);
    serverSeedRecord = await storage.createServerSeed({
      hash: sha256(newServerSeed),
      revealedSeed: null,
      active: true
    });
  }
  
  // Record the take action
  const amountInCents = Math.floor(amount * 100);
  await storage.createBet({
    userId,
    game: 'miraclez-dice-take',
    amount: 0,
    potential_win: amountInCents,
    result: 'WIN',
    profit: amountInCents,
    serverSeedId: serverSeedRecord.id
  });
}

export function rotateServerSeed(userId: string): { oldSeed: string; newHash: string } {
  const state = getOrCreateGameState(userId);
  
  const oldSeed = state.serverSeed;
  const newSeed = generateRandomHex(64);
  
  state.serverSeed = newSeed;
  state.serverSeedHash = sha256(newSeed);
  state.nonce = 0; // Reset nonce with new seed
  
  return {
    oldSeed,
    newHash: state.serverSeedHash
  };
}