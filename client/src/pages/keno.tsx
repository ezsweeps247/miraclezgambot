import React, { useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Volume2, VolumeX } from "lucide-react";
import { useLocation } from "wouter";
import { useGameMode } from "@/contexts/GameModeContext";
import FavoriteButton from "@/components/FavoriteButton";

// Helper: class joiner
function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const NUMBERS = Array.from({ length: 40 }, (_, i) => i + 1);

// Keno payout tables for different risk levels
const KENO_PAYOUTS: Record<string, Record<number, Record<number, number>>> = {
  classic: {
    1: { 0: 0, 1: 3.96 },
    2: { 0: 0, 1: 1, 2: 9 },
    3: { 0: 0, 1: 0.45, 2: 2.5, 3: 25 },
    4: { 0: 0, 1: 0.25, 2: 1.5, 3: 5, 4: 80 },
    5: { 0: 0, 1: 0, 2: 0.6, 3: 3, 4: 20, 5: 150 },
    6: { 0: 0, 1: 0, 2: 0.4, 3: 1.6, 4: 12, 5: 50, 6: 500 },
    7: { 0: 0, 1: 0, 2: 0.4, 3: 1, 4: 4, 5: 20, 6: 100, 7: 1000 },
    8: { 0: 0, 1: 0, 2: 0, 3: 0.6, 4: 2, 5: 10, 6: 50, 7: 200, 8: 2000 },
    9: { 0: 0, 1: 0, 2: 0, 3: 0.3, 4: 1, 5: 6, 6: 25, 7: 100, 8: 500, 9: 4000 },
    10: { 0: 0, 1: 0, 2: 0, 3: 0.3, 4: 0.6, 5: 3, 6: 12, 7: 50, 8: 250, 9: 1500, 10: 10000 },
  },
  low: {
    1: { 0: 0, 1: 3.96 },
    2: { 0: 0, 1: 1.5, 2: 5.5 },
    3: { 0: 0, 1: 0.8, 2: 2, 3: 12 },
    4: { 0: 0, 1: 0.5, 2: 1.5, 3: 3.5, 4: 35 },
    5: { 0: 0, 1: 0.3, 2: 0.8, 3: 2.5, 4: 12, 5: 70 },
    6: { 0: 0, 1: 0.2, 2: 0.5, 3: 1.5, 4: 8, 5: 30, 6: 200 },
    7: { 0: 0, 1: 0.2, 2: 0.5, 3: 1, 4: 3, 5: 15, 6: 60, 7: 400 },
    8: { 0: 0, 1: 0, 2: 0.3, 3: 0.8, 4: 2, 5: 8, 6: 35, 7: 120, 8: 800 },
    9: { 0: 0, 1: 0, 2: 0.2, 3: 0.5, 4: 1.2, 5: 5, 6: 20, 7: 70, 8: 300, 9: 1600 },
    10: { 0: 0, 1: 0, 2: 0.2, 3: 0.4, 4: 0.8, 5: 3, 6: 10, 7: 40, 8: 150, 9: 900, 10: 3200 },
  },
  medium: {
    1: { 0: 0, 1: 3.96 },
    2: { 0: 0, 1: 0.8, 2: 11 },
    3: { 0: 0, 1: 0.3, 2: 3, 3: 38 },
    4: { 0: 0, 1: 0.2, 2: 2, 3: 8, 4: 120 },
    5: { 0: 0, 1: 0, 2: 0.5, 3: 4, 4: 30, 5: 250 },
    6: { 0: 0, 1: 0, 2: 0.3, 3: 2, 4: 18, 5: 80, 6: 800 },
    7: { 0: 0, 1: 0, 2: 0.3, 3: 1.2, 4: 6, 5: 35, 6: 180, 7: 1600 },
    8: { 0: 0, 1: 0, 2: 0, 3: 0.5, 4: 3, 5: 15, 6: 80, 7: 400, 8: 3200 },
    9: { 0: 0, 1: 0, 2: 0, 3: 0.2, 4: 1.5, 5: 8, 6: 40, 7: 180, 8: 900, 9: 6400 },
    10: { 0: 0, 1: 0, 2: 0, 3: 0.2, 4: 0.5, 5: 4, 6: 20, 7: 90, 8: 450, 9: 2500, 10: 15000 },
  },
  high: {
    1: { 0: 0, 1: 3.96 },
    2: { 0: 0, 1: 0.5, 2: 18 },
    3: { 0: 0, 1: 0.2, 2: 3.5, 3: 75 },
    4: { 0: 0, 1: 0, 2: 2, 3: 15, 4: 300 },
    5: { 0: 0, 1: 0, 2: 0.3, 3: 5, 4: 55, 5: 600 },
    6: { 0: 0, 1: 0, 2: 0.2, 3: 2.5, 4: 30, 5: 180, 6: 1800 },
    7: { 0: 0, 1: 0, 2: 0.2, 3: 1.5, 4: 10, 5: 70, 6: 400, 7: 3600 },
    8: { 0: 0, 1: 0, 2: 0, 3: 0.3, 4: 5, 5: 30, 6: 180, 7: 900, 8: 7200 },
    9: { 0: 0, 1: 0, 2: 0, 3: 0.2, 4: 2, 5: 15, 6: 90, 7: 400, 8: 2000, 9: 14400 },
    10: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0.3, 5: 8, 6: 40, 7: 200, 8: 1000, 9: 5000, 10: 30000 },
  },
};

