import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, RotateCcw, HelpCircle, Play, Pause } from "lucide-react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { modernSounds } from "@/lib/modern-sounds";
import { useGameMode } from "@/contexts/GameModeContext";
import FavoriteButton from "@/components/FavoriteButton";

interface GameCommitment {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

interface RollResult {
  diceA: number;
  diceB: number;
  sum: number;
  won: boolean;
  payout: number;
  profit: number;
  serverSeed?: string;
  nextServerSeedHash: string;
}

interface BetHistory {
  id: string;
  bet: number;
  multiplier: number;
  game: string;
  roll: number;
  profit: number;
  timestamp: Date;
}

export default function MiraclezDice() {
  const { toast } = useToast();
  const { gameMode } = useGameMode();
  const [, setLocation] = useLocation();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const rollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Game state
  const [betAmount, setBetAmount] = useState(1);
  const [target, setTarget] = useState(6);
  const [side, setSide] = useState<"OVER" | "UNDER">("UNDER");
  const [rolling, setRolling] = useState(false);
  const [diceShaking, setDiceShaking] = useState(false);
  const [lastRoll, setLastRoll] = useState<{ diceA: number; diceB: number; sum: number } | null>(null);
  const [canRisk, setCanRisk] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [betHistory, setBetHistory] = useState<BetHistory[]>([]);
  const [showLastTen, setShowLastTen] = useState(false);
  
  // Risk feature
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskSelection, setRiskSelection] = useState<Set<number>>(new Set([1, 3, 5]));
  const [riskDieResult, setRiskDieResult] = useState<number | null>(null);
  const [riskAnimating, setRiskAnimating] = useState(false);
  
  // Autoplay
  const [showAutoplayModal, setShowAutoplayModal] = useState(false);
  const [autoplayRunning, setAutoplayRunning] = useState(false);
  const [autoplaySettings, setAutoplaySettings] = useState({
    unlimited: true,
    count: 20,
    onWin: "base",
    onLose: "base",
    winPercent: 100,
    losePercent: 100,
  });
  const [autoplayStats, setAutoplayStats] = useState({
    bets: 0,
    profit: 0,
    maxWin: 0,
    maxLose: 0,
  });
  const [baseBet, setBaseBet] = useState(1);

  // Provably fair
  const [showProvablyFairModal, setShowProvablyFairModal] = useState(false);
  const [commitment, setCommitment] = useState<GameCommitment | null>(null);

  // Get user balance with real-time updates
  const { data: balance } = useQuery<{ available: number; locked: number; currency: string; total: number; sweepsCashTotal: number; sweepsCashRedeemable: number; balanceMode: string }>({
    queryKey: ["/api/balance"],
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });

  // Get next commitment with gameMode in query key
  const { data: nextCommitment, isLoading: commitmentLoading } = useQuery({
    queryKey: ["/api/miraclez-dice/next", gameMode],
    enabled: !!balance,
    staleTime: 0, // Always fetch fresh commitment
    placeholderData: (previousData) => previousData, // Keep previous commitment while loading new one
  });

  // Fetch user's dice game history from server
  const { data: serverBetHistory } = useQuery<any[]>({
    queryKey: ["/api/bets?filter=my"],
    enabled: !!balance,
    select: (data: any) => {
      // Filter for dice games and transform to match our BetHistory interface
      const diceBets = data?.bets?.filter((bet: any) => bet.game === 'miraclez-dice') || [];
      return diceBets.map((bet: any) => ({
        id: bet.id,
        bet: bet.betAmount,
        multiplier: bet.multiplier || 0,
        game: 'DICE',
        roll: 0, // We don't have this info from the server
        profit: bet.payout - bet.betAmount,
        timestamp: new Date(bet.timestamp),
      }));
    },
  });

