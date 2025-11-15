import React, { useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCredits } from "@/lib/utils";
import { Volume2, VolumeX } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGameMode } from "@/contexts/GameModeContext";
import FavoriteButton from "@/components/FavoriteButton";

// Helper: class joiner
function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

// Ball animation interface
interface AnimatedBall {
  id: string;
  path: number[];
  currentRow: number;
  currentCol: number;
  x: number;
  y: number;
  vx: number; // velocity x
  vy: number; // velocity y
  bounceCount: number; // number of bounces
  isComplete: boolean;
  multiplier?: number;
  payout?: number;
}

// ---------------- Preset tables (to visually match screenshots) ----------------
// Keys: rows -> risk -> multipliers (length rows+1)
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

// Fallback paytable generator
function binom(n: number, k: number) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let res = 1;
  for (let i = 1; i <= k; i++) res = (res * (n - k + i)) / i;
  return res;
}

function generatePaytable(rows: number, risk: "low" | "medium" | "high", edge = 0.01): number[] {
  // If we have a preset for an exact visual match, use it
  const preset = PRESETS[rows]?.[risk];
  if (preset && preset.length === rows + 1) return preset;

  const lam = risk === "low" ? 0.28 : risk === "medium" ? 0.53 : 0.85;
  const weights: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const d = Math.abs(i - rows / 2);
    weights.push(Math.exp(lam * d));
  }
  const sumW = weights.reduce((a, b) => a + b, 0);
  const twoPow = Math.pow(2, rows);
  const raw: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const p = binom(rows, i) / twoPow;
    raw.push((weights[i] / p) * ((1 - edge) / sumW));
  }
  // Soft clamping for center floors per risk
  const center = Math.floor(rows / 2);
  const floors = { low: 0.5, medium: 0.4, high: 0.2 } as const;
  if (raw[center] < floors[risk]) {
    const factor = floors[risk] / raw[center];
    for (let i = 0; i < raw.length; i++) raw[i] *= factor;
    // Re-normalize to RTP
    const pSum = raw.reduce((acc, m, i) => acc + (binom(rows, i) / twoPow) * m, 0);
    const scale = (1 - edge) / pSum;
    for (let i = 0; i < raw.length; i++) raw[i] *= scale;
  }
  return raw;
}

function formatMult(x: number) {
  // 1 decimal place for chips, but show integer without .0 when clean
  const s = (Math.round(x * 10) / 10).toFixed(1);
  return s.endsWith(".0") ? `${parseInt(s)}` : s;
}

