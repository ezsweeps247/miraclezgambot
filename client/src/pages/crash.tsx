import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import { cn, formatCredits } from "@/lib/utils";
import { BettingProgressBar, MultiplierProgressBar } from "@/components/animated-progress-bar";
import { LiveWinsFeed } from "@/components/live-wins-feed";
// import { ChatWidget } from "@/components/chat-widget";
import { GlobalBetHistory } from "@/components/global-bet-history";
import { TrendingUp, Volume2, VolumeX, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useGameMode } from "@/contexts/GameModeContext";
import FavoriteButton from "@/components/FavoriteButton";

interface CrashGameState {
  roundId?: string;
  status: 'WAITING' | 'PENDING' | 'RUNNING' | 'ENDED';
  multiplier: number;
  timeLeft?: number;
  crashPoint?: number;
  players?: Array<{
    userId: string;
    username: string;
    amount: number;
    autoCashout?: number;
    cashedOut?: number;
    profit?: number;
  }>;
}

interface Balance {
  available: number;
  locked: number;
  currency: string;
}

interface CrashHistoryItem {
  id: string;
  crashPoint: number;
  status: string;
  createdAt: string;
}

export default function Crash() {
  const { gameMode } = useGameMode();
  const [betAmount, setBetAmount] = useState(1);
  const [autoCashout, setAutoCashout] = useState<number | undefined>(undefined);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState<boolean>(false);
  const [gameState, setGameState] = useState<CrashGameState>({
    status: 'PENDING',
    multiplier: 1.0
  });
  const [hasBet, setHasBet] = useState(false);
  const [canCashout, setCanCashout] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioContext = useRef<AudioContext | null>(null);
  const risingOscillator = useRef<OscillatorNode | null>(null);
  const risingGain = useRef<GainNode | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const { data: balance } = useQuery<Balance>({
    queryKey: ["/api/balance"],
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });

  const { data: crashHistory } = useQuery<CrashHistoryItem[]>({
    queryKey: ["/api/games/crash/history", gameMode]
  });

  // React to gameMode changes - reset state and invalidate queries
  useEffect(() => {
    // Reset game state on mode change
    setHasBet(false);
    setCanCashout(false);
    setBetAmount(1);
    setAutoCashout(undefined);
    
    // Invalidate all relevant queries to refetch for new mode
    queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
    queryClient.invalidateQueries({ queryKey: ["/api/games/crash"] });
  }, [gameMode, queryClient]);

  // Initialize audio context
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      stopRisingSound();
      audioContext.current?.close();
    };
  }, []);

  // Stop rising sound
  const stopRisingSound = () => {
    if (risingOscillator.current) {
      risingOscillator.current.stop();
      risingOscillator.current = null;
    }
    if (risingGain.current) {
      risingGain.current.disconnect();
      risingGain.current = null;
    }
  };

  // Play sound function with various crash game sounds
  const playSound = (type: 'roundStart' | 'rising' | 'cashout' | 'crash' | 'bet' | 'countdown' | 'bigWin' | 'lose') => {
    if (!audioEnabled || !audioContext.current) return;

    const ctx = audioContext.current;
    const now = ctx.currentTime;

    switch (type) {
      case 'roundStart':
        // Clear bell sound for new round
        const bellOsc = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bellOsc.connect(bellGain);
        bellGain.connect(ctx.destination);
        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(880, now); // A5
        bellGain.gain.setValueAtTime(0.3, now);
        bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        bellOsc.start(now);
        bellOsc.stop(now + 0.5);
        
        // Add harmonic
        const bellHarmonic = ctx.createOscillator();
        const bellHarmonicGain = ctx.createGain();
        bellHarmonic.connect(bellHarmonicGain);
        bellHarmonicGain.connect(ctx.destination);
        bellHarmonic.type = 'sine';
        bellHarmonic.frequency.setValueAtTime(1760, now); // A6
        bellHarmonicGain.gain.setValueAtTime(0.15, now);
        bellHarmonicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        bellHarmonic.start(now);
        bellHarmonic.stop(now + 0.3);
        break;

      case 'rising':
        // Continuous tone that increases with multiplier
        stopRisingSound(); // Stop any existing rising sound
        risingOscillator.current = ctx.createOscillator();
        risingGain.current = ctx.createGain();
        risingOscillator.current.connect(risingGain.current);
        risingGain.current.connect(ctx.destination);
        risingOscillator.current.type = 'sine';
        risingOscillator.current.frequency.setValueAtTime(200, now); // Base frequency
        risingGain.current.gain.setValueAtTime(0.1, now);
        risingOscillator.current.start(now);
        break;

      case 'cashout':
        // Triumphant ka-ching
        stopRisingSound();
        const cashNotes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        cashNotes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          const startTime = now + i * 0.08;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
          osc.start(startTime);
          osc.stop(startTime + 0.3);
        });
        break;

      case 'bigWin':
        // Extended fanfare for big wins (5x+)
        stopRisingSound();
        const fanfareNotes = [523, 587, 659, 784, 880, 1047, 1319]; // C5, D5, E5, G5, A5, C6, E6
        fanfareNotes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          const startTime = now + i * 0.1;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
          osc.start(startTime);
          osc.stop(startTime + 0.4);
        });
        break;

      case 'crash':
        // Dramatic explosion/crash
        stopRisingSound();
        
        // Low frequency rumble
        const rumbleOsc = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        rumbleOsc.connect(rumbleGain);
        rumbleGain.connect(ctx.destination);
        rumbleOsc.type = 'sawtooth';
        rumbleOsc.frequency.setValueAtTime(50, now);
        rumbleOsc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
        rumbleGain.gain.setValueAtTime(0.3, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        rumbleOsc.start(now);
        rumbleOsc.stop(now + 0.5);
        
        // Noise explosion
        const noise = ctx.createBufferSource();
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
          noiseData[i] = (Math.random() - 0.5) * Math.exp(-i / (noiseData.length * 0.2));
        }
        noise.buffer = noiseBuffer;
        const noiseGain = ctx.createGain();
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        noise.start(now);
        break;

      case 'bet':
        // Chip placement sound
        const betOsc = ctx.createOscillator();
        const betGain = ctx.createGain();
        betOsc.connect(betGain);
        betGain.connect(ctx.destination);
        betOsc.type = 'triangle';
        betOsc.frequency.setValueAtTime(1000, now);
        betOsc.frequency.exponentialRampToValueAtTime(700, now + 0.1);
        betGain.gain.setValueAtTime(0.2, now);
        betGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        betOsc.start(now);
        betOsc.stop(now + 0.1);
        break;

      case 'countdown':
        // Beep for countdown
        const beepOsc = ctx.createOscillator();
        const beepGain = ctx.createGain();
        beepOsc.connect(beepGain);
        beepGain.connect(ctx.destination);
        beepOsc.type = 'sine';
        beepOsc.frequency.setValueAtTime(600, now);
        beepGain.gain.setValueAtTime(0.2, now);
        beepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        beepOsc.start(now);
        beepOsc.stop(now + 0.1);
        break;

      case 'lose':
        // Simple lose sound
        stopRisingSound();
        const loseOsc = ctx.createOscillator();
        const loseGain = ctx.createGain();
        loseOsc.connect(loseGain);
        loseGain.connect(ctx.destination);
        loseOsc.type = 'sawtooth';
        loseOsc.frequency.setValueAtTime(300, now);
        loseOsc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        loseGain.gain.setValueAtTime(0.2, now);
        loseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        loseOsc.start(now);
        loseOsc.stop(now + 0.3);
        break;
    }
  };

  // WebSocket connection for real-time updates
  // WebSocket connection with gameMode awareness for proper currency separation
  const { socket, isConnected } = useWebSocket(`/ws?gameMode=${gameMode}`);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'gameState':
            setGameState(message.data);
            break;
            
          case 'roundCreated':
            setGameState(prev => ({
              ...prev,
              ...message.data,
              multiplier: 1.0
            }));
            setHasBet(false);
            setCanCashout(false);
            // Reset auto-cashout toggle when new round starts
            setAutoCashoutEnabled(false);
            break;
            
          case 'roundStarted':
            setGameState(prev => ({
              ...prev,
              ...message.data
            }));
            if (hasBet) {
              setCanCashout(true);
            }
            playSound('roundStart');
            playSound('rising'); // Start the rising sound
            break;
            
          case 'multiplierUpdate':
            setGameState(prev => ({
              ...prev,
              multiplier: message.data.multiplier
            }));
            // Update rising sound frequency based on multiplier
            if (risingOscillator.current && audioContext.current) {
              const frequency = 200 + (message.data.multiplier * 50); // Increase frequency with multiplier
              risingOscillator.current.frequency.setValueAtTime(frequency, audioContext.current.currentTime);
            }
            break;
            
          case 'roundEnded':
            setGameState(prev => ({
              ...prev,
              ...message.data
            }));
            setCanCashout(false);
            playSound('crash'); // Play crash sound when round ends
            // Debounce balance updates to prevent spam
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
              queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
            }, 1000);
            break;
            
          case 'playerJoined':
            if (message.data.player.userId === (user as any)?.id) {
              setHasBet(true);
            }
            break;
            
          case 'playerCashedOut':
            if (message.data.userId === (user as any)?.id) {
              setCanCashout(false);
              setHasBet(false);
              // Reset auto-cashout toggle when bet completes
              setAutoCashoutEnabled(false);
              
              // Add safety check for profit field
              const profit = message.data.profit !== undefined ? message.data.profit : 0;
              const multiplier = message.data.multiplier || 1;
              
              // Play appropriate sound based on multiplier
              if (multiplier >= 5) {
                playSound('bigWin');
              } else {
                playSound('cashout');
              }
              
              // Only show notification for wins of $100+
              if (profit >= 100) {
                toast({
                  title: "💰 BIG WIN - Cashed Out!",
                  description: `Multiplier: ${multiplier.toFixed(2)}x • Profit: +${formatCredits(profit)}`,
                  variant: "success"
                });
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.addEventListener('message', handleMessage);
    
    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, user, hasBet, toast, queryClient]);

  const placeBetMutation = useMutation({
    mutationFn: async (data: { amount: number; autoCashout?: number }) => {
      const response = await apiRequest('POST', '/api/games/crash/bet', { ...data, gameMode });
      return response.json();
    },
    onSuccess: () => {
      setHasBet(true);
      playSound('bet');
      // Refresh balance after bet
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      // No notification for bet placement
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const cashoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/games/crash/cashout', { gameMode });
      return response.json();
    },
    onSuccess: (data) => {
      setCanCashout(false);
      setHasBet(false);
      
      // Refresh balance after cashout
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      
      // Show success toast with profit if available
      if (data && data.profit !== undefined) {
        // Play appropriate sound based on profit/multiplier
        if (gameState.multiplier >= 5) {
          playSound('bigWin');
        } else {
          playSound('cashout');
        }
        // Only show notification for wins of $100+
        if (data.profit >= 100) {
          toast({
            title: "💰 BIG WIN - Cashed Out!",
            description: `Profit: +${formatCredits(data.profit)}`,
            variant: "success"
          });
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Cashout Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handlePlaceBet = () => {
    if (!balance || (balance as any).available < betAmount) {
      toast({
        title: "Insufficient Balance",
        description: "Not enough credits",
        variant: "balance" as any,
        duration: 1000
      });
      return;
    }

    if (gameState.status !== 'PENDING' && gameState.status !== 'WAITING') {
      toast({
        title: "Cannot Place Bet",
        description: "Wait for the next round to place a bet",
        variant: "destructive"
      });
      return;
    }

    placeBetMutation.mutate({
      amount: betAmount,
      autoCashout: autoCashoutEnabled && autoCashout ? autoCashout : undefined
    });
  };

  const handleCashout = () => {
    if (!canCashout || gameState.status !== 'RUNNING') {
      return;
    }
    cashoutMutation.mutate();
  };

  const getStatusColor = () => {
    switch (gameState.status) {
      case 'PENDING':
        return 'text-casino-gold';
      case 'RUNNING':
        return 'text-casino-green';
      case 'ENDED':
        return 'text-casino-red';
      default:
        return 'text-casino-text';
    }
  };

  const getStatusText = () => {
    switch (gameState.status) {
      case 'PENDING':
        return 'WAITING FOR PLAYERS';
      case 'RUNNING':
        return 'FLYING';
      case 'ENDED':
        return 'CRASHED';
      default:
        return 'CONNECTING...';
    }
  };

  return (
    <>
    <div className="flex gap-6 max-w-7xl mx-auto p-4 pb-20">
      {/* Main Game Area */}
      <div className="flex-1 max-w-md mx-auto">
      {/* Game Header */}
      <div className="text-center mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold flex-1">Crash Game</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="p-2 rounded-lg bg-casino-card border border-casino-accent text-white hover:bg-casino-accent transition-colors"
              title={audioEnabled ? "Mute sounds" : "Enable sounds"}
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <FavoriteButton gameName="Crash" />
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
        <p className="text-casino-text text-sm">Cash out before the crash!</p>
        {!isConnected && (
          <p className="text-casino-red text-xs mt-2">Connecting to game server...</p>
        )}
      </div>

      {/* Progress Bars */}
      <div className="mb-6 space-y-4">
        {/* Betting Phase Progress */}
        {gameState.status === 'PENDING' && (
          <BettingProgressBar
            isActive={true}
            timeRemaining={gameState.timeLeft || 10}
            totalTime={10}
            className="mb-4"
          />
        )}
        
        {/* Multiplier Progress */}
        {gameState.status === 'RUNNING' && (
          <MultiplierProgressBar
            multiplier={gameState.multiplier}
            maxMultiplier={10}
            isRunning={true}
            className="mb-4"
          />
        )}
      </div>

      {/* Crash Game Interface */}
      <Card className="bg-casino-card border-casino-accent mb-6">
        <CardContent className="p-6">
          {/* Multiplier Display */}
          <div className="text-center mb-6">
            <div className="relative">
              <div className={`text-4xl font-bold mb-2 ${
                gameState.status === 'RUNNING' ? 'animate-bounce-multiplier text-casino-green' : 
                gameState.status === 'ENDED' ? 'text-casino-red' : 'text-casino-gold'
              }`}>
                {gameState.multiplier.toFixed(2)}x
              </div>
              <div className="text-casino-text text-sm">Current Multiplier</div>
              
              {/* Status Indicator */}
              <div className="mt-4">
                <div className={`inline-flex items-center space-x-2 rounded-full px-2 py-1 ${
                  gameState.status === 'PENDING' ? 'bg-casino-gold/20' :
                  gameState.status === 'RUNNING' ? 'bg-casino-green/20' : 'bg-casino-red/20'
                }`}>
                  <div className={`w-4 h-4 rounded-full ${
                    gameState.status === 'RUNNING' ? 'animate-pulse bg-casino-green' :
                    gameState.status === 'PENDING' ? 'bg-casino-gold' : 'bg-casino-red'
                  }`}></div>
                  <span className={`font-medium text-sm ${getStatusColor()}`}>
                    {getStatusText()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Game Graph Area with Animated Bunny */}
          <div className="bg-casino-dark rounded-lg h-40 mb-6 border border-casino-accent relative overflow-hidden">
            {/* Animated Bunny - Full Width Movement */}
            <div className="absolute bottom-2 left-0 text-3xl w-full">
              {gameState.status === 'WAITING' && (
                <div className="text-3xl text-white opacity-70 ml-4">🐰</div>
              )}
              {gameState.status === 'PENDING' && (
                <div className="text-3xl text-casino-gold animate-bounce ml-4">🐰</div>
              )}
              {gameState.status === 'RUNNING' && (
                <div className="bunny-hop text-3xl text-casino-green">🐰</div>
              )}
              {gameState.status === 'ENDED' && (
                <div className="relative ml-4">
                  <div className="bunny-crash text-3xl text-casino-red">😱</div>
                  <div className="absolute -top-2 -right-2 text-xl scissors-animation">✂️</div>
                  <div className="absolute top-0 left-0 text-base bunny-ears-chop">👂👂</div>
                </div>
              )}
            </div>
            
            {/* Game status and chart area */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-casino-text text-xs mb-2">📈 Live multiplier chart</div>
                {gameState.status === 'RUNNING' && (
                  <div className="text-casino-green text-xs animate-pulse">
                    Bunny is racing across the screen! 🚀
                  </div>
                )}
                {gameState.status === 'ENDED' && (
                  <div className="text-casino-red text-xs">
                    Bunny ears got chopped! 💥
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bet Controls */}
          <div className="space-y-4">
            {/* Bet Amount Input */}
            <div>
              <Label className="text-sm font-medium">Bet Amount</Label>
              <div className="relative mt-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balance?.available || 0}
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                  className="bg-casino-dark border-casino-accent text-white placeholder-casino-text focus:border-casino-neon"
                  placeholder="0.00"
                  disabled={hasBet}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-casino-neon text-xs"
                  onClick={() => setBetAmount((balance?.available || 0) / 2)}
                  disabled={hasBet}
                >
                  50%
                </Button>
              </div>
            </div>

            {/* Auto Cashout */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Auto Cashout</Label>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs",
                    autoCashoutEnabled ? "text-green-400" : "text-gray-500"
                  )}>
                    {autoCashoutEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <Switch
                    checked={autoCashoutEnabled}
                    onCheckedChange={setAutoCashoutEnabled}
                    disabled={hasBet}
                  />
                </div>
              </div>
              <Input
                type="number"
                step="0.01"
                min="1.01"
                value={autoCashout || ''}
                onChange={(e) => setAutoCashout(e.target.value ? parseFloat(e.target.value) : undefined)}
                className={cn(
                  "bg-casino-dark border-casino-accent text-white placeholder-casino-text focus:border-casino-neon transition-opacity",
                  !autoCashoutEnabled && "opacity-50"
                )}
                placeholder="2.00x"
                disabled={hasBet || !autoCashoutEnabled}
              />
              {autoCashoutEnabled && autoCashout && (
                <p className="text-xs text-yellow-400">
                  Your bet will automatically cash out at {autoCashout.toFixed(2)}x multiplier
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Place Bet Button - Show when no active bet */}
              {!hasBet && (
                <div className="space-y-2">
                  <Button
                    onClick={handlePlaceBet}
                    disabled={placeBetMutation.isPending || (gameState.status !== 'WAITING' && gameState.status !== 'PENDING')}
                    variant="golden"
                    size="lg"
                    className="w-full text-sm"
                  >
                    {placeBetMutation.isPending ? 'Placing...' : 'Place Bet'}
                  </Button>
                  
                  {/* Disabled Cash Out Button - Shows what will be available */}
                  <Button
                    disabled
                    className="w-full bg-gray-600/50 text-gray-400 font-bold py-1 border-2 border-gray-500/30 opacity-60 text-sm"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base">💰</span>
                      CASH OUT (Place bet first)
                    </div>
                  </Button>
                </div>
              )}

              {/* Enhanced Cash Out Button - Show when user has active bet and game is running */}
              {hasBet && canCashout && gameState.status === 'RUNNING' && (
                <div className="relative">
                  <Button
                    onClick={handleCashout}
                    disabled={cashoutMutation.isPending}
                    variant="destructive"
                    size="lg"
                    className="w-full py-8 text-base animate-pulse"
                  >
                    {cashoutMutation.isPending ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 animate-spin border-3 border-white border-t-transparent rounded-full" />
                        <span className="text-base">CASHING OUT...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">💰</span>
                          <span className="text-base font-black">CASH OUT</span>
                          <span className="text-xl">💰</span>
                        </div>
                        <div className="text-sm font-bold bg-white/20 px-2 py-1 rounded-full">
                          {gameState.multiplier.toFixed(2)}x Multiplier
                        </div>
                      </div>
                    )}
                  </Button>
                  <div className="w-4 h-4 absolute -top-2 -right-2 bg-red-400 rounded-full animate-ping"></div>
                  <div className="w-4 h-4 absolute -top-2 -right-2 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="w-4 h-4 absolute -bottom-2 -left-2 bg-yellow-400 rounded-full animate-ping"></div>
                  <div className="w-4 h-4 absolute -bottom-2 -left-2 bg-yellow-500 rounded-full"></div>
                </div>
              )}

              {/* Alternative Cash Out Button - Show when conditions allow */}
              {hasBet && canCashout && gameState.status !== 'RUNNING' && gameState.status !== 'ENDED' && (
                <Button
                  onClick={handleCashout}
                  disabled={cashoutMutation.isPending}
                  variant="golden"
                  size="lg"
                  className="w-full py-6 text-base"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">💸</span>
                    CASH OUT NOW
                    <span className="text-xs opacity-90">at {gameState.multiplier.toFixed(2)}x</span>
                  </div>
                </Button>
              )}

              {/* Status Button - Show current state when bet is placed but not ready to cash out */}
              {hasBet && !canCashout && (
                <Button
                  disabled
                  className="w-full bg-casino-gold/20 text-casino-gold font-bold py-1 border border-casino-gold/30 text-sm"
                >
                  {gameState.status === 'PENDING' ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="animate-pulse text-base">⏳</span>
                      Waiting for Round to Start...
                    </div>
                  ) : gameState.status === 'ENDED' ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base">💥</span>
                      Round Ended
                    </div>
                  ) : (
                    'Bet Active'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Players */}
      {gameState.players && gameState.players.length > 0 && (
        <Card className="bg-casino-card border-casino-accent mb-6">
          <CardContent className="p-4">
            <h4 className="font-medium text-base mb-3">Live Players</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
              {gameState.players.slice(0, 10).map((player, index) => (
                <div key={`${player.userId}-${index}`} className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-casino-neon rounded-full flex items-center justify-center text-xs text-casino-dark font-bold">
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                    <span>{player.username}</span>
                  </div>
                  <div className="text-right">
                    {player.cashedOut ? (
                      <>
                        <div className="text-casino-green font-bold text-sm">{player.cashedOut.toFixed(2)}x</div>
                        <div className="text-casino-text text-xs">+{player.profit ? formatCredits(player.profit) : '$0.00'}</div>
                      </>
                    ) : gameState.status === 'ENDED' ? (
                      <>
                        <div className="text-casino-red font-bold text-sm">CRASHED</div>
                        <div className="text-casino-text text-xs">-{player.amount.toFixed(2)}</div>
                      </>
                    ) : (
                      <div className="text-casino-gold text-xs">Flying...</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Round History */}
      {crashHistory && crashHistory.length > 0 && (
        <Card className="bg-casino-card border-casino-accent">
          <CardContent className="p-4">
            <h4 className="font-medium text-base mb-3">Recent Crashes</h4>
            <div className="flex flex-wrap gap-2">
              {crashHistory.slice(0, 10).map((round) => (
                <div
                  key={round.id}
                  className={`px-2 py-1 rounded-full text-xs font-medium bg-casino-dark border border-casino-accent ${
                    round.crashPoint < 2 ? 'text-casino-red' :
                    round.crashPoint < 10 ? 'text-casino-green' : 'text-casino-gold'
                  }`}
                >
                  {round.crashPoint?.toFixed(2)}x
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global Bet History */}
      <GlobalBetHistory 
        gameType="crash" 
        className="bg-casino-card border-casino-accent"
      />
      </div>

      {/* Live Wins Feed */}
      <div className="w-80 lg:block hidden">
        <LiveWinsFeed highlightThreshold={100} />
      </div>
    </div>

    {/* Chat Widget - Commented out as component doesn't exist */}
    {/* <ChatWidget /> */}
  </>
  );
}
