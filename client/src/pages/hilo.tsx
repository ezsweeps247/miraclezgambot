// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Equal, SkipForward, Play, Square, Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import FavoriteButton from '@/components/FavoriteButton';

type CardType = { rank: number; suit: number }; // 1..13, 0..3
type PredictMode = 'higher' | 'lower' | 'equal' | 'auto_best';

type HiloState = {
  id: number;
  status: 'in_play' | 'settled';
  baseBet: number;
  current: CardType;
  roundNonce: number;
  serverSeedHash: string;
  clientSeed: string;
  balance: number;
  skips: number;
  quote: { higher: number; lower: number; equal: number };
  result?: { 
    next: CardType; 
    outcome: 'higher' | 'lower' | 'equal'; 
    win: boolean; 
    payout: number; 
    profit: number;
  };
};

const suitChar = (s: number) => ['♠', '♥', '♦', '♣'][s];
const isRed = (s: number) => s === 1 || s === 2;
const rankStr = (r: number) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' } as any)[r] || String(r);

function PlayingCard({ card }: { card: CardType }) {
  const red = isRed(card.suit);
  return (
    <div className={`relative w-14 md:w-20 h-20 md:h-28 rounded-lg border-2 ${red ? 'border-red-500' : 'border-gray-700'} bg-white dark:bg-gray-900 flex items-center justify-center shadow-lg`}>
      <div className={`absolute top-1 md:top-2 left-1 md:left-2 text-xs md:text-sm font-bold ${red ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
        {rankStr(card.rank)}{suitChar(card.suit)}
      </div>
      <div className={`text-lg md:text-xl ${red ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
        {suitChar(card.suit)}
      </div>
    </div>
  );
}

export default function HiloGame() {
  const { user } = useAuth();
  const { data: balance } = useQuery({
    queryKey: ['/api/balance'],
    enabled: !!user
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<'manual' | 'auto'>('manual');
  
  // Manual mode state
  const [amount, setAmount] = useState(1);
  const [state, setState] = useState<HiloState | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Auto mode state
  const [autoCount, setAutoCount] = useState(0); // 0 = infinite
  const [autoSkips, setAutoSkips] = useState(0);
  const [autoBase, setAutoBase] = useState(1);
  const [autoPredict, setAutoPredict] = useState<PredictMode>('auto_best');
  const [autoCfg, setAutoCfg] = useState({ 
    onWin: { mode: 'reset', val: 0 }, 
    onLoss: { mode: 'reset', val: 0 }, 
    stopProfit: 0, 
    stopLoss: 0 
  });
  const [running, setRunning] = useState(false);
  const stopFlag = useRef(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioContext = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContext.current?.close();
    };
  }, []);

  // Play sound function with various Hi-Lo sounds
  const playSound = (type: 'flip' | 'win' | 'lose' | 'cashout' | 'shuffle' | 'bet' | 'skip' | 'multiplier') => {
    if (!audioEnabled || !audioContext.current) return;

    const ctx = audioContext.current;
    const now = ctx.currentTime;

    switch (type) {
      case 'flip':
        // Paper swoosh/flip sound
        const noise = ctx.createBufferSource();
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
          noiseData[i] = (Math.random() - 0.5) * Math.exp(-i / (noiseData.length * 0.3));
        }
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        filter.Q.value = 2;
        const flipGain = ctx.createGain();
        noise.connect(filter);
        filter.connect(flipGain);
        flipGain.connect(ctx.destination);
        flipGain.gain.setValueAtTime(0.3, now);
        flipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        noise.start(now);
        break;

      case 'win':
        // Success ding (C5 → E5)
        const winOsc1 = ctx.createOscillator();
        const winGain1 = ctx.createGain();
        winOsc1.connect(winGain1);
        winGain1.connect(ctx.destination);
        winOsc1.type = 'sine';
        winOsc1.frequency.setValueAtTime(523, now); // C5
        winGain1.gain.setValueAtTime(0.2, now);
        winGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        winOsc1.start(now);
        winOsc1.stop(now + 0.2);
        
        const winOsc2 = ctx.createOscillator();
        const winGain2 = ctx.createGain();
        winOsc2.connect(winGain2);
        winGain2.connect(ctx.destination);
        winOsc2.type = 'sine';
        winOsc2.frequency.setValueAtTime(659, now + 0.1); // E5
        winGain2.gain.setValueAtTime(0.2, now + 0.1);
        winGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        winOsc2.start(now + 0.1);
        winOsc2.stop(now + 0.3);
        break;

      case 'lose':
        // Buzzer/fail sound
        const loseOsc = ctx.createOscillator();
        const loseGain = ctx.createGain();
        loseOsc.connect(loseGain);
        loseGain.connect(ctx.destination);
        loseOsc.type = 'square';
        loseOsc.frequency.setValueAtTime(150, now);
        loseGain.gain.setValueAtTime(0.15, now);
        loseGain.gain.setValueAtTime(0, now + 0.1);
        loseGain.gain.setValueAtTime(0.15, now + 0.15);
        loseGain.gain.setValueAtTime(0, now + 0.25);
        loseGain.gain.setValueAtTime(0.1, now + 0.28);
        loseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        loseOsc.start(now);
        loseOsc.stop(now + 0.3);
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
          const startTime = now + i * 0.08;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
          osc.start(startTime);
          osc.stop(startTime + 0.25);
        });
        break;

      case 'shuffle':
        // Card shuffle sound (multiple noise bursts)
        for (let i = 0; i < 3; i++) {
          const shuffleNoise = ctx.createBufferSource();
          const shuffleBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
          const shuffleData = shuffleBuffer.getChannelData(0);
          for (let j = 0; j < shuffleData.length; j++) {
            shuffleData[j] = (Math.random() - 0.5) * 0.5;
          }
          shuffleNoise.buffer = shuffleBuffer;
          const shuffleFilter = ctx.createBiquadFilter();
          shuffleFilter.type = 'highpass';
          shuffleFilter.frequency.value = 3000;
          const shuffleGain = ctx.createGain();
          shuffleNoise.connect(shuffleFilter);
          shuffleFilter.connect(shuffleGain);
          shuffleGain.connect(ctx.destination);
          const startTime = now + i * 0.08;
          shuffleGain.gain.setValueAtTime(0.2, startTime);
          shuffleGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);
          shuffleNoise.start(startTime);
        }
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

      case 'skip':
        // Quick swoosh for skip
        const skipNoise = ctx.createBufferSource();
        const skipBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
        const skipData = skipBuffer.getChannelData(0);
        for (let i = 0; i < skipData.length; i++) {
          skipData[i] = (Math.random() - 0.5) * Math.exp(-i / (skipData.length * 0.2));
        }
        skipNoise.buffer = skipBuffer;
        const skipFilter = ctx.createBiquadFilter();
        skipFilter.type = 'highpass';
        skipFilter.frequency.setValueAtTime(500, now);
        skipFilter.frequency.exponentialRampToValueAtTime(2000, now + 0.08);
        const skipGain = ctx.createGain();
        skipNoise.connect(skipFilter);
        skipFilter.connect(skipGain);
        skipGain.connect(ctx.destination);
        skipGain.gain.setValueAtTime(0.2, now);
        skipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        skipNoise.start(now);
        break;

      case 'multiplier':
        // Small ascending tone for multiplier increase
        const multOsc = ctx.createOscillator();
        const multGain = ctx.createGain();
        multOsc.connect(multGain);
        multGain.connect(ctx.destination);
        multOsc.type = 'sine';
        multOsc.frequency.setValueAtTime(600, now);
        multOsc.frequency.exponentialRampToValueAtTime(900, now + 0.1);
        multGain.gain.setValueAtTime(0.15, now);
        multGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        multOsc.start(now);
        multOsc.stop(now + 0.1);
        break;
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/games/hilo/start', {});
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Hi-Lo start failed:', response.status, errorData);
        throw new Error(errorData || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setState(data);
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      playSound('shuffle'); // Play shuffle sound when new game starts
    } catch (error: any) {
      console.error('Hi-Lo start error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start game',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const quoteText = (x: number) => (x > 0 ? x.toFixed(2) + 'x' : '—');

  const skip = async () => {
    if (!state || state.status !== 'in_play') return;
    playSound('skip');
    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/games/hilo/skip', { id: state.id });
      const data = await response.json();
      setState(data);
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to skip card',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const bet = async (prediction: 'higher' | 'lower' | 'equal') => {
    if (!state || state.status !== 'in_play') return;
    playSound('bet');
    playSound('flip');
    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/games/hilo/bet', { 
        id: state.id, 
        amount, 
        prediction 
      });
      const data = await response.json();
      setState(data);
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      
      if (data.result?.win) {
        playSound('win');
        playSound('multiplier');
        // Only show notification for wins of $100+
        if (data.result.payout >= 100) {
          toast({
            title: '💰 BIG WIN!',
            description: `Won ${data.result.payout.toFixed(2)} credits!`
          });
        }
      } else if (data.result) {
        playSound('lose');
        // No notification for losses
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to place bet',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const restart = async () => {
    await load();
  };

  const choosePrediction = (s: HiloState): 'higher' | 'lower' | 'equal' => {
    if (autoPredict !== 'auto_best') return autoPredict as any;
    const pairs: [('higher' | 'lower' | 'equal'), number][] = [
      ['higher', s.quote.higher], 
      ['lower', s.quote.lower], 
      ['equal', s.quote.equal]
    ];
    pairs.sort((a, b) => b[1] - a[1]);
    return pairs[0][0];
  };

  const applyRule = (cur: number, rule: { mode: string, val: number }, base: number) => {
    switch (rule.mode) {
      case 'reset': return base;
      case 'inc_pct': return cur * (1 + rule.val / 100);
      case 'inc_flat': return cur + rule.val;
      case 'multiply': return cur * rule.val;
      default: return cur;
    }
  };

  const startAuto = async () => {
    setRunning(true);
    stopFlag.current = false;
    let i = 0;
    let betAmt = autoBase;
    const startBal = balance?.available || 0;

    while (!stopFlag.current && (autoCount === 0 || i < autoCount)) {
      // Start round
      let response = await apiRequest('POST', '/api/games/hilo/start', {});
      let s = await response.json();
      
      // Skips
      for (let k = 0; k < autoSkips; k++) {
        response = await apiRequest('POST', '/api/games/hilo/skip', { id: s.id });
        s = await response.json();
      }
      
      const pred = choosePrediction(s);
      response = await apiRequest('POST', '/api/games/hilo/bet', { 
        id: s.id, 
        amount: betAmt, 
        prediction: pred 
      });
      const r = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      
      const won = !!r.result?.win;
      if (won) {
        playSound('win');
        playSound('multiplier');
      } else {
        playSound('lose');
      }

      // Session P/L check
      const pnl = (balance?.available || 0) - startBal;
      if (autoCfg.stopProfit > 0 && pnl >= autoCfg.stopProfit) break;
      if (autoCfg.stopLoss > 0 && -pnl >= autoCfg.stopLoss) break;

      betAmt = applyRule(betAmt, won ? autoCfg.onWin : autoCfg.onLoss, autoBase);

      await new Promise(res => setTimeout(res, 250));
      i++;
    }
    setRunning(false);
  };

  return (
    <div className="container mx-auto p-3 md:p-4 max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg md:text-xl font-bold">Hi-Lo</CardTitle>
              <CardDescription className="text-sm">Predict if the next card will be higher, lower, or equal</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="p-2 rounded-lg bg-[#1a1d1e] border border-gray-700 text-white hover:bg-[#2a2d2e] transition-colors"
                title={audioEnabled ? "Mute sounds" : "Enable sounds"}
              >
                {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <div className="flex items-center gap-2">
                <FavoriteButton gameName="Hilo" />
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
        </CardHeader>
        <CardContent>
          {!state ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Left panel - Controls */}
              <div className="space-y-4">
                <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual">Manual</TabsTrigger>
                    <TabsTrigger value="auto">Auto</TabsTrigger>
                  </TabsList>

                  <TabsContent value="manual" className="space-y-4">
                    <div>
                      <Label htmlFor="bet-amount">Bet Amount</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="bet-amount"
                          type="number"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(Number(e.target.value))}
                          disabled={loading}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAmount(a => Math.max(0.01, a / 2))}
                          disabled={loading}
                        >
                          ½
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAmount(a => a * 2)}
                          disabled={loading}
                        >
                          2x
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {amount.toFixed(2)} Credits
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full text-sm"
                      onClick={skip}
                      disabled={loading || state.status !== 'in_play'}
                    >
                      <SkipForward className="mr-2 w-4 h-4" />
                      Change Card (Skip)
                    </Button>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="default"
                        onClick={() => bet('higher')}
                        disabled={loading || state.status !== 'in_play'}
                        className="h-auto py-3 text-sm"
                      >
                        <div className="text-center">
                          <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                          <div>Higher</div>
                          <div className="text-xs opacity-80">{quoteText(state.quote.higher)}</div>
                        </div>
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => bet('equal')}
                        disabled={loading || state.status !== 'in_play'}
                        className="h-auto py-3 text-sm"
                      >
                        <div className="text-center">
                          <Equal className="w-5 h-5 mx-auto mb-1" />
                          <div>Equal</div>
                          <div className="text-xs opacity-80">{quoteText(state.quote.equal)}</div>
                        </div>
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => bet('lower')}
                        disabled={loading || state.status !== 'in_play'}
                        className="h-auto py-3 text-sm"
                      >
                        <div className="text-center">
                          <TrendingDown className="w-5 h-5 mx-auto mb-1" />
                          <div>Lower</div>
                          <div className="text-xs opacity-80">{quoteText(state.quote.lower)}</div>
                        </div>
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="auto" className="space-y-4">
                    <div>
                      <Label htmlFor="auto-base">Base Bet</Label>
                      <Input
                        id="auto-base"
                        type="number"
                        step="0.01"
                        value={autoBase}
                        onChange={(e) => setAutoBase(Number(e.target.value))}
                        disabled={running}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="auto-skips">Skips/Round</Label>
                        <Input
                          id="auto-skips"
                          type="number"
                          min={0}
                          value={autoSkips}
                          onChange={(e) => setAutoSkips(Number(e.target.value))}
                          disabled={running}
                        />
                      </div>
                      <div>
                        <Label htmlFor="auto-count">Rounds</Label>
                        <Input
                          id="auto-count"
                          type="number"
                          min={0}
                          value={autoCount}
                          onChange={(e) => setAutoCount(Number(e.target.value))}
                          disabled={running}
                        />
                        <p className="text-xs text-muted-foreground">0 = infinite</p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="auto-predict">Predict Mode</Label>
                      <Select value={autoPredict} onValueChange={(v) => setAutoPredict(v as PredictMode)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto_best">Auto (best multiplier)</SelectItem>
                          <SelectItem value="higher">Always Higher</SelectItem>
                          <SelectItem value="lower">Always Lower</SelectItem>
                          <SelectItem value="equal">Always Equal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {!running ? (
                      <Button className="w-full text-sm" onClick={startAuto}>
                        <Play className="mr-2 w-4 h-4" />
                        Start Autobet
                      </Button>
                    ) : (
                      <Button 
                        className="w-full text-sm" 
                        variant="destructive"
                        onClick={() => { stopFlag.current = true; }}
                      >
                        <Square className="mr-2 w-4 h-4" />
                        Stop
                      </Button>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right panel - Game area */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Current Card</p>
                    <PlayingCard card={state.current} />
                  </div>
                  
                  {state.result && (
                    <>
                      <div className="text-sm text-muted-foreground">→</div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Next Card</p>
                        <PlayingCard card={state.result.next} />
                      </div>
                    </>
                  )}
                </div>

                {state.result && (
                  <div className={`p-4 rounded-lg border ${
                    state.result.win 
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-500' 
                      : 'bg-red-50 dark:bg-red-950/30 border-red-500'
                  }`}>
                    <div className="font-semibold text-base">
                      {state.result.win ? '✓ WIN' : '✗ LOSS'} — {state.result.outcome.toUpperCase()} @ {state.quote[state.result.outcome]?.toFixed(2)}x
                    </div>
                    <div className="text-xs mt-1">
                      Payout: {state.result.payout.toFixed(2)} • Profit: {state.result.profit.toFixed(2)} Credits
                    </div>
                  </div>
                )}

                {state.status === 'settled' && (
                  <Button className="text-sm" onClick={restart}>New Round</Button>
                )}

                <Separator />

                <div className="text-xs space-y-1">
                  <p className="text-muted-foreground">
                    Server Seed Hash: <span className="font-mono text-xs">{state.serverSeedHash.slice(0, 16)}...</span>
                  </p>
                  <p className="text-muted-foreground">
                    Round Nonce: {state.roundNonce}
                  </p>
                  <p className="text-muted-foreground">
                    Skips Used: {state.skips}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}