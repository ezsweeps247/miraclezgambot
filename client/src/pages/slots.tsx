import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { formatCredits } from "@/lib/utils";
import { AnimatedProgressBar } from "@/components/animated-progress-bar";
import { LiveWinsFeed } from "@/components/live-wins-feed";
import { Coins, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useLocation } from "wouter";
import { modernSounds } from "@/lib/modern-sounds";
import { useGameMode } from "@/contexts/GameModeContext";
import FavoriteButton from "@/components/FavoriteButton";

const SYMBOLS = ['🍒', '🍋', '⭐', '🔔', '💎'];

const getSymbolStyle = (symbol: string) => {
  switch(symbol) {
    case '🍒': return 'text-red-500';
    case '🍋': return 'text-yellow-400';
    case '⭐': return 'text-yellow-300';
    case '🔔': return 'text-yellow-500';
    case '💎': return 'text-cyan-400';
    default: return 'text-white';
  }
};

export default function Slots() {
  const { gameMode } = useGameMode();
  const [betAmount, setBetAmount] = useState(1);
  const [reels, setReels] = useState([
    ['🍒', '🍋', '⭐'],
    ['🔔', '⭐', '🍒'],
    ['⭐', '🔔', '🍋'],
    ['🔔', '⭐', '🍒'],
    ['⭐', '🍋', '🔔']
  ]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const reelStopCount = useRef(0);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Initialize modern sounds
  useEffect(() => {
    modernSounds.setEnabled(audioEnabled);
  }, [audioEnabled]);

  // Play sound effects using modern sound system
  const playSound = (type: "spin" | "stop" | "win" | "jackpot" | "click" | "lose") => {
    if (!audioEnabled) return;
    
    switch (type) {
      case "spin":
        modernSounds.playSpin();
        break;
      case "stop":
        modernSounds.playClick();
        break;
      case "win":
        modernSounds.playWin();
        break;
      case "jackpot":
        modernSounds.playJackpot();
        break;
      case "click":
        modernSounds.playClick();
        break;
      case "lose":
        modernSounds.playLose();
        break;
    }
  };

  const { data: balance } = useQuery({
    queryKey: ["/api/balance", gameMode],
    staleTime: 5000,
    gcTime: 30000,
    refetchInterval: false,
    refetchOnWindowFocus: false
  });

  // React to gameMode changes - reset state and invalidate queries
  useEffect(() => {
    // Reset game state on mode change
    setIsSpinning(false);
    setLastWin(0);
    
    // Invalidate balance query to refetch for new mode
    queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
  }, [gameMode, queryClient]);

  const spinMutation = useMutation({
    mutationFn: async (data: { amount: number }) => {
      const response = await apiRequest('POST', '/api/games/slots/spin', { ...data, gameMode });
      return response.json();
    },
    onSuccess: (data) => {
      setReels(data.reels);
      setLastWin(data.payout);
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      
      // Play reel stop sounds
      reelStopCount.current = 0;
      const stopInterval = setInterval(() => {
        playSound("stop");
        reelStopCount.current++;
        if (reelStopCount.current >= 5) {
          clearInterval(stopInterval);
          // Play win/lose sound after all reels stop
          if (data.profit > 0) {
            if (data.payout >= betAmount * 100) {
              playSound("jackpot");
            } else {
              playSound("win");
            }
          } else {
            playSound("lose");
          }
        }
      }, 150);
      
      // Only show notification for wins of $100+
      if (data.payout >= 100) {
        toast({
          title: "💰 BIG WIN!",
          description: `${data.paylinesHit} paylines hit! Won ${formatCredits(data.payout)}`,
          variant: "success"
        });
      }
      // No notification for smaller wins or losses
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Helper function to get available balance based on mode
  const getAvailableBalance = (balanceData: any) => {
    if (balanceData?.balanceMode === 'SC') {
      // In SC mode, use sweeps cash total (already in SC dollars)
      return Number(balanceData.sweepsCashTotal) || 0;
    } else {
      // In GC mode, use available balance (already in GC dollars, not cents)
      return Number(balanceData.available) || 0;
    }
  };

  const handleSpin = async () => {
    // Check balance based on current balance mode
    const currentBalance = balance as any;
    const availableBalance = getAvailableBalance(currentBalance);
    
    if (!balance || availableBalance < betAmount) {
      toast({
        title: "Insufficient Balance",
        description: `Not enough ${currentBalance?.balanceMode || 'credits'}. Available: ${availableBalance.toFixed(2)}, Required: ${betAmount}`,
        variant: "balance" as any,
        duration: 3000
      });
      return;
    }
    
    playSound("spin");
    setIsSpinning(true);
    
    // Animate reels spinning
    const spinDuration = 1000;
    const spinInterval = setInterval(() => {
      setReels(reels.map(() => 
        Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
      ));
    }, 100);

    setTimeout(() => {
      clearInterval(spinInterval);
      setIsSpinning(false);
      spinMutation.mutate({ amount: betAmount });
    }, spinDuration);
  };

  const betOptions = [0.50, 1, 5, 10, 25, 50, 100];

  return (
    <>
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 max-w-7xl mx-auto p-2 md:p-4 pb-32">
      {/* Main Game Area */}
      <div className="flex-1 max-w-full md:max-w-2xl">
        {/* Game Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg md:text-xl font-bold">Slot Machine</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAudioEnabled(!audioEnabled)}
                data-testid="button-toggle-audio"
              >
                {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                <span className="ml-2 hidden md:inline">{audioEnabled ? 'Sound On' : 'Sound Off'}</span>
              </Button>
              <div className="flex items-center gap-2">
                <FavoriteButton gameName="Slots" />
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setLocation("/")}
                  className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black rounded-lg"
                  data-testid="button-back-casino"
                >
                  Back to Casino
                </Button>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs md:text-sm text-gray-400">5x3 reels with multiple paylines</p>
          </div>
        </div>

      {/* Slot Machine */}
      <Card className="bg-[#1a1d1e] border-gray-800 mb-4 md:mb-6 relative z-10 pb-20">
        <CardContent className="p-2 sm:p-3 md:p-4">
          {/* Slot Reels */}
          <div className="mb-3">
            <div className="bg-gradient-to-b from-gray-900 to-gray-800 p-2 sm:p-3 md:p-4 rounded-xl shadow-inner">
              <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-3">
                {reels.map((reel, reelIndex) => (
                  <div key={reelIndex} className="space-y-1 sm:space-y-2">
                    {reel.map((symbol, symbolIndex) => (
                      <div
                        key={`${reelIndex}-${symbolIndex}`}
                        className={`relative w-full h-8 sm:h-14 md:h-20 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-lg flex items-center justify-center border border-casino-gold/30 shadow-lg overflow-hidden ${
                          isSpinning ? 'animate-pulse' : ''
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        <span className={`relative z-10 text-2xl sm:text-3xl md:text-4xl ${getSymbolStyle(symbol)} ${
                          isSpinning ? 'blur-sm' : ''
                        }`}>{symbol}</span>
                        {!isSpinning && (
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-transparent" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              
              {/* Payline Indicators */}
              <div className="flex justify-between mt-2 sm:mt-3 px-1 sm:px-2">
                <div className="w-2 h-2 bg-casino-gold rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-casino-gold rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-casino-gold rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-casino-gold rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-casino-gold rounded-full animate-pulse" />
              </div>
            </div>

            {/* Last Win Display */}
            <div className="text-center mt-2">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg px-2 py-1 border border-casino-gold/20">
                <Coins className="w-4 h-4 text-casino-gold" />
                <span className="text-sm text-gray-400">Last Win:</span>
                <span className={`font-bold text-base ${
                  lastWin > 0 ? 'text-casino-green animate-pulse' : 'text-gray-500'
                }`}>
                  {formatCredits(lastWin)}
                </span>
              </div>
            </div>
          </div>

          {/* Bet Controls */}
          <div className="space-y-3">
            {/* Bet Amount */}
            <div>
              <label className="block text-sm font-medium mb-2">Bet Amount</label>
              <div className="grid grid-cols-3 gap-2">
                {/* First row - $0.50, $1.00, $5.00 */}
                {betOptions.slice(0, 3).map((amount) => (
                  <Button
                    key={amount}
                    variant={betAmount === amount ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      playSound("click");
                      setBetAmount(amount);
                    }}
                    className={`w-full h-8 text-sm ${betAmount === amount ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                  >
                    {formatCredits(amount)}
                  </Button>
                ))}
                {/* Second row - $10.00, $25.00, MAX */}
                {betOptions.slice(3, 5).map((amount) => (
                  <Button
                    key={amount}
                    variant={betAmount === amount ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      playSound("click");
                      setBetAmount(amount);
                    }}
                    className={`w-full h-8 text-sm ${betAmount === amount ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                  >
                    {formatCredits(amount)}
                  </Button>
                ))}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    playSound("click");
                    // Set max bet based on balance mode
                    const currentBalance = balance as any;
                    const maxBet = getAvailableBalance(currentBalance);
                    
                    setBetAmount(Math.min(maxBet, 1000)); // Cap at max bet limit
                  }}
                  className="w-full h-8 text-sm"
                >
                  MAX
                </Button>
              </div>
            </div>

            {/* Spinning Progress Animation */}
            {isSpinning && (
              <div className="mb-4">
                <AnimatedProgressBar
                  progress={100}
                  variant="betting"
                  animated={true}
                  pulseOnUpdate={true}
                  className="h-3"
                >
                  <span className="text-sm font-bold text-white">
                    🎰 SPINNING REELS...
                  </span>
                </AnimatedProgressBar>
              </div>
            )}

            {/* Spin Button - Fixed at bottom */}
            <div className="fixed bottom-16 left-0 right-0 p-3 bg-[#1a1d1e] border-t border-gray-800 md:relative md:border-0 md:p-0 md:mt-3 z-20">
              <Button
                onClick={handleSpin}
                disabled={isSpinning || spinMutation.isPending}
                size="lg"
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-black text-base py-6 disabled:opacity-50 shadow-xl"
                data-testid="button-spin"
              >
                <RotateCcw className={`w-5 h-5 mr-2 ${isSpinning ? 'animate-spin' : ''}`} />
                {isSpinning ? 'Spinning...' : 'SPIN'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paytable */}
      <Card className="bg-gradient-to-b from-gray-900 to-gray-800 border-casino-gold/30 relative z-0">
        <CardContent className="p-4">
          <h4 className="font-bold mb-3 text-casino-gold text-center text-base">PAYTABLE</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-cyan-400 text-lg">💎</span>
                ))}
              </div>
              <span className="text-casino-gold font-bold">1000x</span>
            </div>
            <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-500 text-lg">🔔</span>
                ))}
              </div>
              <span className="text-casino-gold font-bold">500x</span>
            </div>
            <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-300 text-lg">⭐</span>
                ))}
              </div>
              <span className="text-casino-gold font-bold">250x</span>
            </div>
            <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-lg">🍋</span>
                ))}
              </div>
              <span className="text-casino-gold font-bold">100x</span>
            </div>
            <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-red-500 text-lg">🍒</span>
                ))}
              </div>
              <span className="text-casino-gold font-bold">50x</span>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Live Wins Feed Column */}
      <div className="w-full md:w-96 max-w-md mt-4 md:mt-0">
        <LiveWinsFeed className="sticky top-4" />
      </div>
    </div>

  </>
  );
}
