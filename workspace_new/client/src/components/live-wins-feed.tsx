import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Coins, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WinEntry {
  id: string;
  username: string;
  game: 'DICE' | 'SLOTS' | 'CRASH';
  amount: number;
  payout: number;
  multiplier?: number;
  timestamp: string;
  isHighWin?: boolean;
}

interface LiveWinsFeedProps {
  className?: string;
  maxEntries?: number;
  highlightThreshold?: number;
}

export function LiveWinsFeed({ 
  className, 
  maxEntries = 50, 
  highlightThreshold = 100 
}: LiveWinsFeedProps) {
  const [wins, setWins] = useState<WinEntry[]>([]);
  const [newWinIds, setNewWinIds] = useState<Set<string>>(new Set());

  // Fetch recent wins from the API
  const { data: recentWins } = useQuery({
    queryKey: ['/api/casino/live-wins'],
    queryFn: () => fetch('/api/casino/live-wins?limit=' + maxEntries)
      .then(res => res.json()),
    refetchInterval: 3000, // Refetch every 3 seconds
    staleTime: 1000,
  });

  useEffect(() => {
    if (recentWins && Array.isArray(recentWins)) {
      const newWins = recentWins.map((win: any) => ({
        ...win,
        isHighWin: win.payout >= highlightThreshold
      }));

      // Identify newly added wins for animation
      const currentWinIds = new Set(wins.map(w => w.id));
      const newIds = new Set(
        newWins
          .filter((win: WinEntry) => !currentWinIds.has(win.id))
          .map((win: WinEntry) => win.id)
      );

      setNewWinIds(newIds);
      setWins(newWins);

      // Clear new win highlighting after animation
      if (newIds.size > 0) {
        setTimeout(() => setNewWinIds(new Set()), 2000);
      }
    }
  }, [recentWins, highlightThreshold]); // Removed 'wins' dependency to prevent infinite loop

  const getGameIcon = (game: string) => {
    switch (game) {
      case 'DICE': return '🎲';
      case 'SLOTS': return '🎰';
      case 'CRASH': return '🚀';
      default: return '🎮';
    }
  };

  const getGameColor = (game: string) => {
    switch (game) {
      case 'DICE': return 'bg-blue-500/20 text-blue-400';
      case 'SLOTS': return 'bg-yellow-500/20 text-yellow-400';
      case 'CRASH': return 'bg-green-500/20 text-green-400';
      default: return 'bg-casino-accent/20 text-casino-text';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const winTime = new Date(timestamp);
    const diffMs = now.getTime() - winTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return winTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className={cn('bg-casino-card border-casino-accent micro-card fade-in', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-casino-neon">
          <Trophy style={{width: '3px', height: '3px'}} className="float" />
          <span>Live Wins</span>
          <Badge variant="secondary" className="bg-casino-gold/20 text-casino-gold pulse-glow">
            LIVE
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-64 px-4 pb-4 overflow-y-auto">
          {wins.length === 0 ? (
            <div className="text-center py-8 text-casino-text">
              <Coins style={{width: '3.5px', height: '3.5px'}} className="mx-auto mb-2 opacity-50" />
              <p>No recent wins...</p>
              <p className="text-[8px]">Be the first to win big!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {wins.map((win) => (
                <div
                  key={win.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-all duration-500 micro-card hover:scale-102 cursor-pointer',
                    win.isHighWin
                      ? 'bg-gradient-to-r from-casino-gold/10 to-casino-neon/10 border-casino-gold/30'
                      : 'bg-casino-dark/30 border-casino-accent/20',
                    newWinIds.has(win.id) && 'bounce-subtle ring-2 ring-casino-neon/50'
                  )}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px]">{getGameIcon(win.game)}</span>
                      <Badge 
                        variant="outline" 
                        className={cn('text-[8px]', getGameColor(win.game))}
                      >
                        {win.game}
                      </Badge>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-medium text-white truncate">
                          {win.username}
                        </span>
                        {win.isHighWin && (
                          <TrendingUp style={{width: '3px', height: '3px'}} className="text-casino-gold animate-bounce" />
                        )}
                      </div>
                      <div className="text-[8px] text-casino-text">
                        {formatTimeAgo(win.timestamp)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={cn(
                      'font-bold',
                      win.isHighWin ? 'text-casino-gold' : 'text-casino-green'
                    )}>
                      +{win.payout.toFixed(2)}
                    </div>
                    {win.multiplier && (
                      <div className="text-[8px] text-casino-text">
                        {win.multiplier.toFixed(2)}x
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for smaller spaces
export function CompactLiveWinsFeed({ className }: { className?: string }) {
  return (
    <LiveWinsFeed 
      className={cn('max-w-sm', className)}
      maxEntries={20}
      highlightThreshold={50}
    />
  );
}