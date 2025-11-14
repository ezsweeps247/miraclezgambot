import { createHash, randomBytes } from 'crypto';
import { broadcastNewBet } from '../broadcast-manager';

interface GameResult {
  won: boolean;
  multiplier: number;
  payout: number;
  profit: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

interface DoubleUpResult {
  won: boolean;
  playerCard: string;
  dealerCard: string;
  newAmount: number;
}

// Card values for double-up game
const CARDS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CARD_VALUES: { [key: string]: number } = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Generate provably fair multiplier
function generateMultiplier(serverSeed: string, clientSeed: string, nonce: number, difficulty: string): number {
  const hash = createHash('sha256')
    .update(`${serverSeed}:${clientSeed}:${nonce}`)
    .digest('hex');
  
  // Convert hash to number between 0 and 1
  const hashInt = parseInt(hash.substring(0, 13), 16);
  const max = Math.pow(16, 13);
  const random = hashInt / max;
  
  // Base multipliers for each difficulty
  const baseMultipliers = {
    easy: 1.5,
    medium: 2.5,
    hard: 5.0
  };
  
  const base = baseMultipliers[difficulty as keyof typeof baseMultipliers] || 2.5;
  const houseEdge = 0.04; // 4% house edge
  
  // Determine win based on probability
  const winChance = (1 - houseEdge) / base;
  const won = random < winChance;
  
  return won ? base : 0;
}

// Play a round of Tower Defense
export function playTowerDefense(
  betAmount: number,
  difficulty: 'easy' | 'medium' | 'hard',
  userId: string,
  username?: string
): GameResult {
  // Generate seeds
  const serverSeed = randomBytes(32).toString('hex');
  const clientSeed = randomBytes(16).toString('hex');
  const nonce = Math.floor(Math.random() * 1000000);
  
  // Generate multiplier
  const multiplier = generateMultiplier(serverSeed, clientSeed, nonce, difficulty);
  const won = multiplier > 0;
  
  // Calculate payout
  const payout = won ? betAmount * multiplier : 0;
  const profit = payout - betAmount;
  
  // Broadcast the bet
  broadcastNewBet({
    id: randomBytes(16).toString('hex'),
    userId,
    username: username || `Player${userId.slice(-4)}`,
    game: 'Tower Defense',
    amount: betAmount,
    multiplier: won ? multiplier : 0,
    profit,
    payout,
    timestamp: Date.now()
  });
  
  return {
    won,
    multiplier: won ? multiplier : 0,
    payout,
    profit,
    serverSeed,
    clientSeed,
    nonce
  };
}

// Play double-up card game
export function playDoubleUp(
  amount: number,
  selectedCard: number,
  userId: string
): DoubleUpResult {
  // Generate random cards
  const playerCardIndex = Math.floor(Math.random() * CARDS.length);
  const dealerCardIndex = Math.floor(Math.random() * CARDS.length);
  
  const playerCard = CARDS[playerCardIndex];
  const dealerCard = CARDS[dealerCardIndex];
  
  const playerValue = CARD_VALUES[playerCard];
  const dealerValue = CARD_VALUES[dealerCard];
  
  const won = playerValue > dealerValue;
  const newAmount = won ? amount * 2 : 0;
  
  return {
    won,
    playerCard,
    dealerCard,
    newAmount
  };
}

// Verify a game result (for provably fair verification)
export function verifyTowerDefenseResult(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  difficulty: string
): { multiplier: number; won: boolean } {
  const multiplier = generateMultiplier(serverSeed, clientSeed, nonce, difficulty);
  return {
    multiplier: multiplier > 0 ? multiplier : 0,
    won: multiplier > 0
  };
}