export default function PlinkoPage() {
  const { user } = useAuth();
  const { gameMode } = useGameMode();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"manual" | "auto">("manual");
  const [bet, setBet] = useState("1");
  const [risk, setRisk] = useState<"low" | "medium" | "high">("low");
  const [rows, setRows] = useState(8); // 8..16 supported
  const [activeBalls, setActiveBalls] = useState<AnimatedBall[]>([]);
  const ballIdCounter = useRef(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioContext = useRef<AudioContext | null>(null);
  
  // Fetch balance with real-time updates
  const { data: balanceData } = useQuery<{ available: number; locked: number }>({
    queryKey: ['/api/balance'],
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });

  // React to gameMode changes - reset state and invalidate queries
  useEffect(() => {
    // Reset game state on mode change
    setActiveBalls([]);
    setAutoRunning(false);
    setCurrentAutoRound(0);
    setTotalAutoProfit(0);
    
    // Invalidate balance query to refetch for new mode
    queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
    queryClient.invalidateQueries({ queryKey: ["/api/plinko"] });
  }, [gameMode, queryClient]);
  
  // Auto play state
  const [autoRounds, setAutoRounds] = useState("10");
  const [autoRunning, setAutoRunning] = useState(false);
  const [currentAutoRound, setCurrentAutoRound] = useState(0);
  const [stopOnWin, setStopOnWin] = useState("");
  const [stopOnLoss, setStopOnLoss] = useState("");
  const [totalAutoProfit, setTotalAutoProfit] = useState(0);
  const autoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const canBet = Number(bet) > 0;
  const multipliers = useMemo(() => generatePaytable(rows, risk), [rows, risk]);

  // Initialize audio context
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContext.current?.close();
    };
  }, []);

  // Play sound effects
  const playSound = (type: "drop" | "plink" | "win" | "lose" | "cashout" | "click", frequency?: number) => {
    if (!audioEnabled || !audioContext.current) return;
    
    const ctx = audioContext.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    if (type === "drop") {
      // Ball drop release sound
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    } else if (type === "plink") {
      // Metallic plink sound with variations
      oscillator.type = "triangle";
      const freq = frequency || (1200 + Math.random() * 800);
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(freq * 0.7, ctx.currentTime + 0.08);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    } else if (type === "win") {
      // Cash register + celebration sound
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(523, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    } else if (type === "lose") {
      // Soft thud sound
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(150, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    } else if (type === "cashout") {
      // Big win celebration
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      oscillator.frequency.setValueAtTime(554, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      oscillator.frequency.setValueAtTime(1108, ctx.currentTime + 0.4);
      gainNode.gain.setValueAtTime(0.35, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    } else if (type === "click") {
      // Button click sound
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.02);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    }
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 1);
  };

  function halfBet() {
    playSound("click");
    const v = Number(bet || 0);
    setBet((v / 2).toFixed(2));
  }
  
  function doubleBet() {
    playSound("click");
    const v = Number(bet || 0);
    setBet((v * 2).toFixed(2));
  }
  
  // Auto play functions
  function startAutoPlay() {
    if (!user) {
      toast({ 
        title: "Login Required", 
        description: "Please log in to play",
        variant: "destructive" 
      });
      return;
    }
    
    const betAmount = parseFloat(bet);
    if (betAmount < 0.50 || betAmount > 100) {
      toast({ 
        title: "Invalid Bet", 
        description: "Bet must be between 0.50 and 100 credits",
        variant: "destructive" 
      });
      return;
    }
    
    setAutoRunning(true);
    setCurrentAutoRound(0);
    setTotalAutoProfit(0);
  }
  
  function stopAutoPlay() {
    setAutoRunning(false);
    setCurrentAutoRound(0);
    if (autoIntervalRef.current) {
      clearTimeout(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
  }
  
  // Auto play effect
  useEffect(() => {
    if (!autoRunning || activeBalls.length > 0) return;
    
    const rounds = parseInt(autoRounds) || 0;
    if (currentAutoRound >= rounds) {
      stopAutoPlay();
      toast({ 
        title: "Auto Play Complete", 
        description: `Finished ${rounds} rounds. Total profit: ${formatCredits(totalAutoProfit)}`,
      });
      return;
    }
    
    // Check stop conditions
    if (stopOnWin && totalAutoProfit >= parseFloat(stopOnWin)) {
      stopAutoPlay();
      toast({ 
        title: "Auto Play Stopped", 
        description: `Target profit of ${stopOnWin} credits reached!`,
      });
      return;
    }
    
    if (stopOnLoss && Math.abs(totalAutoProfit) >= parseFloat(stopOnLoss)) {
      stopAutoPlay();
      toast({ 
        title: "Auto Play Stopped", 
        description: `Loss limit of ${stopOnLoss} credits reached`,
        variant: "destructive" 
      });
      return;
    }
    
    // Initiate next bet with a small delay
    autoIntervalRef.current = setTimeout(() => {
      handleBet();
      setCurrentAutoRound(prev => prev + 1);
    }, 1000);
    
    return () => {
      if (autoIntervalRef.current) {
        clearTimeout(autoIntervalRef.current);
      }
    };
  }, [autoRunning, currentAutoRound, activeBalls.length, totalAutoProfit, autoRounds, stopOnWin, stopOnLoss]);

  async function handleBet() {
    if (!canBet) return;

    try {
      const response = await apiRequest("POST", "/api/plinko/bet", {
        betAmount: bet,
        rows,
        risk,
        gameMode
      });
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Create new ball and start animation
      playSound("drop");
      const ballId = `ball-${++ballIdCounter.current}`;
      const newBall: AnimatedBall = {
        id: ballId,
        path: result.path,
        currentRow: 0,
        currentCol: 0,
        x: 50, // Start at center (50%)
        y: 0,
        vx: 0,
        vy: 0,
        bounceCount: 0,
        isComplete: false,
        multiplier: result.multiplier,
        payout: result.payout
      };
      
      setActiveBalls(prev => [...prev, newBall]);
      animateBall(ballId, result.path, result.multiplier, result.payout, result.profit);
      
      // Update auto profit if in auto mode
      if (autoRunning) {
        const profit = result.payout - parseFloat(bet);
        setTotalAutoProfit(prev => prev + profit);
      }
      
      // Refresh balance immediately with single invalidation (now that all games use same key)
      await queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      // Force an immediate refetch to ensure real-time update
      await queryClient.refetchQueries({ queryKey: ["/api/balance"] });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to place bet",
        variant: "destructive"
      });
    }
  }

  function animateBall(ballId: string, path: number[], multiplier: number, payout: number, profit: number) {
    const gravity = 0.004; // Further reduced gravity for much slower, more suspenseful dropping
    const bounceDamping = 0.99; // Increased damping for more bounce energy retention
    const springForce = 6.5; // Increased spring force for bouncier collisions
    const frameRate = 15; // Even lower fps for more dramatic, suspenseful animation
    const frameDuration = 1000 / frameRate;
    let frame = 0;
    const totalRows = path.length;
    
    // Calculate peg positions for physics
    const getPegPosition = (row: number, col: number) => {
      const pegsInRow = row + 3;
      const maxWidth = 65; // Maximum width at bottom
      const rowRatio = (row + 1) / (totalRows + 1);
      const rowWidth = maxWidth * rowRatio;
      const spacing = rowWidth / (pegsInRow - 1);
      const startX = 50 - (rowWidth / 2);
      const x = startX + (spacing * col);
      const ySpacing = 94 / totalRows;
      const y = (ySpacing * row);
      return { x, y };
    };
    
    // Initialize ball
    setActiveBalls(prev => prev.map(ball => {
      if (ball.id !== ballId) return ball;
      return {
        ...ball,
        x: 50,
        y: 0,
        vx: (Math.random() - 0.5) * 0.4, // Reduced initial velocity for slower, more suspenseful start
        vy: 0,
        bounceCount: 0,
        currentRow: -1,
        currentCol: 0,
        isComplete: false
      };
    }));
    
    const animationInterval = setInterval(() => {
      frame++;
      
      setActiveBalls(prev => prev.map(ball => {
        if (ball.id !== ballId) return ball;
        if (ball.isComplete) return ball;
        
        // Apply physics
        let newVy = ball.vy + gravity;
        let newY = ball.y + newVy;
        let newX = ball.x + ball.vx;
        let newVx = ball.vx * 0.96; // Less air resistance for more lateral movement
        
        // Check current row based on y position
        const rowHeight = 94 / totalRows;
        const currentRow = Math.min(Math.floor(newY / rowHeight), totalRows - 1);
        
        // Check for collision with pegs
        if (currentRow >= 0 && currentRow < totalRows) {
          const targetCol = path[currentRow];
          const pegPos = getPegPosition(currentRow, targetCol);
          
          // Calculate distance to peg
          const dx = newX - pegPos.x;
          const dy = newY - pegPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Collision detection (peg radius = 2)
          if (distance < 4 && ball.currentRow !== currentRow) {
            // Bounce off peg with spring-like physics
            const angle = Math.atan2(dy, dx);
            const speed = Math.sqrt(newVx * newVx + newVy * newVy);
            
            // Reflect velocity with pinball-style elastic bounce
            const direction = targetCol > (currentRow + 2) / 2 ? 1 : -1;
            // Add much more randomness to bounces
            const randomFactor = (Math.random() - 0.5) * 5.0; // Increased randomness
            newVx = direction * Math.abs(Math.cos(angle) * speed * bounceDamping * springForce) + randomFactor;
            newVy = Math.abs(Math.sin(angle) * speed * bounceDamping) * 0.8 + 0.5 + Math.random() * 0.6; // Increased vertical bounce
            
            // Move ball away from peg in the correct direction
            const moveDir = path[currentRow] - (currentRow > 0 ? path[currentRow - 1] : (currentRow + 2) / 2);
            newX = pegPos.x + (moveDir > 0 ? 3 : moveDir < 0 ? -3 : 0);
            newY = pegPos.y + 4;
            
            ball.bounceCount++;
            ball.currentRow = currentRow;
            ball.currentCol = targetCol;
            
            // Play plink sound with frequency variation based on position
            const freq = 1000 + (currentRow * 50) + (targetCol * 30);
            playSound("plink", freq);
          }
          
          // Check collisions with all pegs in current row
          const pegsInRow = currentRow + 3;
          for (let col = 0; col < pegsInRow; col++) {
            const pegPos = getPegPosition(currentRow, col);
            const dx = newX - pegPos.x;
            const dy = newY - pegPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // If ball is too close to any peg, bounce it with spring physics
            if (dist < 3.5) {
              const angle = Math.atan2(dy, dx);
              const bounceForce = (3.5 - dist) * 1.5; // Even stronger bounce force
              const randomBounce = (Math.random() - 0.5) * 2; // Add random element
              newVx += Math.cos(angle) * bounceForce * springForce + randomBounce;
              
              // Add vertical bounce component for more realistic physics
              if (dy < 0) {
                newVy = Math.max(newVy * 0.9, -3.0); // Allow more upward bounce
              } else {
                newVy = Math.max(newVy, 0.05); // Can fall very slowly for floating effect
              }
              
              // Limit horizontal speed but allow more movement
              newVx = Math.max(-4, Math.min(4, newVx)); // Allow more horizontal movement
            }
          }
        }
        
        // Keep ball within triangular bounds
        const yPercent = Math.max(0, Math.min(1, (newY - 5) / 90));
        const maxWidth = 65;
        const currentWidth = maxWidth * Math.max(0.15, yPercent); // Minimum 15% width at top
        const leftBound = 50 - (currentWidth / 2);
        const rightBound = 50 + (currentWidth / 2);
        
        // Check left boundary
        if (newX < leftBound) {
          newX = leftBound;
          newVx = Math.abs(newVx) * 0.95; // Very elastic wall bounce for more bounce
          // Add slight downward angle but keep bouncy
          newVy = Math.abs(newVy) * 1.05;
        }
        // Check right boundary
        else if (newX > rightBound) {
          newX = rightBound;
          newVx = -Math.abs(newVx) * 0.95; // Very elastic wall bounce for more bounce
          // Add slight downward angle but keep bouncy
          newVy = Math.abs(newVy) * 1.05;
        }
        
        // Check if ball reached bottom
        if (newY >= 94) {
          clearInterval(animationInterval);
          
          // Calculate final chip position to match multiplier positions exactly
          const finalCol = path[totalRows - 1];
          const totalPositions = totalRows + 1;
          const maxWidth = 65; // Same as chip positioning
          const position = (finalCol / (totalPositions - 1)) * maxWidth;
          const finalX = 50 - (maxWidth / 2) + position;
          
          // Show result
          setTimeout(() => {
            if (profit > 0) {
              playSound(multiplier >= 10 ? "cashout" : "win");
              // Only show notification for wins of $100+
              if (payout >= 100) {
                toast({
                  title: `💰 BIG WIN ${formatCredits(payout)}!`,
                  description: `Ball landed on ${multiplier}x multiplier`,
                });
              }
            } else if (profit === 0) {
              playSound("lose");
              // No notification for break-even
            } else {
              playSound("lose");
              // No notification for losses
            }
            
            setTimeout(() => {
              setActiveBalls(prev => prev.filter(b => b.id !== ballId));
            }, 1500);
          }, 300);
          
          return {
            ...ball,
            x: finalX,
            y: 97,
            vx: 0,
            vy: 0,
            isComplete: true,
            currentRow: totalRows,
            currentCol: finalCol
          };
        }
        
        return {
          ...ball,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
          currentRow: currentRow
        };
      }));
      
      // Safety timeout (increased due to much slower fall for more suspense)
      if (frame > 2000) {
        clearInterval(animationInterval);
      }
    }, frameDuration);
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-gray-200 flex justify-center md:py-1">
      <div className="w-full max-w-[1600px] md:rounded-2xl bg-[#1a1a1a] shadow-xl ring-1 ring-black/20">
        <div className="flex flex-col md:flex-row">
          {/* LEFT RAIL / BOTTOM CONTROLS ON MOBILE */}
          <aside className="w-full md:w-[300px] bg-[#1a1a1a] px-2 md:px-2 pt-4 md:pt-6 pb-4 md:pb-8 border-b md:border-b-0 md:border-r border-gray-800 order-2 md:order-1">
            {/* Game Header */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-base font-bold">Plinko</h2>
                <div className="flex items-center gap-2">
                  <FavoriteButton gameName="Plinko" />
                  <button
                    onClick={() => setLocation("/")}
                    className="border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition px-1.5 py-0.5 rounded-lg text-sm"
                    data-testid="button-back-casino"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            </div>
            
            {/* Tabs and Volume */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex md:inline-flex rounded-lg bg-[#0a0a0a] p-1 select-none">
                <button
                  onClick={() => setTab("manual")}
                  className={cx(
                    "flex-1 md:flex-initial px-2 py-1 rounded-md text-sm font-medium transition",
                    tab === "manual" ? "bg-[#2a2a2a] text-white shadow-inner" : "text-gray-400 hover:text-gray-200"
                  )}
                >
                  Manual
                </button>
                <button
                  onClick={() => setTab("auto")}
                  className={cx(
                    "flex-1 md:flex-initial px-2 py-1 rounded-md text-sm font-medium transition",
                    tab === "auto" ? "bg-[#2a2a2a] text-white shadow-inner" : "text-gray-400 hover:text-gray-200"
                  )}
                >
                  Auto
                </button>
              </div>
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="p-2 rounded-lg bg-[#0a0a0a] hover:bg-[#2a2a2a] transition"
                data-testid="button-toggle-audio"
                title={audioEnabled ? "Mute sounds" : "Unmute sounds"}
              >
                {audioEnabled ? <Volume2 className="w-5 h-5 text-gray-400" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
              </button>
            </div>

            {/* Bet Amount */}
            <div className="mt-4 md:mt-6">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span className="inline-flex items-center gap-2">
                  <span>Bet Amount</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-xs rounded-full bg-white/10">i</span>
                </span>
                <span>{(Number(bet) || 0).toFixed(2)} Credits</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center">
                    {/* Coin icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
                      <circle cx="12" cy="12" r="10" stroke="#8892A6" strokeWidth="1.5" />
                      <path d="M12 6v12M8 9h8M8 15h8" stroke="#8892A6" strokeWidth="1.5" />
                    </svg>
                  </span>
                  <input
                    value={bet}
                    onChange={(e) => setBet(e.target.value)}
                    className="w-full h-8 pl-9 pr-3 rounded-lg bg-[#0a0a0a] border border-gray-700 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <button 
                  onClick={halfBet} 
                  className="h-8 px-2 rounded-lg bg-[#0a0a0a] border border-gray-700 text-white text-sm hover:bg-[#2a2a2a]"
                >
                  ½
                </button>
                <button 
                  onClick={doubleBet}
                  className="h-8 px-2 rounded-lg bg-[#0a0a0a] border border-gray-700 text-white text-sm hover:bg-[#2a2a2a]"
                >
                  2×
                </button>
              </div>
            </div>

            {/* Risk */}
            <div className="mt-4 md:mt-6">
              <div className="text-xs text-gray-400 mb-2">Risk</div>
              <div className="flex gap-2 md:gap-3">
                <RiskPill label="Low" active={risk === "low"} onClick={() => setRisk("low")} />
                <RiskPill label="Medium" active={risk === "medium"} onClick={() => setRisk("medium")} />
                <RiskPill label="High" active={risk === "high"} onClick={() => setRisk("high")} />
              </div>
            </div>

            {/* Rows slider */}
            <div className="mt-4 md:mt-6">
              <div className="text-xs text-gray-400 mb-2">Rows</div>
              <div className="text-base mb-2">{rows}</div>
              <input
                type="range"
                min={8}
                max={16}
                step={1}
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value))}
                className="w-full h-2 bg-[#0a0a0a] rounded-full appearance-none cursor-pointer"
                style={{ 
                  background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${((rows - 8) / (16 - 8)) * 100}%, #0a0a0a ${((rows - 8) / (16 - 8)) * 100}%, #0a0a0a 100%)` 
                }}
              />
            </div>

            {/* Manual mode controls */}
            {tab === "manual" && (
              <div className="mt-4 md:mt-6">
                <div className="text-xs text-gray-400 mb-2">Manual Mode Active</div>
                <div className="text-sm text-gray-300">Click the bet button below the game board to place your bet.</div>
              </div>
            )}
            
            {/* Auto mode controls */}
            {tab === "auto" && (
              <>
                <div className="mt-4 md:mt-6 space-y-4">
                  {/* Number of rounds */}
                  <div>
                    <label className="text-xs text-gray-400">Number of Rounds</label>
                    <input
                      type="number"
                      value={autoRounds}
                      onChange={(e) => setAutoRounds(e.target.value)}
                      disabled={autoRunning}
                      className="w-full h-8 px-2 mt-1 rounded-lg bg-[#0a0a0a] border border-gray-700 text-white text-sm"
                      placeholder="10"
                      min="1"
                      max="1000"
                    />
                  </div>
                  
                  {/* Stop on win */}
                  <div>
                    <label className="text-xs text-gray-400">Stop on Profit (optional)</label>
                    <input
                      type="number"
                      value={stopOnWin}
                      onChange={(e) => setStopOnWin(e.target.value)}
                      disabled={autoRunning}
                      className="w-full h-8 px-2 mt-1 rounded-lg bg-[#0a0a0a] border border-gray-700 text-white text-sm"
                      placeholder="0.00"
                      min="0"
                    />
                  </div>
                  
                  {/* Stop on loss */}
                  <div>
                    <label className="text-xs text-gray-400">Stop on Loss (optional)</label>
                    <input
                      type="number"
                      value={stopOnLoss}
                      onChange={(e) => setStopOnLoss(e.target.value)}
                      disabled={autoRunning}
                      className="w-full h-8 px-2 mt-1 rounded-lg bg-[#0a0a0a] border border-gray-700 text-white text-sm"
                      placeholder="0.00"
                      min="0"
                    />
                  </div>
                  
                  {/* Auto play stats */}
                  {autoRunning && (
                    <div className="p-3 rounded-lg bg-[#2a2a2a] space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Round</span>
                        <span className="text-white">{currentAutoRound} / {autoRounds}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Total Profit</span>
                        <span className={cx(
                          "font-semibold",
                          totalAutoProfit >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {totalAutoProfit >= 0 ? "+" : ""}{totalAutoProfit.toFixed(2)} Credits
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Start/Stop button */}
                  <button
                    onClick={autoRunning ? stopAutoPlay : startAutoPlay}
                    disabled={!autoRunning && (!canBet || activeBalls.length > 0)}
                    className={cx(
                      "h-8 w-full rounded-xl text-sm font-semibold transition shadow-sm",
                      autoRunning 
                        ? "bg-red-500 hover:bg-red-600" 
                        : canBet && activeBalls.length === 0
                          ? "bg-[#7c3aed] hover:bg-[#6d28d9]"
                          : "bg-[#7c3aed]/40 cursor-not-allowed"
                    )}
                  >
                    {autoRunning ? "Stop Auto Play" : "Start Auto Play"}
                  </button>
                </div>
              </>
            )}
          </aside>

          {/* RIGHT: BOARD */}
          <main className="flex-1 px-2 md:px-2 pt-4 md:pt-6 pb-20 md:pb-24 order-1 md:order-2" style={{ background: '#1a2332' }}>
            {/* Peg triangle with ball animation and chips */}
            <div className="mx-auto max-w-full md:max-w-[1200px] relative">
              <PegTriangle rows={rows} activeBalls={activeBalls} />
              
              {/* Bottom chips - aligned with landing positions */}
              <div className="relative w-full" style={{ marginTop: '-25px' }}>
                <div className="relative" style={{ 
                  width: '100%',
                  paddingBottom: '40px'
                }}>
                  {multipliers.map((m, i) => {
                    // Calculate chip positions to align with where balls land
                    // Balls land between pegs and at edges, creating rows+1 positions
                    const totalPositions = rows + 1;
                    const maxWidth = 65; // Same as bottom peg row width
                    const position = (i / (totalPositions - 1)) * maxWidth;
                    const leftOffset = 50 - (maxWidth / 2) + position;
                    
                    return (
                      <div
                        key={i}
                        className="absolute"
                        style={{
                          left: `${leftOffset}%`,
                          transform: 'translateX(-50%)',
                          top: '0'
                        }}
                      >
                        <Chip 
                          idx={i} 
                          rows={rows} 
                          label={`${formatMult(m)}x`}
                          isLanded={activeBalls.some(ball => 
                            ball.isComplete && ball.path[rows] === i
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Bet amount bar positioned under multiplier chips */}
              <div className="mt-8 max-w-md mx-auto">
                <div className="flex items-center gap-2 mb-4 bg-[#1a1a1a] rounded-xl p-3 shadow-xl border border-gray-800">
                  <div className="flex-1 relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center">
                      {/* Coin icon */}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
                        <circle cx="12" cy="12" r="10" stroke="#8892A6" strokeWidth="1.5" />
                        <path d="M12 6v12M8 9h8M8 15h8" stroke="#8892A6" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <input
                      value={bet}
                      onChange={(e) => setBet(e.target.value)}
                      className="w-full h-8 pl-9 pr-3 rounded-lg bg-[#0a0a0a] border border-gray-700 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
                      placeholder="0.00"
                      data-testid="input-bet-amount"
                    />
                  </div>
                  <button 
                    onClick={halfBet} 
                    className="h-8 px-2 rounded-lg bg-[#0a0a0a] border border-gray-700 text-white text-sm hover:bg-[#2a2a2a]"
                    data-testid="button-half-bet"
                  >
                    ½
                  </button>
                  <button 
                    onClick={doubleBet}
                    className="h-8 px-2 rounded-lg bg-[#0a0a0a] border border-gray-700 text-white text-sm hover:bg-[#2a2a2a]"
                    data-testid="button-double-bet"
                  >
                    2×
                  </button>
                </div>
                
                <div className="text-xs text-gray-400 text-center mb-4">
                  Balance: {balanceData ? formatCredits(balanceData.available) : '0.00'} Credits
                </div>
                
                {/* Bet button positioned under bet amount controls */}
                {tab === "manual" && (
                  <button
                    onClick={handleBet}
                    disabled={!canBet}
                    className={cx(
                      "h-8 w-full rounded-xl text-sm font-semibold transition shadow-lg mt-2",
                      canBet ? "bg-[#7c3aed] hover:bg-[#6d28d9] text-white" : "bg-[#7c3aed]/40 cursor-not-allowed text-gray-400"
                    )}
                    data-testid="button-bet"
                  >
                    {activeBalls.length > 0 ? `Dropping (${activeBalls.length})...` : `Place Bet (${(Number(bet) || 0).toFixed(2)} Credits)`}
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function RiskPill({ 
  label, 
  active, 
  onClick
}: { 
  label: string; 
  active?: boolean; 
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "h-8 rounded-md px-2 md:px-2 text-sm font-medium border border-gray-700 bg-[#0a0a0a]",
        "transition hover:bg-[#2a2a2a] text-gray-200 flex-1 md:flex-initial",
        active && "bg-[#1a1a1a] text-white border-purple-600"
      )}
    >
      {label}
    </button>
  );
}

function PegTriangle({ 
  rows, 
  activeBalls 
}: { 
  rows: number;
  activeBalls: AnimatedBall[];
}) {
  // Create proper triangular peg layout
  const pegRows = rows;
  
  return (
    <div className="w-full flex flex-col items-center select-none relative">
      {/* Animated balls layer */}
      <div className="absolute inset-0 pointer-events-none">
        {activeBalls.map(ball => (
          <div
            key={ball.id}
            className="absolute"
            style={{
              left: `${ball.x}%`,
              top: `${ball.y}%`,
              transform: 'translate(-50%, -50%)',
              width: '22px',
              height: '32px', // Egg shape - taller than wide
              filter: ball.isComplete 
                ? 'drop-shadow(0 0 16px rgba(212, 175, 55, 1))' 
                : 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))',
              transition: ball.bounceCount > 0 ? 'none' : 'all 80ms ease-out',
              zIndex: ball.isComplete ? 10 : 1,
              animation: ball.bounceCount > 0 ? 'plinkoEggBounce 0.5s ease-out' : 'plinkoEggFloat 2s ease-in-out infinite'
            }}
          >
            <div 
              className="w-full h-full bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600"
              style={{
                borderRadius: '50% / 60% 60% 40% 40%', // Egg shape
                transform: `rotate(${(ball.x * 3 + ball.bounceCount * 30) % 360}deg)`,
                opacity: ball.isComplete ? 1 : 0.95,
                border: '2px solid rgba(212, 175, 55, 0.8)',
                boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/60 rounded-full blur-sm" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Pegs grid - proper triangle shape */}
      <div className="flex flex-col items-center" style={{ width: '100%', height: 'min(440px, 65vh)' }}>
        {Array.from({ length: pegRows }, (_, row) => {
          // Each row has row+3 pegs (row 0 = 3 pegs, row 1 = 4 pegs, etc.)
          const pegsInRow = row + 3;
          const maxWidth = 65; // Maximum width percentage at bottom
          const rowRatio = (row + 1) / (pegRows + 1);
          const rowWidth = maxWidth * rowRatio;
          const pegSpacing = rowWidth / (pegsInRow - 1);
          
          return (
            <div 
              key={row} 
              className="relative"
              style={{ 
                position: 'absolute',
                top: `${(94 / pegRows) * row}%`,
                left: '50%',
                transform: 'translateX(-50%)',
                width: `${rowWidth}%`,
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              {Array.from({ length: pegsInRow }).map((_, i) => (
                <span 
                  key={i} 
                  className="absolute"
                  style={{
                    left: `${(i / (pegsInRow - 1)) * 100}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <span 
                    className="block w-1.5 h-1.5 rounded-full"
                    style={{
                      background: '#ffffff',
                      boxShadow: '0 0 4px rgba(255, 255, 255, 0.5)'
                    }}
                  />
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ 
  idx, 
  rows, 
  label,
  isLanded 
}: { 
  idx: number; 
  rows: number; 
  label: string;
  isLanded?: boolean;
}) {
  // Color gradient from red (edges) to yellow (center)
  const totalChips = rows + 1;
  const center = totalChips / 2;
  const distance = Math.abs(idx - center);
  const maxDistance = center;
  const ratio = distance / maxDistance;
  
  // Generate gradient color based on position
  let bgColor = "";
  if (ratio > 0.8) {
    bgColor = "#dc2626"; // Deep red for edges
  } else if (ratio > 0.6) {
    bgColor = "#ef4444"; // Red
  } else if (ratio > 0.4) {
    bgColor = "#f97316"; // Orange-red
  } else if (ratio > 0.2) {
    bgColor = "#fb923c"; // Orange
  } else {
    bgColor = "#fbbf24"; // Yellow/Gold for center
  }
  
  const textColor = ratio > 0.3 ? "white" : "black";
  
  // Dynamic sizing based on number of chips and screen size
  const chipCount = rows + 1;
  const sizeClass = chipCount > 12 
    ? "px-1 md:px-1.5 py-1.5 md:py-1 text-sm min-w-[28px] md:min-w-[35px]" // Smaller for 12+ chips
    : "px-1.5 md:px-2.5 py-1 md:py-2.5 text-sm min-w-[35px] md:min-w-[45px]"; // Normal size for fewer chips
  
  return (
    <div
      className={cx(
        "rounded font-bold shadow-md transition-all whitespace-nowrap text-center",
        sizeClass,
        isLanded && "ring-4 ring-yellow-400 scale-110 animate-bounce"
      )}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        boxShadow: isLanded 
          ? '0 0 20px rgba(251, 191, 36, 0.6)' 
          : '0 2px 4px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(0, 0, 0, 0.1)'
      }}
    >
      {label}
    </div>
  );
}