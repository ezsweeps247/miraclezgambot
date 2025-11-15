// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Info, DollarSign, Bomb, Gem, Trophy, Volume2, VolumeX, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { formatCredits } from "@/lib/utils";
import { useGameMode } from "@/contexts/GameModeContext";
import FavoriteButton from "@/components/FavoriteButton";

interface MinesGameState {
  roundId?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
  mines: number;
  tiles: number;
  safeRemaining: number;
  multiplierTable: number[];
  openedTiles: number[];
  currentMultiplier: number;
  picks: number;
  gameActive: boolean;
  betAmount: string;
  revealedMines?: number[];
}

export default function Mines() {
  const { gameMode } = useGameMode();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioContext = useRef<AudioContext | null>(null);
  
  const [gameState, setGameState] = useState<MinesGameState>({
    mines: 3,
    tiles: 25,
    safeRemaining: 22,
    multiplierTable: [],
    openedTiles: [],
    currentMultiplier: 0,
    picks: 0,
    gameActive: false,
    betAmount: "1",
  });
  
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [isRevealing, setIsRevealing] = useState(false);
  
  // Initialize audio context
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContext.current?.close();
    };
  }, []);
  
  // Play sound effects
  const playSound = (type: "click" | "safe" | "mine" | "cashout" | "hover") => {
    if (!audioEnabled || !audioContext.current) return;
    
    const ctx = audioContext.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    if (type === "click") {
      // Soft tap/click sound
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(600, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    } else if (type === "safe") {
      // Pleasant chime for safe reveal
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(523, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.05);
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    } else if (type === "mine") {
      // Explosion sound (low rumble)
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(150, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      // Add some noise for explosion effect
      const noise = ctx.createOscillator();
      const noiseGain = ctx.createGain();
      noise.type = "square";
      noise.frequency.setValueAtTime(50, ctx.currentTime);
      noiseGain.gain.setValueAtTime(0.15, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();
      noise.stop(ctx.currentTime + 0.2);
    } else if (type === "cashout") {
      // Success fanfare
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      oscillator.frequency.setValueAtTime(554, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    } else if (type === "hover") {
      // Subtle hover sound
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    }
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
  };
  
  // Auto play states
  const [autoRounds, setAutoRounds] = useState("10");
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoRoundsPlayed, setAutoRoundsPlayed] = useState(0);
  const [autoPicksPerRound, setAutoPicksPerRound] = useState("3");
  const [autoStopOnProfit, setAutoStopOnProfit] = useState(1.5);
  const [autoStopOnLoss, setAutoStopOnLoss] = useState(false);
  const autoStopRef = React.useRef(false);
  
  // Get user balance (includes balanceMode preference)
  const { data: balance } = useQuery({
    queryKey: ["/api/balance"],
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });

  // Get the user's actual balance mode from server (GC or SC)
  const currentBalanceMode = balance?.balanceMode || 'GC';
  const isRealMoney = currentBalanceMode === 'SC';

  // React to balance mode changes - reset state and invalidate queries
  useEffect(() => {
    // Reset game state on mode change
    setIsRevealing(false);
    setAutoRunning(false);
    setGameState(prev => ({
      mines: 3,
      tiles: 25,
      safeRemaining: 22,
      multiplierTable: [],
      openedTiles: [],
      currentMultiplier: 0,
      picks: 0,
      gameActive: false,
      betAmount: "1",
    }));
    
    // Invalidate balance query to refetch for new mode
    queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
    queryClient.invalidateQueries({ queryKey: ["/api/mines"] });
  }, [currentBalanceMode, queryClient]);

  // Balance validation helper
  const getBalanceValidation = () => {
    if (!balance) return { isValid: false, message: "Loading balance..." };
    
    const betAmount = parseFloat(gameState.betAmount);
    const availableBalance = isRealMoney ? (balance.sweepsCashTotal || 0) : (balance.total || 0);
    
    if (betAmount <= 0) return { isValid: false, message: "Enter bet amount" };
    if (betAmount > availableBalance) {
      return { 
        isValid: false, 
        message: isRealMoney ? "Insufficient SC" : "Insufficient GC" 
      };
    }
    
    return { isValid: true, message: "Ready to bet" };
  };

  const balanceValidation = getBalanceValidation();
  
  // Start game mutation
  const startGame = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/mines/start", {
        betAmount: gameState.betAmount,
        mines: gameState.mines,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGameState(prev => ({
        ...prev,
        roundId: data.roundId,
        serverSeedHash: data.serverSeedHash,
        clientSeed: data.clientSeed,
        nonce: data.nonce,
        tiles: data.tiles,
        safeRemaining: data.safeRemaining,
        multiplierTable: data.multiplierTable,
        openedTiles: [],
        currentMultiplier: 0,
        picks: 0,
        gameActive: true,
        revealedMines: undefined,
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start game",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Pick tile mutation
  const pickTile = useMutation({
    mutationFn: async (tileIndex: number) => {
      playSound("click");
      const response = await apiRequest("POST", "/api/mines/pick", {
        roundId: gameState.roundId,
        tileIndex,
      });
      return response.json();
    },
    onSuccess: (data, tileIndex) => {
      if (data.state === "safe") {
        playSound("safe");
        setGameState(prev => ({
          ...prev,
          openedTiles: data.openedTiles || [...prev.openedTiles, tileIndex],
          currentMultiplier: data.currentMultiplier || 0,
          picks: data.picks || prev.picks + 1,
          safeRemaining: data.safeRemaining ?? prev.safeRemaining - 1,
        }));
        
        // Auto cashout if all safe tiles revealed
        if (data.safeRemaining === 0) {
          toast({
            title: "Auto Cashout!",
            description: `All safe tiles revealed! Won ${formatCredits(parseFloat(gameState.betAmount) * data.currentMultiplier)}`,
          });
          setGameState(prev => ({ ...prev, gameActive: false }));
          queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
        }
        return { success: true, multiplier: data.currentMultiplier };
      } else if (data.state === "boom") {
        playSound("mine");
        setIsRevealing(true);
        setGameState(prev => ({
          ...prev,
          revealedMines: data.minePositions,
          openedTiles: [...prev.openedTiles, tileIndex],
          gameActive: false,
        }));
        
        toast({
          title: "BOOM! 💥",
          description: "You hit a mine! Game over.",
          variant: "destructive",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
        return { success: false };
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to pick tile",
        description: error.message,
        variant: "destructive",
      });
      return { success: false };
    },
  });
  
  // Cashout mutation
  const cashOut = useMutation({
    mutationFn: async () => {
      playSound("cashout");
      const response = await apiRequest("POST", "/api/mines/cashout", {
        roundId: gameState.roundId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGameState(prev => ({
        ...prev,
        gameActive: false,
        revealedMines: data.minePositions,
      }));
      
      toast({
        title: "Cashed Out! 💰",
        description: `Won ${formatCredits(data.payout)} with ${data.currentMultiplier.toFixed(2)}x multiplier!`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cash out",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleTileClick = (index: number) => {
    if (!gameState.gameActive) return;
    if (gameState.openedTiles.includes(index)) return;
    if (pickTile.isPending) return;
    if (autoRunning) return;
    
    pickTile.mutate(index);
  };
  
  const handleBetAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setGameState(prev => ({ ...prev, betAmount: value }));
    }
  };
  
  // Auto play functions
  async function startAutoPlay() {
    const betAmount = parseFloat(gameState.betAmount);
    const availableBalance = isRealMoney ? (balance?.sweepsCashTotal || 0) : (balance?.total || 0);
    
    if (!balance || betAmount > availableBalance) {
      toast({
        title: "Insufficient balance",
        description: isRealMoney ? "Not enough Sweeps Cash (SC)" : "Not enough Gold Credits (GC)",
        variant: "balance" as any,
        duration: 1000,
      });
      return;
    }
    
    autoStopRef.current = false;
    setAutoRunning(true);
    setAutoRoundsPlayed(0);
    
    const rounds = Number(autoRounds) || 10;
    const picksPerRound = Number(autoPicksPerRound) || 3;
    
    for (let round = 0; round < rounds; round++) {
      if (autoStopRef.current) break;
      
      setAutoRoundsPlayed(round + 1);
      
      // Start a new game
      await new Promise<void>((resolve) => {
        startGame.mutate(undefined, {
          onSuccess: () => resolve(),
          onError: () => {
            autoStopRef.current = true;
            resolve();
          }
        });
      });
      
      if (autoStopRef.current) break;
      
      // Wait for game to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Make picks for this round
      let hitMine = false;
      let currentMultiplier = 0;
      
      for (let pick = 0; pick < picksPerRound; pick++) {
        if (autoStopRef.current || hitMine) break;
        
        // Find available tiles - we need to check the current state
        const currentState = gameState;
        const availableTiles = Array.from({ length: 25 }, (_, i) => i)
          .filter(i => !currentState.openedTiles.includes(i));
        
        if (availableTiles.length === 0) break;
        
        // Pick a random tile
        const randomTile = availableTiles[Math.floor(Math.random() * availableTiles.length)];
        
        // Wait for pick result
        const result = await new Promise<any>((resolve) => {
          pickTile.mutate(randomTile, {
            onSuccess: (data) => resolve(data),
            onError: () => resolve({ success: false })
          });
        });
        
        if (!result || !result.success) {
          hitMine = true;
        } else {
          currentMultiplier = result.multiplier;
        }
        
        // Small delay between picks
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      // Check stop conditions
      if (!hitMine && currentMultiplier > 0) {
        // Check profit target
        if (currentMultiplier >= autoStopOnProfit) {
          await cashOut.mutateAsync();
          toast({
            title: "Auto play stopped",
            description: `Target profit reached: ${currentMultiplier.toFixed(2)}x`,
          });
          break;
        }
        
        // Cash out this round
        await cashOut.mutateAsync();
      } else if (hitMine && autoStopOnLoss) {
        toast({
          title: "Auto play stopped",
          description: "Stopped due to loss",
          variant: "destructive",
        });
        break;
      }
      
      // Small delay between rounds
      if (round < rounds - 1 && !autoStopRef.current) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setAutoRunning(false);
    setAutoRoundsPlayed(0);
  }
  
  function stopAutoPlay() {
    autoStopRef.current = true;
    setAutoRunning(false);
  }
  
  const multiplyBet = (multiplier: number) => {
    const current = parseFloat(gameState.betAmount) || 0;
    setGameState(prev => ({ ...prev, betAmount: (current * multiplier).toFixed(2) }));
  };
  
  const renderTile = (index: number) => {
    const isOpened = gameState.openedTiles.includes(index);
    const isMine = gameState.revealedMines?.includes(index);
    const isSafe = isOpened && !isMine;
    
    return (
      <motion.button
        key={index}
        className={`
          aspect-square rounded-lg border-2 transition-all duration-200
          ${!gameState.gameActive && !isOpened && !isMine 
            ? 'bg-gray-800 border-gray-700 cursor-not-allowed opacity-50' 
            : isOpened
              ? isMine
                ? 'bg-red-600/20 border-red-500 cursor-not-allowed'
                : 'bg-green-600/20 border-green-500 cursor-not-allowed'
              : 'bg-[#1F232B] border-gray-700 hover:bg-[#2A2F3A] hover:border-gray-600 cursor-pointer'
          }
        `}
        onClick={() => handleTileClick(index)}
        disabled={!gameState.gameActive || isOpened}
        whileTap={{ scale: gameState.gameActive && !isOpened ? 0.95 : 1 }}
        animate={
          isMine && isRevealing
            ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
            : isSafe
              ? { scale: [1, 1.05, 1] }
              : {}
        }
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence>
          {isOpened && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex items-center justify-center"
            >
              {isMine ? (
                <Bomb className="w-6 h-6 text-red-500" />
              ) : (
                <Gem className="w-6 h-6 text-green-500" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  };
  
  return (
    <div className="min-h-screen bg-[#0f1212] text-gray-200 p-2 md:p-4 pb-28">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" />
            Mines
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAudioEnabled(!audioEnabled)}
              data-testid="button-toggle-audio"
              title={audioEnabled ? "Mute sounds" : "Unmute sounds"}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <div className="flex items-center gap-2">
              <FavoriteButton gameName="Mines" />
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
        </div>
        
        <div className="flex flex-col gap-4 md:gap-6">
          {/* Game Board - NOW AT TOP */}
          <Card className="bg-[#1a1d1e] border-gray-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-5 gap-4 max-w-[520px] mx-auto">
                {Array.from({ length: 25 }, (_, i) => renderTile(i))}
              </div>
              
              {/* Multiplier Table */}
              {gameState.multiplierTable.length > 0 && !gameState.gameActive && (
                <div className="mt-6 p-4 bg-[#0B0D13] rounded-lg">
                  <h3 className="text-sm font-semibold mb-2 text-gray-400">
                    Multiplier Progression ({gameState.mines} mines)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {gameState.multiplierTable.slice(0, 10).map((mult, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1 bg-[#1A1D24] rounded text-xs"
                      >
                        <span className="text-gray-500">{idx + 1}:</span>{" "}
                        <span className="text-yellow-500 font-bold">{mult.toFixed(2)}x</span>
                      </div>
                    ))}
                    {gameState.multiplierTable.length > 10 && (
                      <div className="px-2 py-1 text-xs text-gray-500">
                        +{gameState.multiplierTable.length - 10} more...
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Win Display */}
              {!gameState.gameActive && gameState.picks > 0 && gameState.currentMultiplier > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mt-6 p-4 bg-green-600/10 border border-green-500 rounded-lg text-center"
                >
                  <Trophy className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-base font-bold text-green-500">
                    Won {formatCredits(parseFloat(gameState.betAmount) * gameState.currentMultiplier)}!
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {gameState.picks} safe tiles × {gameState.currentMultiplier.toFixed(2)}x multiplier
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
          
          {/* Control Panel - NOW AT BOTTOM */}
          <Card className="bg-[#1a1d1e] border-gray-800">
            <CardContent className="p-3 md:p-4 space-y-3 md:space-y-4">
              {/* Mode Selector */}
              <Tabs value={mode} onValueChange={(v) => setMode(v as "manual" | "auto")}>
                <TabsList className="grid w-full grid-cols-2 bg-[#0f1212]">
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                  <TabsTrigger value="auto">Auto</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* Bet Amount */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Bet Amount</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                    <Input
                      type="number"
                      value={gameState.betAmount}
                      onChange={(e) => handleBetAmountChange(e.target.value)}
                      className="pl-8 bg-[#0f1212] border-gray-700 text-white"
                      disabled={gameState.gameActive}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      {parseFloat(gameState.betAmount).toFixed(2)} Credits
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => multiplyBet(0.5)}
                    disabled={gameState.gameActive}
                    className="bg-[#0f1212] border-gray-700"
                  >
                    ½
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => multiplyBet(2)}
                    disabled={gameState.gameActive}
                    className="bg-[#0f1212] border-gray-700"
                  >
                    2×
                  </Button>
                </div>
              </div>
              
              {/* Mines Selector */}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Mines</label>
                <Select
                  value={gameState.mines.toString()}
                  onValueChange={(v) => setGameState(prev => ({ ...prev, mines: parseInt(v) }))}
                  disabled={gameState.gameActive}
                >
                  <SelectTrigger className="bg-[#0f1212] border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1212] border-gray-700">
                    <SelectItem value="3">3 Mines</SelectItem>
                    <SelectItem value="5">5 Mines</SelectItem>
                    <SelectItem value="10">10 Mines</SelectItem>
                    <SelectItem value="15">15 Mines</SelectItem>
                    <SelectItem value="20">20 Mines</SelectItem>
                    <SelectItem value="24">24 Mines</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Game Info */}
              {gameState.gameActive && (
                <div className="space-y-2 p-3 bg-[#0f1212] rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Current Multiplier</span>
                    <span className="font-bold text-green-500">
                      {gameState.currentMultiplier.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Potential Win</span>
                    <span className="font-bold">
                      {(parseFloat(gameState.betAmount) * gameState.currentMultiplier).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Safe Tiles Left</span>
                    <span>{gameState.safeRemaining}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Next Pick Multiplier</span>
                    <span className="text-yellow-500">
                      {gameState.multiplierTable[gameState.picks]?.toFixed(2) || "MAX"}x
                    </span>
                  </div>
                </div>
              )}
              
              {/* Manual Mode Controls */}
              {mode === "manual" && (
                <>
                  {!gameState.gameActive ? (
                    <Button
                      className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                      onClick={() => startGame.mutate()}
                      disabled={
                        startGame.isPending || 
                        autoRunning ||
                        !balanceValidation.isValid
                      }
                    >
                      {startGame.isPending ? "Starting..." : balanceValidation.message === "Ready to bet" ? "Bet" : balanceValidation.message}
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => cashOut.mutate()}
                      disabled={cashOut.isPending || gameState.picks === 0}
                    >
                      {cashOut.isPending 
                        ? "Cashing out..." 
                        : `Cash Out ${(parseFloat(gameState.betAmount) * gameState.currentMultiplier).toFixed(2)}`
                      }
                    </Button>
                  )}
                </>
              )}
              
              {/* Auto Mode Controls */}
              {mode === "auto" && (
                <div className="space-y-3">
                  {/* Auto Settings */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm text-gray-400">Number of Rounds</label>
                      <Input
                        type="number"
                        value={autoRounds}
                        onChange={(e) => setAutoRounds(e.target.value)}
                        disabled={autoRunning || gameState.gameActive}
                        className="bg-[#0f1212] border-gray-700"
                        min="1"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Picks per Round</label>
                      <Input
                        type="number"
                        value={autoPicksPerRound}
                        onChange={(e) => setAutoPicksPerRound(e.target.value)}
                        disabled={autoRunning || gameState.gameActive}
                        className="bg-[#0f1212] border-gray-700"
                        min="1"
                        max="10"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Stop on Profit (multiplier)</label>
                      <Input
                        type="number"
                        value={autoStopOnProfit}
                        onChange={(e) => setAutoStopOnProfit(parseFloat(e.target.value))}
                        disabled={autoRunning || gameState.gameActive}
                        className="bg-[#0f1212] border-gray-700"
                        min="1.1"
                        max="10"
                        step="0.1"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={autoStopOnLoss}
                        onChange={(e) => setAutoStopOnLoss(e.target.checked)}
                        disabled={autoRunning || gameState.gameActive}
                        className="rounded"
                      />
                      <span>Stop on any loss</span>
                    </label>
                  </div>
                  
                  {/* Auto Play Button */}
                  <Button
                    className={`w-full ${
                      autoRunning 
                        ? "bg-red-600 hover:bg-red-700" 
                        : "bg-[#7c3aed] hover:bg-[#6d28d9]"
                    } text-white`}
                    onClick={autoRunning ? stopAutoPlay : startAutoPlay}
                    disabled={gameState.gameActive || (parseFloat(gameState.betAmount) <= 0 && !autoRunning)}
                  >
                    {autoRunning 
                      ? `Stop (${autoRoundsPlayed}/${autoRounds})`
                      : "Start Auto Play"
                    }
                  </Button>
                  
                  {/* Manual cashout during auto play */}
                  {gameState.gameActive && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => cashOut.mutate()}
                      disabled={cashOut.isPending || gameState.picks === 0}
                    >
                      {cashOut.isPending 
                        ? "Cashing out..." 
                        : `Cash Out ${(parseFloat(gameState.betAmount) * gameState.currentMultiplier).toFixed(2)}`
                      }
                    </Button>
                  )}
                </div>
              )}
              
              {/* Balance Display */}
              <div className="pt-2 border-t border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Balance</span>
                  <span className="font-bold">{balance?.available?.toFixed(2) || "0.00"}</span>
                </div>
              </div>
              
              {/* Provably Fair */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-gray-500 hover:text-gray-300"
                onClick={() => {
                  if (gameState.serverSeedHash) {
                    toast({
                      title: "Provably Fair",
                      description: `Server Seed Hash: ${gameState.serverSeedHash.slice(0, 16)}...`,
                    });
                  }
                }}
              >
                <Info className="w-4 h-4 mr-1" />
                Provably Fair
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}