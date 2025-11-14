import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type GamePhase = "ready" | "playing" | "ended" | "demo";

export interface Block {
  row: number;
  columns: boolean[];
}

export interface EndGameData {
  stake: number | 'FREE';
  highestRow: number;
  blocksStacked: number;
  prize: number;
  prizeType: 'cash' | 'points';
  score: number;
  bonusPoints: number;
}

interface GameState {
  phase: GamePhase;
  blocks: Block[];
  currentBlock: Block | null;
  currentBlockPosition: number;
  movementDirection: number;
  movementSpeed: number;
  score: number;
  bonusPoints: number;
  stake: number | 'FREE';
  availableStakes: (number | 'FREE')[];
  highestRow: number;
  blocksStacked: number;
  comboMultiplier: number;
  comboStreak: number;
  perfectAlignments: number;
  lastPlacedBlock: { row: number; columns: number[]; isPerfect: boolean } | null;
  demoAutoStopTimer: NodeJS.Timeout | null;
  onEndCallback: ((data: EndGameData) => Promise<void>) | null;
  
  setStake: (stake: number | 'FREE') => void;
  cycleStake: (direction: 'up' | 'down') => void;
  getPotentialPrize: () => { amount: number; type: 'cash' | 'points' };
  calculatePrizeMultiplier: (row: number) => { multiplier: number; type: 'cash' | 'points' };
  start: (onEndCallback: (data: EndGameData) => Promise<void>) => void;
  startDemo: () => void;
  restart: () => void;
  end: () => void;
  stopBlock: () => void;
  updateBlockPosition: (delta: number) => void;
  spawnNewBlock: () => void;
}

const GRID_WIDTH = 7;
const BASE_SPEED = 2.5;
const MIN_SPEED_INCREMENT = 0.25;
const MAX_SPEED_INCREMENT = 0.45;

const getPointMultiplier = (stake: number | 'FREE'): number => {
  if (stake === 'FREE') return 1;
  if (stake === 0.5) return 0.2;
  if (stake === 1) return 1;
  if (stake === 2) return 2;
  if (stake === 5) return 4;
  if (stake === 10) return 20;
  if (stake === 20) return 80;
  return 1;
};

const getStakeSpeedMultiplier = (stake: number | 'FREE'): number => {
  if (stake === 'FREE') return 0.8;
  if (stake === 0.5) return 0.9;
  if (stake === 1) return 1.2;
  if (stake === 2) return 1.25;
  if (stake === 5) return 1.5;
  if (stake === 10) return 1.7;
  if (stake === 20) return 2.0;
  return 1.0;
};

