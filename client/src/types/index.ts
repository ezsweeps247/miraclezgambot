export interface User {
  id: string;
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  createdAt: string;
}

export interface Balance {
  available: number;
  locked: number;
  currency: string;
  total: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'BET' | 'PAYOUT' | 'REFUND';
  amount: number;
  meta?: {
    game?: 'DICE' | 'SLOTS' | 'CRASH';
    betId?: string;
    source?: string;
    [key: string]: any;
  };
  createdAt: string;
}

export interface Bet {
  id: string;
  userId: string;
  game: 'DICE' | 'SLOTS' | 'CRASH';
  amount: number;
  result: 'WIN' | 'LOSE' | 'CASHED';
  profit: number;
  nonce: number;
  serverSeedId: string;
  createdAt: string;
}

export interface DiceBetResult {
  betId: string;
  roll: number;
  result: 'WIN' | 'LOSE';
  profit: number;
  multiplier: number;
}

export interface SlotsBetResult {
  betId: string;
  reels: string[][];
  paylinesHit: number;
  payout: number;
  profit: number;
}

export interface CrashGameState {
  roundId?: string;
  status: 'WAITING' | 'RUNNING' | 'ENDED';
  multiplier: number;
  timeLeft?: number;
  crashPoint?: number;
  players?: CrashPlayer[];
}

export interface CrashPlayer {
  userId: string;
  username: string;
  amount: number;
  autoCashout?: number;
  cashedOut?: number;
  profit?: number;
}

export interface CrashRound {
  id: string;
  crashPoint: number | null;
  endAt: string | null;
}

export interface ProvablyFairData {
  serverSeedHash?: string;
  clientSeed: string;
  nextNonce: number;
}

export interface GameResult {
  value: number;
  roll?: number;
  reels?: number[][];
  crashPoint?: number;
}
