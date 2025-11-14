import { useState, useEffect, useRef } from 'react';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { formatCreditsCompact } from '@/lib/utils';

interface LiveBet {
  id: string;
  username: string;
  game: string;
  betAmount: number;
  multiplier?: number;
  payout: number;
  timestamp: number;
  userId: string;
}

export function LiveBetsFeed() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'latest' | 'my' | 'high' | 'race'>('latest');
  const [bets, setBets] = useState<LiveBet[]>([]);
  const [displayCount, setDisplayCount] = useState(10);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Fetch initial bets from API
    const fetchInitialBets = async () => {
      try {
        const response = await fetch('/api/bets?limit=50');
        if (response.ok) {
          const data = await response.json();
          setBets(data.bets || []);
        }
      } catch (error) {
        console.error('Error fetching initial bets:', error);
      }
    };
    
    fetchInitialBets();
    
    // Connect to WebSocket for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('Connected to live bets feed');
        // Subscribe to bet updates
        socket.send(JSON.stringify({ type: 'subscribe_bets' }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'new_bet') {
            setBets(prev => [data.bet, ...prev].slice(0, 100)); // Keep max 100 bets in memory
          } else if (data.type === 'initial_bets') {
            // WebSocket also sends initial bets, update if we haven't fetched from API yet
            setBets(prev => prev.length === 0 ? (data.bets || []) : prev);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      socket.onclose = () => {
        console.log('Disconnected from live bets feed');
      };

      return () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'unsubscribe_bets' }));
          socket.close();
        }
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }, []);

  const getFilteredBets = () => {
    if (activeTab === 'race') {
      // Weekly race - aggregate total bets per user
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const weeklyBets = bets.filter(bet => bet.timestamp > oneWeekAgo);
      
      // Group by user and sum their bet amounts
      const userTotals = new Map<string, { username: string; total: number; betCount: number }>();
      
      weeklyBets.forEach(bet => {
        const existing = userTotals.get(bet.userId) || { username: bet.username, total: 0, betCount: 0 };
        existing.total += bet.betAmount;
        existing.betCount += 1;
        userTotals.set(bet.userId, existing);
      });
      
      // Convert to array and sort by total bet amount
      const leaderboard = Array.from(userTotals.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, displayCount);
      
      // Return as special format for race display
      return leaderboard.map((user, index) => ({
        id: `race-${index}`,
        username: user.username,
        game: `${user.betCount} bets`,
        betAmount: user.total,
        multiplier: 0,
        payout: user.total,
        timestamp: Date.now(),
        userId: user.username
      }));
    }
    
    let filtered = [...bets];
    
    switch (activeTab) {
      case 'my':
        filtered = filtered.filter(bet => bet.userId === user?.id);
        break;
      case 'high':
        filtered = filtered.filter(bet => bet.betAmount >= 25);
        break;
      case 'latest':
      default:
        // Show all latest bets
        break;
    }
    
    return filtered.slice(0, displayCount);
  };

  const filteredBets = getFilteredBets();

  return (
    <section className="px-4 py-6">
      <div className="bg-[#0A0A0A] rounded-xl border border-[#1a1a1a] overflow-hidden">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white text-xl">Live Bets</h3>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">
                Displaying {Math.min(displayCount, filteredBets.length)} games
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-gray-400 hover:text-white bg-[#1a1a1a] hover:bg-[#2a2a2a] text-sm"
                  >
                    {displayCount}
                    <ChevronDown className="ml-1 w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#0A0A0A] border-[#1a1a1a] text-white">
                  <DropdownMenuItem onClick={() => setDisplayCount(10)} className="hover:bg-purple-600/20">10</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDisplayCount(25)} className="hover:bg-purple-600/20">25</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDisplayCount(50)} className="hover:bg-purple-600/20">50</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDisplayCount(100)} className="hover:bg-purple-600/20">100</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tabs - Sleek Horizontal Scrollable */}
          <div className="overflow-x-auto mb-3 thin-scrollbar">
            <div className="flex gap-1 min-w-fit p-1 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border border-purple-500/20 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('latest')}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-[3px] [&_svg]:shrink-0 transform hover:scale-105 active:scale-95 from-purple-950/50 to-purple-800/50 hover:from-purple-900/70 hover:to-purple-700/70 hover:text-purple-200 hover:shadow-lg hover:shadow-purple-500/30 min-w-[55px] h-5 px-1.5 py-0 font-semibold transition-all rounded bg-purple-600 text-white hover:bg-purple-700 text-sm"
              >
                Latest
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('my')}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-[3px] [&_svg]:shrink-0 transform hover:scale-105 active:scale-95 bg-gradient-to-b from-purple-950/50 to-purple-800/50 hover:from-purple-900/70 hover:to-purple-700/70 hover:shadow-lg hover:shadow-purple-500/30 min-w-[55px] h-5 px-1.5 py-0 font-semibold transition-all rounded text-gray-400 hover:text-white hover:bg-[#2a2a2a] text-sm"
              >
                Mine
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('high')}
                className={`min-w-[65px] h-5 px-1.5 py-0 text-sm font-semibold transition-all rounded ${
                  activeTab === 'high'
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                High Roll
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('race')}
                className={`min-w-[55px] h-5 px-1.5 py-0 text-sm font-semibold transition-all rounded whitespace-nowrap ${
                  activeTab === 'race'
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                Weekly
              </Button>
            </div>
          </div>

          {/* Bets List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
            {filteredBets.length > 0 ? (
              filteredBets.map((bet, index) => {
                const isWin = bet.payout > bet.betAmount;
                const isMyBet = bet.userId === user?.id;
                const isMega = bet.multiplier && bet.multiplier >= 100;
                const position = activeTab === 'race' ? index + 1 : null;
                
                return (
                  <div
                    key={bet.id}
                    className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                      isMyBet 
                        ? 'bg-purple-600/10 border border-purple-600/30' 
                        : 'bg-[#1a1a1a] hover:bg-[#252525]'
                    } ${isMega ? 'border border-yellow-500/50 shadow-lg shadow-yellow-500/20' : ''}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {position && (
                          <span className={`text-xs font-bold ${
                            position === 1 ? 'text-yellow-500' : 
                            position === 2 ? 'text-gray-400' : 
                            position === 3 ? 'text-orange-500' : 
                            'text-gray-500'
                          }`}>
                            #{position}
                          </span>
                        )}
                        <span className="font-medium text-white text-base">
                          {isMyBet ? 'You' : bet.username}
                        </span>
                        {isMega && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-yellow-500 to-yellow-400 text-black rounded-full animate-pulse">
                            MEGA WIN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-400 text-sm">
                          {bet.game}
                        </span>
                        {bet.multiplier && bet.multiplier > 0 && (
                          <>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="font-semibold text-purple-400 text-sm">
                              {bet.multiplier.toFixed(2)}x
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {bet.betAmount >= 1000 ? (
                          <span className="text-yellow-500 text-xs">
                            {formatCreditsCompact(bet.betAmount)}
                          </span>
                        ) : (
                          <span className="text-white text-sm">
                            {bet.betAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {bet.payout !== bet.betAmount && (
                        <div className={`flex items-center gap-1 text-xs font-bold ${
                          isWin ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {isWin ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span className="text-sm">{isWin ? '+' : ''}{formatCreditsCompact(bet.payout - bet.betAmount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-xs">No bets yet</p>
                <p className="text-xs mt-2">Be the first to place a bet!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}