import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Trophy, Clock, Home, ChevronRight, Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import FavoriteButton from '@/components/FavoriteButton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Game constants
const TILE_SIZE = 40;
const MARBLE_SIZE = 30;
const GRID_WIDTH = 15;
const GRID_HEIGHT = 11;

// Game object types
enum TileType {
  EMPTY = 0,
  WALL = 1,
  OXYD = 2,
  HOLE = 3,
  MOVABLE = 4,
  TRIGGER = 5,
  DOOR = 6,
  ICE = 7,
  MUD = 8
}

interface Position {
  x: number;
  y: number;
}

interface Marble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  radius: number;
}

interface Oxyd {
  id: number;
  position: Position;
  color: string;
  isOpen: boolean;
  matchId: number;
}

interface Level {
  id: number;
  name: string;
  grid: number[][];
  oxyds: Oxyd[];
  marbleStart: Position;
  description: string;
  parMoves: number;
  parTime: number;
}

// Level definitions
const LEVELS: Level[] = [
  {
    id: 1,
    name: "First Steps",
    description: "Match the Oxyd stones",
    parMoves: 10,
    parTime: 30,
    marbleStart: { x: 7, y: 5 },
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,2,0,0,0,0,0,0,0,0,0,2,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,2,0,0,0,0,0,0,0,0,0,2,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    oxyds: [
      { id: 1, position: { x: 2, y: 2 }, color: '#FF6B6B', isOpen: false, matchId: 2 },
      { id: 2, position: { x: 12, y: 2 }, color: '#FF6B6B', isOpen: false, matchId: 1 },
      { id: 3, position: { x: 2, y: 8 }, color: '#4ECDC4', isOpen: false, matchId: 4 },
      { id: 4, position: { x: 12, y: 8 }, color: '#4ECDC4', isOpen: false, matchId: 3 }
    ]
  },
  {
    id: 2,
    name: "Maze Runner",
    description: "Navigate the maze to find matching pairs",
    parMoves: 25,
    parTime: 60,
    marbleStart: { x: 7, y: 5 },
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,0,0,0,1,0,0,0,1,0,0,0,2,1],
      [1,0,1,1,0,1,0,0,0,1,0,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,0,0,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,0,0,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,0,0,0,1,0,1,1,0,1],
      [1,2,0,0,0,1,0,0,0,1,0,0,0,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    oxyds: [
      { id: 1, position: { x: 1, y: 1 }, color: '#FFE66D', isOpen: false, matchId: 2 },
      { id: 2, position: { x: 13, y: 1 }, color: '#FFE66D', isOpen: false, matchId: 1 },
      { id: 3, position: { x: 1, y: 9 }, color: '#A8E6CF', isOpen: false, matchId: 4 },
      { id: 4, position: { x: 13, y: 9 }, color: '#A8E6CF', isOpen: false, matchId: 3 }
    ]
  },
  {
    id: 3,
    name: "Push and Match",
    description: "Move blocks to reach the Oxyd stones",
    parMoves: 30,
    parTime: 90,
    marbleStart: { x: 7, y: 5 },
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,0,0,0,0,0,0,0,0,0,0,0,2,1],
      [1,0,0,4,0,0,0,0,0,0,0,4,0,0,1],
      [1,0,0,0,0,0,1,1,1,0,0,0,0,0,1],
      [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
      [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
      [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
      [1,0,0,0,0,0,1,1,1,0,0,0,0,0,1],
      [1,0,0,4,0,0,0,0,0,0,0,4,0,0,1],
      [1,2,0,0,0,0,0,0,0,0,0,0,0,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    oxyds: [
      { id: 1, position: { x: 1, y: 1 }, color: '#FF8CC6', isOpen: false, matchId: 2 },
      { id: 2, position: { x: 13, y: 1 }, color: '#FF8CC6', isOpen: false, matchId: 1 },
      { id: 3, position: { x: 1, y: 9 }, color: '#8CE8FF', isOpen: false, matchId: 4 },
      { id: 4, position: { x: 13, y: 9 }, color: '#8CE8FF', isOpen: false, matchId: 3 }
    ]
  },
  {
    id: 4,
    name: "Ice and Holes",
    description: "Careful! Ice is slippery and holes are dangerous",
    parMoves: 35,
    parTime: 100,
    marbleStart: { x: 7, y: 5 },
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,0,7,7,7,0,0,0,7,7,7,0,2,1],
      [1,0,0,7,3,7,0,0,0,7,3,7,0,0,1],
      [1,0,0,7,7,7,0,0,0,7,7,7,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,3,0,0,0,3,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,7,7,7,0,0,0,7,7,7,0,0,1],
      [1,0,0,7,3,7,0,0,0,7,3,7,0,0,1],
      [1,2,0,7,7,7,0,0,0,7,7,7,0,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    oxyds: [
      { id: 1, position: { x: 1, y: 1 }, color: '#B4A7D6', isOpen: false, matchId: 2 },
      { id: 2, position: { x: 13, y: 1 }, color: '#B4A7D6', isOpen: false, matchId: 1 },
      { id: 3, position: { x: 1, y: 9 }, color: '#FFD966', isOpen: false, matchId: 4 },
      { id: 4, position: { x: 13, y: 9 }, color: '#FFD966', isOpen: false, matchId: 3 }
    ]
  },
  {
    id: 5,
    name: "The Challenge",
    description: "Master all the mechanics!",
    parMoves: 50,
    parTime: 120,
    marbleStart: { x: 7, y: 5 },
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,0,0,4,0,0,3,0,0,4,0,0,2,1],
      [1,0,1,0,0,0,7,7,7,0,0,0,1,0,1],
      [1,0,1,0,0,0,7,2,7,0,0,0,1,0,1],
      [1,0,1,0,0,0,7,7,7,0,0,0,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,0,0,0,8,8,8,0,0,0,1,0,1],
      [1,0,1,0,0,0,8,2,8,0,0,0,1,0,1],
      [1,0,1,0,0,0,8,8,8,0,0,0,1,0,1],
      [1,2,0,0,4,0,0,3,0,0,4,0,0,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    oxyds: [
      { id: 1, position: { x: 1, y: 1 }, color: '#93C47D', isOpen: false, matchId: 2 },
      { id: 2, position: { x: 13, y: 1 }, color: '#93C47D', isOpen: false, matchId: 1 },
      { id: 3, position: { x: 7, y: 3 }, color: '#E06666', isOpen: false, matchId: 4 },
      { id: 4, position: { x: 7, y: 7 }, color: '#E06666', isOpen: false, matchId: 3 },
      { id: 5, position: { x: 1, y: 9 }, color: '#76A5AF', isOpen: false, matchId: 6 },
      { id: 6, position: { x: 13, y: 9 }, color: '#76A5AF', isOpen: false, matchId: 5 }
    ]
  }
];

export default function EnigmaGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const scaleRef = useRef(1);
  const marbleRef = useRef<Marble>({
    x: 7 * TILE_SIZE + TILE_SIZE / 2,
    y: 5 * TILE_SIZE + TILE_SIZE / 2,
    vx: 0,
    vy: 0,
    targetX: 7 * TILE_SIZE + TILE_SIZE / 2,
    targetY: 5 * TILE_SIZE + TILE_SIZE / 2,
    radius: MARBLE_SIZE / 2
  });

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'victory'>('menu');
  const [currentLevel, setCurrentLevel] = useState<Level>(LEVELS[0]);
  const [levelIndex, setLevelIndex] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [openedOxyds, setOpenedOxyds] = useState<Set<number>>(new Set());
  const [matchedPairs, setMatchedPairs] = useState<Set<number>>(new Set());
  const [lastOpenedOxyd, setLastOpenedOxyd] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [unlockedLevels, setUnlockedLevels] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('enigma-unlocked-levels');
    return saved ? new Set(JSON.parse(saved)) : new Set([1]);
  });
  const [levelScores, setLevelScores] = useState<Map<number, { moves: number, time: number }>>(() => {
    const saved = localStorage.getItem('enigma-level-scores');
    return saved ? new Map(JSON.parse(saved)) : new Map();
  });
  const [movableBlocks, setMovableBlocks] = useState<Position[]>([]);

  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Set document title
  useEffect(() => {
    document.title = 'Enigma Puzzle - Miraclez Gaming';
    return () => {
      document.title = 'Miraclez Gaming';
    };
  }, []);
  
  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem('enigma-unlocked-levels', JSON.stringify(Array.from(unlockedLevels)));
  }, [unlockedLevels]);
  
  useEffect(() => {
    localStorage.setItem('enigma-level-scores', JSON.stringify(Array.from(levelScores)));
  }, [levelScores]);

  // Initialize level
  useEffect(() => {
    if (gameState === 'playing') {
      const level = LEVELS[levelIndex];
      setCurrentLevel(level);
      marbleRef.current = {
        x: level.marbleStart.x * TILE_SIZE + TILE_SIZE / 2,
        y: level.marbleStart.y * TILE_SIZE + TILE_SIZE / 2,
        vx: 0,
        vy: 0,
        targetX: level.marbleStart.x * TILE_SIZE + TILE_SIZE / 2,
        targetY: level.marbleStart.y * TILE_SIZE + TILE_SIZE / 2,
        radius: MARBLE_SIZE / 2
      };
      setMoves(0);
      setTimer(0);
      setOpenedOxyds(new Set());
      setMatchedPairs(new Set());
      setLastOpenedOxyd(null);
      
      // Find movable blocks
      const blocks: Position[] = [];
      level.grid.forEach((row, y) => {
        row.forEach((tile, x) => {
          if (tile === TileType.MOVABLE) {
            blocks.push({ x, y });
          }
        });
      });
      setMovableBlocks(blocks);
    }
  }, [gameState, levelIndex]);

  // Timer
  useEffect(() => {
    if (gameState === 'playing') {
      const interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  // Handle canvas resize
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const containerRect = container.getBoundingClientRect();
    const aspectRatio = (GRID_WIDTH * TILE_SIZE) / (GRID_HEIGHT * TILE_SIZE);
    
    // Calculate maximum dimensions with padding for mobile
    const maxWidth = Math.min(containerRect.width, window.innerWidth - 32); // 16px padding on each side
    const maxHeight = Math.min(containerRect.height, window.innerHeight * 0.6); // Max 60% of viewport height on mobile
    
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    scaleRef.current = width / (GRID_WIDTH * TILE_SIZE);
    
    // Set display size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Set actual size in memory (scaled for high DPI)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = GRID_WIDTH * TILE_SIZE * dpr;
    canvas.height = GRID_HEIGHT * TILE_SIZE * dpr;
    
    // Scale all drawing operations
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);
  
  // Set up resize observer
  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Handle mouse/touch movement with proper scaling
  const handlePointerMove = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Map display coordinates to logical game coordinates
    // Correct formula: position_in_display * game_size / display_size
    const x = (e.clientX - rect.left) * (GRID_WIDTH * TILE_SIZE) / rect.width;
    const y = (e.clientY - rect.top) * (GRID_HEIGHT * TILE_SIZE) / rect.height;
    
    marbleRef.current.targetX = Math.max(MARBLE_SIZE/2, Math.min(x, GRID_WIDTH * TILE_SIZE - MARBLE_SIZE/2));
    marbleRef.current.targetY = Math.max(MARBLE_SIZE/2, Math.min(y, GRID_HEIGHT * TILE_SIZE - MARBLE_SIZE/2));
  }, [gameState]);

  // Push a movable block
  const pushBlock = useCallback((blockX: number, blockY: number, dx: number, dy: number): boolean => {
    const newX = blockX + dx;
    const newY = blockY + dy;
    
    // Check if new position is valid
    if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
      return false;
    }
    
    // Check if new position is empty or passable
    const targetTile = currentLevel.grid[newY][newX];
    if (targetTile !== TileType.EMPTY && targetTile !== TileType.ICE && targetTile !== TileType.MUD) {
      return false;
    }
    
    // Check if another block is in the way
    const blockInWay = movableBlocks.some(b => b.x === newX && b.y === newY);
    if (blockInWay) {
      return false;
    }
    
    // Move the block
    setMovableBlocks(prev => prev.map(block => 
      (block.x === blockX && block.y === blockY) 
        ? { x: newX, y: newY }
        : block
    ));
    
    return true;
  }, [currentLevel, movableBlocks]);

  // Check collision with walls and handle block pushing
  const checkWallCollision = useCallback((x: number, y: number, radius: number, vx: number, vy: number): boolean => {
    const leftTile = Math.floor((x - radius) / TILE_SIZE);
    const rightTile = Math.floor((x + radius) / TILE_SIZE);
    const topTile = Math.floor((y - radius) / TILE_SIZE);
    const bottomTile = Math.floor((y + radius) / TILE_SIZE);
    
    // Determine push direction based on velocity
    const pushDx = vx > 0.5 ? 1 : vx < -0.5 ? -1 : 0;
    const pushDy = vy > 0.5 ? 1 : vy < -0.5 ? -1 : 0;

    for (let tx = leftTile; tx <= rightTile; tx++) {
      for (let ty = topTile; ty <= bottomTile; ty++) {
        if (tx < 0 || tx >= GRID_WIDTH || ty < 0 || ty >= GRID_HEIGHT) continue;
        
        const tile = currentLevel.grid[ty][tx];
        if (tile === TileType.WALL) {
          return true;
        }
        
        // Check movable blocks
        const blockIndex = movableBlocks.findIndex(b => b.x === tx && b.y === ty);
        if (blockIndex !== -1) {
          // Try to push the block
          if (pushDx !== 0 || pushDy !== 0) {
            const pushed = pushBlock(tx, ty, pushDx, pushDy);
            if (!pushed) {
              return true; // Block couldn't be pushed, treat as collision
            }
            // Block was pushed, allow movement but with some resistance
            marbleRef.current.vx *= 0.7;
            marbleRef.current.vy *= 0.7;
            setMoves(m => m + 1); // Pushing costs a move
          } else {
            return true; // No clear push direction, treat as collision
          }
        }
      }
    }
    return false;
  }, [currentLevel, movableBlocks, pushBlock]);

  // Check collision with Oxyd stones
  const checkOxydCollision = (x: number, y: number): Oxyd | null => {
    for (const oxyd of currentLevel.oxyds) {
      const oxydX = oxyd.position.x * TILE_SIZE + TILE_SIZE / 2;
      const oxydY = oxyd.position.y * TILE_SIZE + TILE_SIZE / 2;
      const dist = Math.sqrt((x - oxydX) ** 2 + (y - oxydY) ** 2);
      
      if (dist < MARBLE_SIZE / 2 + TILE_SIZE / 2) {
        return oxyd;
      }
    }
    return null;
  };

  // Check for holes
  const checkHole = (x: number, y: number): boolean => {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    
    if (tileX >= 0 && tileX < GRID_WIDTH && tileY >= 0 && tileY < GRID_HEIGHT) {
      return currentLevel.grid[tileY][tileX] === TileType.HOLE;
    }
    return false;
  };

  // Get tile type at position
  const getTileType = (x: number, y: number): TileType => {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    
    if (tileX >= 0 && tileX < GRID_WIDTH && tileY >= 0 && tileY < GRID_HEIGHT) {
      return currentLevel.grid[tileY][tileX];
    }
    return TileType.WALL;
  };

  // Handle Oxyd stone interaction
  const handleOxydInteraction = (oxyd: Oxyd) => {
    if (matchedPairs.has(oxyd.id)) return;
    
    setMoves(m => m + 1);
    
    if (!openedOxyds.has(oxyd.id)) {
      setOpenedOxyds(prev => new Set([...prev, oxyd.id]));
      
      if (lastOpenedOxyd !== null && lastOpenedOxyd !== oxyd.id) {
        const lastOxyd = currentLevel.oxyds.find(o => o.id === lastOpenedOxyd);
        if (lastOxyd && lastOxyd.matchId === oxyd.id) {
          // Match found!
          setMatchedPairs(prev => new Set([...prev, oxyd.id, lastOxyd.id]));
          setLastOpenedOxyd(null);
          
          if (soundEnabled) {
            // Play match sound
            const audio = new Audio('data:audio/wav;base64,UklGRl4CAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YToCAAA=');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          }
          
          // Check victory
          if (matchedPairs.size + 2 === currentLevel.oxyds.length) {
            handleVictory();
          }
        } else {
          // Not a match, close both after delay
          setLastOpenedOxyd(oxyd.id);
          setTimeout(() => {
            setOpenedOxyds(prev => {
              const newSet = new Set(prev);
              if (lastOpenedOxyd !== null) newSet.delete(lastOpenedOxyd);
              newSet.delete(oxyd.id);
              return newSet;
            });
            setLastOpenedOxyd(null);
          }, 1500); // Show unmatched pair for 1.5 seconds
        }
      } else {
        setLastOpenedOxyd(oxyd.id);
        // Auto-close if no match is made within 2 seconds
        setTimeout(() => {
          setOpenedOxyds(prev => {
            const newSet = new Set(prev);
            // Only close if it's still open and not matched
            if (!matchedPairs.has(oxyd.id) && lastOpenedOxyd === oxyd.id) {
              newSet.delete(oxyd.id);
              setLastOpenedOxyd(null);
            }
            return newSet;
          });
        }, 2000);
      }
    }
  };

  // Handle victory
  const handleVictory = () => {
    setGameState('victory');
    
    // Save score
    setLevelScores(prev => {
      const newScores = new Map(prev);
      const currentScore = newScores.get(levelIndex + 1);
      if (!currentScore || moves < currentScore.moves || timer < currentScore.time) {
        newScores.set(levelIndex + 1, { moves, time: timer });
      }
      return newScores;
    });
    
    // Unlock next level
    if (levelIndex < LEVELS.length - 1) {
      setUnlockedLevels(prev => new Set([...prev, levelIndex + 2]));
    }
    
    toast({
      title: "Level Complete!",
      description: `Completed in ${moves} moves and ${timer} seconds`,
    });
  };

  // Game loop
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || gameState !== 'playing') return;

    // Update marble physics
    const marble = marbleRef.current;
    const dx = marble.targetX - marble.x;
    const dy = marble.targetY - marble.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Smooth marble movement
    const speed = 0.15;
    const friction = 0.9;
    
    // Apply ice/mud effects
    const tileType = getTileType(marble.x, marble.y);
    let currentSpeed = speed;
    let currentFriction = friction;
    
    if (tileType === TileType.ICE) {
      currentSpeed = 0.05;
      currentFriction = 0.98;
    } else if (tileType === TileType.MUD) {
      currentSpeed = 0.08;
      currentFriction = 0.85;
    }
    
    // Always apply acceleration toward target, even when very close
    // This ensures continuous movement
    if (dist > 0.1) { // Changed from > 1 to > 0.1 for continuous movement
      marble.vx += (dx / dist) * currentSpeed;
      marble.vy += (dy / dist) * currentSpeed;
    }
    
    // Apply friction but ensure marble doesn't stop completely when target is far
    if (dist < 5) {
      // Only apply full friction when very close to target
      marble.vx *= currentFriction;
      marble.vy *= currentFriction;
    } else {
      // Apply reduced friction when far from target to maintain movement
      marble.vx *= Math.max(currentFriction, 0.95);
      marble.vy *= Math.max(currentFriction, 0.95);
    }
    
    // Calculate new position
    const newX = marble.x + marble.vx;
    const newY = marble.y + marble.vy;
    
    // Check collisions with velocity for push direction
    if (!checkWallCollision(newX, newY, marble.radius, marble.vx, marble.vy)) {
      marble.x = newX;
      marble.y = newY;
      
      // Check hole
      if (checkHole(marble.x, marble.y)) {
        // Reset marble position
        marble.x = currentLevel.marbleStart.x * TILE_SIZE + TILE_SIZE / 2;
        marble.y = currentLevel.marbleStart.y * TILE_SIZE + TILE_SIZE / 2;
        marble.vx = 0;
        marble.vy = 0;
        setMoves(m => m + 5); // Penalty for falling in hole
      }
      
      // Check Oxyd collision
      const oxyd = checkOxydCollision(marble.x, marble.y);
      if (oxyd && !openedOxyds.has(oxyd.id)) {
        handleOxydInteraction(oxyd);
      }
    } else {
      // Bounce off walls
      marble.vx *= -0.5;
      marble.vy *= -0.5;
    }

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tile = currentLevel.grid[y][x];
        const tx = x * TILE_SIZE;
        const ty = y * TILE_SIZE;
        
        // Draw tile based on type
        switch (tile) {
          case TileType.WALL:
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#1a1a1a';
            ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
            break;
          case TileType.HOLE:
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(tx + TILE_SIZE/2, ty + TILE_SIZE/2, TILE_SIZE/3, 0, Math.PI * 2);
            ctx.fill();
            break;
          case TileType.ICE:
            ctx.fillStyle = '#a0d8ef';
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#7fbfdb';
            ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
            break;
          case TileType.MUD:
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#654321';
            ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
            break;
          default:
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#0f0f0f';
            ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
        }
      }
    }
    
    // Draw movable blocks with better visuals
    movableBlocks.forEach(block => {
      const bx = block.x * TILE_SIZE;
      const by = block.y * TILE_SIZE;
      
      // Block shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(bx + 4, by + 4, TILE_SIZE - 4, TILE_SIZE - 4);
      
      // Block body
      const gradient = ctx.createLinearGradient(bx, by, bx + TILE_SIZE, by + TILE_SIZE);
      gradient.addColorStop(0, '#888888');
      gradient.addColorStop(0.5, '#666666');
      gradient.addColorStop(1, '#444444');
      ctx.fillStyle = gradient;
      ctx.fillRect(bx + 2, by + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      
      // Block highlight
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 2, by + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    });

    // Draw Oxyd stones
    currentLevel.oxyds.forEach(oxyd => {
      const x = oxyd.position.x * TILE_SIZE + TILE_SIZE / 2;
      const y = oxyd.position.y * TILE_SIZE + TILE_SIZE / 2;
      
      ctx.save();
      ctx.translate(x, y);
      
      // Draw Oxyd stone
      const isOpen = openedOxyds.has(oxyd.id);
      const isMatched = matchedPairs.has(oxyd.id);
      
      if (isMatched) {
        // Matched - show color with glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = oxyd.color;
        ctx.fillStyle = oxyd.color;
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE / 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (isOpen) {
        // Temporarily open - show color
        ctx.fillStyle = oxyd.color;
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE / 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Closed - show gray
        ctx.fillStyle = '#444444';
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE / 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.restore();
    });

    // Draw marble
    ctx.save();
    ctx.translate(marble.x, marble.y);
    
    // Marble shadow
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#D4AF37';
    
    // Marble body
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, marble.radius);
    gradient.addColorStop(0, '#FFE4B5');
    gradient.addColorStop(0.5, '#D4AF37');
    gradient.addColorStop(1, '#B8860B');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, marble.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Marble shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(-marble.radius/3, -marble.radius/3, marble.radius/3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, currentLevel, openedOxyds, matchedPairs, movableBlocks, soundEnabled, checkWallCollision]);

  // Start/stop game loop
  useEffect(() => {
    if (gameState === 'playing') {
      animationRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop]);

  const startLevel = (index: number) => {
    setLevelIndex(index);
    setGameState('playing');
  };

  const togglePause = () => {
    setGameState(gameState === 'playing' ? 'paused' : 'playing');
  };

  const restartLevel = () => {
    setGameState('playing');
    const level = LEVELS[levelIndex];
    marbleRef.current = {
      x: level.marbleStart.x * TILE_SIZE + TILE_SIZE / 2,
      y: level.marbleStart.y * TILE_SIZE + TILE_SIZE / 2,
      vx: 0,
      vy: 0,
      targetX: level.marbleStart.x * TILE_SIZE + TILE_SIZE / 2,
      targetY: level.marbleStart.y * TILE_SIZE + TILE_SIZE / 2,
      radius: MARBLE_SIZE / 2
    };
    setMoves(0);
    setTimer(0);
    setOpenedOxyds(new Set());
    setMatchedPairs(new Set());
    setLastOpenedOxyd(null);
  };

  const nextLevel = () => {
    if (levelIndex < LEVELS.length - 1) {
      startLevel(levelIndex + 1);
    } else {
      setGameState('menu');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (gameState === 'menu') {
    return (
      <div className="container max-w-4xl mx-auto p-3 sm:p-4">
        <Card className="bg-casino-card border-casino-accent">
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
              <CardTitle className="text-xl text-center text-casino-neon flex-1">
                ENIGMA PUZZLE
              </CardTitle>
              <div className="flex items-center gap-2">
                <FavoriteButton gameName="Enigma" />
                <button
                  onClick={() => setLocation("/")}
                  className="bg-gradient-to-r from-[#B8941A] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#F4D06F] text-black font-semibold px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm flex items-center gap-2"
                  data-testid="button-back-casino"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-casino-text">
              <p className="mb-4 text-sm">Guide the marble to find matching Oxyd stone pairs!</p>
              <p className="text-xs">Control the marble with your mouse or finger</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LEVELS.map((level, index) => {
                const isUnlocked = unlockedLevels.has(level.id);
                const score = levelScores.get(level.id);
                
                return (
                  <Card
                    key={level.id}
                    className={cn(
                      "bg-black/50 border-casino-accent/50 transition-all cursor-pointer",
                      isUnlocked ? "hover:border-casino-neon hover:bg-black/70" : "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => isUnlocked && startLevel(index)}
                    data-testid={`level-card-${level.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-sm">{level.name}</h3>
                        {score && (
                          <Trophy className="w-5 h-5 text-casino-gold" />
                        )}
                      </div>
                      <p className="text-xs text-casino-text mb-3">{level.description}</p>
                      <div className="flex justify-between text-xs text-casino-text">
                        <span>Par: {level.parMoves} moves</span>
                        <span>Time: {level.parTime}s</span>
                      </div>
                      {score && (
                        <div className="mt-2 pt-2 border-t border-casino-accent/30 text-xs">
                          <div className="flex justify-between">
                            <span>Best: {score.moves} moves</span>
                            <span>{formatTime(score.time)}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="border-casino-accent hover:bg-casino-accent/20 w-full sm:w-auto sm:max-w-[160px]"
                data-testid="button-toggle-sound"
              >
                {soundEnabled ? <Volume2 className="mr-2 w-4 h-4" /> : <VolumeX className="mr-2 w-4 h-4" />}
                <span className="text-sm">Sound {soundEnabled ? 'On' : 'Off'}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem('enigma-unlocked-levels');
                  localStorage.removeItem('enigma-level-scores');
                  setUnlockedLevels(new Set([1]));
                  setLevelScores(new Map());
                  toast({
                    title: "Progress Reset",
                    description: "All progress has been cleared.",
                  });
                }}
                className="border-red-500 hover:bg-red-500/20 text-red-500 w-full sm:w-auto sm:max-w-[160px]"
                data-testid="button-reset-progress"
              >
                <span className="text-sm">Reset Progress</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-3 sm:p-4">
      <Card className="bg-casino-card border-casino-accent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-casino-neon">
              Level {currentLevel.id}: {currentLevel.name}
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-casino-text text-sm">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(timer)}</span>
              </div>
              <div className="text-casino-text text-sm">
                Moves: <span className="font-bold text-casino-neon">{moves}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Game Canvas */}
          <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden mx-auto" style={{ width: '100%', maxWidth: '800px', aspectRatio: `${GRID_WIDTH}/${GRID_HEIGHT}` }}>
            <canvas
              ref={canvasRef}
              width={GRID_WIDTH * TILE_SIZE}
              height={GRID_HEIGHT * TILE_SIZE}
              className="absolute inset-0 w-full h-full"
              onPointerMove={handlePointerMove}
              style={{ touchAction: 'none', imageRendering: 'crisp-edges' }}
              data-testid="game-canvas"
            />
            
            {/* Pause Overlay */}
            {gameState === 'paused' && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-bold text-casino-neon">PAUSED</h2>
                  <div className="flex gap-2 md:gap-4">
                    <Button
                      onClick={() => setGameState('playing')}
                      className="bg-casino-neon hover:bg-casino-neon/80 text-black text-sm px-4 md:px-6"
                      data-testid="button-resume-game"
                    >
                      <Play className="mr-2 w-4 h-4" /> Resume
                    </Button>
                    <Button
                      onClick={() => setGameState('menu')}
                      variant="outline"
                      className="border-casino-accent hover:bg-casino-accent/20 text-sm px-4 md:px-6"
                      data-testid="button-back-menu"
                    >
                      <Home className="mr-2 w-4 h-4" /> Menu
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Victory Overlay */}
            {gameState === 'victory' && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <Trophy className="w-12 h-12 text-casino-gold mx-auto" />
                  <h2 className="text-2xl font-bold text-casino-neon">LEVEL COMPLETE!</h2>
                  <div className="space-y-2 text-casino-text text-sm">
                    <p>Moves: <span className="font-bold text-casino-neon">{moves}</span> (Par: {currentLevel.parMoves})</p>
                    <p>Time: <span className="font-bold text-casino-neon">{formatTime(timer)}</span> (Par: {formatTime(currentLevel.parTime)})</p>
                  </div>
                  <div className="flex gap-2 md:gap-4 justify-center flex-wrap">
                    <Button
                      onClick={restartLevel}
                      variant="outline"
                      className="border-casino-accent hover:bg-casino-accent/20 text-sm px-4 md:px-6"
                      data-testid="button-restart-level"
                    >
                      <RotateCcw className="mr-2 w-4 h-4" /> Retry
                    </Button>
                    {levelIndex < LEVELS.length - 1 && (
                      <Button
                        onClick={nextLevel}
                        className="bg-casino-neon hover:bg-casino-neon/80 text-black text-sm px-4 md:px-6"
                        data-testid="button-next-level"
                      >
                        <span>Next</span> <ChevronRight className="ml-2 w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => setGameState('menu')}
                      variant="outline"
                      className="border-casino-accent hover:bg-casino-accent/20 text-sm px-4 md:px-6"
                      data-testid="button-victory-menu"
                    >
                      <Home className="mr-2 w-4 h-4" /> Menu
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Game Controls */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            <Button
              onClick={togglePause}
              variant="outline"
              className="border-casino-accent hover:bg-casino-accent/20 text-sm px-3 md:px-4 py-2 min-w-[80px] sm:min-w-[100px]"
              disabled={gameState === 'victory'}
              data-testid="button-pause-game"
            >
              {gameState === 'playing' ? <Pause className="mr-2 w-4 h-4" /> : <Play className="mr-2 w-4 h-4" />}
              <span className="hidden sm:inline">{gameState === 'playing' ? 'Pause' : 'Resume'}</span>
              <span className="sm:hidden">{gameState === 'playing' ? 'Pause' : 'Play'}</span>
            </Button>
            <Button
              onClick={restartLevel}
              variant="outline"
              className="border-casino-accent hover:bg-casino-accent/20 text-sm px-3 md:px-4 py-2 min-w-[80px] sm:min-w-[100px]"
              data-testid="button-restart-current"
            >
              <RotateCcw className="mr-2 w-4 h-4" />
              <span>Restart</span>
            </Button>
            <Button
              onClick={() => setGameState('menu')}
              variant="outline"
              className="border-casino-accent hover:bg-casino-accent/20 text-sm px-3 md:px-4 py-2 min-w-[80px] sm:min-w-[100px]"
              data-testid="button-game-menu"
            >
              <Home className="mr-2 w-4 h-4" />
              <span>Menu</span>
            </Button>
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              variant="outline"
              className="border-casino-accent hover:bg-casino-accent/20 text-sm px-3 md:px-4 py-2 min-w-[40px]"
              data-testid="button-toggle-sound-game"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Instructions */}
          <div className="bg-black/50 rounded-lg p-4 text-sm text-casino-text">
            <h3 className="font-bold mb-2 text-casino-neon text-base">How to Play:</h3>
            <ul className="space-y-1">
              <li>• Move the golden marble with your mouse or finger</li>
              <li>• Touch gray Oxyd stones to reveal their colors</li>
              <li>• Find and match all pairs of same-colored stones</li>
              <li>• Avoid holes (black circles) - they reset your position!</li>
              <li>• Ice (blue) makes movement slippery</li>
              <li>• Mud (brown) slows you down</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}