  // Merge server history with local history only once on mount
  useEffect(() => {
    if (serverBetHistory && serverBetHistory.length > 0 && betHistory.length === 0) {
      setBetHistory(serverBetHistory);
    }
  }, [serverBetHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to gameMode changes - reset state and invalidate queries
  useEffect(() => {
    // Reset transient game state on mode change
    setRolling(false);
    setCanRisk(false);
    setLastWin(0);
    setShowRiskModal(false);
    setAutoplayRunning(false);
    
    // Invalidate all relevant queries to refetch for new mode
    queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
    queryClient.invalidateQueries({ queryKey: ["/api/miraclez-dice"] });
  }, [gameMode, queryClient]);

  useEffect(() => {
    if (nextCommitment) {
      setCommitment(nextCommitment as GameCommitment);
    }
    // Don't clear commitment if nextCommitment is undefined during mode transition
  }, [nextCommitment]);

  // Initialize modern sounds
  useEffect(() => {
    modernSounds.setEnabled(audioEnabled);
    return () => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    };
  }, [audioEnabled]);

  // Calculate multiplier based on target and side
  const calculateMultiplier = () => {
    const sumCounts: { [key: number]: number } = {
      2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1
    };
    
    let winCount = 0;
    for (let s = 2; s <= 12; s++) {
      if (side === "UNDER" && s < target) winCount += sumCounts[s];
      if (side === "OVER" && s > target) winCount += sumCounts[s];
    }
    
    if (winCount === 0) return 0;
    const probability = winCount / 36;
    const rtp = 0.96; // 96% RTP
    return Math.max(1.01, Math.floor((rtp / probability) * 100) / 100);
  };

  // Play sound effects using modern sound system
  const playSound = (type: "shake" | "clack" | "win" | "lose") => {
    if (!audioEnabled) return;
    
    switch (type) {
      case "shake":
        modernSounds.playDiceRoll();
        break;
      case "clack":
        modernSounds.playClick();
        break;
      case "win":
        modernSounds.playWin();
        break;
      case "lose":
        modernSounds.playLose();
        break;
    }
  };

  // Roll mutation
  const rollMutation = useMutation({
    mutationFn: async () => {
      if (!commitment) throw new Error("No commitment available");
      
      const response = await apiRequest("POST", "/api/miraclez-dice/roll", {
        betAmount,
        target,
        side,
        clientSeed: commitment.clientSeed,
        nonce: commitment.nonce,
        gameMode,
      });
      return response.json() as Promise<RollResult>;
    },
    onSuccess: (data) => {
      setLastRoll({ diceA: data.diceA, diceB: data.diceB, sum: data.sum });
      
      // Add to history
      const historyEntry: BetHistory = {
        id: crypto.randomUUID(),
        bet: betAmount,
        multiplier: data.won ? calculateMultiplier() : 0,
        game: `${side} ${target}`,
        roll: data.sum,
        profit: data.profit,
        timestamp: new Date(),
      };
      setBetHistory(prev => [historyEntry, ...prev].slice(0, 100));
      
      if (data.won) {
        setCanRisk(true);
        setLastWin(data.payout);
        playSound("win");
        // Only show notification for wins of $100+
        if (data.payout >= 100) {
          toast({
            title: "💰 BIG WIN!",
            description: `+${data.payout.toFixed(2)} credits`,
          });
        }
      } else {
        setCanRisk(false);
        setLastWin(0);
        playSound("lose");
      }
      
      // Update commitment for next roll
      if (data.nextServerSeedHash) {
        setCommitment(prev => prev ? {
          ...prev,
          serverSeedHash: data.nextServerSeedHash,
          nonce: prev.nonce + 1,
        } : null);
      }
      
      // Refetch balance and bet history
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets?filter=my"] });
      
      // Handle autoplay
      if (autoplayRunning) {
        handleAutoplayResult(data.won);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Roll Failed",
        description: error.message,
        variant: "destructive",
      });
      setAutoplayRunning(false);
    },
  });