export const useFundoraBloxStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    phase: "ready",
    blocks: [],
    currentBlock: null,
    currentBlockPosition: 0,
    movementDirection: 1,
    movementSpeed: BASE_SPEED,
    score: 0,
    bonusPoints: 0,
    stake: 1,
    availableStakes: ['FREE', 0.5, 1, 2, 5, 10, 20],
    highestRow: 0,
    blocksStacked: 0,
    comboMultiplier: 1,
    comboStreak: 0,
    perfectAlignments: 0,
    lastPlacedBlock: null,
    demoAutoStopTimer: null,
    onEndCallback: null,
    
    setStake: (stake: number | 'FREE') => {
      const state = get();
      if (state.phase === "ready") {
        set({ stake });
      }
    },
    
    cycleStake: (direction: 'up' | 'down') => {
      const state = get();
      if (state.phase !== "ready") return;
      
      const currentIndex = state.availableStakes.indexOf(state.stake);
      let newIndex;
      
      if (direction === 'up') {
        newIndex = currentIndex < state.availableStakes.length - 1 ? currentIndex + 1 : 0;
      } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : state.availableStakes.length - 1;
      }
      
      const newStake = state.availableStakes[newIndex];
      set({ stake: newStake });
    },
    
    calculatePrizeMultiplier: (row: number) => {
      if (row >= 13) return { multiplier: 100, type: 'cash' as const };
      if (row >= 12) return { multiplier: 10, type: 'cash' as const };
      if (row >= 11) return { multiplier: 5, type: 'cash' as const };
      if (row >= 10) return { multiplier: 2, type: 'cash' as const };
      
      const stakeAmount = typeof get().stake === 'number' ? get().stake : 0;
      
      if (row >= 9) {
        if (stakeAmount >= 20) return { multiplier: 700, type: 'points' as const };
        if (stakeAmount >= 10) return { multiplier: 500, type: 'points' as const };
        if (stakeAmount >= 5) return { multiplier: 350, type: 'points' as const };
        if (stakeAmount >= 2) return { multiplier: 200, type: 'points' as const };
        if (stakeAmount >= 1) return { multiplier: 150, type: 'points' as const };
        return { multiplier: 150, type: 'points' as const };
      }
      
      if (row >= 8) {
        if (stakeAmount >= 20) return { multiplier: 650, type: 'points' as const };
        if (stakeAmount >= 10) return { multiplier: 450, type: 'points' as const };
        if (stakeAmount >= 5) return { multiplier: 300, type: 'points' as const };
        if (stakeAmount >= 2) return { multiplier: 150, type: 'points' as const };
        if (stakeAmount >= 1) return { multiplier: 100, type: 'points' as const };
        return { multiplier: 100, type: 'points' as const };
      }
      
      if (row >= 7) {
        if (stakeAmount >= 20) return { multiplier: 600, type: 'points' as const };
        if (stakeAmount >= 10) return { multiplier: 400, type: 'points' as const };
        if (stakeAmount >= 5) return { multiplier: 250, type: 'points' as const };
        if (stakeAmount >= 2) return { multiplier: 100, type: 'points' as const };
        if (stakeAmount >= 1) return { multiplier: 25, type: 'points' as const };
        return { multiplier: 25, type: 'points' as const };
      }
      
      return { multiplier: 0, type: 'points' as const };
    },
    
    getPotentialPrize: () => {
      const state = get();
      const prizeInfo = state.calculatePrizeMultiplier(state.highestRow);
      
      const stakeAmount = typeof state.stake === 'number' ? state.stake : 0;
      
      if (prizeInfo.type === 'cash') {
        return { amount: stakeAmount * prizeInfo.multiplier, type: 'cash' as const };
      } else {
        return { amount: prizeInfo.multiplier, type: 'points' as const };
      }
    },
    
    start: (onEndCallback: (data: EndGameData) => Promise<void>) => {
      const state = get();
      
      if (state.demoAutoStopTimer) {
        clearTimeout(state.demoAutoStopTimer);
      }
      
      const randomStart = Math.floor(Math.random() * 5);
      const startCol = randomStart;
      const endCol = randomStart + 2;
      
      console.log(`Game started! Stake: ${state.stake === 'FREE' ? 'FREE MODE' : `$${state.stake}`}, First block: columns ${startCol}-${endCol}`);
      
      set({
        phase: "playing",
        blocks: [{
          row: 0,
          columns: Array(GRID_WIDTH).fill(false).map((_, i) => i >= startCol && i <= endCol)
        }],
        currentBlock: null,
        currentBlockPosition: 0,
        movementDirection: 1,
        movementSpeed: BASE_SPEED,
        score: 0,
        bonusPoints: 0,
        highestRow: 0,
        blocksStacked: 0,
        comboMultiplier: 1,
        comboStreak: 0,
        perfectAlignments: 0,
        lastPlacedBlock: null,
        demoAutoStopTimer: null,
        onEndCallback,
      });
      
      setTimeout(() => {
        get().spawnNewBlock();
      }, 500);
    },
    
    startDemo: () => {
      console.log("🎮 Starting demo mode...");
      
      const randomStart = Math.floor(Math.random() * 5);
      const startCol = randomStart;
      const endCol = randomStart + 2;
      
      set({
        phase: "demo",
        blocks: [{
          row: 0,
          columns: Array(GRID_WIDTH).fill(false).map((_, i) => i >= startCol && i <= endCol)
        }],
        currentBlock: null,
        currentBlockPosition: 0,
        movementDirection: 1,
        movementSpeed: BASE_SPEED,
        score: 0,
        bonusPoints: 0,
        highestRow: 0,
        blocksStacked: 0,
        comboMultiplier: 1,
        comboStreak: 0,
        perfectAlignments: 0,
        lastPlacedBlock: null,
        demoAutoStopTimer: null,
      });
      
      setTimeout(() => {
        get().spawnNewBlock();
      }, 500);
    },
    
    restart: () => {
      const state = get();
      
      if (state.demoAutoStopTimer) {
        clearTimeout(state.demoAutoStopTimer);
      }
      
      console.log("Game restarted!");
      set({
        phase: "ready",
        blocks: [],
        currentBlock: null,
        currentBlockPosition: 0,
        movementDirection: 1,
        movementSpeed: BASE_SPEED,
        score: 0,
        bonusPoints: 0,
        highestRow: 0,
        blocksStacked: 0,
        comboMultiplier: 1,
        comboStreak: 0,
        perfectAlignments: 0,
        lastPlacedBlock: null,
        demoAutoStopTimer: null,
        onEndCallback: null,
      });
    },
    
    end: async () => {
      const state = get();
      const prizeInfo = state.getPotentialPrize();
      
      console.log(`Game ended! Bonus points earned: ${state.bonusPoints}P`);
      
      if (prizeInfo.amount === 0) {
        console.log(`No prize won (only reached row ${state.highestRow})`);
      } else if (prizeInfo.type === 'cash') {
        console.log(`Prize won: $${prizeInfo.amount.toFixed(2)}`);
      } else {
        console.log(`Prize won: ${prizeInfo.amount}P`);
      }
      
      set({ phase: "ended" });

      if (state.onEndCallback) {
        await state.onEndCallback({
          stake: state.stake,
          highestRow: state.highestRow,
          blocksStacked: state.blocksStacked,
          prize: prizeInfo.amount,
          prizeType: prizeInfo.type,
          score: state.score,
          bonusPoints: state.bonusPoints,
        });
      }
    },
    
    spawnNewBlock: () => {
      const state = get();
      if (state.phase !== "playing" && state.phase !== "demo") return;
      
      const lastBlock = state.blocks[state.blocks.length - 1];
      const newRow = lastBlock ? lastBlock.row + 1 : 1;
      
      let initialColumns: boolean[];
      if (lastBlock) {
        initialColumns = [...lastBlock.columns];
      } else {
        if (state.stake === 'FREE') {
          initialColumns = Array(GRID_WIDTH).fill(false).map((_, i) => i >= 2 && i <= 4);
          console.log('🆓 FREE mode: Starting blocks in middle (columns 2-4)');
        } else {
          const startCol = Math.floor(Math.random() * (GRID_WIDTH - 2));
          initialColumns = Array(GRID_WIDTH).fill(false).map((_, i) => i >= startCol && i <= startCol + 2);
          console.log(`💰 Paid game ($${state.stake}): Starting blocks in columns ${startCol}-${startCol + 2}`);
        }
      }
      
      const newBlock: Block = {
        row: newRow,
        columns: initialColumns
      };
      
      let leftmostCol = -1;
      let rightmostCol = -1;
      for (let i = 0; i < GRID_WIDTH; i++) {
        if (newBlock.columns[i]) {
          if (leftmostCol === -1) leftmostCol = i;
          rightmostCol = i;
        }
      }
      
      const minPosition = leftmostCol >= 0 ? -leftmostCol : 0;
      const maxPosition = rightmostCol >= 0 ? GRID_WIDTH - 1 - rightmostCol : GRID_WIDTH - 1;
      
      const randomPosition = minPosition + (Math.random() * (maxPosition - minPosition));
      
      const newDirection = state.blocks.length === 0 
        ? (Math.random() > 0.5 ? 1 : -1)
        : (Math.random() > 0.3 ? -state.movementDirection : state.movementDirection);
      
      let rowSpeed: number;
      
      if (newRow < 7) {
        const randomIncrement = MIN_SPEED_INCREMENT + (Math.random() * (MAX_SPEED_INCREMENT - MIN_SPEED_INCREMENT));
        rowSpeed = BASE_SPEED + ((newRow - 1) * randomIncrement);
      } else if (newRow === 13) {
        rowSpeed = BASE_SPEED + (newRow * 0.8);
        console.log(`🔥 ROW 14 - MAXIMUM SPEED! Speed: ${rowSpeed.toFixed(2)}`);
      } else {
        const minIncrement = 0.3;
        const maxIncrement = 0.7;
        const randomIncrement = minIncrement + (Math.random() * (maxIncrement - minIncrement));
        rowSpeed = BASE_SPEED + ((newRow - 1) * randomIncrement);
        console.log(`⚡ Row ${newRow} random speed: increment ${randomIncrement.toFixed(2)}, speed: ${rowSpeed.toFixed(2)}`);
      }
      
      const stakeMultiplier = getStakeSpeedMultiplier(state.stake);
      let finalSpeed = rowSpeed * stakeMultiplier;
      
      console.log(`Spawning new block at row ${newRow}, position ${randomPosition.toFixed(2)}, direction ${newDirection}, speed: ${finalSpeed.toFixed(2)}`);
      
      let autoStopTimer: NodeJS.Timeout | null = null;
      if (state.phase === "demo") {
        const targetOffset = (Math.random() - 0.5) * 0.4;
        const travelDistance = Math.abs(targetOffset - randomPosition);
        const timeToTarget = (travelDistance / finalSpeed) * 1000 + 300 + (Math.random() * 400);
        
        autoStopTimer = setTimeout(() => {
          const currentState = get();
          if (currentState.phase === "demo" && currentState.currentBlock) {
            get().stopBlock();
          }
        }, timeToTarget);
      }
      
      set({
        currentBlock: newBlock,
        currentBlockPosition: randomPosition,
        movementDirection: newDirection,
        movementSpeed: finalSpeed,
        demoAutoStopTimer: autoStopTimer
      });
    },
    
    updateBlockPosition: (delta: number) => {
      const state = get();
      if (!state.currentBlock || (state.phase !== "playing" && state.phase !== "demo")) return;
      
      let leftmostCol = -1;
      let rightmostCol = -1;
      
      for (let i = 0; i < GRID_WIDTH; i++) {
        if (state.currentBlock.columns[i]) {
          if (leftmostCol === -1) leftmostCol = i;
          rightmostCol = i;
        }
      }
      
      const minPosition = leftmostCol >= 0 ? -leftmostCol : 0;
      const maxPosition = rightmostCol >= 0 ? GRID_WIDTH - 1 - rightmostCol : GRID_WIDTH - 1;
      
      let newPosition = state.currentBlockPosition + (state.movementDirection * state.movementSpeed * delta);
      let newDirection = state.movementDirection;
      
      if (newPosition >= maxPosition) {
        newPosition = maxPosition;
        newDirection = -1;
      } else if (newPosition <= minPosition) {
        newPosition = minPosition;
        newDirection = 1;
      }
      
      set({
        currentBlockPosition: newPosition,
        movementDirection: newDirection
      });
    },
    
    stopBlock: () => {
      const state = get();
      if (!state.currentBlock || (state.phase !== "playing" && state.phase !== "demo")) {
        console.log("Cannot stop block - invalid state");
        return;
      }
      
      if (state.demoAutoStopTimer) {
        clearTimeout(state.demoAutoStopTimer);
      }
      
      console.log(`Stopping block at position ${state.currentBlockPosition}`);
      
      const stoppedPosition = state.currentBlockPosition;
      
      if (state.blocks.length === 0) {
        const newBlock: Block = {
          row: 0,
          columns: Array(GRID_WIDTH).fill(false).map((_, i) => i >= 2 && i <= 4)
        };
        set({
          blocks: [newBlock],
          currentBlock: null
        });
        setTimeout(() => get().spawnNewBlock(), 500);
        return;
      }
      
      const previousBlock = state.blocks[state.blocks.length - 1];
      const newColumns = Array(GRID_WIDTH).fill(false);
      
      let hasOverlap = false;
      for (let i = 0; i < GRID_WIDTH; i++) {
        if (!state.currentBlock.columns[i]) continue;
        
        const blockColumnPosition = stoppedPosition + i;
        const gridColumn = Math.round(blockColumnPosition);
        
        if (gridColumn >= 0 && gridColumn < GRID_WIDTH && previousBlock.columns[gridColumn]) {
          newColumns[gridColumn] = true;
          hasOverlap = true;
        }
      }
      
      if (!hasOverlap) {
        console.log("Game Over - No overlap with previous block!");
        set({
          currentBlock: null
        });
        get().end();
        return;
      }
      
      const activeBlockCount = newColumns.filter(col => col).length;
      const previousActiveCount = previousBlock.columns.filter(col => col).length;
      const isPerfect = activeBlockCount === previousActiveCount && activeBlockCount > 0;
      
      let newComboStreak = state.comboStreak;
      let newComboMultiplier = state.comboMultiplier;
      let newPerfectAlignments = state.perfectAlignments;
      
      if (isPerfect) {
        newComboStreak = state.comboStreak + 1;
        newComboMultiplier = Math.min(1 + (newComboStreak * 0.5), 5);
        newPerfectAlignments = state.perfectAlignments + 1;
        console.log(`🎯 PERFECT ALIGNMENT! Combo streak: ${newComboStreak}, Multiplier: ${newComboMultiplier.toFixed(1)}x`);
      } else {
        if (state.comboStreak > 0) {
          console.log(`❌ Combo broken! Previous streak: ${state.comboStreak}`);
        }
        newComboStreak = 0;
        newComboMultiplier = 1;
      }
      
      const basePoints = activeBlockCount * 10;
      const multipliedPoints = Math.round(basePoints * newComboMultiplier);
      const shouldCountScore = state.currentBlock.row >= 7;
      const bonusPointsToAdd = activeBlockCount * 50;
      const newScore = shouldCountScore ? state.score + multipliedPoints : state.score;
      const newBonusPoints = shouldCountScore ? state.bonusPoints + bonusPointsToAdd : state.bonusPoints;
      const newHighestRow = Math.max(state.highestRow, state.currentBlock.row);
      const newBlocksStacked = state.blocksStacked + 1;
      
      console.log(`Block placed! Active columns: ${activeBlockCount}, Row: ${state.currentBlock.row}, Score ${shouldCountScore ? 'COUNTED' : 'NOT counted'}, Bonus: +${bonusPointsToAdd}`);
      
      const finalBlock: Block = {
        row: state.currentBlock.row,
        columns: newColumns
      };
      
      const placedColumns: number[] = [];
      newColumns.forEach((isActive, idx) => {
        if (isActive) placedColumns.push(idx);
      });
      
      set({
        blocks: [...state.blocks, finalBlock],
        currentBlock: null,
        score: newScore,
        bonusPoints: newBonusPoints,
        highestRow: newHighestRow,
        blocksStacked: newBlocksStacked,
        comboMultiplier: newComboMultiplier,
        comboStreak: newComboStreak,
        perfectAlignments: newPerfectAlignments,
        lastPlacedBlock: {
          row: state.currentBlock.row,
          columns: placedColumns,
          isPerfect
        }
      });
      
      const endRow = state.phase === "demo" ? (7 + Math.floor(Math.random() * 4)) : 13;
      
      if (newHighestRow >= endRow) {
        if (state.phase === "demo") {
          console.log("🎮 Demo complete! Restarting...");
          setTimeout(() => {
            get().startDemo();
          }, 1500);
        } else {
          console.log("🎉 Game complete! Reached the top!");
          setTimeout(() => {
            get().end();
          }, 500);
        }
      } else {
        setTimeout(() => {
          get().spawnNewBlock();
        }, 300);
      }
    }
  }))
);
