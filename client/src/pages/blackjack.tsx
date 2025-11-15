import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card as UICard } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCredits } from "@/lib/utils";
import { Volume2, VolumeX } from "lucide-react";
import { useLocation } from "wouter";
import { useGameMode } from "@/contexts/GameModeContext";
import FavoriteButton from "@/components/FavoriteButton";

type BJCard = { rank: number; suit: number };
type BJHandState = {
  id: number;
  status: 'in_play' | 'settled';
  baseBet: number;
  ppBet: number;
  plus3Bet: number;
  insuranceOffered: boolean;
  insuranceBet: number;
  playerHands: { cards: BJCard[]; bet: number; doubled: boolean; finished: boolean; result?: string; payout?: number; }[];
  dealer: { cards: BJCard[]; hidden: boolean };
  serverSeedHash: string;
  clientSeed: string;
  handNonce: number;
  created_at: string;
  balance: number;
  messages?: string[];
};

const suitChar = (s: number) => ['♠','♥','♦','♣'][s];
const isRed = (s: number) => s === 1 || s === 2;
const rankStr = (r: number) => ({1:'A',11:'J',12:'Q',13:'K'} as any)[r] || String(r);

function PlayingCard({ card, faceDown = false }: { card?: BJCard; faceDown?: boolean }) {
  if (faceDown) {
    return (
      <div className="w-14 md:w-20 h-20 md:h-28 rounded-lg border-2 border-gray-700 bg-gradient-to-br from-purple-600 to-purple-900 relative overflow-hidden shadow-lg">
        <div className="absolute inset-2 bg-purple-800/50 rounded"></div>
      </div>
    );
  }
  if (!card) {
    return <div className="w-14 md:w-20 h-20 md:h-28 rounded-lg border border-gray-700 bg-gray-800"></div>;
  }
  const red = isRed(card.suit);
  return (
    <div className={`w-14 md:w-20 h-20 md:h-28 rounded-lg border border-gray-700 bg-white relative flex items-center justify-center font-bold shadow-lg ${red ? 'text-red-500' : 'text-gray-900'}`}>
      <div className="absolute top-1 left-1 md:left-2 text-xs md:text-sm">{rankStr(card.rank)}{suitChar(card.suit)}</div>
      <div className="text-sm md:text-base">{suitChar(card.suit)}</div>
    </div>
  );
}

