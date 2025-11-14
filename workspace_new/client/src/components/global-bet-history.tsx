import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, User, Trophy, Clock } from "lucide-react";
import { formatCredits } from "@/lib/utils";

interface GlobalBet {
  id: string;
  roundId: string;
  username: string;
  userLevel: 'REGULAR' | 'PREMIUM' | 'VIP';
  amount: number;
  cashoutMultiplier: string;
  profit: number;
  createdAt: string;
  roundStatus: string;
  crashPoint: string | null;
}

interface GlobalBetHistoryProps {
  gameType?: 'crash' | 'crypto-coaster';
  className?: string;
}

export function GlobalBetHistory({ gameType = 'crypto-coaster', className }: GlobalBetHistoryProps) {
  const [displayBets, setDisplayBets] = useState<GlobalBet[]>([]);

  const { data: bets, isLoading } = useQuery<GlobalBet[]>({
    queryKey: [`/api/games/${gameType}/global-bets`],
    refetchInterval: 2000, // Refresh every 2 seconds for real-time updates
    staleTime: 1000,
  });

  useEffect(() => {
    if (bets && bets.length > 0) {
      setDisplayBets(bets);
    }
  }, [bets]);

  const getUserLevelColor = (level: string) => {
    switch (level) {
      case 'VIP':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'PREMIUM':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Use formatCredits from utils for consistent dollar formatting

  const formatMultiplier = (multiplier: string) => {
    return `${parseFloat(multiplier).toFixed(2)}x`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-[10px] flex items-center gap-2">
            <TrendingUp style={{width: '3px', height: '3px'}} />
            Live Bets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-[10px] flex items-center gap-2">
          <TrendingUp style={{width: '3px', height: '3px'}} />
          Live Bets
          <div className="ml-auto">
            <div className="flex items-center gap-1 text-[8px] text-green-500">
              <div style={{width: '2.5px', height: '2.5px'}} className="bg-green-500 rounded-full animate-pulse" />
              LIVE
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          <div className="space-y-2 p-4">
            {displayBets.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="mx-auto mb-2 opacity-50" style={{width: '3.5px', height: '3.5px'}} />
                <p>No bets yet. Be the first to play!</p>
              </div>
            ) : (
              displayBets.map((bet) => (
                <div
                  key={bet.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border transition-all hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <User className="text-muted-foreground" style={{width: '3px', height: '3px'}} />
                      <span className="font-medium text-[8px]">
                        {bet.username || 'Anonymous'}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-[8px] ${getUserLevelColor(bet.userLevel)}`}
                      >
                        {bet.userLevel}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-[8px]">
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCredits(bet.amount)}
                      </div>
                      <div className="text-[8px] text-muted-foreground">
                        {formatTime(bet.createdAt)}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {bet.roundStatus === 'ENDED' && bet.crashPoint ? (
                        <div className="flex items-center gap-1">
                          <Trophy className={parseFloat(bet.cashoutMultiplier) > 0 ? 'text-green-500' : 'text-red-500'} style={{width: '2.5px', height: '2.5px'}} />
                          <span className={`font-mono text-[8px] ${
                            parseFloat(bet.cashoutMultiplier) > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {parseFloat(bet.cashoutMultiplier) > 0 
                              ? formatMultiplier(bet.cashoutMultiplier)
                              : 'Lost'
                            }
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <div style={{width: '2.5px', height: '2.5px'}} className="bg-yellow-500 rounded-full animate-pulse" />
                          <span className="text-[8px] text-yellow-500 font-medium">
                            Playing
                          </span>
                        </div>
                      )}
                      {bet.profit > 0 && (
                        <div className="text-[8px] text-green-500 mt-1">
                          +{formatCredits(bet.profit)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}