export default function KenoPage() {
  const { user } = useAuth();
  const { gameMode } = useGameMode();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"manual" | "auto">("manual");
  const [bet, setBet] = useState("1");
  const [risk, setRisk] = useState<"classic" | "low" | "medium" | "high">("classic");
  const [picks, setPicks] = useState<number[]>([]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [commitment, setCommitment] = useState<any>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioContext = useRef<AudioContext | null>(null);
  
  // Auto play states
  const [autoRounds, setAutoRounds] = useState("10");
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoRoundsPlayed, setAutoRoundsPlayed] = useState(0);
  const [autoStopOnWin, setAutoStopOnWin] = useState(false);
  const [autoStopOnLoss, setAutoStopOnLoss] = useState(false);
  const autoStopRef = React.useRef(false);
  
  // Get balance from query  
  const { data: balance } = useQuery<{ 
    available: number; 
    locked: number; 
    currency: string;
    sweepsCashTotal?: number;
  }>({ 
    queryKey: ["/api/balance", gameMode] 
  });

  const canBet = Number(bet) > 0 && picks.length >= 1 && picks.length <= 10 && !isPlaying && !autoRunning;

  // Initialize audio context
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContext.current?.close();
    };
  }, []);

  // Play sound function with various casino sounds
  const playSound = (type: 'select' | 'draw' | 'match' | 'win' | 'clear' | 'autopick' | 'bet' | 'loss') => {
    if (!audioEnabled || !audioContext.current) return;

    const ctx = audioContext.current;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (type) {
      case 'select':
        // Soft beep for number selection
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, now);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
        break;

      case 'draw':
        // Popping sound for ball draw
        oscillator.type = 'triangle';
        const popFreq = 800 + Math.random() * 400; // 800-1200Hz varied
        oscillator.frequency.setValueAtTime(popFreq, now);
        oscillator.frequency.exponentialRampToValueAtTime(popFreq * 0.7, now + 0.1);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;

      case 'match':
        // Pleasant ding for matching numbers
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, now); // C6
        oscillator.frequency.setValueAtTime(1047, now + 0.05); // C7
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;

      case 'win':
        // Ascending arpeggio for win
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          const startTime = now + i * 0.08;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
          osc.start(startTime);
          osc.stop(startTime + 0.3);
        });
        break;

      case 'clear':
        // Quick swoosh for clearing
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

      case 'autopick':
        // Quick sequence of selection sounds
        for (let i = 0; i < 5; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          const startTime = now + i * 0.02;
          osc.frequency.setValueAtTime(500 + i * 100, startTime);
          gain.gain.setValueAtTime(0.1, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.02);
          osc.start(startTime);
          osc.stop(startTime + 0.02);
        }
        break;

      case 'bet':
        // Chip placement sound
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(1000, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;

      case 'loss':
        // Simple descending tone for loss
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.3);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;
    }
  };

  // Get initial commitment on mount
  useEffect(() => {
    getNextCommitment();
  }, []);

  async function getNextCommitment() {
    try {
      const response = await apiRequest("GET", "/api/keno/next");
      const data = await response.json();
      setCommitment(data);
    } catch (error) {
      console.error("Failed to get commitment:", error);
    }
  }

  function togglePick(n: number) {
    playSound('select');
    setPicks((prev) =>
      prev.includes(n)
        ? prev.filter((x) => x !== n)
        : prev.length < 10
        ? [...prev, n]
        : prev
    );
  }

  function clearPicks() {
    playSound('clear');
    setPicks([]);
    setDrawnNumbers([]);
    setLastResult(null);
  }

  function autoPick() {
    playSound('autopick');
    const need = Math.max(0, 10 - picks.length);
    const remaining = NUMBERS.filter((n) => !picks.includes(n));
    // simple shuffle
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    setPicks([...picks, ...remaining.slice(0, need)]);
  }

  function halfBet() {
    try {
      const v = Number(bet || 0);
      setBet((v / 2).toFixed(2));
    } catch {}
  }
  
  function doubleBet() {
    try {
      const v = Number(bet || 0);
      setBet((v * 2).toFixed(2));
    } catch {}
  }

  async function handleBet(skipToast = false) {
    if (picks.length === 0 || !commitment || Number(bet) <= 0) return null;

    playSound('bet');
    setIsPlaying(true);
    setDrawnNumbers([]);
    setLastResult(null);

    try {
      const response = await apiRequest("POST", "/api/keno/bet", {
        betAmount: bet,
        picks: picks.sort((a, b) => a - b),
        risk,
        clientSeed: commitment.clientSeed,
        nonce: commitment.nonce
      });
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Animate drawing numbers one by one (faster in auto mode)
      const delay = autoRunning ? 50 : 200;
      for (let i = 0; i < result.drawnNumbers.length; i++) {
        await new Promise(resolve => setTimeout(resolve, delay));
        setDrawnNumbers(prev => {
          const newDrawn = [...prev, result.drawnNumbers[i]];
          // Play draw sound for each ball
          playSound('draw');
          // Check if it's a match
          if (picks.includes(result.drawnNumbers[i])) {
            setTimeout(() => playSound('match'), 50);
          }
          return newDrawn;
        });
      }

      setLastResult(result);
      
      // Refresh balance after bet completes
      await queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      
      // Show result (skip toast in auto mode)
      if (!skipToast) {
        if (result.hits > 0) {
          playSound('win');
          // Only show notification for wins of $100+
          if (result.payout >= 100) {
            toast({
              title: `💰 BIG WIN - ${result.payout} credits!`,
              description: `${result.hits} hits out of ${picks.length} picks (${result.multiplier}x)`,
            });
          }
        } else {
          playSound('loss');
          // No notification for losses
        }
      }

      // Get next commitment for next round
      getNextCommitment();
      return result;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to place bet",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsPlaying(false);
    }
  }

  async function startAutoPlay() {
    if (picks.length === 0) {
      toast({
        title: "Select numbers",
        description: "Please select at least one number",
        variant: "destructive"
      });
      return;
    }
    
    const availableBalance = gameMode === 'real' ? (balance?.sweepsCashTotal || 0) : (balance?.available || 0);
    if (Number(bet) <= 0 || !balance || Number(bet) > availableBalance) {
      toast({
        title: "Invalid bet",
        description: gameMode === 'real' ? "Check your bet amount and SC balance" : "Check your bet amount and balance",
        variant: "destructive"
      });
      return;
    }

    autoStopRef.current = false;
    setAutoRunning(true);
    setAutoRoundsPlayed(0);
    
    const rounds = Number(autoRounds) || 10;
    
    for (let i = 0; i < rounds; i++) {
      if (autoStopRef.current) break;
      
      setAutoRoundsPlayed(i + 1);
      const result = await handleBet(true);
      
      if (!result) {
        break; // Error occurred
      }
      
      // Check stop conditions
      if (autoStopOnWin && result.profit > 0) {
        toast({
          title: "Auto play stopped",
          description: `Won ${result.payout} credits!`,
        });
        break;
      }
      
      if (autoStopOnLoss && result.profit <= 0) {
        toast({
          title: "Auto play stopped",
          description: "Stopped due to loss",
          variant: "destructive"
        });
        break;
      }
      
      // Small delay between rounds
      if (i < rounds - 1 && !autoStopRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setAutoRunning(false);
    setAutoRoundsPlayed(0);
  }

  function stopAutoPlay() {
    autoStopRef.current = true;
  }

  const getNumberState = (n: number) => {
    const isPicked = picks.includes(n);
    const isDrawn = drawnNumbers.includes(n);
    const isHit = isPicked && isDrawn;
    
    if (isHit) return "hit";
    if (isDrawn) return "drawn";
    if (isPicked) return "picked";
    return "normal";
  };

  return (
    <div className="min-h-screen w-full bg-[#0f1212] text-gray-200 py-1 md:py-6">
      <div className="w-full max-w-[1400px] mx-auto px-2 md:px-2">
        {/* Game Header */}
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-[10px] md:text-[10px] font-bold">Keno</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="p-2 rounded-lg bg-[#1a1d1e] border border-gray-700 text-white hover:bg-[#2a2d2e] transition-colors"
              title={audioEnabled ? "Mute sounds" : "Enable sounds"}
            >
              {audioEnabled ? <Volume2 style={{width: '3px', height: '3px'}} className="" /> : <VolumeX style={{width: '3px', height: '3px'}} className="" />}
            </button>
            <div className="flex items-center gap-2">
              <FavoriteButton gameName="Keno" />
              <button
                onClick={() => setLocation("/")}
                className="border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition px-1.5 py-0.5 rounded-lg text-[8px]"
                data-testid="button-back-casino"
              >
                Back to Casino
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - Grid + Side Panel */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* LEFT: GAME GRID */}
          <main className="flex-1 rounded-xl bg-gradient-to-br from-[#1a1d1e] to-[#0f1212] p-4 md:p-6 border border-gray-800">
            <div className="grid grid-cols-8 gap-1 md:gap-2 lg:gap-3 place-items-center mb-4">
              {NUMBERS.map((n) => {
                const state = getNumberState(n);
                return (
                  <button
                    key={n}
                    onClick={() => togglePick(n)}
                    disabled={isPlaying || autoRunning}
                    className={cx(
                      "w-9 h-7 md:w-12 md:h-8 lg:w-16 lg:h-16 rounded-lg border text-white text-[8px] md:text-[8px] lg:text-[10px] font-semibold",
                      "grid place-content-center select-none transition-all",
                      state === "hit" && "bg-green-500 border-green-400 ring-2 ring-green-400 shadow-lg",
                      state === "drawn" && "bg-orange-500 border-orange-400",
                      state === "picked" && "ring-2 ring-[#7c3aed] bg-[#1a1d1e] border-[#7c3aed]",
                      state === "normal" && "bg-[#0f1212] border-gray-700 hover:bg-[#1a1d1e] hover:border-gray-600",
                      isPlaying && "cursor-not-allowed"
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>

            {/* Helper bar */}
            <div className="rounded-lg bg-[#0f1212] border border-gray-700 px-2 py-1 text-center text-[8px] text-gray-300">
              {isPlaying 
                ? `Drawing numbers... ${drawnNumbers.length}/10`
                : `Select 1–10 numbers to play (${picks.length} selected)`
              }
            </div>
          </main>

          {/* RIGHT: BETTING CONTROLS SIDE PANEL */}
          <aside className="w-full lg:w-[340px] flex flex-col gap-3 pb-20 lg:pb-4">
            {/* Stack 1: Mode Tabs */}
            <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
              <div className="text-[8px] font-semibold text-purple-300 mb-2">PLAY MODE</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTab("manual")}
                  className={cx(
                    "flex-1 py-1 px-2 rounded-lg text-[8px] font-semibold transition",
                    tab === "manual"
                      ? "bg-purple-600 text-white shadow-lg"
                      : "bg-[#1a1d1e] text-gray-400 hover:bg-[#2a2d2e] border border-gray-700"
                  )}
                >
                  Manual
                </button>
                <button
                  onClick={() => setTab("auto")}
                  className={cx(
                    "flex-1 py-1 px-2 rounded-lg text-[8px] font-semibold transition",
                    tab === "auto"
                      ? "bg-purple-600 text-white shadow-lg"
                      : "bg-[#1a1d1e] text-gray-400 hover:bg-[#2a2d2e] border border-gray-700"
                  )}
                >
                  Auto
                </button>
              </div>
            </div>

            {/* Stack 2: Bet Amount */}
            <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
                <div className="flex items-center justify-between text-[8px] text-gray-400 mb-2">
                  <span className="inline-flex items-center gap-2">
                    <span>Bet Amount</span>
                    <span style={{width: '3px', height: '3px'}} className="inline-flex items-center justify-center  text-[10px] rounded-full bg-white/10">i</span>
                  </span>
                  <span>{(Number(bet) * 1).toFixed(2)} Credits</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* input with coin icon */}
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
                      disabled={isPlaying}
                      className={
                        "w-full h-8 pl-9 pr-3 rounded-lg bg-[#0f1212] border border-gray-700 text-white text-[8px] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent disabled:opacity-50"
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    onClick={halfBet}
                    disabled={isPlaying}
                    className="h-8 px-2 rounded-lg bg-[#0f1212] border border-gray-700 text-white text-[8px] hover:bg-[#1a1d1e] disabled:opacity-50"
                  >
                    ½
                  </button>
                  <button
                    onClick={doubleBet}
                    disabled={isPlaying}
                    className="h-8 px-2 rounded-lg bg-[#0f1212] border border-gray-700 text-white text-[8px] hover:bg-[#1a1d1e] disabled:opacity-50"
                  >
                    2×
                  </button>
                </div>
            </div>

            {/* Stack 3: Risk */}
            <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
              <div className="text-[8px] font-semibold text-purple-300 mb-2">RISK LEVEL</div>
              <div className="grid grid-cols-2 gap-2">
                <RiskPill 
                  label="Classic" 
                  active={risk === "classic"} 
                  color="blue" 
                  onClick={() => setRisk("classic")}
                  disabled={isPlaying} 
                />
                <RiskPill 
                  label="Low" 
                  active={risk === "low"} 
                  color="green" 
                  onClick={() => setRisk("low")}
                  disabled={isPlaying} 
                />
                <RiskPill 
                  label="Medium" 
                  active={risk === "medium"} 
                  color="amber" 
                  onClick={() => setRisk("medium")}
                  disabled={isPlaying} 
                />
                <RiskPill 
                  label="High" 
                  active={risk === "high"} 
                  color="rose" 
                  onClick={() => setRisk("high")}
                  disabled={isPlaying} 
                />
              </div>
            </div>

            {/* Stack 4: Manual Controls */}
            {tab === "manual" && (
              <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/30 p-3 border border-purple-500/30">
                <div className="text-[8px] font-semibold text-purple-300 mb-2">QUICK ACTIONS</div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={autoPick}
                    disabled={isPlaying || autoRunning}
                    className="h-7 rounded-lg bg-[#1a1d1e] border border-gray-700 text-white text-[8px] hover:bg-[#2a2d2e] disabled:opacity-50 transition"
                  >
                    Auto pick
                  </button>
                  <button
                    onClick={clearPicks}
                    disabled={isPlaying || autoRunning}
                    className="h-7 rounded-lg bg-[#1a1d1e] border border-gray-700 text-white text-[8px] hover:bg-[#2a2d2e] disabled:opacity-50 transition"
                  >
                    Clear
                  </button>
                </div>

                {/* Bet button */}
                <button
                  onClick={() => handleBet()}
                  disabled={!canBet}
                  className={cx(
                    "h-8 w-full rounded-xl text-[8px] font-bold transition shadow-lg",
                    canBet
                        ? "bg-[#7c3aed] hover:bg-[#6d28d9]"
                        : "bg-[#7c3aed]/40 cursor-not-allowed"
                    )}
                  >
                    {isPlaying ? "Playing..." : "Bet"}
                  </button>
              </div>
            )}

              {/* Auto tab content */}
              {tab === "auto" && (
                <>
                  {/* Auto rounds input */}
                  <div className="mt-6">
                    <div className="text-[8px] text-gray-400 mb-2">Number of Rounds</div>
                    <input
                      type="number"
                      value={autoRounds}
                      onChange={(e) => setAutoRounds(e.target.value)}
                      disabled={autoRunning}
                      className="w-full h-8 px-2 rounded-lg bg-[#0f1212] border border-gray-700 text-white text-[8px] focus:outline-none focus:ring-2 focus:ring-[#7c3aed] disabled:opacity-50"
                      placeholder="10"
                      min="1"
                      max="100"
                    />
                  </div>

                  {/* Stop conditions */}
                  <div className="mt-4 space-y-2">
                    <label className="flex items-center gap-2 text-[8px] text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoStopOnWin}
                        onChange={(e) => setAutoStopOnWin(e.target.checked)}
                        disabled={autoRunning}
                        style={{width: '3px', height: '3px'}} className=" rounded bg-[#0f1212] border-gray-700"
                      />
                      <span>Stop on any win</span>
                    </label>
                    <label className="flex items-center gap-2 text-[8px] text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoStopOnLoss}
                        onChange={(e) => setAutoStopOnLoss(e.target.checked)}
                        disabled={autoRunning}
                        style={{width: '3px', height: '3px'}} className=" rounded bg-[#0f1212] border-gray-700"
                      />
                      <span>Stop on loss</span>
                    </label>
                  </div>

                  {/* Auto play button */}
                  <button
                    onClick={autoRunning ? stopAutoPlay : startAutoPlay}
                    disabled={picks.length === 0 && !autoRunning}
                    className={cx(
                      "mt-6 h-8 w-full rounded-xl text-[8px] font-semibold transition shadow-sm",
                      autoRunning
                        ? "bg-red-600 hover:bg-red-700"
                        : picks.length > 0
                        ? "bg-[#7c3aed] hover:bg-[#6d28d9]"
                        : "bg-[#7c3aed]/40 cursor-not-allowed"
                    )}
                  >
                    {autoRunning ? `Stop (${autoRoundsPlayed}/${autoRounds})` : "Start Auto Play"}
                  </button>

                  {/* Utility buttons */}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <button
                      onClick={autoPick}
                      disabled={isPlaying || autoRunning}
                      className="h-8 rounded-xl bg-[#0f1212] border border-gray-700 text-white text-[8px] hover:bg-[#1a1d1e] disabled:opacity-50"
                    >
                      Auto pick
                    </button>
                    <button
                      onClick={clearPicks}
                      disabled={isPlaying || autoRunning}
                      className="h-8 rounded-xl bg-[#0f1212] border border-gray-700 text-white text-[8px] hover:bg-[#1a1d1e] disabled:opacity-50"
                    >
                      Clear table
                    </button>
                  </div>
                </>
              )}

              {/* Last result */}
              {lastResult && (
                <div className="mt-6 p-4 rounded-xl bg-[#0f1212] border border-gray-700">
                  <div className="text-[8px] text-gray-400 mb-2">Last Result</div>
                  <div className="space-y-1 text-[8px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hits:</span>
                      <span className="text-white">{lastResult.hits}/{picks.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Multiplier:</span>
                      <span className="text-white">{lastResult.multiplier}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Payout:</span>
                      <span className={cx(
                        "font-semibold",
                        lastResult.profit > 0 ? "text-green-400" : "text-gray-400"
                      )}>
                        {lastResult.payout} credits
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payout Table */}
              {picks.length > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-[#0f1212] border border-gray-700">
                  <div className="text-[8px] text-gray-400 mb-2">Payout Table ({risk})</div>
                  <div className="text-[8px] space-y-1">
                    {Object.entries(KENO_PAYOUTS[risk][picks.length] || {}).map(([hits, multiplier]) => {
                      if (multiplier === 0) return null;
                      return (
                        <div key={hits} className="flex justify-between">
                          <span className="text-gray-400">{hits} hits:</span>
                          <span className={cx(
                            "font-semibold",
                            Number(hits) === picks.length ? "text-yellow-400" : "text-white"
                          )}>
                            {multiplier}x
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function RiskPill({
  label,
  active,
  color,
  onClick,
  disabled,
}: {
  label: string;
  active?: boolean;
  color: "blue" | "green" | "amber" | "rose";
  onClick?: () => void;
  disabled?: boolean;
}) {
  // Color maps for subtle colored pills
  const map: Record<string, { bg: string; ring: string; text: string }> = {
    blue: {
      bg: "bg-blue-600/20",
      ring: "ring-1 ring-blue-400/40",
      text: "text-blue-200",
    },
    green: {
      bg: "bg-emerald-600/20",
      ring: "ring-1 ring-emerald-400/40",
      text: "text-emerald-200",
    },
    amber: {
      bg: "bg-amber-600/20",
      ring: "ring-1 ring-amber-400/40",
      text: "text-amber-200",
    },
    rose: {
      bg: "bg-rose-600/20",
      ring: "ring-1 ring-rose-400/40",
      text: "text-rose-200",
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "h-8 rounded-md px-2 text-[8px] font-semibold border transition disabled:opacity-50",
        active 
          ? "bg-[#1a1a1a] text-white border-purple-600" 
          : "bg-gradient-to-r from-[#2d1b69] to-[#1e1b4b] hover:from-[#3d2b79] hover:to-[#2e2b5b] text-[#D4AF37] border-[#D4AF37]/20"
      )}
    >
      {label}
    </button>
  );
}