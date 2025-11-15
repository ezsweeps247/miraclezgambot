// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Hash, Target, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import FavoriteButton from '@/components/FavoriteButton';

export default function LimboPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Game state
  const [betAmount, setBetAmount] = useState('1');
  const [targetMultiplier, setTargetMultiplier] = useState('2.00');
  const [clientSeed, setClientSeed] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioContext = useRef<AudioContext | null>(null);
  const risingOscillator = useRef<OscillatorNode | null>(null);
  const risingGain = useRef<GainNode | null>(null);
  
  // Auto-play state
  const [autoBetCount, setAutoBetCount] = useState('10');
  const [autoWinStop, setAutoWinStop] = useState('');
  const [autoLossStop, setAutoLossStop] = useState('');
  const [isAutoplaying, setIsAutoplaying] = useState(false);
  const [autoStats, setAutoStats] = useState({ wins: 0, losses: 0, profit: 0 });
  const [onWinAction, setOnWinAction] = useState('reset');
  const [onWinValue, setOnWinValue] = useState('');
  const [onLossAction, setOnLossAction] = useState('reset');
  const [onLossValue, setOnLossValue] = useState('');
  const [currentAutoBetAmount, setCurrentAutoBetAmount] = useState(parseFloat(betAmount));
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');
  
  // Fetch current seed info
  const { data: seedInfo } = useQuery({
    queryKey: ['/api/limbo/seed'],
    refetchInterval: false
  });
  
  // Fetch recent bets
  const { data: recentBets } = useQuery({
    queryKey: ['/api/limbo/bets'],
    refetchInterval: 2000
  });
  
  // Calculate win chance
  const winChance = Math.min(99 / parseFloat(targetMultiplier || '2'), 99);
  const potentialPayout = parseFloat(betAmount || '0') * parseFloat(targetMultiplier || '2');

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

  // Play sound function with various limbo sounds
  const playSound = (type: 'bet' | 'start' | 'rising' | 'win' | 'lose' | 'targetChange' | 'cashout' | 'bigWin') => {
    if (!audioEnabled || !audioContext.current) return;

    const ctx = audioContext.current;
    // Ensure currentTime is valid
    let now = ctx.currentTime;
    if (!isFinite(now) || isNaN(now) || now < 0) {
      now = 0; // Use 0 as fallback
    }

    switch (type) {
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

      case 'start':
        // Starting bell
        const startOsc = ctx.createOscillator();
        const startGain = ctx.createGain();
        startOsc.connect(startGain);
        startGain.connect(ctx.destination);
        startOsc.type = 'sine';
        startOsc.frequency.setValueAtTime(660, now); // E5
        startGain.gain.setValueAtTime(0.25, now);
        startGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        startOsc.start(now);
        startOsc.stop(now + 0.3);
        break;

      case 'rising':
        // Continuous ascending pitch that rises with the result
        stopRisingSound(); // Stop any existing rising sound
        risingOscillator.current = ctx.createOscillator();
        risingGain.current = ctx.createGain();
        risingOscillator.current.connect(risingGain.current);
        risingGain.current.connect(ctx.destination);
        risingOscillator.current.type = 'sine';
        // Ensure frequency value is valid before setting
        const initialFreq = 200;
        if (isFinite(initialFreq) && initialFreq > 0 && isFinite(now)) {
          risingOscillator.current.frequency.setValueAtTime(initialFreq, now);
        } else {
          risingOscillator.current.frequency.value = 200; // Fallback to direct assignment
        }
        // Frequency will be updated based on multiplier
        risingGain.current.gain.setValueAtTime(0.15, now);
        risingOscillator.current.start(now);
        break;

      case 'win':
        // Success chime scaled by multiplier
        stopRisingSound();
        const winNotes = lastResult && lastResult.hitMultiplier > 5 
          ? [523, 659, 784, 1047] // C5, E5, G5, C6 for big wins
          : [523, 659, 784]; // C5, E5, G5 for normal wins
        winNotes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          const startTime = now + i * 0.1;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
          osc.start(startTime);
          osc.stop(startTime + 0.3);
        });
        break;

      case 'bigWin':
        // Extended fanfare for big wins (5x+)
        stopRisingSound();
        const fanfareNotes = [523, 587, 659, 784, 880, 1047]; // C5, D5, E5, G5, A5, C6
        fanfareNotes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          const startTime = now + i * 0.08;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
          osc.start(startTime);
          osc.stop(startTime + 0.4);
        });
        break;

      case 'lose':
        // Crash sound
        stopRisingSound();
        const loseOsc = ctx.createOscillator();
        const loseGain = ctx.createGain();
        loseOsc.connect(loseGain);
        loseGain.connect(ctx.destination);
        loseOsc.type = 'sawtooth';
        loseOsc.frequency.setValueAtTime(400, now);
        loseOsc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        loseGain.gain.setValueAtTime(0.25, now);
        loseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        loseOsc.start(now);
        loseOsc.stop(now + 0.3);
        break;

      case 'targetChange':
        // Slider sound when changing target
        const noise = ctx.createBufferSource();
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
          noiseData[i] = (Math.random() - 0.5) * 0.3;
        }
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000 + parseFloat(targetMultiplier) * 100, now);
        filter.Q.value = 10;
        const targetGain = ctx.createGain();
        noise.connect(filter);
        filter.connect(targetGain);
        targetGain.connect(ctx.destination);
        targetGain.gain.setValueAtTime(0.1, now);
        targetGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        noise.start(now);
        break;

      case 'cashout':
        // Cash register ka-ching
        const cashNotes = [880, 1047, 1319]; // A5, C6, E6
        cashNotes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          const startTime = now + i * 0.05;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.15, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
          osc.start(startTime);
          osc.stop(startTime + 0.2);
        });
        break;
    }
  };
  
  // Play mutation
  const playMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/limbo/play', {
        amount: parseFloat(betAmount),
        targetMultiplier: parseFloat(targetMultiplier),
        clientSeed: clientSeed || undefined
      });
      return response;
    },
    onSuccess: async (data: any) => {
      setLastResult(data);
      setIsAnimating(true);
      
      // Play rising sound
      playSound('rising');
      
      // Animate the result with rising pitch
      const animationDuration = 1000;
      const startTime = Date.now();
      const animateRising = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Update rising sound frequency based on hit multiplier
        if (risingOscillator.current && audioContext.current && data.hitMultiplier && !isNaN(data.hitMultiplier)) {
          const targetFreq = 200 + (data.hitMultiplier * 100); // Scale frequency with multiplier
          const currentFreq = 200 + (progress * (targetFreq - 200));
          // Ensure frequency is valid before setting
          if (isFinite(currentFreq) && currentFreq > 0) {
            risingOscillator.current.frequency.setValueAtTime(currentFreq, audioContext.current.currentTime);
          }
        }
        
        if (progress < 1) {
          requestAnimationFrame(animateRising);
        } else {
          setIsAnimating(false);
          // Play win or lose sound
          if (data.win) {
            if (data.hitMultiplier >= 5) {
              playSound('bigWin');
            } else {
              playSound('win');
            }
          } else {
            playSound('lose');
          }
        }
      };
      animateRising();
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/limbo/bets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bets'] });
      
      if (data.win) {
        // Only show notification for wins of $100+
        // Backend already returns values in dollars, not cents
        const winAmount = parseFloat(data.profit);
        if (winAmount >= 100) {
          toast({
            title: "💰 BIG WIN!",
            description: `You hit ${parseFloat(data.hitMultiplier).toFixed(2)}x and won ${winAmount.toFixed(2)} Credits!`,
          });
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Bet Failed",
        description: error.message || "Failed to place bet",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsPlaying(false);
    }
  });
  
  const handlePlay = () => {
    playSound('bet');
    if (parseFloat(betAmount) < 0.50 || parseFloat(betAmount) > 100) {
      toast({
        title: "Invalid Bet",
        description: "Bet amount must be between $0.50 and $100",
        variant: "destructive"
      });
      return;
    }
    
    if (parseFloat(targetMultiplier) < 1.01 || parseFloat(targetMultiplier) > 1000000) {
      toast({
        title: "Invalid Multiplier",
        description: "Target multiplier must be between 1.01 and 1,000,000",
        variant: "destructive"
      });
      return;
    }
    
    setIsPlaying(true);
    setTimeout(() => playSound('start'), 100);
    playMutation.mutate();
  };
  
  const applyBetAction = (currentAmount: number, action: string, value: string, baseAmount: number) => {
    const numValue = parseFloat(value) || 0;
    switch (action) {
      case 'reset':
        return baseAmount;
      case 'increase_pct':
        return currentAmount * (1 + numValue / 100);
      case 'increase_flat':
        return currentAmount + numValue;
      case 'multiply':
        return currentAmount * numValue;
      default:
        return currentAmount;
    }
  };

  const handleAutoPlay = async () => {
    if (isAutoplaying) {
      setIsAutoplaying(false);
      return;
    }
    
    setIsAutoplaying(true);
    setAutoStats({ wins: 0, losses: 0, profit: 0 });
    setCurrentAutoBetAmount(parseFloat(betAmount));
    
    const maxBets = parseInt(autoBetCount) || 0; // 0 = infinite
    const winStopAmount = parseFloat(autoWinStop) * 100 || Infinity;
    const lossStopAmount = parseFloat(autoLossStop) * 100 || Infinity;
    
    let stats = { wins: 0, losses: 0, profit: 0 };
    let currentBetAmount = parseFloat(betAmount);
    let i = 0;
    
    while (isAutoplaying && (maxBets === 0 || i < maxBets)) {
      try {
        playSound('bet');
        const response = await apiRequest('POST', '/api/limbo/play', {
          amount: currentBetAmount,
          targetMultiplier: parseFloat(targetMultiplier),
          clientSeed: clientSeed || undefined
        });
        
        setLastResult(response);
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 500);
        
        const won = response.win;
        stats = {
          wins: stats.wins + (won ? 1 : 0),
          losses: stats.losses + (won ? 0 : 1),
          profit: stats.profit + parseFloat(response.profit)
        };
        setAutoStats(stats);
        
        // Apply win/loss action for next bet
        if (won) {
          currentBetAmount = applyBetAction(currentBetAmount, onWinAction, onWinValue, parseFloat(betAmount));
        } else {
          currentBetAmount = applyBetAction(currentBetAmount, onLossAction, onLossValue, parseFloat(betAmount));
        }
        setCurrentAutoBetAmount(currentBetAmount);
        
        // Check stop conditions
        if (stats.profit >= winStopAmount) {
          toast({ title: "Auto-play stopped", description: "Win limit reached!" });
          break;
        }
        if (Math.abs(stats.profit) >= lossStopAmount) {
          toast({ title: "Auto-play stopped", description: "Loss limit reached!" });
          break;
        }
        
        queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/limbo/bets'] });
        
        // Delay between bets
        await new Promise(resolve => setTimeout(resolve, 200));
        i++;
      } catch (error) {
        console.error('Auto-play error:', error);
        break;
      }
    }
    
    setIsAutoplaying(false);
  };
  
  const formatMultiplier = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(2);
  };
  
  return (
    <div className="min-h-screen bg-[#0f1212] text-white">
      <div className="container mx-auto p-3 md:p-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Game Area */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Game Display */}
            <Card className="bg-[#1a1d1e] border-gray-800">
              <CardContent className="p-4 md:p-8">
                {/* Game Header */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl md:text-2xl font-bold">Limbo</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAudioEnabled(!audioEnabled)}
                      className="p-2 rounded-lg bg-[#0f1212] border border-gray-700 text-white hover:bg-[#1a1d1e] transition-colors"
                      title={audioEnabled ? "Mute sounds" : "Enable sounds"}
                    >
                      {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>
                    <div className="flex items-center gap-2">
                      <FavoriteButton gameName="Limbo" />
                      <button
                        onClick={() => setLocation("/")}
                        className="border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition px-3 py-1.5 rounded-lg text-sm"
                        data-testid="button-back-casino"
                      >
                        Back to Home
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-center space-y-6">
                  {/* Result Display */}
                  <div className="relative h-32 md:h-48 flex items-center justify-center bg-[#0f1212] rounded-lg">
                    {lastResult ? (
                      <div className={`transition-all duration-500 ${isAnimating ? 'scale-110' : 'scale-100'}`}>
                        <div className={`text-4xl md:text-6xl font-bold ${lastResult.win ? 'text-green-500' : 'text-red-500'}`}>
                          {parseFloat(lastResult.hitMultiplier).toFixed(2)}x
                        </div>
                        <div className="text-xl md:text-2xl mt-2">
                          {lastResult.win ? 'WIN!' : 'BUST'}
                        </div>
                        <div className="text-sm md:text-base text-gray-400 mt-1">
                          Target: {targetMultiplier}x
                        </div>
                      </div>
                    ) : (
                      <div className="text-4xl md:text-6xl font-semibold text-white">
                        1.00x
                      </div>
                    )}
                  </div>
                
                {/* Multiplier Scale */}
                <div className="relative h-8 bg-[#0f1212] rounded-lg overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-300"
                    style={{ width: `${Math.min(winChance, 100)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-2">
                    <span className="text-xs text-gray-400">0%</span>
                    <span className="text-sm font-bold text-white">{winChance.toFixed(2)}% Win Chance</span>
                    <span className="text-xs text-gray-400">100%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Controls */}
          <Card className="bg-[#1a1d1e] border-gray-800">
            <CardContent className="p-6">
              {/* Manual/Auto Toggle */}
              <div className="flex gap-2 mb-3 md:mb-6">
                <Button 
                  className={cn(
                    "flex-1 font-semibold",
                    activeTab === 'manual' 
                      ? "bg-gradient-to-r from-[#4d2b99] to-[#3e2b6b] text-[#D4AF37]" 
                      : "bg-gradient-to-r from-[#2d1b69] to-[#1e1b4b] hover:from-[#3d2b79] hover:to-[#2e2b5b] text-[#D4AF37] border border-[#D4AF37]/20"
                  )}
                  onClick={() => setActiveTab('manual')}
                  disabled={isAutoplaying}
                >
                  Manual
                </Button>
                <Button 
                  className={cn(
                    "flex-1 font-semibold",
                    activeTab === 'auto' 
                      ? "bg-gradient-to-r from-[#4d2b99] to-[#3e2b6b] text-[#D4AF37]" 
                      : "bg-gradient-to-r from-[#2d1b69] to-[#1e1b4b] hover:from-[#3d2b79] hover:to-[#2e2b5b] text-[#D4AF37] border border-[#D4AF37]/20"
                  )}
                  onClick={() => setActiveTab('auto')}
                  disabled={isAutoplaying}
                >
                  Auto
                </Button>
              </div>
              
              <Tabs value={activeTab} className="w-full">
                
                <TabsContent value="manual" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <Label className="text-sm font-medium mb-2">Bet Amount (Credits)</Label>
                      <Input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        min="0.01"
                        step="0.01"
                        className="bg-[#0f1212] border-gray-700 text-white h-10 mb-2 text-sm"
                      />
                      <div className="flex gap-2 h-9">
                        <Button
                          size="sm"
                          onClick={() => setBetAmount((parseFloat(betAmount) / 2).toFixed(2))}
                          className="flex-1 bg-gradient-to-r from-[#2d1b69] to-[#1e1b4b] hover:from-[#3d2b79] hover:to-[#2e2b5b] text-[#D4AF37] border border-[#D4AF37]/20 font-semibold h-full text-sm"
                        >
                          ½
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setBetAmount((parseFloat(betAmount) * 2).toFixed(2))}
                          className="flex-1 bg-gradient-to-r from-[#2d1b69] to-[#1e1b4b] hover:from-[#3d2b79] hover:to-[#2e2b5b] text-[#D4AF37] border border-[#D4AF37]/20 font-semibold h-full text-sm"
                        >
                          2×
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      <Label className="text-sm font-medium mb-2">Target Multiplier</Label>
                      <Input
                        type="number"
                        value={targetMultiplier}
                        onChange={(e) => {
                          setTargetMultiplier(e.target.value);
                          playSound('targetChange');
                        }}
                        min="1.01"
                        max="1000000"
                        step="0.01"
                        className="bg-[#0f1212] border-gray-700 text-white h-10 mb-2 text-sm"
                      />
                      <div className="flex gap-2 h-9">
                        <Button
                          size="sm"
                          onClick={() => setTargetMultiplier('2.00')}
                          className="flex-1 bg-gradient-to-r from-[#2d1b69] to-[#1e1b4b] hover:from-[#3d2b79] hover:to-[#2e2b5b] text-[#D4AF37] border border-[#D4AF37]/20 font-semibold h-full text-sm"
                        >
                          2×
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setTargetMultiplier('10.00')}
                          className="flex-1 bg-gradient-to-r from-[#2d1b69] to-[#1e1b4b] hover:from-[#3d2b79] hover:to-[#2e2b5b] text-[#D4AF37] border border-[#D4AF37]/20 font-semibold h-full text-sm"
                        >
                          10×
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm">Client Seed (Optional)</Label>
                    <Input
                      type="text"
                      value={clientSeed}
                      onChange={(e) => setClientSeed(e.target.value)}
                      placeholder="Enter custom seed for provable fairness"
                      className="bg-[#0f1212] border-gray-700 text-white h-10 text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 p-4 bg-[#0f1212] rounded-lg">
                    <div>
                      <div className="text-xs text-gray-400">Multiplier</div>
                      <div className="text-base font-bold text-white">{targetMultiplier}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Chance</div>
                      <div className="text-base font-bold text-white">{winChance.toFixed(7)}</div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handlePlay}
                    disabled={isPlaying || playMutation.isPending}
                    className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold"
                    size="lg"
                  >
                    {isPlaying ? 'Rolling...' : 'Bet'}
                  </Button>
                </TabsContent>
                
                <TabsContent value="auto" className="space-y-4 mt-4">
                  <div>
                    <Label className="text-sm">Bet Amount</Label>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="Enter bet amount"
                      className="bg-[#0f1212] border-gray-700 text-white h-10 text-sm"
                    />
                    {isAutoplaying && (
                      <div className="text-xs text-gray-400 mt-1">
                        Current: {currentAutoBetAmount.toFixed(2)} Credits
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-sm">Number of Bets (0 = infinite)</Label>
                    <Input
                      type="number"
                      value={autoBetCount}
                      onChange={(e) => setAutoBetCount(e.target.value)}
                      placeholder="Number of bets"
                      className="bg-[#0f1212] border-gray-700 text-white h-10 text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">On Win</Label>
                      <Select value={onWinAction} onValueChange={setOnWinAction}>
                        <SelectTrigger className="bg-[#0f1212] border-gray-700 text-white h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reset">Reset to base</SelectItem>
                          <SelectItem value="increase_pct">Increase by %</SelectItem>
                          <SelectItem value="increase_flat">Increase by amount</SelectItem>
                          <SelectItem value="multiply">Multiply by</SelectItem>
                        </SelectContent>
                      </Select>
                      {onWinAction !== 'reset' && (
                        <Input
                          type="number"
                          value={onWinValue}
                          onChange={(e) => setOnWinValue(e.target.value)}
                          placeholder="Value"
                          className="mt-2 bg-[#0f1212] border-gray-700 text-white h-10 text-sm"
                        />
                      )}
                    </div>
                    <div>
                      <Label className="text-sm">On Loss</Label>
                      <Select value={onLossAction} onValueChange={setOnLossAction}>
                        <SelectTrigger className="bg-[#0f1212] border-gray-700 text-white h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reset">Reset to base</SelectItem>
                          <SelectItem value="increase_pct">Increase by %</SelectItem>
                          <SelectItem value="increase_flat">Increase by amount</SelectItem>
                          <SelectItem value="multiply">Multiply by</SelectItem>
                        </SelectContent>
                      </Select>
                      {onLossAction !== 'reset' && (
                        <Input
                          type="number"
                          value={onLossValue}
                          onChange={(e) => setOnLossValue(e.target.value)}
                          placeholder="Value"
                          className="mt-2 bg-[#0f1212] border-gray-700 text-white h-10 text-sm"
                        />
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Stop on Profit (Credits)</Label>
                      <Input
                        type="number"
                        value={autoWinStop}
                        onChange={(e) => setAutoWinStop(e.target.value)}
                        placeholder="Optional"
                        className="bg-[#0f1212] border-gray-700 text-white h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Stop on Loss (Credits)</Label>
                      <Input
                        type="number"
                        value={autoLossStop}
                        onChange={(e) => setAutoLossStop(e.target.value)}
                        placeholder="Optional"
                        className="bg-[#0f1212] border-gray-700 text-white h-10 text-sm"
                      />
                    </div>
                  </div>
                  
                  {isAutoplaying && (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-[#0f1212] rounded-lg">
                      <div>
                        <div className="text-xs text-gray-400">Wins</div>
                        <div className="text-base font-bold text-green-500">{autoStats.wins}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Losses</div>
                        <div className="text-base font-bold text-red-500">{autoStats.losses}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Profit</div>
                        <div className={`text-base font-bold ${autoStats.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {autoStats.profit.toFixed(2)} Credits
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    onClick={handleAutoPlay}
                    disabled={isPlaying}
                    className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold"
                    size="lg"
                  >
                    {isAutoplaying ? 'STOP AUTO-PLAY' : 'START AUTO-PLAY'}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Side Panel */}
        <div className="space-y-6">
          {/* Provably Fair */}
          <Card className="bg-[#1a1d1e] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white text-lg">
                <Hash className="w-5 h-5" />
                Provably Fair
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="text-xs text-gray-400">Server Seed Hash</div>
                <div className="text-sm font-mono break-all text-white">{seedInfo?.serverSeedHash || 'Loading...'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Nonce</div>
                <div className="text-base font-bold">{seedInfo?.nonce || 0}</div>
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Bets */}
          <Card className="bg-[#1a1d1e] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white text-lg">
                <TrendingUp className="w-5 h-5" />
                Recent Bets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {recentBets?.map((bet: any) => (
                  <div
                    key={bet.id}
                    className={`p-3 rounded bg-[#0f1212] border ${
                      bet.win ? 'border-green-500/50' : 'border-red-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold">
                          {formatMultiplier(parseFloat(bet.hitMultiplier))}x
                        </div>
                        <div className="text-xs text-gray-400">
                          Target: {formatMultiplier(parseFloat(bet.targetMultiplier))}x
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${bet.win ? 'text-green-500' : 'text-red-500'}`}>
                          {bet.win ? '+' : ''}{parseFloat(bet.profit).toFixed(2)} Credits
                        </div>
                        <div className="text-xs text-gray-400">
                          Bet: {parseFloat(bet.amount).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
  );
}