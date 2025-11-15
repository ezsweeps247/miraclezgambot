import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowLeft, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import FavoriteButton from '@/components/FavoriteButton';

interface RecentGame {
  gameName: string;
  lastPlayed: string;
}

// Game metadata for display purposes
const gameMetadata: Record<string, {
  displayName: string;
  description: string;
  image: string;
  path: string;
  rtp?: string;
  volatility?: string;
}> = {
  'CRASH': {
    displayName: 'CRASH',
    description: 'Watch the multiplier climb, but cash out before it crashes!',
    image: '/game-images/crash.png',
    path: '/crash',
    rtp: '99%',
    volatility: 'High'
  },
  'SLOTS': {
    displayName: 'MIRACLEZ SLOTS',
    description: 'Spin the reels for big wins with expanding wilds',
    image: '/slot-bg.jpg', 
    path: '/slots',
    rtp: '96%',
    volatility: 'Medium'
  },
  'PLINKO': {
    displayName: 'PLINKO',
    description: 'Drop balls through pegs for random payouts',
    image: '/game-images/plinko.png',
    path: '/plinko',
    rtp: '98%',
    volatility: 'Medium'
  },
  'MINES': {
    displayName: 'MINES',
    description: 'Navigate the minefield for increasing rewards',
    image: '/game-images/mines.png',
    path: '/mines',
    rtp: '97%',
    volatility: 'High'
  },
  'Miraclez Dice': {
    displayName: 'MIRACLEZ DICE',
    description: 'Roll the dice for instant multiplier wins',
    image: '/miraclez-dice-preview.png',
    path: '/miraclez-dice',
    rtp: '99%',
    volatility: 'Low'
  },
  'Blackjack': {
    displayName: 'BLACKJACK',
    description: 'Beat the dealer in this classic card game',
    image: '/game-images/blackjack.png',
    path: '/blackjack',
    rtp: '99.5%',
    volatility: 'Low'
  },
  'Roulette': {
    displayName: 'ROULETTE',
    description: 'Spin the wheel and predict where it lands',
    image: '/game-images/roulette.png',
    path: '/roulette',
    rtp: '97.3%',
    volatility: 'Medium'
  },
  'KENO': {
    displayName: 'KENO',
    description: 'Pick numbers and match them to win',
    image: '/game-images/keno.png',
    path: '/keno',
    rtp: '96%',
    volatility: 'Medium'
  },
  'LIMBO': {
    displayName: 'LIMBO',
    description: 'Predict if the result will be above your target',
    image: '/game-images/limbo.png',
    path: '/limbo',
    rtp: '98.5%',
    volatility: 'Medium'
  },
  'Hilo': {
    displayName: 'HI-LO',
    description: 'Guess if the next card is higher or lower',
    image: '/game-images/hilo.png',
    path: '/hilo',
    rtp: '98%',
    volatility: 'Low'
  },
  'Enigma': {
    displayName: 'ENIGMA',
    description: '🎮 FREE TO PLAY! Match Oxyd stones in this relaxing puzzle game',
    image: '/game-images/enigma-marble.png',
    path: '/enigma',
    rtp: 'FREE',
    volatility: 'Low'
  },
  'Miracoaster': {
    displayName: 'MIRACOASTER',
    description: 'Ride the price waves up and down for profits',
    image: '/game-images/crash.png',
    path: '/miracoaster',
    rtp: '98%',
    volatility: 'High'
  },
  'Tower Defense': {
    displayName: 'TOWER DEFENSE',
    description: 'Build towers to defend against waves of enemies',
    image: '/game-images/tower-defense.png',
    path: '/tower-defense',
    rtp: '97.5%',
    volatility: 'Medium'
  }
};

export default function RecentGames() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Fetch recently played games
  const { data: recentGames, isLoading, error } = useQuery<RecentGame[]>({
    queryKey: ['/api/games/recent'],
    enabled: !!user,
  });

  const handlePlayGame = (path: string) => {
    setLocation(path);
  };

  const formatLastPlayed = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <button
            onClick={() => setLocation('/')}
            className="bg-gradient-to-r from-[#B8941A] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#F4D06F] text-black font-semibold px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm flex items-center gap-2"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>

        <Card className="bg-casino-card border-casino-border">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <h2 className="text-lg font-semibold mb-2 text-white">Sign In Required</h2>
            <p className="text-sm text-gray-400 mb-6">
              Please sign in to view your recently played games.
            </p>
            <Button 
              onClick={() => setLocation('/')}
              className="bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold text-sm"
              data-testid="button-go-home"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <button
          onClick={() => setLocation('/')}
          className="bg-gradient-to-r from-[#B8941A] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#F4D06F] text-black font-semibold px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm flex items-center gap-2"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
        
        <div className="flex items-center gap-3 mb-2">
          <Clock className="w-6 h-6 text-[#D4AF37]" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">Recently Played</h1>
        </div>
        <p className="text-sm text-gray-400">Your last 3 played games</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-casino-card border-casino-border animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-700 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-700 rounded w-32"></div>
                    <div className="h-4 bg-gray-700 rounded w-48"></div>
                    <div className="h-3 bg-gray-700 rounded w-24"></div>
                  </div>
                  <div className="w-20 h-10 bg-gray-700 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="bg-casino-card border-casino-border">
          <CardContent className="p-8 text-center">
            <div className="text-red-400 mb-4">
              <Clock className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Error Loading Games</h2>
              <p className="text-sm">Unable to load your recently played games. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      ) : !recentGames || recentGames.length === 0 ? (
        <Card className="bg-casino-card border-casino-border">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <h2 className="text-lg font-semibold mb-2 text-white">No Recent Games</h2>
            <p className="text-sm text-gray-400 mb-6">
              Start playing some games and they'll appear here!
            </p>
            <Button 
              onClick={() => setLocation('/')}
              className="bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold text-sm"
              data-testid="button-browse-games"
            >
              Browse Games
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" data-testid="recent-games-list">
          {recentGames.map((game, index) => {
            const metadata = gameMetadata[game.gameName];
            if (!metadata) return null; // Skip games without metadata

            return (
              <Card 
                key={`${game.gameName}-${index}`} 
                className="bg-casino-card border-casino-border hover:border-[#D4AF37] transition-colors group"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={metadata.image}
                        alt={metadata.displayName}
                        className="w-20 h-20 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/game-images/placeholder.png';
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all">
                        <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base font-semibold text-white truncate">
                          {metadata.displayName}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatLastPlayed(game.lastPlayed)}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                        {metadata.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {metadata.rtp && (
                          <span>RTP: {metadata.rtp}</span>
                        )}
                        {metadata.volatility && (
                          <span>Volatility: {metadata.volatility}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <FavoriteButton 
                        gameName={game.gameName} 
                        className="opacity-70 hover:opacity-100"
                      />
                      <Button
                        onClick={() => handlePlayGame(metadata.path)}
                        className="bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold px-6 text-sm"
                        data-testid={`button-play-${game.gameName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Play
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}