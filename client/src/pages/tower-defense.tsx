import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Play, Shield, Swords, Trophy, Volume2, VolumeX, Info } from "lucide-react";
import { useLocation } from "wouter";
import FavoriteButton from "@/components/FavoriteButton";
import { useGameMode } from "@/contexts/GameModeContext";
import Phaser from "phaser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { TowerDefenseGameScene } from '@/games/tower-defense/game-scene';

interface GameResult {
  won: boolean;
  multiplier: number;
  payout: number;
  profit: number;
  serverSeed?: string;
  clientSeed?: string;
  nonce?: number;
}

interface DoubleUpResult {
  won: boolean;
  playerCard: string;
  dealerCard: string;
  newAmount: number;
}

export default function TowerDefense() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { gameMode } = useGameMode();
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<TowerDefenseGameScene | null>(null);
  
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [betAmount, setBetAmount] = useState(1);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Double-up modal state
  const [showDoubleUp, setShowDoubleUp] = useState(false);
  const [doubleUpAmount, setDoubleUpAmount] = useState(0);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [revealedCards, setRevealedCards] = useState<{ player: string; dealer: string } | null>(null);
  
  // Get user balance
  const { data: balance } = useQuery<{ available: number; locked: number; currency: string; total: number; sweepsCashTotal?: number }>({
    queryKey: ["/api/balance"],
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });
  
  // Initialize Phaser game
  useEffect(() => {
    const createGame = () => {
      if (gameRef.current && !phaserGame.current) {
        // Calculate responsive dimensions
        const isMobile = window.innerWidth < 768;
        const maxWidth = Math.min(window.innerWidth - (isMobile ? 16 : 32), 800);
        
        // Use more screen height on mobile (70% instead of 50%)
        let gameWidth, gameHeight;
        if (isMobile) {
          gameWidth = maxWidth;
          // Use 70% of viewport height or maintain aspect ratio, whichever is smaller
          gameHeight = Math.min(window.innerHeight * 0.7, maxWidth * 0.75);
        } else {
          gameWidth = 800;
          gameHeight = 600;
        }
        
        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          parent: gameRef.current,
          width: gameWidth,
          height: gameHeight,
          backgroundColor: '#0a0d14',
          scene: TowerDefenseGameScene,
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: gameWidth,
            height: gameHeight,
            parent: gameRef.current
          },
          physics: {
            default: 'arcade',
            arcade: {
              gravity: { x: 0, y: 0 },
              debug: false
            }
          }
        };
        
        phaserGame.current = new Phaser.Game(config);
        
        // Wait for scene to be ready
        const checkScene = setInterval(() => {
          const scene = phaserGame.current?.scene.getScene('TowerDefenseGameScene');
          if (scene && scene.scene.isActive()) {
            sceneRef.current = scene as TowerDefenseGameScene;
            clearInterval(checkScene);
          }
        }, 100);
      }
    };
    
    createGame();
    
    // Handle resize events for orientation changes
    const handleResize = () => {
      if (phaserGame.current) {
        // Destroy and recreate the game on resize
        phaserGame.current.destroy(true);
        phaserGame.current = null;
        sceneRef.current = null;
        setTimeout(createGame, 100); // Small delay to ensure proper cleanup
      }
    };
    
    // Add resize listener with debounce
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 300);
    };
    
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', debouncedResize);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', debouncedResize);
      clearTimeout(resizeTimeout);
      if (phaserGame.current) {
        phaserGame.current.destroy(true);
        phaserGame.current = null;
        sceneRef.current = null;
      }
    };
  }, []);
  
  // Play round mutation
  const playMutation = useMutation({
    mutationFn: async (gameScore: number) => {
      const response = await apiRequest("POST", "/api/tower-defense/play", {
        betAmount,
        difficulty,
      });
      return response.json() as Promise<GameResult>;
    },
    onSuccess: (data) => {
      if (data.won) {
        setLastWin(data.payout);
        setDoubleUpAmount(data.payout);
        setShowDoubleUp(true);
        // Only show notification for wins of $100+
        if (data.payout >= 100) {
          toast({
            title: "💰 BIG WIN - Victory!",
            description: `You won ${data.payout.toFixed(2)} credits!`,
          });
        }
      } else {
        setLastWin(0);
        // No notification for losses
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      setIsPlaying(false);
      setGameStarted(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to play round",
        variant: "destructive",
      });
      setIsPlaying(false);
      setGameStarted(false);
    },
  });
  
  // Double-up mutation
  const doubleUpMutation = useMutation({
    mutationFn: async (cardIndex: number) => {
      const response = await apiRequest("POST", "/api/tower-defense/double-up", {
        amount: doubleUpAmount,
        selectedCard: cardIndex,
      });
      return response.json() as Promise<DoubleUpResult>;
    },
    onSuccess: (data) => {
      setRevealedCards({ player: data.playerCard, dealer: data.dealerCard });
      
      setTimeout(() => {
        if (data.won) {
          setDoubleUpAmount(data.newAmount);
          // Only show notification for wins of $100+
          if (data.newAmount >= 100) {
            toast({
              title: "💰 BIG Double-Up Won!",
              description: `Your winnings are now ${data.newAmount.toFixed(2)} credits!`,
            });
          }
          setRevealedCards(null);
          setSelectedCard(null);
        } else {
          // No notification for losses
          setShowDoubleUp(false);
          setDoubleUpAmount(0);
          setRevealedCards(null);
          setSelectedCard(null);
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      }, 2000);
    },
  });
  
  // Collect winnings mutation
  const collectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/tower-defense/collect", {
        amount: doubleUpAmount,
      });
      return response.json();
    },
    onSuccess: () => {
      // Only show notification for collections of $100+
      if (doubleUpAmount >= 100) {
        toast({
          title: "💰 BIG Collection!",
          description: `${doubleUpAmount.toFixed(2)} credits added to your balance!`,
        });
      }
      setShowDoubleUp(false);
      setDoubleUpAmount(0);
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
    },
  });
  
  const handlePlay = () => {
    const availableBalance = gameMode === 'real' ? (balance?.sweepsCashTotal || 0) : (balance?.available || 0);
    if (!balance || availableBalance < betAmount) {
      toast({
        title: "Insufficient Balance",
        description: gameMode === 'real' ? "Not enough Sweep Cash (SC)" : "Not enough credits",
        variant: "balance" as any,
        duration: 1000,
      });
      return;
    }
    
    setIsPlaying(true);
    setGameStarted(true);
    
    // Enable the game and set up callbacks
    if (sceneRef.current) {
      // Enable the game to start (bet is placed)
      sceneRef.current.enableGameStart();
      
      // Set up game end callback
      sceneRef.current.setGameEndCallback((won: boolean, score: number) => {
        // Game ended callback
        playMutation.mutate(score);
        
        // Reset bet state for next game
        if (sceneRef.current) {
          sceneRef.current.resetBetState();
        }
      });
    } else {
      // Fallback if scene not ready
      toast({
        title: "Game Loading",
        description: "Please wait for the game to load and try again",
      });
      setIsPlaying(false);
      setGameStarted(false);
    }
  };
  
  const handleDoubleUp = (cardIndex: number) => {
    setSelectedCard(cardIndex);
    doubleUpMutation.mutate(cardIndex);
  };
  
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy": return "text-emerald-400";
      case "medium": return "text-[#D4AF37]";
      case "hard": return "text-red-400";
      default: return "text-gray-400";
    }
  };
  
  const getDifficultyIcon = (diff: string) => {
    switch (diff) {
      case "easy": return <Shield className="w-4 h-4" />;
      case "medium": return <Target className="w-4 h-4" />;
      case "hard": return <Swords className="w-4 h-4" />;
      default: return null;
    }
  };
  
  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 max-w-7xl mx-auto p-2 md:p-4 pb-28">
      {/* Main Game Area */}
      <div className="flex-1">
        {/* Game Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex justify-between items-center mb-2">
            <div className="flex-1 text-center">
              <h2 className="text-lg md:text-xl font-bold flex items-center justify-center gap-2">
                <Target className="w-5 h-5 text-[#D4AF37]" />
                Tower Defense
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <FavoriteButton gameName="Tower Defense" />
              <button
                onClick={() => setLocation("/")}
                className="border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition px-1.5 py-0.5 rounded-lg text-sm"
                data-testid="button-back-casino"
              >
                Back to Home
              </button>
            </div>
          </div>
          <p className="text-xs md:text-sm text-gray-400 text-center">
            Build towers to defend against waves of enemies!
          </p>
        </div>
        
        {/* Game Canvas */}
        <Card className="bg-[#1a1d1e] border-gray-800 mb-4 md:mb-6">
          <div 
            ref={gameRef} 
            className="w-full rounded-lg overflow-hidden touch-none relative"
            style={{ 
              minHeight: window.innerWidth < 768 ? '400px' : '600px',
              maxHeight: window.innerWidth < 768 ? '70vh' : '600px',
              aspectRatio: window.innerWidth < 768 ? '4/3' : '4/3'
            }}
          />
        </Card>
        
        {/* Game Controls - Only show when game not started */}
        {!gameStarted && (
          <Card className="bg-[#1a1d1e] border-gray-800 p-4">
            <div className="space-y-4">
              {/* Bet Amount */}
              <div>
                <Label className="text-sm mb-2 block text-gray-300">Bet Amount</Label>
                <div className="space-y-2">
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    min={0.1}
                    max={1000}
                    step={0.1}
                    disabled={isPlaying}
                    className="w-full bg-[#1a1d1e] border-gray-700 text-white"
                  />
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {[0.5, 1, 5, 10, 100].map((amount) => (
                      <Button
                        key={amount}
                        size="sm"
                        variant="outline"
                        onClick={() => setBetAmount(amount)}
                        disabled={isPlaying}
                        className={`transition-all min-h-[44px] ${
                          betAmount === amount
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37] hover:bg-[#D4AF37]/90'
                            : 'bg-[#1a1d1e] border-gray-700 hover:bg-[#2a2d3a] text-gray-300'
                        }`}
                        data-testid={`button-bet-${amount}`}
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Difficulty Selection */}
              <div>
                <Label className="text-sm mb-2 block text-gray-300">Difficulty</Label>
                <RadioGroup
                  value={difficulty}
                  onValueChange={(value) => setDifficulty(value as any)}
                  disabled={isPlaying}
                  className="flex flex-col gap-2"
                >
                  {["easy", "medium", "hard"].map((diff) => (
                    <div key={diff} className="flex items-center justify-between p-3 rounded-lg bg-[#1a1d1e] border border-gray-700 hover:border-gray-600 transition-all">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value={diff} id={diff} className="text-[#D4AF37]" />
                        <Label
                          htmlFor={diff}
                          className={`cursor-pointer flex items-center gap-2 ${getDifficultyColor(diff)}`}
                        >
                          {getDifficultyIcon(diff)}
                          <span className="capitalize font-medium">{diff}</span>
                        </Label>
                      </div>
                      <span className="text-sm font-bold text-[#D4AF37]">
                        {diff === "easy" ? "1.5x" : diff === "medium" ? "2.5x" : "5x"}
                      </span>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              
              {/* Play Button */}
              <Button
                onClick={handlePlay}
                disabled={isPlaying || !balance || balance.available < betAmount}
                size="lg"
                className="w-full bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[56px]"
                data-testid="button-play"
              >
                {isPlaying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                    Game Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Game (${betAmount.toFixed(2)})
                  </>
                )}
              </Button>
              
              {/* Balance Display */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                <span className="text-xs text-gray-400">Balance:</span>
                <span className="font-bold text-sm text-white">
                  ${balance?.available.toFixed(2) || '0.00'}
                </span>
              </div>
              
              {/* Last Win Display */}
              {lastWin > 0 && (
                <div className="flex justify-between items-center p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg">
                  <span className="text-xs text-[#D4AF37]">Last Win:</span>
                  <span className="font-bold text-sm text-[#D4AF37]">
                    +${lastWin.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}
        
        {/* Game Instructions - Show when game is active */}
        {gameStarted && (
          <Card className="bg-[#1a1d1e] border-gray-800 p-4">
            <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-white">
              <Info className="w-4 h-4 text-[#D4AF37]" />
              Game Controls
            </h3>
            <ul className="space-y-1 text-xs text-gray-400">
              <li className="flex items-start">
                <span className="text-[#D4AF37] mr-2">•</span>
                <span>Select tower type from side panel</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#D4AF37] mr-2">•</span>
                <span>Click on map to place towers (avoid paths)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#D4AF37] mr-2">•</span>
                <span>Towers auto-shoot at enemies in range</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#D4AF37] mr-2">•</span>
                <span>Earn gold from kills to buy more towers</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#D4AF37] mr-2">•</span>
                <span>Survive 10 waves to win!</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#D4AF37] mr-2">•</span>
                <span>Press ESC to cancel tower placement</span>
              </li>
            </ul>
          </Card>
        )}
      </div>
      
      {/* Side Panel */}
      <div className="w-full md:w-80">
        {/* Game Info */}
        <Card className="bg-[#1a1d1e] border-gray-800 p-4 mb-4">
          <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-white">
            <Trophy className="w-4 h-4 text-[#D4AF37]" />
            How to Play
          </h3>
          <ul className="space-y-2 text-xs text-gray-400">
            <li className="flex items-start">
              <span className="text-casino-gold mr-2">•</span>
              <span>Place your bet and select difficulty</span>
            </li>
            <li className="flex items-start">
              <span className="text-casino-gold mr-2">•</span>
              <span>Build towers to defend your base</span>
            </li>
            <li className="flex items-start">
              <span className="text-casino-gold mr-2">•</span>
              <span>Enemies follow the path to your base</span>
            </li>
            <li className="flex items-start">
              <span className="text-casino-gold mr-2">•</span>
              <span>Each enemy that reaches the end costs a life</span>
            </li>
            <li className="flex items-start">
              <span className="text-casino-gold mr-2">•</span>
              <span>Survive all 10 waves to win!</span>
            </li>
            <li className="flex items-start">
              <span className="text-casino-gold mr-2">•</span>
              <span>Higher difficulty = higher payout</span>
            </li>
          </ul>
        </Card>
        
        {/* Tower Selection */}
        {gameStarted && (
          <Card className="bg-[#1a1d1e] border-gray-800 p-4 mb-4">
            <h3 className="text-base font-bold mb-3 text-white">Select Tower</h3>
            <div className="space-y-2">
              {[
                { key: 'BASIC', name: 'Basic', cost: 50, icon: '🗼', desc: 'Fast fire', color: '#fbbf24' },
                { key: 'SNIPER', name: 'Sniper', cost: 100, icon: '🎯', desc: 'Long range', color: '#3b82f6' },
                { key: 'CANNON', name: 'Cannon', cost: 150, icon: '💥', desc: 'High damage', color: '#ef4444' },
                { key: 'LASER', name: 'Laser', cost: 200, icon: '⚡', desc: 'Rapid fire', color: '#10b981' }
              ].map((tower) => (
                <Button
                  key={tower.key}
                  onClick={() => {
                    if (sceneRef.current) {
                      sceneRef.current.setSelectedTowerType(tower.key as any);
                    }
                  }}
                  disabled={!gameStarted}
                  className={`w-full p-3 h-auto flex justify-between items-center transition-all ${
                    gameStarted
                      ? 'bg-[#0a0d14] hover:bg-[#2a2d3a] border border-gray-700 hover:border-[#D4AF37]'
                      : 'bg-gray-800 cursor-not-allowed'
                  }`}
                  variant="outline"
                  data-testid={`button-tower-${tower.key.toLowerCase()}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{tower.icon}</span>
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">{tower.name}</div>
                      <div className="text-xs text-gray-400">{tower.desc}</div>
                    </div>
                  </div>
                  <div className="text-[#D4AF37] font-bold">${tower.cost}</div>
                </Button>
              ))}
            </div>
            <div className="mt-3 p-2 bg-[#0a0d14]/50 border border-gray-800 rounded text-xs text-gray-400">
              💡 Select a tower type above, then click on the map to place it
            </div>
          </Card>
        )}
        
        {/* Tower Types Info */}
        {!gameStarted && (
          <Card className="bg-[#1a1d1e] border-gray-800 p-4 mb-4">
            <h3 className="text-base font-bold mb-3 text-white">Tower Types</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 rounded bg-[#0a0d14]/50 border border-gray-800">
                <span className="text-gray-300 font-medium">Basic</span>
                <span className="text-[#D4AF37]">$50 <span className="text-gray-400">• Fast fire</span></span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-[#0a0d14]/50 border border-gray-800">
                <span className="text-gray-300 font-medium">Sniper</span>
                <span className="text-[#D4AF37]">$100 <span className="text-gray-400">• Long range</span></span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-[#0a0d14]/50 border border-gray-800">
                <span className="text-gray-300 font-medium">Cannon</span>
                <span className="text-[#D4AF37]">$150 <span className="text-gray-400">• High damage</span></span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-[#0a0d14]/50 border border-gray-800">
                <span className="text-gray-300 font-medium">Laser</span>
                <span className="text-[#D4AF37]">$200 <span className="text-gray-400">• Rapid fire</span></span>
              </div>
            </div>
          </Card>
        )}
        
        {/* Enemy Types */}
        <Card className="bg-[#1a1d1e] border-gray-800 p-4 mb-4">
          <h3 className="text-base font-bold mb-3 text-white">Enemy Types</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2 rounded bg-[#0a0d14]/50 border border-gray-800">
              <span className="text-gray-300 font-medium">Basic</span>
              <span className="text-gray-400">100 HP • <span className="text-[#D4AF37]">$10</span></span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-[#0a0d14]/50 border border-gray-800">
              <span className="text-gray-300 font-medium">Fast</span>
              <span className="text-gray-400">75 HP • <span className="text-[#D4AF37]">$15</span></span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-[#0a0d14]/50 border border-gray-800">
              <span className="text-gray-300 font-medium">Tank</span>
              <span className="text-gray-400">300 HP • <span className="text-[#D4AF37]">$30</span></span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-[#0a0d14]/50 border border-gray-800">
              <span className="text-gray-300 font-medium">Boss</span>
              <span className="text-gray-400">1000 HP • <span className="text-[#D4AF37]">$100</span></span>
            </div>
          </div>
        </Card>
        
        {/* Multiplier Table */}
        <Card className="bg-[#1a1d1e] border-gray-800 p-4">
          <h3 className="text-base font-bold mb-3 text-white">Difficulty Multipliers</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-emerald-900/10 border border-emerald-700/20 rounded">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-gray-300">Easy</span>
              </span>
              <span className="font-bold text-[#D4AF37]">1.5x</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded">
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-gray-300">Medium</span>
              </span>
              <span className="font-bold text-[#D4AF37]">2.5x</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-900/10 border border-red-700/20 rounded">
              <span className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-red-400" />
                <span className="text-gray-300">Hard</span>
              </span>
              <span className="font-bold text-[#D4AF37]">5.0x</span>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Double-Up Modal */}
      <Dialog open={showDoubleUp} onOpenChange={setShowDoubleUp}>
        <DialogContent className="bg-[#1a1d1e] border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-center">
              Double-Up Challenge!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-400 mb-2">Current Winnings:</p>
              <p className="text-base font-bold text-[#D4AF37]">
                ${doubleUpAmount.toFixed(2)}
              </p>
            </div>
            
            <div className="text-center text-xs text-gray-400">
              Pick a card higher than the dealer's to double your winnings!
            </div>
            
            {/* Card Selection */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((cardNum) => (
                <motion.button
                  key={cardNum}
                  onClick={() => !revealedCards && !doubleUpMutation.isPending && handleDoubleUp(cardNum)}
                  disabled={revealedCards !== null || doubleUpMutation.isPending}
                  className={`
                    h-24 rounded-lg border-2 transition-all
                    ${selectedCard === cardNum ? 'border-[#D4AF37]' : 'border-gray-600'}
                    ${revealedCards ? 'cursor-not-allowed' : 'hover:border-[#8B5CF6] cursor-pointer'}
                    bg-gradient-to-br from-[#1a1d1e] to-[#0a0d14]
                  `}
                  whileHover={!revealedCards ? { scale: 1.05 } : {}}
                  whileTap={!revealedCards ? { scale: 0.95 } : {}}
                  data-testid={`button-card-${cardNum}`}
                >
                  {revealedCards && selectedCard === cardNum ? (
                    <div className="text-base font-bold">
                      {revealedCards.player}
                    </div>
                  ) : (
                    <div className="text-[#D4AF37] text-base">?</div>
                  )}
                </motion.button>
              ))}
            </div>
            
            {/* Dealer's Card */}
            {revealedCards && (
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-2">Dealer's Card:</p>
                <div className="inline-block h-24 w-16 rounded-lg border-2 border-red-500 bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center">
                  <div className="text-base font-bold text-white">
                    {revealedCards.dealer}
                  </div>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => collectMutation.mutate()}
                disabled={revealedCards !== null || doubleUpMutation.isPending}
                className="flex-1 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90"
                data-testid="button-collect"
              >
                Collect ${doubleUpAmount.toFixed(2)}
              </Button>
              <Button
                onClick={() => setShowDoubleUp(false)}
                disabled={doubleUpMutation.isPending}
                className="flex-1 bg-[#8B5CF6] text-white hover:bg-[#8B5CF6]/90"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}