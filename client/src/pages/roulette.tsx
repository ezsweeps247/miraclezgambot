import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatCredits } from '@/lib/utils';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { useLocation } from 'wouter';
import { RouletteWheel } from '@/components/RouletteWheel';
import { useGameMode } from '@/contexts/GameModeContext';
import FavoriteButton from '@/components/FavoriteButton';

// Roulette number colors
const ROULETTE_NUMBERS: Record<number, { color: 'red' | 'black' | 'green' }> = {
  0: { color: 'green' },
  1: { color: 'red' },
  2: { color: 'black' },
  3: { color: 'red' },
  4: { color: 'black' },
  5: { color: 'red' },
  6: { color: 'black' },
  7: { color: 'red' },
  8: { color: 'black' },
  9: { color: 'red' },
  10: { color: 'black' },
  11: { color: 'black' },
  12: { color: 'red' },
  13: { color: 'black' },
  14: { color: 'red' },
  15: { color: 'black' },
  16: { color: 'red' },
  17: { color: 'black' },
  18: { color: 'red' },
  19: { color: 'red' },
  20: { color: 'black' },
  21: { color: 'red' },
  22: { color: 'black' },
  23: { color: 'red' },
  24: { color: 'black' },
  25: { color: 'red' },
  26: { color: 'black' },
  27: { color: 'red' },
  28: { color: 'black' },
  29: { color: 'black' },
  30: { color: 'red' },
  31: { color: 'black' },
  32: { color: 'red' },
  33: { color: 'black' },
  34: { color: 'red' },
  35: { color: 'black' },
  36: { color: 'red' }
};

interface Bet {
  type: string;
  value: any;
  amount: number;
}

// Helper to get adjacent numbers for split bets
function getAdjacentNumbers(num: number): number[] {
  const adjacent: number[] = [];
  const row = (num - 1) % 3;
  const col = Math.floor((num - 1) / 3);
  
  // Horizontal adjacent (to the right)
  if (num % 3 !== 0) adjacent.push(num + 1);
  // Horizontal adjacent (to the left)  
  if ((num - 1) % 3 !== 0) adjacent.push(num - 1);
  // Vertical adjacent (above)
  if (num + 3 <= 36) adjacent.push(num + 3);
  // Vertical adjacent (below)
  if (num - 3 >= 1) adjacent.push(num - 3);
  
  return adjacent;
}

// Helper to get street numbers
function getStreetNumbers(num: number): number[] {
  const firstInRow = num - ((num - 1) % 3);
  return [firstInRow, firstInRow + 1, firstInRow + 2];
}

// Helper to get corner numbers
function getCornerNumbers(num: number): number[][] {
  const corners: number[][] = [];
  
  // Top-left corner
  if (num % 3 !== 1 && num <= 33) {
    corners.push([num, num + 1, num + 3, num + 4]);
  }
  // Top-right corner
  if (num % 3 !== 0 && num <= 33) {
    corners.push([num - 1, num, num + 2, num + 3]);
  }
  // Bottom-left corner
  if (num % 3 !== 1 && num > 3) {
    corners.push([num - 3, num - 2, num, num + 1]);
  }
  // Bottom-right corner
  if (num % 3 !== 0 && num > 3) {
    corners.push([num - 4, num - 3, num - 1, num]);
  }
  
  return corners;
}

// Helper to get line numbers (six-line bet)
function getLineNumbers(num: number): number[][] {
  const lines: number[][] = [];
  const firstInRow = num - ((num - 1) % 3);
  
  if (firstInRow <= 33) {
    lines.push([
      firstInRow, firstInRow + 1, firstInRow + 2,
      firstInRow + 3, firstInRow + 4, firstInRow + 5
    ]);
  }
  if (firstInRow > 3) {
    lines.push([
      firstInRow - 3, firstInRow - 2, firstInRow - 1,
      firstInRow, firstInRow + 1, firstInRow + 2
    ]);
  }
  
  return lines;
}

interface SpinResult {
  winningNumber: number;
  totalWin: number;
  profit: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  bets: Bet[];
}