  // Risk mutation
  const riskMutation = useMutation({
    mutationFn: async () => {
      if (!commitment) throw new Error("No commitment available");
      
      const response = await apiRequest("POST", "/api/miraclez-dice/risk", {
        amount: lastWin,
        selection: Array.from(riskSelection),
        clientSeed: commitment.clientSeed,
        nonce: commitment.nonce,
        gameMode,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setRiskDieResult(data.die);
      setRiskAnimating(true);
      
      setTimeout(() => {
        setRiskAnimating(false);
        setShowRiskModal(false);
        setCanRisk(false);
        setLastWin(0);
        setRiskDieResult(null);
        
        // Add to history
        const historyEntry: BetHistory = {
          id: crypto.randomUUID(),
          bet: lastWin,
          multiplier: data.won ? 1.92 : 0,
          game: "RISK",
          roll: data.die,
          profit: data.profit,
          timestamp: new Date(),
        };
        setBetHistory(prev => [historyEntry, ...prev].slice(0, 100));
        
        if (data.won) {
          playSound("win");
          // Only show notification for wins of $100+
          if (data.payout >= 100) {
            toast({
              title: "💰 RISK BIG WIN!",
              description: `+${data.payout.toFixed(2)} credits`,
            });
          }
        } else {
          playSound("lose");
          // No notification for losses
        }
        
        // Update commitment
        if (data.nextServerSeedHash) {
          setCommitment(prev => prev ? {
            ...prev,
            serverSeedHash: data.nextServerSeedHash,
            nonce: prev.nonce + 1,
          } : null);
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Risk Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAutoplayResult = (won: boolean) => {
    setAutoplayStats(prev => {
      const newProfit = prev.profit + (won ? lastWin - betAmount : -betAmount);
      return {
        bets: prev.bets + 1,
        profit: newProfit,
        maxWin: Math.max(prev.maxWin, newProfit > 0 ? newProfit : 0),
        maxLose: Math.min(prev.maxLose, newProfit < 0 ? newProfit : 0),
      };
    });
    
    // Check if should continue
    if (!autoplaySettings.unlimited && autoplayStats.bets >= autoplaySettings.count - 1) {
      setAutoplayRunning(false);
      return;
    }
    
    // Adjust bet based on result
    let nextBet = baseBet;
    if (won && autoplaySettings.onWin === "inc") {
      nextBet = Math.min(100, betAmount * (1 + autoplaySettings.winPercent / 100));
    } else if (!won && autoplaySettings.onLose === "inc") {
      nextBet = Math.min(100, betAmount * (1 + autoplaySettings.losePercent / 100));
    }
    setBetAmount(Math.floor(nextBet));
    
    // Continue autoplay after delay
    setTimeout(() => {
      if (autoplayRunning) {
        handleRoll();
      }
    }, 1500);
  };

  const handleRoll = async () => {
    if (rolling) return;
    
    // Check balance based on game mode
    const availableBalance = gameMode === 'real' ? (balance?.sweepsCashTotal || 0) : (balance?.available || 0);
    if (betAmount > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: "Not enough credits",
        variant: "destructive",
        duration: 1000,
      });
      setAutoplayRunning(false);
      return;
    }
    
    setRolling(true);
    setDiceShaking(true);
    
    try {
      // Play shake sound twice
      playSound("shake");
      setTimeout(() => playSound("shake"), 350);
      
      // Animate dice shaking for 1.4 seconds
      await new Promise(resolve => setTimeout(resolve, 1400));
      
      setDiceShaking(false);
      playSound("clack");
      
      await rollMutation.mutateAsync();
    } catch (error) {
      // Error handling is already done in the mutation's onError
      // Just ensure we reset the rolling state
    } finally {
      setRolling(false);
      setDiceShaking(false);
    }
  };

  const handleTakeWinnings = async () => {
    if (!canRisk) return;
    
    try {
      await apiRequest("POST", "/api/miraclez-dice/take", {
        amount: lastWin,
        gameMode,
      });
      
      setCanRisk(false);
      setLastWin(0);
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      
      toast({
        title: "Winnings Collected",
        description: `+${lastWin.toFixed(2)} credits added to balance`,
      });
    } catch (error) {
      toast({
        title: "Failed to collect winnings",
        variant: "destructive",
      });
    }
  };

  // Define dots array outside of renderDice for reuse
  const dots: { [key: number]: { x: number; y: number }[] } = {
    1: [{ x: 42, y: 42 }],
    2: [{ x: 22, y: 22 }, { x: 62, y: 62 }],
    3: [{ x: 22, y: 22 }, { x: 42, y: 42 }, { x: 62, y: 62 }],
    4: [{ x: 22, y: 22 }, { x: 62, y: 22 }, { x: 22, y: 62 }, { x: 62, y: 62 }],
    5: [{ x: 22, y: 22 }, { x: 62, y: 22 }, { x: 42, y: 42 }, { x: 22, y: 62 }, { x: 62, y: 62 }],
    6: [{ x: 22, y: 22 }, { x: 62, y: 22 }, { x: 22, y: 42 }, { x: 62, y: 42 }, { x: 22, y: 62 }, { x: 62, y: 62 }],
  };

  const renderDice = (value: number, isRiskDie = false, isAnimating = false) => {
    // For animation, show random face
    const displayValue = isAnimating ? Math.floor(Math.random() * 6) + 1 : value;
    
    return (
      <div className={`relative ${isRiskDie ? "w-[102px] h-[102px]" : "w-[84px] h-[84px]"}`}>
        <svg 
          width={isRiskDie ? "102" : "84"} 
          height={isRiskDie ? "102" : "84"} 
          viewBox="0 0 84 84" 
          className={`rounded-xl shadow-xl ${isRiskDie ? "scale-125" : ""} ${isAnimating ? "animate-spin" : ""}`}
        >
          {/* Die face gradient */}
          <defs>
            <linearGradient id="diceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#ffdd44", stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: "#ffcc2e", stopOpacity: 1 }} />
            </linearGradient>
            <filter id="diceShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>
          
          {/* Die background */}
          <rect width="84" height="84" rx="14" fill="url(#diceGradient)" filter="url(#diceShadow)" />
          
          {/* Die edge highlight */}
          <rect width="82" height="82" x="1" y="1" rx="13" fill="none" stroke="#ffe655" strokeWidth="1" opacity="0.5" />
          
          {/* Dots with 3D effect */}
          {dots[displayValue]?.map((dot, i) => (
            <g key={i}>
              <circle cx={dot.x} cy={dot.y} r="8" fill="#000000" opacity="0.2" />
              <circle cx={dot.x} cy={dot.y - 1} r="7" fill="#1a1a1a" />
              <circle cx={dot.x} cy={dot.y - 2} r="5.5" fill="#0a0a0a" />
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const toggleAutoplay = () => {
    if (autoplayRunning) {
      setAutoplayRunning(false);
    } else {
      setAutoplayRunning(true);
      setAutoplayStats({ bets: 0, profit: 0, maxWin: 0, maxLose: 0 });
      setBaseBet(betAmount);
      setShowAutoplayModal(false);
      handleRoll();
    }
  };

  return (
    <div 
      className="min-h-screen text-white pb-40 lg:pb-28"
      style={{
        background: "radial-gradient(1200px 600px at 75% 60%, #1a222d 0%, #11151c 55%, #0b0f14 100%) no-repeat fixed"
      }}
    >
      <div className="flex flex-col lg:grid lg:grid-cols-[480px,1fr] min-h-screen">
        {/* Mobile Header - Only visible on mobile */}
        <div className="lg:hidden bg-gray-900/95 border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black">Miraclez</h1>
              <span className="bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-black">DICE</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 rounded-full border border-gray-700 bg-gray-900/50"
                onClick={() => setShowProvablyFairModal(true)}
              >
                ?
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 rounded-full border border-gray-700 bg-gray-900/50"
                onClick={() => setAudioEnabled(!audioEnabled)}
              >
                {audioEnabled ? "🔊" : "🔇"}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 rounded-full border border-gray-700 bg-gray-900/50"
                onClick={() => setShowLastTen(!showLastTen)}
              >
                ↺
              </Button>
              <div className="flex items-center gap-2">
                <FavoriteButton gameName="Miraclez Dice" />
                <button
                  onClick={() => setLocation("/")}
                  className="border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition px-1.5 py-0.5 rounded-lg text-xs"
                  data-testid="button-back-casino"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Left Panel - History - Hidden on mobile, shown on desktop */}
        <div 
          className="hidden lg:block border-r border-gray-800 p-6 overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #0d1015 0%, #0b0e12 100%)"
          }}
        >
          <div className="text-xs font-bold tracking-[0.28em] text-gray-400 mb-2">WELCOME TO</div>
          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-lg font-black">Miraclez</h1>
            <span className="bg-yellow-500 text-black px-2 py-1 rounded text-sm font-black tracking-wider">DICE</span>
            <span className="ml-auto text-xs text-gray-500 border border-gray-700 px-2 py-1 rounded">MIRACLEZ</span>
          </div>
          
          <div className="border-t border-gray-800 pt-4">
            <div className="grid grid-cols-5 gap-3 text-xs text-gray-500 font-semibold mb-2 px-2">
              <div>Bet</div>
              <div>Multiplier</div>
              <div>Game</div>
              <div>Roll</div>
              <div>Profit</div>
            </div>
            <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar pr-2">
              {(showLastTen ? betHistory.slice(0, 10) : betHistory).map((entry) => (
                <div key={entry.id} className="grid grid-cols-5 gap-3 text-sm font-semibold border-b border-gray-900 pb-1 px-2">
                  <div>{entry.bet}</div>
                  <div>{entry.multiplier.toFixed(2)}x</div>
                  <div className="text-cyan-400 font-bold">{entry.game}</div>
                  <div>{entry.roll}</div>
                  <div className={entry.profit >= 0 ? "text-green-400" : "text-red-400"}>
                    {entry.profit >= 0 ? "+" : ""}{entry.profit.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Game - Full screen on mobile */}
        <div className="relative flex-1 p-4 pb-20 lg:p-8 lg:pb-8 overflow-hidden">
          {/* Top Controls - Only visible on desktop */}
          <div className="hidden lg:flex absolute top-4 right-4 gap-2 opacity-90 z-10">
            <Button
              size="icon"
              variant="ghost"
              className="w-10 h-10 rounded-full border border-gray-700 bg-gray-900/50 backdrop-blur"
              onClick={() => setShowProvablyFairModal(true)}
              title="Provably fair & verify"
            >
              ?
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="w-10 h-10 rounded-full border border-gray-700 bg-gray-900/50 backdrop-blur"
              onClick={() => setAudioEnabled(!audioEnabled)}
              title="Sound on/off"
            >
              {audioEnabled ? "🔊" : "🔇"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="w-10 h-10 rounded-full border border-gray-700 bg-gray-900/50 backdrop-blur"
              onClick={() => setShowLastTen(!showLastTen)}
              title="Last 10 results"
            >
              ↺
            </Button>
          </div>

          {/* Mobile Game Controls - Visible on mobile */}
          <div className="lg:hidden flex flex-col items-center gap-4 mb-6">
            {/* Target and Over/Under */}
            <div className="flex items-center gap-4 w-full max-w-sm">
              <div className="flex gap-2">
                <Button
                  className={`px-3 py-2 font-bold rounded-lg text-sm ${
                    side === "OVER" ? "bg-gray-600" : "bg-gray-700 opacity-65"
                  }`}
                  onClick={() => setSide("OVER")}
                >
                  OVER
                </Button>
                <Button
                  className={`px-3 py-2 font-bold rounded-lg text-sm ${
                    side === "UNDER" ? "bg-gray-100 text-black" : "bg-gray-200 text-black opacity-65"
                  }`}
                  onClick={() => setSide("UNDER")}
                >
                  UNDER
                </Button>
              </div>
              
              <div className="flex items-center gap-2 flex-1 justify-center">
                <Button className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 text-base"
                  onClick={() => setTarget(Math.max(3, target - 1))}
                  disabled={rolling}
                >
                  −
                </Button>
                <div className="w-20 h-20 rounded-2xl bg-gray-900/80 border border-gray-700 flex items-center justify-center">
                  <div className="text-2xl font-black text-yellow-400">{target}</div>
                </div>
                <Button className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 text-base"
                  onClick={() => setTarget(Math.min(11, target + 1))}
                  disabled={rolling}
                >
                  +
                </Button>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-400">Multiplier</div>
              <div className="text-xl font-black text-white">{calculateMultiplier().toFixed(2)}x</div>
            </div>
          </div>

          {/* Desktop Game Controls - Visible on desktop */}
          <div className="hidden lg:block">
            {/* Over/Under Controls */}
            <div className="absolute right-72 top-12 flex flex-col gap-2">
              <Button
                className={`w-24 font-black tracking-wider rounded-xl ${
                  side === "OVER" ? "bg-gray-600" : "bg-gray-700 opacity-65"
                }`}
                onClick={() => setSide("OVER")}
              >
                OVER
              </Button>
              <Button
                className={`w-24 font-black tracking-wider rounded-xl ${
                  side === "UNDER" ? "bg-gray-100 text-black" : "bg-gray-200 text-black opacity-65"
                }`}
                onClick={() => setSide("UNDER")}
              >
                UNDER
              </Button>
            </div>

            {/* Target Box */}
            <div className="absolute right-44 top-10 w-32 h-32 rounded-3xl bg-gray-900/80 border border-gray-700 flex items-center justify-center shadow-inner">
              <div className="text-3xl font-black text-yellow-400">{target}</div>
            </div>

            {/* Arrow Controls */}
            <div className="absolute right-[106px] top-14 flex flex-col gap-3">
              <Button className="w-12 h-12 rounded-xl bg-gray-700 hover:bg-gray-600 text-lg"
                onClick={() => setTarget(Math.min(11, target + 1))}
                disabled={rolling}
              >
                ▲
              </Button>
              <Button className="w-12 h-12 rounded-xl bg-gray-700 hover:bg-gray-600 text-lg"
                onClick={() => setTarget(Math.max(3, target - 1))}
                disabled={rolling}
              >
                ▼
              </Button>
            </div>

            {/* Multiplier Display */}
            <div className="absolute right-44 top-40 text-center">
              <div className="text-sm text-gray-400">Multiplier</div>
              <div className="text-xl font-black text-white">{calculateMultiplier().toFixed(2)}x</div>
            </div>
          </div>

          {/* Mobile Dice Scene */}
          <div className="lg:hidden flex justify-center items-center h-48 mb-6">
            <div className="relative w-full max-w-sm h-full">
              {/* Mobile Dice Cup */}
              <div 
                className={`absolute right-4 bottom-0 w-32 h-32 rotate-[30deg] rounded-[18px_18px_60%_60%] shadow-xl ${
                  diceShaking ? "animate-pulse" : ""
                }`}
                style={{
                  background: "radial-gradient(55px 70px at 60% 60%, #667385 0%, #3c4757 55%, #2e3745 65%, #151b24 100%)",
                  filter: "drop-shadow(-5px 10px 7px rgba(0,0,0,.35))"
                }}
              />
              
              {/* Mobile Dice - Always show both */}
              <AnimatePresence>
                {!diceShaking ? (
                  <>
                    <motion.div
                      key="mobile-dice1-static"
                      className="absolute"
                      initial={{ x: 30, y: 20, rotate: 0, scale: 0.8 }}
                      animate={{ 
                        x: lastRoll ? 70 + Math.random() * 60 : 100, 
                        y: lastRoll ? 10 + Math.random() * 40 : 50, 
                        rotate: lastRoll ? Math.random() * 720 - 360 : 15,
                        scale: 1
                      }}
                      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                    >
                      <div className="relative w-[60px] h-[60px]">
                        <svg width="60" height="60" viewBox="0 0 84 84" className="rounded-lg shadow-lg">
                          <defs>
                            <linearGradient id="mobileDiceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" style={{ stopColor: "#ffdd44", stopOpacity: 1 }} />
                              <stop offset="100%" style={{ stopColor: "#ffcc2e", stopOpacity: 1 }} />
                            </linearGradient>
                          </defs>
                          <rect width="84" height="84" rx="14" fill="url(#mobileDiceGrad)" />
                          {dots[lastRoll?.diceA || 6]?.map((dot: { x: number; y: number }, i: number) => (
                            <g key={i}>
                              <circle cx={dot.x} cy={dot.y} r="7" fill="#000" opacity="0.2" />
                              <circle cx={dot.x} cy={dot.y - 1} r="6" fill="#111" />
                            </g>
                          ))}
                        </svg>
                      </div>
                    </motion.div>
                    <motion.div
                      key="mobile-dice2-static"
                      className="absolute"
                      initial={{ x: 30, y: 20, rotate: 0, scale: 0.8 }}
                      animate={{ 
                        x: lastRoll ? 140 + Math.random() * 60 : 150, 
                        y: lastRoll ? 45 + Math.random() * 50 : 70, 
                        rotate: lastRoll ? Math.random() * 720 - 360 : -25,
                        scale: 1
                      }}
                      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                    >
                      <div className="relative w-[60px] h-[60px]">
                        <svg width="60" height="60" viewBox="0 0 84 84" className="rounded-lg shadow-lg">
                          <rect width="84" height="84" rx="14" fill="url(#mobileDiceGrad)" />
                          {dots[lastRoll?.diceB || 1]?.map((dot: { x: number; y: number }, i: number) => (
                            <g key={i}>
                              <circle cx={dot.x} cy={dot.y} r="7" fill="#000" opacity="0.2" />
                              <circle cx={dot.x} cy={dot.y - 1} r="6" fill="#111" />
                            </g>
                          ))}
                        </svg>
                      </div>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <motion.div
                      key="mobile-dice1-rolling"
                      className="absolute"
                      animate={{ 
                        x: [30, 33, 27, 31, 29, 30],
                        y: [20, 18, 22, 19, 21, 20],
                        rotate: [0, 360, 720, 1080, 1440, 1800]
                      }}
                      transition={{ 
                        duration: 0.7,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      <div className="w-[60px] h-[60px] rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg animate-pulse" />
                    </motion.div>
                    <motion.div
                      key="mobile-dice2-rolling"
                      className="absolute"
                      animate={{ 
                        x: [30, 27, 33, 29, 31, 30],
                        y: [20, 22, 18, 21, 19, 20],
                        rotate: [0, -360, -720, -1080, -1440, -1800]
                      }}
                      transition={{ 
                        duration: 0.7,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      <div className="w-[60px] h-[60px] rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg animate-pulse" />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Desktop Dice Table Scene */}
          <div className="hidden lg:block absolute right-10 bottom-36 w-[640px] h-[340px] pointer-events-none">
            {/* Dice Cup */}
            <div 
              className={`absolute right-0 bottom-0 w-64 h-64 rotate-[30deg] rounded-[18px_18px_60%_60%] shadow-2xl ${
                diceShaking ? "animate-pulse" : ""
              }`}
              style={{
                background: "radial-gradient(110px 140px at 60% 60%, #667385 0%, #3c4757 55%, #2e3745 65%, #151b24 100%)",
                filter: "drop-shadow(-10px 20px 14px rgba(0,0,0,.35))"
              }}
            />
            
            {/* Dice - Always show both dice */}
            <AnimatePresence>
              {!diceShaking ? (
                <>
                  {/* First die */}
                  <motion.div
                    key="dice1-static"
                    className="absolute"
                    initial={{ x: 60, y: 40, rotate: 0, scale: 0.8 }}
                    animate={{ 
                      x: lastRoll ? 140 + Math.random() * 120 : 200, 
                      y: lastRoll ? 20 + Math.random() * 80 : 100, 
                      rotate: lastRoll ? Math.random() * 720 - 360 : 15,
                      scale: 1
                    }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                  >
                    {renderDice(lastRoll?.diceA || 6, false, false)}
                  </motion.div>
                  
                  {/* Second die */}
                  <motion.div
                    key="dice2-static"
                    className="absolute"
                    initial={{ x: 60, y: 40, rotate: 0, scale: 0.8 }}
                    animate={{ 
                      x: lastRoll ? 280 + Math.random() * 120 : 300, 
                      y: lastRoll ? 90 + Math.random() * 100 : 140, 
                      rotate: lastRoll ? Math.random() * 720 - 360 : -25,
                      scale: 1
                    }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                  >
                    {renderDice(lastRoll?.diceB || 1, false, false)}
                  </motion.div>
                </>
              ) : (
                <>
                  {/* Rolling animation - First die */}
                  <motion.div
                    key="dice1-rolling"
                    className="absolute"
                    animate={{ 
                      x: [60, 65, 55, 62, 58, 60],
                      y: [40, 36, 44, 38, 42, 40],
                      rotate: [0, 360, 720, 1080, 1440, 1800],
                      scale: [1, 1.1, 0.9, 1.05, 0.95, 1]
                    }}
                    transition={{ 
                      duration: 0.7,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  >
                    {renderDice(1, false, true)}
                  </motion.div>
                  
                  {/* Rolling animation - Second die */}
                  <motion.div
                    key="dice2-rolling"
                    className="absolute"
                    animate={{ 
                      x: [60, 55, 65, 58, 62, 60],
                      y: [40, 44, 36, 42, 38, 40],
                      rotate: [0, -360, -720, -1080, -1440, -1800],
                      scale: [1, 0.9, 1.1, 0.95, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 0.7,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  >
                    {renderDice(1, false, true)}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Bottom Controls */}
          <div 
            className="lg:hidden fixed bottom-16 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 p-4 z-40"
          >
            <div className="flex flex-col gap-3">
              {/* Bet Amount Row */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400 whitespace-nowrap">Bet:</label>
                <div className="flex items-center gap-1 flex-1">
                  <Button
                    className="w-12 h-10 rounded bg-gray-700 hover:bg-gray-600 text-sm font-bold"
                    onClick={() => setBetAmount(Math.max(0.1, betAmount / 2))}
                    disabled={rolling || autoplayRunning}
                  >
                    ÷2
                  </Button>
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(0.50, Math.min(100, parseFloat(e.target.value) || 0.50)))}
                    className="flex-1 h-10 bg-gray-800 border-gray-700 text-center text-base font-bold"
                    disabled={rolling || autoplayRunning}
                  />
                  <Button
                    className="w-12 h-10 rounded bg-gray-700 hover:bg-gray-600 text-sm font-bold"
                    onClick={() => setBetAmount(Math.min(100, betAmount * 2))}
                    disabled={rolling || autoplayRunning}
                  >
                    ×2
                  </Button>
                </div>
              </div>
              
              {/* Action Buttons Row */}
              <div className="flex gap-2">
                {canRisk && (
                  <>
                    <Button
                      className="flex-1 h-10 bg-red-600 hover:bg-red-700 font-bold text-sm"
                      onClick={() => setShowRiskModal(true)}
                      disabled={rolling}
                    >
                      RISK
                    </Button>
                    <Button
                      className="flex-1 h-10 bg-green-600 hover:bg-green-700 font-bold text-sm"
                      onClick={handleTakeWinnings}
                      disabled={rolling}
                    >
                      TAKE
                    </Button>
                  </>
                )}
                {!canRisk && (
                  <>
                    <Button
                      className="flex-1 h-10 bg-green-600 hover:bg-green-700 font-bold text-sm"
                      onClick={handleRoll}
                      disabled={rolling || !balance || !commitment || betAmount > (gameMode === 'real' ? (balance.sweepsCashTotal || 0) : (balance.available || 0))}
                    >
                      {rolling ? "ROLLING..." : "ROLL"}
                    </Button>
                    <Button
                      className="h-10 px-3 bg-gray-700 hover:bg-gray-600 font-bold text-sm"
                      onClick={() => setShowAutoplayModal(true)}
                      disabled={rolling}
                    >
                      AUTO
                    </Button>
                  </>
                )}
              </div>

              {/* Balance Display */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Balance:</span>
                <span className="font-bold">
                  {gameMode === 'real' 
                    ? `${(balance?.sweepsCashTotal || 0).toFixed(2)} SC` 
                    : `${(balance?.available || 0).toFixed(2)} SC`}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Centered Controls */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-6">
            {/* Main Roll Button */}
            <Button className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white font-black text-xl shadow-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-700 transition-all"
              onClick={handleRoll}
              disabled={rolling || autoplayRunning || !balance || !commitment || betAmount > (gameMode === 'real' ? (balance.sweepsCashTotal || 0) : (balance.available || 0))}
              data-testid="button-roll"
            >
              {rolling ? "..." : "ROLL"}
            </Button>

            {/* Secondary Action Buttons */}
            <div className="flex items-center gap-4">
              {canRisk ? (
                <>
                  <Button className="w-24 h-24 rounded-full bg-red-600 hover:bg-red-700 border-2 border-red-500 font-bold tracking-widest shadow-lg text-base"
                    onClick={() => setShowRiskModal(true)}
                    disabled={rolling}
                  >
                    RISK
                  </Button>
                  <Button className="w-24 h-24 rounded-full bg-green-600 hover:bg-green-700 border-2 border-green-500 font-bold tracking-widest shadow-lg animate-pulse text-base"
                    onClick={handleTakeWinnings}
                    disabled={rolling}
                  >
                    TAKE
                  </Button>
                </>
              ) : (
                <Button
                  className={`w-24 h-24 rounded-full bg-gray-800 border-2 text-base ${
                    autoplayRunning ? "border-green-500" : "border-gray-600"
                  } hover:bg-gray-700 font-bold tracking-widest shadow-lg`}
                  onClick={() => autoplayRunning ? setAutoplayRunning(false) : setShowAutoplayModal(true)}
                  disabled={rolling && !autoplayRunning}
                >
                  {autoplayRunning ? "STOP" : "AUTO"}
                </Button>
              )}
            </div>
          </div>

          {/* Desktop Bottom Info Bar */}
          <div 
            className="hidden lg:flex absolute bottom-0 left-0 right-0 h-20 border-t border-gray-800 items-center px-2 gap-4 justify-between"
            style={{
              background: "linear-gradient(180deg, #0e1218 0%, #0b0f14 100%)"
            }}
          >
            <div className="text-gray-400 font-bold">
              <div className="text-sm text-gray-500 font-mono">Max bet 100 SC</div>
              Balance <span className="text-yellow-500 font-mono ml-2 text-base">{balance?.available?.toFixed(2) || "0.00"}</span> SC
            </div>

            <div className="ml-auto flex items-center gap-2 text-gray-300 font-bold">
              <Button
                size="sm"
                variant="ghost"
                className="border border-gray-700 hover:bg-gray-800 text-sm"
                onClick={() => setBetAmount(1)}
              >
                Min
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="w-10 h-10 border border-gray-700 hover:bg-gray-800 text-base"
                onClick={() => setBetAmount(Math.max(1, betAmount - 1))}
              >
                −
              </Button>
              <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(0.50, Math.min(100, parseFloat(e.target.value) || 0.50)))}
                  className="w-32 text-center font-mono font-black text-lg bg-transparent border-0 text-white"
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="w-10 h-10 border border-gray-700 hover:bg-gray-800 text-base"
                onClick={() => setBetAmount(Math.min(100, betAmount + 1))}
              >
                +
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="border border-gray-700 hover:bg-gray-800 text-sm"
                onClick={() => setBetAmount(Math.min(100, Math.floor(balance?.available || 100)))}
              >
                Max
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Modal */}
      <Dialog open={showRiskModal} onOpenChange={setShowRiskModal}>
        <DialogContent 
          className="w-[95vw] max-w-4xl border-gray-800 max-h-[90vh] overflow-y-auto"
          style={{
            background: "radial-gradient(1600px 600px at 80% 40%, #611313 0%, #281313 65%, #140909 100%)"
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-black text-white">RISK</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div>
              <p className="text-sm text-gray-400 mb-4">
                Take your chance to boost your latest win<br />
                Choose <b>three numbers</b> and click the Roll button
              </p>
              
              <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <Button
                    key={num}
                    variant={riskSelection.has(num) ? "default" : "outline"}
                    className={`h-16 md:h-24 p-1 md:p-2 font-bold transition-all ${
                      riskSelection.has(num) 
                        ? "bg-yellow-500 text-black border-2 md:border-4 border-white shadow-lg scale-105" 
                        : "bg-yellow-400 text-black hover:bg-yellow-300"
                    } ${riskAnimating ? "pointer-events-none" : ""}`}
                    onClick={() => {
                      const newSelection = new Set(riskSelection);
                      if (newSelection.has(num)) {
                        newSelection.delete(num);
                      } else if (newSelection.size < 3) {
                        newSelection.add(num);
                      }
                      setRiskSelection(newSelection);
                    }}
                    disabled={riskAnimating}
                  >
                    {renderDice(num, true)}
                  </Button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="text-white border-gray-600"
                  onClick={() => setRiskSelection(new Set([2, 4, 6]))}
                  disabled={riskAnimating}
                >
                  EVEN
                </Button>
                <Button 
                  variant="outline" 
                  className="text-white border-gray-600"
                  onClick={() => setRiskSelection(new Set([1, 3, 5]))}
                  disabled={riskAnimating}
                >
                  ODD
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col justify-between mt-4 md:mt-0">
              <div>
                <div className="text-sm text-gray-400">TAKE</div>
                <div className="text-xl md:text-2xl font-black text-white">{lastWin.toFixed(2)} CREDITS</div>
                
                <div className="text-sm text-gray-400 mt-2 md:mt-4">YOU CAN WIN</div>
                <div className="text-xl md:text-2xl font-black text-yellow-400">{(lastWin * 1.92).toFixed(2)} CREDITS</div>
                
                {riskDieResult && (
                  <div className="mt-6 p-4 bg-black/50 rounded-xl">
                    <div className="text-sm text-gray-400 mb-2">Result:</div>
                    <motion.div
                      initial={{ scale: 0, rotate: 0 }}
                      animate={{ scale: 1, rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      {renderDice(riskDieResult)}
                    </motion.div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-gray-100 text-black hover:bg-gray-200" 
                  onClick={() => { 
                    setShowRiskModal(false); 
                    handleTakeWinnings(); 
                  }}
                  disabled={riskAnimating}
                >
                  TAKE
                </Button>
                <Button
                  className="flex-1 bg-black text-white border-2 border-white hover:bg-gray-900"
                  onClick={() => riskMutation.mutate()}
                  disabled={riskSelection.size !== 3 || riskMutation.isPending || riskAnimating}
                >
                  ROLL
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Autoplay Modal */}
      <Dialog open={showAutoplayModal} onOpenChange={setShowAutoplayModal}>
        <DialogContent className="bg-gray-900/95 border-gray-800 backdrop-blur">
          <DialogHeader>
            <DialogTitle className="font-black tracking-wider text-xl">AUTO-PLAY</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoplaySettings.unlimited}
                  onCheckedChange={(checked) => setAutoplaySettings(prev => ({ ...prev, unlimited: checked }))}
                />
                <Label>Unlimited</Label>
              </div>
              {!autoplaySettings.unlimited && (
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setAutoplaySettings(prev => ({ ...prev, count: Math.max(1, prev.count - 1) }))}
                  >
                    −
                  </Button>
                  <Input
                    type="number"
                    value={autoplaySettings.count}
                    onChange={(e) => setAutoplaySettings(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                    className="w-20 text-center"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setAutoplaySettings(prev => ({ ...prev, count: prev.count + 1 }))}
                  >
                    +
                  </Button>
                </div>
              )}
            </div>
            
            <div>
              <Label>On Win:</Label>
              <RadioGroup
                value={autoplaySettings.onWin}
                onValueChange={(value) => setAutoplaySettings(prev => ({ ...prev, onWin: value }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="base" />
                  <Label>Return to base bet</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inc" />
                  <Label>Increase bet by %</Label>
                  {autoplaySettings.onWin === "inc" && (
                    <Input
                      type="number"
                      value={autoplaySettings.winPercent}
                      onChange={(e) => setAutoplaySettings(prev => ({ ...prev, winPercent: parseInt(e.target.value) || 0 }))}
                      className="w-20"
                    />
                  )}
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <Label>On Lose:</Label>
              <RadioGroup
                value={autoplaySettings.onLose}
                onValueChange={(value) => setAutoplaySettings(prev => ({ ...prev, onLose: value }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="base" />
                  <Label>Return to base bet</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inc" />
                  <Label>Increase bet by %</Label>
                  {autoplaySettings.onLose === "inc" && (
                    <Input
                      type="number"
                      value={autoplaySettings.losePercent}
                      onChange={(e) => setAutoplaySettings(prev => ({ ...prev, losePercent: parseInt(e.target.value) || 0 }))}
                      className="w-20"
                    />
                  )}
                </div>
              </RadioGroup>
            </div>
            
            <Button
              className="w-full bg-yellow-500 text-black hover:bg-yellow-400 font-bold"
              onClick={toggleAutoplay}
            >
              Start
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Provably Fair Modal */}
      <Dialog open={showProvablyFairModal} onOpenChange={setShowProvablyFairModal}>
        <DialogContent className="max-w-3xl bg-gray-900/95 border-gray-800 backdrop-blur">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Provably Fair • Miraclez Dice</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              We commit to a <b>server seed hash</b>. Each roll uses HMAC_SHA256(serverSeed, clientSeed + ":" + nonce + ":" + i) 
              to derive randomness. Change your <b>client seed</b> any time. Nonce increments every action. RTP is 96% (house edge 4%).
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <Label className="text-sm text-gray-400">Server Seed Hash (commit):</Label>
                  <Input 
                    value={commitment?.serverSeedHash || ""} 
                    readOnly 
                    className="font-mono text-sm bg-gray-800 border-gray-700" 
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-400">Client Seed:</Label>
                  <Input 
                    value={commitment?.clientSeed || ""} 
                    readOnly 
                    className="font-mono text-sm bg-gray-800 border-gray-700" 
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-400">Nonce:</Label>
                  <Input 
                    value={commitment?.nonce || 0} 
                    readOnly 
                    className="font-mono text-sm bg-gray-800 border-gray-700" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-base">Verify a Roll</h3>
                <p className="text-sm text-gray-400">
                  Use the server seed, client seed, and nonce to verify any roll offline.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full border-gray-700 hover:bg-gray-800"
                  onClick={async () => {
                    try {
                      const response = await apiRequest("POST", "/api/miraclez-dice/rotate-seed", { gameMode });
                      const data = await response.json();
                      toast({
                        title: "Server Seed Rotated",
                        description: `Old seed revealed: ${data.oldSeed.slice(0, 20)}...`,
                      });
                      queryClient.invalidateQueries({ queryKey: ["/api/miraclez-dice/next"] });
                    } catch (error) {
                      toast({
                        title: "Failed to rotate seed",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Reveal & Rotate Server Seed
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Autoplay Stats (floating) */}
      {autoplayRunning && (
        <Card 
          className="fixed bottom-20 md:bottom-36 right-2 md:right-32 bg-gray-900/90 border-gray-700 p-3 md:p-4 text-sm font-mono backdrop-blur z-50"
        >
          <div className="font-bold mb-2 text-yellow-400 text-base">Autoplay stats:</div>
          <div>Bets: {autoplayStats.bets}</div>
          <div className={autoplayStats.profit >= 0 ? "text-green-400" : "text-red-400"}>
            Profit: {autoplayStats.profit.toFixed(2)} C
          </div>
          <div className="text-green-400">Max Win: {autoplayStats.maxWin.toFixed(2)} C</div>
          <div className="text-red-400">Max Lose: {Math.abs(autoplayStats.maxLose).toFixed(2)} C</div>
        </Card>
      )}
    </div>
  );
}