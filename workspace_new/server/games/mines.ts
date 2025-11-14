import { createHash, createHmac, randomBytes } from 'crypto';
import Decimal from 'decimal.js';
import { getHouseEdge } from './rtp-helper';

// Configuration
const MIN_MINES = 3;
const MAX_MINES = 24;
const TOTAL_TILES = 25;
const MIN_BET = 1;
const MAX_BET = 10000;

// Types
export interface MinesRound {
  id: string;
  userId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  mines: number;
  minePositions: Set<number>;
  openedTiles: Set<number>;
  betAmount: Decimal;
  state: 'active' | 'won' | 'lost';
  currentMultiplier: number;
  picks: number;
  startedAt: Date;
  endedAt?: Date;
}

// In-memory storage (will be replaced with database later)
export const activeRounds = new Map<string, MinesRound>();
const userNonces = new Map<string, number>();

// Helper functions
function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

// Fisher-Yates shuffle with deterministic RNG from HMAC
function deterministicShuffle(array: number[], seed: Buffer): number[] {
  const shuffled = [...array];
  let seedOffset = 0;
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Get more entropy if needed
    if (seedOffset >= seed.length) {
      seed = hmacSha256(seed.toString('hex'), `:${Math.floor(seedOffset / 32)}`);
      seedOffset = 0;
    }
    
    // Use 4 bytes for random number
    const randomBytes = seed.readUInt32BE(seedOffset % (seed.length - 3));
    seedOffset += 4;
    
    const j = randomBytes % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Generate mine positions
export function generateMinePositions(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  mineCount: number
): Set<number> {
  const seedData = `${clientSeed}:${nonce}`;
  const hmacSeed = hmacSha256(serverSeed, seedData);
  
  // Create array of tile indices [0..24]
  const tiles = Array.from({ length: TOTAL_TILES }, (_, i) => i);
  
  // Shuffle deterministically
  const shuffled = deterministicShuffle(tiles, hmacSeed);
  
  // First N positions are mines
  return new Set(shuffled.slice(0, mineCount));
}

// Calculate multiplier for k safe picks with N mines
export async function calculateMultiplier(picks: number, mines: number): Promise<number> {
  if (picks === 0) return 0;
  
  const T = TOTAL_TILES;
  const N = mines;
  const k = picks;
  
  // Calculate fair multiplier using product form to avoid overflow
  // M_fair(k) = C(T, k) / C(T - N, k) = Π_{i=0}^{k-1} (T - i) / (T - N - i)
  let multiplier = new Decimal(1);
  
  for (let i = 0; i < k; i++) {
    multiplier = multiplier.mul(T - i).div(T - N - i);
  }
  
  // Apply house edge
  const houseEdge = await getHouseEdge('MINES') / 100; // Convert percentage to decimal
  multiplier = multiplier.mul(1 - houseEdge);
  
  return parseFloat(multiplier.toFixed(6));
}

// Generate multiplier table for all possible picks
export async function generateMultiplierTable(mines: number): Promise<number[]> {
  const maxPicks = TOTAL_TILES - mines;
  const table: number[] = [];
  
  for (let k = 1; k <= maxPicks; k++) {
    table.push(await calculateMultiplier(k, mines));
  }
  
  return table;
}

// Get and increment user nonce
function getUserNonce(userId: string): number {
  const current = userNonces.get(userId) || 0;
  const next = current + 1;
  userNonces.set(userId, next);
  return next;
}

// Start a new round
export async function startRound(
  userId: string,
  betAmount: string,
  mines: number,
  clientSeed?: string
): Promise<{
  roundId: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  mines: number;
  tiles: number;
  safeRemaining: number;
  multiplierTable: number[];
  startedAt: string;
}> {
  // Validate inputs
  if (mines < MIN_MINES || mines > MAX_MINES) {
    throw new Error(`Mines must be between ${MIN_MINES} and ${MAX_MINES}`);
  }
  
  const bet = new Decimal(betAmount);
  if (bet.lt(MIN_BET) || bet.gt(MAX_BET)) {
    throw new Error(`Bet must be between ${MIN_BET} and ${MAX_BET}`);
  }
  
  // Generate round data
  const roundId = randomBytes(16).toString('hex');
  const serverSeed = randomBytes(32).toString('hex');
  const serverSeedHash = sha256(serverSeed);
  const finalClientSeed = clientSeed || randomBytes(16).toString('hex');
  const nonce = getUserNonce(userId);
  
  // Generate mine positions
  const minePositions = generateMinePositions(serverSeed, finalClientSeed, nonce, mines);
  
  // Create round
  const round: MinesRound = {
    id: roundId,
    userId,
    serverSeed,
    serverSeedHash,
    clientSeed: finalClientSeed,
    nonce,
    mines,
    minePositions,
    openedTiles: new Set(),
    betAmount: bet,
    state: 'active',
    currentMultiplier: 0,
    picks: 0,
    startedAt: new Date(),
  };
  
  activeRounds.set(roundId, round);
  
  return {
    roundId,
    serverSeedHash,
    clientSeed: finalClientSeed,
    nonce,
    mines,
    tiles: TOTAL_TILES,
    safeRemaining: TOTAL_TILES - mines,
    multiplierTable: await generateMultiplierTable(mines),
    startedAt: round.startedAt.toISOString(),
  };
}

// Pick a tile
export async function pickTile(
  roundId: string,
  tileIndex: number,
  userId: string
): Promise<{
  state: 'safe' | 'boom';
  openedTiles?: number[];
  lastPick: number;
  picks?: number;
  currentMultiplier?: number;
  safeRemaining?: number;
  minePositions?: number[];
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
  endedAt?: string;
}> {
  const round = activeRounds.get(roundId);
  if (!round) {
    throw new Error('Round not found');
  }
  
  if (round.userId !== userId) {
    throw new Error('Unauthorized');
  }
  
  if (round.state !== 'active') {
    throw new Error('Round is not active');
  }
  
  if (tileIndex < 0 || tileIndex >= TOTAL_TILES) {
    throw new Error('Invalid tile index');
  }
  
  if (round.openedTiles.has(tileIndex)) {
    throw new Error('Tile already opened');
  }
  
  // Check if it's a mine
  if (round.minePositions.has(tileIndex)) {
    // Hit a mine - game over
    round.state = 'lost';
    round.endedAt = new Date();
    
    return {
      state: 'boom',
      lastPick: tileIndex,
      minePositions: Array.from(round.minePositions),
      serverSeed: round.serverSeed,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      endedAt: round.endedAt.toISOString(),
    };
  }
  
  // Safe tile
  round.openedTiles.add(tileIndex);
  round.picks++;
  round.currentMultiplier = await calculateMultiplier(round.picks, round.mines);
  
  const safeRemaining = TOTAL_TILES - round.mines - round.picks;
  
  // Auto-cashout if all safe tiles are revealed
  if (safeRemaining === 0) {
    round.state = 'won';
    round.endedAt = new Date();
  }
  
  return {
    state: 'safe',
    openedTiles: Array.from(round.openedTiles),
    lastPick: tileIndex,
    picks: round.picks,
    currentMultiplier: round.currentMultiplier,
    safeRemaining,
  };
}

// Cash out
export function cashOut(
  roundId: string,
  userId: string
): {
  state: 'cashed';
  payout: string;
  picks: number;
  currentMultiplier: number;
  minePositions: number[];
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
} {
  const round = activeRounds.get(roundId);
  if (!round) {
    throw new Error('Round not found');
  }
  
  if (round.userId !== userId) {
    throw new Error('Unauthorized');
  }
  
  if (round.state !== 'active') {
    throw new Error('Round is not active');
  }
  
  if (round.picks === 0) {
    throw new Error('Must pick at least one tile before cashing out');
  }
  
  // Calculate payout
  const payout = round.betAmount.mul(round.currentMultiplier);
  
  round.state = 'won';
  round.endedAt = new Date();
  
  // Remove from active rounds
  activeRounds.delete(roundId);
  
  return {
    state: 'cashed',
    payout: payout.toFixed(2),
    picks: round.picks,
    currentMultiplier: round.currentMultiplier,
    minePositions: Array.from(round.minePositions),
    serverSeed: round.serverSeed,
    serverSeedHash: round.serverSeedHash,
    clientSeed: round.clientSeed,
    nonce: round.nonce,
  };
}

// Verify a round
export function verifyRound(
  serverSeedHash: string,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  mines: number
): {
  valid: boolean;
  minePositions?: number[];
  error?: string;
} {
  try {
    // Verify server seed hash
    const computedHash = sha256(serverSeed);
    if (computedHash !== serverSeedHash) {
      return {
        valid: false,
        error: 'Server seed hash does not match',
      };
    }
    
    // Generate mine positions
    const minePositions = generateMinePositions(serverSeed, clientSeed, nonce, mines);
    
    return {
      valid: true,
      minePositions: Array.from(minePositions),
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

// Get active round for user
export function getActiveRound(userId: string): MinesRound | null {
  const rounds = Array.from(activeRounds.values());
  for (const round of rounds) {
    if (round.userId === userId && round.state === 'active') {
      return round;
    }
  }
  return null;
}