export default function Roulette() {
  const { gameMode } = useGameMode();
  const [bets, setBets] = useState<Bet[]>([]);
  const [previousBets, setPreviousBets] = useState<Bet[]>([]);
  const [currentBetAmount, setCurrentBetAmount] = useState('1');
  const [clientSeed, setClientSeed] = useState(Math.random().toString(36).substring(7));
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | undefined>(undefined);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [removeMode, setRemoveMode] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioContext = useRef<AudioContext | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Initialize audio context
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContext.current?.close();
    };
  }, []);

  // Play sound function with comprehensive casino sounds
  const playSound = (type: 'spin' | 'win' | 'lose' | 'chip' | 'ballRoll' | 'ballBounce' | 'ballSettle' | 'clear' | 'bigWin') => {
    if (!audioEnabled || !audioContext.current) return;

    const ctx = audioContext.current;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch(type) {
      case 'spin':
        // Mechanical whirring that ramps up
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, now);
        oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.3);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.setValueAtTime(0.25, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.5);
        break;

      case 'ballRoll':
        // Continuous rolling sound
        oscillator.type = 'triangle';
        const rollFreq = 200 + Math.random() * 100;
        oscillator.frequency.setValueAtTime(rollFreq, now);
        // Add modulation for rolling effect
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 15; // Fast modulation
        lfoGain.gain.value = 50;
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        lfo.start(now);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        lfo.stop(now + 0.3);
        break;

      case 'ballBounce':
        // Metallic bounce
        oscillator.type = 'square';
        const bounceFreq = 1000 + Math.random() * 500;
        oscillator.frequency.setValueAtTime(bounceFreq, now);
        oscillator.frequency.exponentialRampToValueAtTime(bounceFreq * 0.7, now + 0.05);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
        break;

      case 'ballSettle':
        // Final click when landing
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        oscillator.start(now);
        oscillator.stop(now + 0.08);
        break;

      case 'chip':
        // Satisfying chip clink
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(1200, now);
        oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.05);
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
        break;

      case 'win':
        // Cash register + celebration
        const notes = [523, 659, 784]; // C5, E5, G5
        notes.forEach((freq, i) => {
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
        // Extended fanfare for big wins
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
        // Descending tone
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.3);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;

      case 'clear':
        // Swoosh sound for clearing bets
        const noise = ctx.createBufferSource();
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
          noiseData[i] = (Math.random() - 0.5) * Math.exp(-i / (noiseData.length * 0.2));
        }
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(3000, now + 0.1);
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        noise.start(now);
        break;
    }
  };

  // Fetch recent winning numbers with gameMode for proper cache separation
  const { data: recentNumbers = [] } = useQuery<Array<{ number: number; color: string; time: Date }>>({
    queryKey: ['/api/roulette/recent', gameMode]
  });

  // Fetch user's spin history with gameMode for proper cache separation
  const { data: history = [] } = useQuery<Array<{ result: number; color: string; createdAt: Date; profit: number }>>({
    queryKey: ['/api/roulette/history', gameMode]
  });

  // React to gameMode changes - reset state and invalidate queries
  useEffect(() => {
    // Reset game state on mode change
    setBets([]);
    setPreviousBets([]);
    setIsSpinning(false);
    setWheelSpinning(false);
    setWinningNumber(undefined);
    setLastResult(null);
    
    // Invalidate queries to refetch for new mode
    queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
    queryClient.invalidateQueries({ queryKey: ["/api/roulette"] });
  }, [gameMode, queryClient]);

  // Spin mutation
  const spinMutation = useMutation({
    mutationFn: async () => {
      if (bets.length === 0) {
        throw new Error('Please place at least one bet');
      }
      
      setIsSpinning(true);
      playSound('chip'); // Play chip sound when starting spin
      const response = await apiRequest('POST', '/api/roulette/spin', {
        bets,
        clientSeed,
        gameMode
      });
      return await response.json();
    },
    onSuccess: (data: SpinResult) => {
      // Start wheel animation with winning number
      setWinningNumber(data.winningNumber);
      setWheelSpinning(true);
      
      // Play wheel spin sound and ball rolling sounds
      playSound('spin');
      setTimeout(() => playSound('ballRoll'), 500);
      setTimeout(() => playSound('ballRoll'), 1000);
      setTimeout(() => playSound('ballBounce'), 1800);
      setTimeout(() => playSound('ballBounce'), 2100);
      setTimeout(() => playSound('ballBounce'), 2300);
      setTimeout(() => playSound('ballSettle'), 2500);
      
      // Store current bets as previous bets before clearing
      setPreviousBets([...bets]);
      
      // Wait for animation to complete before showing results
      setTimeout(() => {
        setLastResult(data);
        setBets([]);
        setClientSeed(Math.random().toString(36).substring(7));
        queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/roulette/recent'] });
        queryClient.invalidateQueries({ queryKey: ['/api/roulette/history'] });
        
        const color = ROULETTE_NUMBERS[data.winningNumber].color;
        
        // Play win or lose sound based on result
        if (data.profit > 0) {
          // Play bigger win sound for larger payouts
          if (data.totalWin >= totalBetAmount * 10) {
            playSound('bigWin');
          } else {
            playSound('win');
          }
        } else {
          playSound('lose');
        }
        
        toast({
          title: `Number ${data.winningNumber} (${color})!`,
          description: data.profit > 0 
            ? `You won ${data.totalWin} credits!` 
            : `Better luck next time!`,
          variant: data.profit > 0 ? 'default' : 'destructive'
        });
      }, 4500); // Wait for animation to complete
    },
    onError: (error: any) => {
      toast({
        title: 'Spin Failed',
        description: error.message || 'Failed to spin the wheel',
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setIsSpinning(false);
    }
  });

  const [selectedBetType, setSelectedBetType] = useState<string>('straight');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate total bet amount on a specific position
  const getTotalBetAmount = (type: string, value: any): number => {
    let total = 0;
    
    if (type === 'number') {
      // For numbers, sum up all bets that include this number
      const num = value as number;
      bets.forEach(bet => {
        if (bet.type === 'straight' && bet.value === num) {
          total += bet.amount;
        } else if (bet.type === 'split' || bet.type === 'street' || bet.type === 'corner' || bet.type === 'line') {
          const numbers = bet.value.split('-').map((n: string) => parseInt(n));
          if (numbers.includes(num)) {
            total += bet.amount;
          }
        }
      });
    } else {
      // For other bet types, sum up all bets of that type and value
      bets.forEach(bet => {
        if (bet.type === type && JSON.stringify(bet.value) === JSON.stringify(value)) {
          total += bet.amount;
        }
      });
    }
    
    return total;
  };

  const placeBet = (type: string, value: any) => {
    playSound('chip'); // Play chip sound for bet placement
    const amount = parseFloat(currentBetAmount);
    if (isNaN(amount) || amount < 0.50 || amount > 100) {
      toast({
        title: 'Invalid Bet',
        description: 'Bet must be between $0.50 and $100',
        variant: 'destructive'
      });
      return;
    }

    // Check if bet already exists
    const existingBetIndex = bets.findIndex(b => b.type === type && JSON.stringify(b.value) === JSON.stringify(value));
    if (existingBetIndex >= 0) {
      // Update existing bet
      const newBets = [...bets];
      newBets[existingBetIndex].amount += amount;
      setBets(newBets);
    } else {
      // Add new bet
      setBets([...bets, { type, value, amount }]);
    }

    toast({
      title: 'Bet Placed',
      description: `${amount} credits on ${type === 'straight' ? `Number ${value}` : type}`,
    });
  };

  const clearBets = () => {
    if (bets.length > 0) {
      playSound('clear'); // Play clear sound when removing bets
    }
    setBets([]);
    toast({
      title: 'Bets Cleared',
      description: 'All bets have been removed',
    });
  };

  const rebetPrevious = () => {
    if (previousBets.length === 0) {
      toast({
        title: 'No Previous Bets',
        description: 'No previous bets to repeat',
        variant: 'destructive'
      });
      return;
    }
    setBets([...previousBets]);
    toast({
      title: 'Rebet Placed',
      description: `${previousBets.length} bets repeated from last round`,
    });
  };

  const halfBets = () => {
    if (bets.length === 0) {
      toast({
        title: 'No Bets',
        description: 'No bets to halve',
        variant: 'destructive'
      });
      return;
    }
    const halvedBets = bets.map(bet => ({
      ...bet,
      amount: Math.floor(bet.amount / 2)
    })).filter(bet => bet.amount > 0);
    
    setBets(halvedBets);
    toast({
      title: 'Bets Halved',
      description: 'All bet amounts have been halved',
    });
  };

  const doubleBets = () => {
    if (bets.length === 0) {
      toast({
        title: 'No Bets',
        description: 'No bets to double',
        variant: 'destructive'
      });
      return;
    }
    const doubledBets = bets.map(bet => ({
      ...bet,
      amount: bet.amount * 2
    }));
    
    setBets(doubledBets);
    toast({
      title: 'Bets Doubled',
      description: 'All bet amounts have been doubled',
    });
  };

  const removeBet = (type: string, value: any) => {
    const newBets = bets.filter(b => !(b.type === type && JSON.stringify(b.value) === JSON.stringify(value)));
    setBets(newBets);
    toast({
      title: 'Bet Removed',
      description: `Removed bet from ${type === 'straight' ? `Number ${value}` : `${type}: ${value}`}`,
    });
  };

  const totalBetAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);

  const handleWheelSpinComplete = () => {
    setWheelSpinning(false);
    setWinningNumber(undefined);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex-1">
          European Roulette
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-2 rounded-lg bg-[#1a1d1e] border border-gray-700 text-white hover:bg-[#2a2d2e] transition-colors"
            title={audioEnabled ? "Mute sounds" : "Enable sounds"}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <FavoriteButton gameName="Roulette" />
            <button
              onClick={() => setLocation("/")}
              className="border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition px-3 py-1.5 rounded-lg text-sm"
              data-testid="button-back-casino"
            >
              Back to Casino
            </button>
          </div>
        </div>
      </div>

      {/* Recent Numbers & Spin History */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Numbers */}
            <div>
              <h3 className="text-base font-semibold mb-2">Recent Numbers</h3>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {recentNumbers.map((num, idx) => (
                  <div
                    key={idx}
                    className={`flex-shrink-0 w-12 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      num.color === 'red' ? 'bg-red-600' :
                      num.color === 'black' ? 'bg-gray-900' :
                      'bg-green-600'
                    }`}
                  >
                    {num.number}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Spin History */}
            <div>
              <h3 className="text-base font-semibold mb-2">Your Spin History</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                {history.slice(0, 5).map((spin, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          spin.color === 'red' ? 'bg-red-600' :
                          spin.color === 'black' ? 'bg-gray-900' :
                          'bg-green-600'
                        }`}
                      >
                        {spin.result}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(spin.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={`font-bold text-xs ${spin.profit > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {spin.profit > 0 ? '+' : ''}{spin.profit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Animated Roulette Wheel */}
      <Card className="bg-gradient-to-br from-casino-card to-casino-dark mb-4">
        <CardContent className="p-4 sm:p-6 flex flex-col items-center">
          <h3 className="text-base font-semibold mb-4 text-center">Roulette Wheel</h3>
          <RouletteWheel 
            isSpinning={wheelSpinning}
            winningNumber={winningNumber}
            onSpinComplete={handleWheelSpinComplete}
            onSpin={() => spinMutation.mutate()}
            canSpin={bets.length > 0 && !isSpinning}
          />
          {isSpinning && !wheelSpinning && (
            <div className="mt-4 text-center text-sm">
              <Loader2 className="animate-spin inline mr-2 w-4 h-4" />
              <span>Placing bets...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Betting Board */}
      <Card className="mb-6">
        <CardContent className="p-2 sm:p-6">
          {/* Action Buttons - Moved to Top */}
          <div className="flex gap-2 mb-3">
            <Button
              onClick={() => spinMutation.mutate()}
              disabled={isSpinning || bets.length === 0}
              variant="golden"
              className="flex-1 h-10 text-sm"
            >
              {isSpinning ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Spinning...
                </>
              ) : (
                'Spin the Wheel'
              )}
            </Button>
            <Button
              onClick={clearBets}
              variant="outline"
              disabled={bets.length === 0 || isSpinning}
              className="h-10 text-sm"
            >
              Clear Bets
            </Button>
          </div>

          {/* Bet Amount and Type Selection */}
          <div className="mb-3 flex gap-2 flex-wrap justify-center">
            <Input
              type="number"
              placeholder="Bet amount"
              value={currentBetAmount}
              onChange={(e) => setCurrentBetAmount(e.target.value)}
              className="w-32 h-10 text-sm"
              min="1"
            />
            <Button onClick={() => setCurrentBetAmount('10')} className="h-10 px-3 text-sm">10</Button>
            <Button onClick={() => setCurrentBetAmount('50')} className="h-10 px-3 text-sm">50</Button>
            <Button onClick={() => setCurrentBetAmount('100')} className="h-10 px-3 text-sm">100</Button>
            <Button onClick={() => setCurrentBetAmount('500')} className="h-10 px-3 text-sm">500</Button>
            
            {/* Advanced Betting Toggle */}
            <Button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              variant="outline"
              className="ml-auto h-10 text-sm"
            >
              {showAdvanced ? 'Simple Bets' : 'Advanced Bets'}
            </Button>
          </div>

          {/* Betting Controls */}
          <div className="mb-3 flex gap-2 flex-wrap">
            <Button 
              onClick={rebetPrevious}
              variant="outline"
              disabled={previousBets.length === 0 || isSpinning}
              className="h-10 text-sm"
            >
              Rebet
            </Button>
            <Button 
              onClick={halfBets}
              variant="outline"
              disabled={bets.length === 0 || isSpinning}
              className="h-10 text-sm"
            >
              Half
            </Button>
            <Button 
              onClick={doubleBets}
              variant="outline"
              disabled={bets.length === 0 || isSpinning}
              className="h-10 text-sm"
            >
              Double
            </Button>
            <Button 
              onClick={() => setRemoveMode(!removeMode)}
              variant={removeMode ? "destructive" : "outline"}
              disabled={isSpinning}
              className="h-10 text-sm"
            >
              {removeMode ? 'Exit Remove Mode' : 'Remove Bets'}
            </Button>
          </div>
          
          {/* Bet Type Selector for Advanced */}
          {showAdvanced && (
            <div className="mb-3 flex gap-2 flex-wrap">
              <Button 
                variant={selectedBetType === 'split' ? 'default' : 'outline'}
                onClick={() => setSelectedBetType('split')}
                className="h-10 text-sm"
              >
                Split (17:1)
              </Button>
              <Button 
                variant={selectedBetType === 'street' ? 'default' : 'outline'}
                onClick={() => setSelectedBetType('street')}
                className="h-10 text-sm"
              >
                Street (11:1)
              </Button>
              <Button 
                variant={selectedBetType === 'corner' ? 'default' : 'outline'}
                onClick={() => setSelectedBetType('corner')}
                className="h-10 text-sm"
              >
                Corner (8:1)
              </Button>
              <Button 
                variant={selectedBetType === 'line' ? 'default' : 'outline'}
                onClick={() => setSelectedBetType('line')}
                className="h-10 text-sm"
              >
                Line (5:1)
              </Button>
            </div>
          )}

          {/* Zero */}
          <div className="mb-4 relative">
            <Button
              onClick={() => {
                if (removeMode) {
                  removeBet('straight', 0);
                } else {
                  placeBet('straight', 0);
                }
              }}
              className={`w-full text-white font-bold text-xl h-12`}
              style={{
                backgroundColor: removeMode ? '#dc2626' : '#059669',
                color: '#ffffff',
                border: `2px solid ${removeMode ? '#dc2626' : '#047857'}`,
                boxShadow: `0 0 8px ${removeMode ? 'rgba(220, 38, 38, 0.5)' : 'rgba(5, 150, 105, 0.5)'}`
              }}
            >
              0
              {/* Show chip on zero if bet exists */}
              {getTotalBetAmount('straight', 0) > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative">
                    <svg width="50" height="50" viewBox="0 0 50 50" className="drop-shadow-lg">
                      {/* Outer ring */}
                      <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                      {/* Inner decorative ring */}
                      <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                      {/* Center circle */}
                      <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                      {/* Value text */}
                      <text x="25" y="30" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                        {getTotalBetAmount('straight', 0)}
                      </text>
                    </svg>
                  </div>
                </div>
              )}
            </Button>
          </div>

          {/* Numbers Grid with Advanced Betting */}
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-0.5 sm:gap-1 mb-4 relative overflow-x-auto">
            {[...Array(36)].map((_, i) => {
              const num = i + 1;
              const color = ROULETTE_NUMBERS[num].color;
              const betOnNumber = bets.find(b => {
                if (b.type === 'straight' && b.value === num) return true;
                // For advanced bets, split the value string and check if number is included
                if (b.type === 'split' || b.type === 'street' || b.type === 'corner' || b.type === 'line') {
                  const numbers = b.value.split('-').map((n: string) => parseInt(n));
                  if (numbers.includes(num)) return true;
                }
                return false;
              });
              
              return (
                <div key={num} className="relative">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (removeMode) {
                        const existingBet = bets.find(b => {
                          if (b.type === 'straight' && b.value === num) return true;
                          if (b.type === 'split' || b.type === 'street' || b.type === 'corner' || b.type === 'line') {
                            const numbers = b.value.split('-').map((n: string) => parseInt(n));
                            if (numbers.includes(num)) return true;
                          }
                          return false;
                        });
                        if (existingBet) {
                          removeBet(existingBet.type, existingBet.value);
                        }
                      } else if (!showAdvanced) {
                        placeBet('straight', num);
                      } else {
                        // Handle advanced bets
                        if (selectedBetType === 'split') {
                          const adjacent = getAdjacentNumbers(num);
                          if (adjacent.length > 0) {
                            const splitValue = `${Math.min(num, adjacent[0])}-${Math.max(num, adjacent[0])}`;
                            placeBet('split', splitValue);
                          }
                        } else if (selectedBetType === 'street') {
                          const street = getStreetNumbers(num);
                          placeBet('street', street.join('-'));
                        } else if (selectedBetType === 'corner') {
                          const corners = getCornerNumbers(num);
                          if (corners.length > 0) {
                            placeBet('corner', corners[0].sort((a, b) => a - b).join('-'));
                          }
                        } else if (selectedBetType === 'line') {
                          const lines = getLineNumbers(num);
                          if (lines.length > 0) {
                            placeBet('line', lines[0].sort((a, b) => a - b).join('-'));
                          }
                        }
                      }
                    }}
                    className={`aspect-square text-white text-base w-full font-bold border-0 ${
                      removeMode ? 'ring-2 ring-red-500' : ''
                    } hover:opacity-80 ${showAdvanced && !removeMode ? 'ring-2 ring-purple-500' : ''}`}
                    style={{
                      backgroundColor: color === 'red' ? '#ef4444' : color === 'black' ? '#1f2937' : '#059669',
                      color: '#ffffff',
                      border: `2px solid ${color === 'red' ? '#dc2626' : color === 'black' ? '#374151' : '#047857'}`,
                      boxShadow: `0 0 8px ${color === 'red' ? 'rgba(239, 68, 68, 0.5)' : color === 'black' ? 'rgba(31, 41, 55, 0.5)' : 'rgba(5, 150, 105, 0.5)'}`
                    }}
                  >
                    {num}
                  </Button>
                  
                  {/* Show chip on number if bet exists */}
                  {getTotalBetAmount('number', num) > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <svg width="36" height="36" viewBox="0 0 50 50" className="drop-shadow-lg animate-in zoom-in-50 duration-200">
                        {/* Outer ring */}
                        <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                        {/* Inner decorative ring */}
                        <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                        {/* Center circle */}
                        <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                        {/* Value text */}
                        <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                          {getTotalBetAmount('number', num)}
                        </text>
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Outside Bets */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="relative">
              <Button onClick={() => placeBet('color', 'red')} className="bg-red-600 hover:bg-red-700 w-full text-white font-bold border border-red-700 h-10 text-sm">
                Red
              </Button>
              {getTotalBetAmount('color', 'red') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg width="40" height="40" viewBox="0 0 50 50" className="drop-shadow-lg animate-in zoom-in-50 duration-200">
                    <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                    <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                    <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                      {getTotalBetAmount('color', 'red')}
                    </text>
                  </svg>
                </div>
              )}
            </div>
            <div className="relative">
              <Button onClick={() => placeBet('color', 'black')} className="bg-black hover:bg-gray-900 w-full text-white font-bold border border-gray-700 h-10 text-sm">
                Black
              </Button>
              {getTotalBetAmount('color', 'black') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg width="40" height="40" viewBox="0 0 50 50" className="drop-shadow-lg animate-in zoom-in-50 duration-200">
                    <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                    <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                    <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                      {getTotalBetAmount('color', 'black')}
                    </text>
                  </svg>
                </div>
              )}
            </div>
            <div className="relative">
              <Button onClick={() => placeBet('even_odd', 'even')} variant="outline" className="w-full h-10 text-sm">
                Even
              </Button>
              {getTotalBetAmount('even_odd', 'even') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg width="40" height="40" viewBox="0 0 50 50" className="drop-shadow-lg animate-in zoom-in-50 duration-200">
                    <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                    <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                    <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                      {getTotalBetAmount('even_odd', 'even')}
                    </text>
                  </svg>
                </div>
              )}
            </div>
            <div className="relative">
              <Button onClick={() => placeBet('even_odd', 'odd')} variant="outline" className="w-full h-10 text-sm">
                Odd
              </Button>
              {getTotalBetAmount('even_odd', 'odd') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg width="40" height="40" viewBox="0 0 50 50" className="drop-shadow-lg animate-in zoom-in-50 duration-200">
                    <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                    <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                    <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                      {getTotalBetAmount('even_odd', 'odd')}
                    </text>
                  </svg>
                </div>
              )}
            </div>
            <div className="relative">
              <Button onClick={() => placeBet('high_low', 'low')} variant="outline" className="w-full h-10 text-sm">
                1-18
              </Button>
              {getTotalBetAmount('high_low', 'low') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg width="40" height="40" viewBox="0 0 50 50" className="drop-shadow-lg animate-in zoom-in-50 duration-200">
                    <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                    <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                    <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                      {getTotalBetAmount('high_low', 'low')}
                    </text>
                  </svg>
                </div>
              )}
            </div>
            <div className="relative">
              <Button onClick={() => placeBet('high_low', 'high')} variant="outline" className="w-full h-10 text-sm">
                19-36
              </Button>
              {getTotalBetAmount('high_low', 'high') > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg width="40" height="40" viewBox="0 0 50 50" className="drop-shadow-lg animate-in zoom-in-50 duration-200">
                    <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                    <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                    <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                      {getTotalBetAmount('high_low', 'high')}
                    </text>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Dozens */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="relative">
              <Button onClick={() => placeBet('dozen', 1)} variant="outline" className="w-full h-10 text-sm">
                1st 12
              </Button>
              {getTotalBetAmount('dozen', 1) > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg width="40" height="40" viewBox="0 0 50 50" className="drop-shadow-lg animate-in zoom-in-50 duration-200">
                    <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                    <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                    <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                      {getTotalBetAmount('dozen', 1)}
                    </text>
                  </svg>
                </div>
              )}
            </div>
            <div className="relative">
              <Button onClick={() => placeBet('dozen', 2)} variant="outline" className="w-full h-10 text-sm">
                2nd 12
              </Button>
              {getTotalBetAmount('dozen', 2) > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg width="40" height="40" viewBox="0 0 50 50" className="drop-shadow-lg animate-in zoom-in-50 duration-200">
                    <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                    <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                    <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                      {getTotalBetAmount('dozen', 2)}
                    </text>
                  </svg>
                </div>
              )}
            </div>
            <div className="relative">
              <Button onClick={() => placeBet('dozen', 3)} variant="outline" className="w-full h-10 text-sm">
                3rd 12
              </Button>
              {getTotalBetAmount('dozen', 3) > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg width="40" height="40" viewBox="0 0 50 50" className="drop-shadow-lg animate-in zoom-in-50 duration-200">
                    <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                    <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                    <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                      {getTotalBetAmount('dozen', 3)}
                    </text>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Columns */}
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <Button onClick={() => placeBet('column', 1)} variant="outline" className="w-full h-10 text-sm">
                Column 1
              </Button>
              {getTotalBetAmount('column', 1) > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg width="40" height="40" viewBox="0 0 50 50" className="drop-shadow-lg animate-in zoom-in-50 duration-200">
                    <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                    <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                    <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                      {getTotalBetAmount('column', 1)}
                    </text>
                  </svg>
                </div>
              )}
            </div>
            <div className="relative">
              <Button onClick={() => placeBet('column', 2)} variant="outline" className="w-full h-10 text-sm">
                Column 2
              </Button>
              {getTotalBetAmount('column', 2) > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg width="40" height="40" viewBox="0 0 50 50" className="drop-shadow-lg animate-in zoom-in-50 duration-200">
                    <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                    <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                    <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                      {getTotalBetAmount('column', 2)}
                    </text>
                  </svg>
                </div>
              )}
            </div>
            <div className="relative">
              <Button onClick={() => placeBet('column', 3)} variant="outline" className="w-full h-10 text-sm">
                Column 3
              </Button>
              {getTotalBetAmount('column', 3) > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg width="40" height="40" viewBox="0 0 50 50" className="drop-shadow-lg animate-in zoom-in-50 duration-200">
                    <circle cx="25" cy="25" r="23" fill="#2F7D32" stroke="#1B5E20" strokeWidth="2"/>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#4CAF50" strokeWidth="1" strokeDasharray="3,2"/>
                    <circle cx="25" cy="25" r="15" fill="#388E3C"/>
                    <text x="25" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                      {getTotalBetAmount('column', 3)}
                    </text>
                  </svg>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Bets */}
      {bets.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="text-base font-semibold mb-2">Current Bets (Total: {formatCredits(totalBetAmount)})</h3>
            <div className="space-y-2">
              {bets.map((bet, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{bet.type === 'straight' ? `Number ${bet.value}` : `${bet.type}: ${bet.value}`}</span>
                  <span className="font-bold">{bet.amount} credits</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Result */}
      {lastResult && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="text-base font-semibold mb-2">Last Spin Result</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span>Winning Number:</span>
                <div
                  className={`w-12 h-10 rounded-full flex items-center justify-center text-white font-bold text-base ${
                    ROULETTE_NUMBERS[lastResult.winningNumber].color === 'red' ? 'bg-red-600' :
                    ROULETTE_NUMBERS[lastResult.winningNumber].color === 'black' ? 'bg-gray-900' :
                    'bg-green-600'
                  }`}
                >
                  {lastResult.winningNumber}
                </div>
              </div>
              <div>Profit: <span className={lastResult.profit > 0 ? 'text-green-500' : 'text-red-500'}>
                {lastResult.profit > 0 ? '+' : ''}{lastResult.profit} credits
              </span></div>
              <div className="text-xs text-gray-500">
                <div>Server Seed Hash: {lastResult.serverSeedHash.substring(0, 16)}...</div>
                <div>Client Seed: {lastResult.clientSeed}</div>
                <div>Nonce: {lastResult.nonce}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  );
}