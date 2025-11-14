import crypto from 'crypto';

export interface GameResult {
  value: number; // 0-1 float
  roll?: number; // For dice (0-99.99)
  reels?: number[][]; // For slots
  crashPoint?: number; // For crash
}

export function generateRNG(serverSeed: string, clientSeed: string, nonce: number): number {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hash = hmac.digest('hex');
  
  // Convert first 8 characters to integer and normalize to 0-1
  const hex = hash.substring(0, 8);
  const value = parseInt(hex, 16) / Math.pow(2, 32);
  
  return value;
}

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateClientSeed(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function hashServerSeed(seed: string): string {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

export function generateDiceRoll(serverSeed: string, clientSeed: string, nonce: number): number {
  const value = generateRNG(serverSeed, clientSeed, nonce);
  return Math.floor(value * 10000) / 100; // 0.00 - 99.99
}

export function generateSlotReels(serverSeed: string, clientSeed: string, nonce: number): number[][] {
  const symbols = [0, 1, 2, 3, 4]; // 🍒, 🍋, ⭐, 🔔, 💎
  const reels: number[][] = [];
  
  for (let reel = 0; reel < 5; reel++) {
    const reelSymbols: number[] = [];
    for (let position = 0; position < 3; position++) {
      const value = generateRNG(serverSeed, clientSeed, nonce + reel * 3 + position);
      const symbol = Math.floor(value * symbols.length);
      reelSymbols.push(symbol);
    }
    reels.push(reelSymbols);
  }
  
  return reels;
}

export function generateCrashPoint(serverSeed: string, clientSeed: string, nonce: number): number {
  const houseEdge = parseFloat(process.env.HOUSE_EDGE_CRASH || '0.01');
  const value = generateRNG(serverSeed, clientSeed, nonce);
  
  // Generate crash point with house edge
  const crashPoint = Math.max(1.0, (1 - houseEdge) / value);
  return Math.round(crashPoint * 100) / 100; // Round to 2 decimals
}

export function verifyResult(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  game: string
): GameResult {
  const value = generateRNG(serverSeed, clientSeed, nonce);
  
  switch (game) {
    case 'DICE':
      return {
        value,
        roll: generateDiceRoll(serverSeed, clientSeed, nonce)
      };
    case 'SLOTS':
      return {
        value,
        reels: generateSlotReels(serverSeed, clientSeed, nonce)
      };
    case 'CRASH':
      return {
        value,
        crashPoint: generateCrashPoint(serverSeed, clientSeed, nonce)
      };
    default:
      return { value };
  }
}
