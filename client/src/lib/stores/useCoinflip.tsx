import { create } from "zustand";
import CryptoJS from "crypto-js";

export type GameSide = "HEADS" | "TAILS";
export type GamePhase = "betting" | "flipping" | "result";

export interface BetHistoryEntry {
  id: string;
  time: string;
  round: string;
  result: GameSide;
  totalStake: number;
  win: number;
  serverSeed: string;
  clientSeed: number;
  betSide: GameSide;
}

export interface GameResult {
  side: GameSide;
  roundId: string;
}

interface CoinflipState {
  phase: GamePhase;
  currentBet: number;
  selectedChip: number;
  betSide: GameSide | null;
  headsTotal: number;
  tailsTotal: number;
  countdown: number;
  currentRound: string;
  serverSeed: string;
  clientSeed: number;
  useRandomSeed: boolean;
  betHistory: BetHistoryEntry[];
  gameHistory: GameSide[];
  balance: number;
  
  selectChip: (value: number) => void;
  placeBet: (side: GameSide) => void;
  cancelBet: () => void;
  startFlip: () => void;
  setPhase: (phase: GamePhase) => void;
  setCountdown: (seconds: number) => void;
  setClientSeed: (seed: number) => void;
  setUseRandomSeed: (useRandom: boolean) => void;
  generateNewServerSeed: () => void;
  generateNewClientSeed: () => void;
  calculateResult: () => GameSide;
  addBetToHistory: (entry: BetHistoryEntry) => void;
  resetForNewRound: () => void;
}

function generateRandomSeed(): number {
  return Math.floor(Math.random() * 10000);
}

function generateServerSeed(): string {
  const randomData = Math.random().toString() + Date.now().toString() + Math.random().toString();
  return CryptoJS.SHA256(randomData).toString();
}

function generateRoundId(): string {
  return Math.floor(Math.random() * 10000000).toString();
}

function calculateGameResult(serverSeed: string, clientSeed: number, roundId: string): GameSide {
  const combined = `${serverSeed}${clientSeed}${roundId}`;
  const hash = CryptoJS.SHA256(combined).toString();
  
  const firstChar = hash.charAt(0);
  const numValue = parseInt(firstChar, 16);
  
  return numValue % 2 === 0 ? "HEADS" : "TAILS";
}

export const useCoinflip = create<CoinflipState>((set, get) => ({
  phase: "betting",
  currentBet: 0,
  selectedChip: 1,
  betSide: null,
  headsTotal: 0,
  tailsTotal: 0,
  countdown: 10,
  currentRound: generateRoundId(),
  serverSeed: generateServerSeed(),
  clientSeed: generateRandomSeed(),
  useRandomSeed: true,
  betHistory: [],
  gameHistory: [],
  balance: 10000,
  
  selectChip: (value: number) => {
    set({ selectedChip: value });
  },
  
  placeBet: (side: GameSide) => {
    const { selectedChip, currentBet, betSide, balance } = get();
    
    if (betSide && betSide !== side) {
      return;
    }
    
    const newBet = currentBet + selectedChip;
    
    if (newBet > 1000) {
      return;
    }
    
    if (balance < selectedChip) {
      return;
    }
    
    set({
      currentBet: newBet,
      betSide: side,
      balance: balance - selectedChip,
      headsTotal: side === "HEADS" ? get().headsTotal + selectedChip : get().headsTotal,
      tailsTotal: side === "TAILS" ? get().tailsTotal + selectedChip : get().tailsTotal,
    });
  },
  
  cancelBet: () => {
    const { currentBet, betSide } = get();
    set({
      currentBet: 0,
      betSide: null,
      balance: get().balance + currentBet,
      headsTotal: betSide === "HEADS" ? get().headsTotal - currentBet : get().headsTotal,
      tailsTotal: betSide === "TAILS" ? get().tailsTotal - currentBet : get().tailsTotal,
    });
  },
  
  startFlip: () => {
    set({ phase: "flipping" });
  },
  
  setPhase: (phase: GamePhase) => {
    set({ phase });
  },
  
  setCountdown: (seconds: number) => {
    set({ countdown: seconds });
  },
  
  setClientSeed: (seed: number) => {
    set({ clientSeed: seed });
  },
  
  setUseRandomSeed: (useRandom: boolean) => {
    set({ useRandomSeed: useRandom });
  },
  
  generateNewServerSeed: () => {
    set({ serverSeed: generateServerSeed() });
  },
  
  generateNewClientSeed: () => {
    set({ clientSeed: generateRandomSeed() });
  },
  
  calculateResult: () => {
    const { serverSeed, clientSeed, currentRound } = get();
    return calculateGameResult(serverSeed, clientSeed, currentRound);
  },
  
  addBetToHistory: (entry: BetHistoryEntry) => {
    set(state => ({
      betHistory: [entry, ...state.betHistory].slice(0, 50),
      gameHistory: [entry.result, ...state.gameHistory].slice(0, 100),
    }));
  },
  
  resetForNewRound: () => {
    const { useRandomSeed } = get();
    set({
      phase: "betting",
      currentBet: 0,
      betSide: null,
      headsTotal: 0,
      tailsTotal: 0,
      countdown: 10,
      currentRound: generateRoundId(),
      serverSeed: generateServerSeed(),
      clientSeed: useRandomSeed ? generateRandomSeed() : get().clientSeed,
    });
  },
}));