export default function Blackjack() {
  const [tab, setTab] = useState<"standard" | "side">("standard");
  const [amount, setAmount] = useState(1);
  const [ppBet, setPpBet] = useState(0);
  const [plus3Bet, setPlus3Bet] = useState(0);
  const [insBet, setInsBet] = useState(0);
  const [state, setState] = useState<BJHandState | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const running = useRef(false);
  const audioContext = useRef<AudioContext | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Get balance
  const { data: balance } = useQuery({
    queryKey: ["/api/balance"],
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });

  // Initialize audio context
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContext.current?.close();
    };
  }, []);

  // Play sound effects
  const playSound = (type: "deal" | "win" | "lose" | "blackjack" | "bust" | "chip" | "hit" | "stand") => {
    if (!audioEnabled || !audioContext.current) return;
    
    const ctx = audioContext.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    if (type === "deal") {
      // Card dealing sound - quick swoosh
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    } else if (type === "chip") {
      // Chip placement sound - metallic clink
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    } else if (type === "hit") {
      // Hit sound - card snap
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(600, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    } else if (type === "stand") {
      // Stand sound - subtle confirmation
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      oscillator.frequency.setValueAtTime(550, ctx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    } else if (type === "blackjack") {
      // Blackjack sound - triumphant ascending arpeggio
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5
      oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.3); // C6
      gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    } else if (type === "win") {
      // Win sound - pleasant ascending chime
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
      oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    } else if (type === "lose") {
      // Lose sound - descending low tone
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(300, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    } else if (type === "bust") {
      // Bust sound - harsh descending tone
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.18, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    }
    
    oscillator.connect(gainNode).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
  };

  const half = (setter: (v: number) => void, cur: number) => setter(Math.max(0, cur / 2));
  const dbl = (setter: (v: number) => void, cur: number) => setter(cur * 2);

  const start = async () => {
    try {
      playSound("chip"); // Play chip sound when placing bet
      const response = await fetch("/api/blackjack/start", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ bet: amount, ppBet, plus3Bet })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      const data = await response.json();
      setState(data);
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      
      // Play appropriate sound based on initial cards
      setTimeout(() => {
        playSound("deal");
        // Check for natural blackjack
        if (data.playerHands?.[0]?.result?.includes('Blackjack')) {
          setTimeout(() => playSound("blackjack"), 500);
        }
      }, 100);
    } catch (error: any) {
      console.error("Start game error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start game",
        variant: "destructive"
      });
    }
  };

  const insurance = async () => {
    if (!state) return;
    try {
      const response = await fetch("/api/blackjack/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ handId: state.id, amount: insBet })
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setState(data);
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to place insurance",
        variant: "destructive"
      });
    }
  };

  const act = async (type: "hit" | "stand" | "double" | "split") => {
    if (!state || running.current) return;
    running.current = true;
    try {
      // Play action sound
      if (type === "hit") {
        playSound("hit");
      } else if (type === "stand") {
        playSound("stand");
      } else if (type === "double") {
        playSound("chip");
      } else if (type === "split") {
        playSound("deal");
      }
      
      const response = await fetch("/api/blackjack/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ handId: state.id, action: type, handIndex: 0 })
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setState(data);
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      
      // Play result sounds
      if (data.status === 'settled' || data.playerHands?.[0]?.finished) {
        const hand = data.playerHands?.[0];
        if (hand?.result) {
          setTimeout(() => {
            if (hand.result.includes('Bust')) {
              playSound("bust");
            } else if (hand.result.includes('Blackjack')) {
              playSound("blackjack");
            } else if (hand.result.includes('Win')) {
              playSound("win");
            } else if (hand.result === 'Push') {
              playSound("stand"); // Neutral sound for push
            } else if (hand.result.includes('Lose')) {
              playSound("lose");
            }
          }, 300);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to perform action",
        variant: "destructive"
      });
    } finally {
      running.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1212] text-gray-200 p-3 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold">Blackjack</h1>
            <p className="text-gray-400 text-sm mt-1">Classic 21 with side bets</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="hover:bg-gray-800"
              title={audioEnabled ? "Mute sounds" : "Enable sounds"}
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <FavoriteButton gameName="Blackjack" />
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

        {/* Game Table */}
        <UICard className="bg-[#1a1d1e] border-gray-800 p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-400 mb-4 space-y-1 sm:space-y-0">
              <div>BLACKJACK PAYS 3 TO 2</div>
              <div>DEALER STANDS ON 17</div>
              <div>INSURANCE PAYS 2 TO 1</div>
            </div>

            {!state ? (
              <div className="text-sm h-96 flex items-center justify-center text-gray-500">
                Place your bets and click DEAL to start playing
              </div>
            ) : (
              <div className="space-y-6">
                {/* Dealer */}
                <div>
                  <div className="text-sm text-gray-400 mb-2">Dealer</div>
                  <div className="flex gap-2">
                    {state.dealer.cards.map((c, i) => (
                      <PlayingCard key={i} card={c} faceDown={i === 1 && state.dealer.hidden} />
                    ))}
                  </div>
                </div>

                {/* Player Hands */}
                <div>
                  <div className="text-sm text-gray-400 mb-2">Player</div>
                  <div className="space-y-4">
                    {state.playerHands.map((hand, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <div className="flex gap-2">
                          {hand.cards.map((c, j) => (
                            <PlayingCard key={j} card={c} />
                          ))}
                        </div>
                        {hand.doubled && <span className="text-sm text-yellow-500 ml-2">Doubled</span>}
                        {hand.finished && hand.result && (
                          <span className={`text-sm ml-4 font-semibold ${
                            hand.result.includes('Win') || hand.result.includes('Blackjack') ? 'text-green-500' :
                            hand.result === 'Push' ? 'text-yellow-500' : 'text-red-500'
                          }`}>
                            {hand.result} {hand.payout && hand.payout > 0 && `(${formatCredits(hand.payout)})`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                {state.messages && state.messages.length > 0 && (
                  <div className="mt-4 p-3 bg-[#0f1212] rounded-lg">
                    <ul className="text-sm text-gray-400 space-y-1">
                      {state.messages.map((m, i) => (
                        <li key={i}>• {m}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Mobile Action Buttons - Below Cards (only when game is active) */}
                {state && state.status === 'in_play' && (
                  <div className="mt-6 space-y-2 lg:hidden">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="default"
                        onClick={() => act("hit")}
                        disabled={!state || state.status !== 'in_play'}
                      >
                        Hit
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => act("stand")}
                        disabled={!state || state.status !== 'in_play'}
                      >
                        Stand
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => act("double")}
                        disabled={!state || state.status !== 'in_play'}
                      >
                        Double
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => act("split")}
                        disabled={!state || state.status !== 'in_play'}
                      >
                        Split
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
        </UICard>

        {/* Controls Panel - Now Below Game Table */}
        <UICard className="bg-[#1a1d1e] border-gray-800 p-3 md:p-4 mb-6">
            {/* Deal Button - Moved Above Tabs */}
            <div className="mb-4">
              <Button
                variant="golden"
                size="lg"
                className="w-full"
                onClick={start}
                disabled={state && state.status === 'in_play' || false}
                data-testid="button-deal"
              >
                DEAL
              </Button>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2 bg-[#0f1212]">
                <TabsTrigger value="standard" className="data-[state=active]:bg-[#7c3aed] data-[state=active]:text-white">
                  Standard
                </TabsTrigger>
                <TabsTrigger value="side" className="data-[state=active]:bg-[#7c3aed] data-[state=active]:text-white">
                  Side Bets
                </TabsTrigger>
              </TabsList>

              <TabsContent value="standard" className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Bet Amount</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="bg-[#0f1212] border-gray-700 text-sm text-white"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => half(setAmount, amount)}
                      className="bg-[#0f1212] border-gray-700"
                    >
                      ½
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => dbl(setAmount, amount)}
                      className="bg-[#0f1212] border-gray-700"
                    >
                      2×
                    </Button>
                  </div>
                  <div className="text-sm mt-1 text-gray-500">{formatCredits(amount * 100)}</div>
                </div>
              </TabsContent>

              <TabsContent value="side" className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Bet Amount</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="bg-[#0f1212] border-gray-700 text-sm text-white"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => half(setAmount, amount)}
                      className="bg-[#0f1212] border-gray-700"
                    >
                      ½
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => dbl(setAmount, amount)}
                      className="bg-[#0f1212] border-gray-700"
                    >
                      2×
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Perfect Pairs</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={ppBet}
                      onChange={(e) => setPpBet(Number(e.target.value))}
                      className="bg-[#0f1212] border-gray-700 text-sm text-white"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => half(setPpBet, ppBet)}
                      className="bg-[#0f1212] border-gray-700"
                    >
                      ½
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => dbl(setPpBet, ppBet)}
                      className="bg-[#0f1212] border-gray-700"
                    >
                      2×
                    </Button>
                  </div>
                  <div className="text-sm mt-1 text-gray-500">{formatCredits(ppBet)}</div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">21 + 3</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={plus3Bet}
                      onChange={(e) => setPlus3Bet(Number(e.target.value))}
                      className="bg-[#0f1212] border-gray-700 text-sm text-white"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => half(setPlus3Bet, plus3Bet)}
                      className="bg-[#0f1212] border-gray-700"
                    >
                      ½
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => dbl(setPlus3Bet, plus3Bet)}
                      className="bg-[#0f1212] border-gray-700"
                    >
                      2×
                    </Button>
                  </div>
                  <div className="text-sm mt-1 text-gray-500">{formatCredits(plus3Bet)}</div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Desktop Action Buttons - In Sidebar */}
            <div className="mt-4 space-y-2 hidden lg:block">
              {state && state.status === 'in_play' && (
                <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="default"
                  onClick={() => act("hit")}
                  disabled={!state || state.status !== 'in_play'}
                >
                  Hit
                </Button>
                <Button
                  variant="default"
                  onClick={() => act("stand")}
                  disabled={!state || state.status !== 'in_play'}
                >
                  Stand
                </Button>
                <Button
                  variant="default"
                  onClick={() => act("double")}
                  disabled={!state || state.status !== 'in_play'}
                >
                  Double
                </Button>
                <Button
                  variant="default"
                  onClick={() => act("split")}
                  disabled={!state || state.status !== 'in_play'}
                >
                  Split
                </Button>
                </div>
              )}
            </div>

            {/* Insurance */}
            {state?.insuranceOffered && state.status === "in_play" && state.insuranceBet === 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <label className="text-sm text-gray-400 mb-1 block">Insurance (max half of base bet)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={insBet}
                    onChange={(e) => setInsBet(Number(e.target.value))}
                    className="bg-[#0f1212] border-gray-700 text-sm text-white"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      playSound("chip");
                      insurance();
                    }}
                    className="bg-[#7c3aed] hover:bg-[#6d28d9]"
                  >
                    Place
                  </Button>
                </div>
              </div>
            )}

            {/* Balance */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Balance</span>
                <span className="font-bold text-white">{formatCredits((balance as any)?.available || 0)}</span>
              </div>
            </div>
        </UICard>

        {/* History */}
        <UICard className="bg-[#1a1d1e] border-gray-800 p-4 mt-6">
          <h3 className="font-bold text-base mb-4">Recent Hands</h3>
          <BlackjackHistory />
        </UICard>
      </div>
    </div>
  );
}

function BlackjackHistory() {
  const { data, isFetching } = useQuery({
    queryKey: ["/api/blackjack/history"],
    queryFn: async () => {
      const response = await fetch("/api/blackjack/history?limit=20", {
        credentials: "include"
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    refetchInterval: 5000
  });

  if (!data) return <div className="text-gray-500 text-sm">Loading history...</div>;

  return (
    <div className="space-y-2 max-h-96 overflow-auto custom-scrollbar pr-2">
      {data.map((hand: any) => (
        <div
          key={hand.id}
          className={`p-3 rounded-lg border ${
            hand.profit >= 0 ? 'border-green-800 bg-green-950/30' : 'border-red-800 bg-red-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm">{hand.result_summary || 'In progress'}</div>
            <div className={`text-sm font-bold ${hand.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {hand.profit >= 0 && '+'}{formatCredits(hand.profit)}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Base: {formatCredits(hand.base_bet)} | PP: {formatCredits(hand.pp_bet)} | 21+3: {formatCredits(hand.plus3_bet)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {new Date(hand.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}