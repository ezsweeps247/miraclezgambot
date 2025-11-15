import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ArrowLeft, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import FavoriteButton from '@/components/FavoriteButton';

interface FavoriteGame {
  gameName: string;
  createdAt: string;
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
  'Crash': {
    displayName: 'CRASH',
    description: 'Watch the multiplier climb, but cash out before it crashes!',
    image: '/game-images/crash.png',
    path: '/crash',
    rtp: '99%',
    volatility: 'High'
  },
  'Slots': {
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
  'Plinko': {
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
  'Keno': {
    displayName: 'KENO',
    description: 'Pick numbers and match them to win',
    image: '/game-images/keno.png',
    path: '/keno',
    rtp: '96%',
    volatility: 'Medium'
  },
  'Limbo': {
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
  'ENIGMA': {
    displayName: 'ENIGMA',
    description: '🎮 FREE TO PLAY! Match Oxyd stones in this relaxing puzzle game',
    image: '/game-images/enigma-marble.png',
    path: '/enigma',
    rtp: 'FREE',
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

export default function FavoriteGames() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Fetch favorite games
  const { data: favoriteGames, isLoading, error } = useQuery<FavoriteGame[]>({
    queryKey: ['/api/games/favorites'],
    enabled: !!user,
  });

  const handlePlayGame = (path: string) => {
    setLocation(path);
  };

  const formatDateAdded = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      return 'Added today';
    } else if (diffDays === 1) {
      return 'Added yesterday';
    } else if (diffDays < 7) {
      return `Added ${diffDays} days ago`;
    } else {
      return `Added ${date.toLocaleDateString()}`;
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="text-gray-400 hover:text-white mb-4"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm">Back to Home</span>
          </Button>
        </div>

        <Card className="bg-casino-card border-casino-border">
          <CardContent className="p-8 text-center">
            <Star className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <h2 className="text-xl font-semibold mb-2 text-white">Sign In Required</h2>
            <p className="text-sm text-gray-400 mb-6">
              Please sign in to view your favorite games.
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
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setLocation('/')}
          className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black mb-4 rounded-lg"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="text-sm">Back to Home</span>
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <Star className="w-6 h-6 text-[#D4AF37] fill-[#D4AF37]" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">Favorite Games</h1>
        </div>
        <p className="text-sm text-gray-400">Games you've marked as favorites</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-casino-card border-casino-border animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-700 rounded w-32"></div>
                    <div className="h-4 bg-gray-700 rounded w-48"></div>
                    <div className="h-3 bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="bg-casino-card border-casino-border">
          <CardContent className="p-8 text-center">
            <div className="text-red-400 mb-4">
              <Star className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Games</h2>
              <p className="text-sm">Unable to load your favorite games. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      ) : !favoriteGames || favoriteGames.length === 0 ? (
        <Card className="bg-casino-card border-casino-border">
          <CardContent className="p-8 text-center">
            <Star className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <h2 className="text-xl font-semibold mb-2 text-white">No Favorite Games</h2>
            <p className="text-sm text-gray-400 mb-6">
              Start adding games to your favorites by clicking the star icon on any game!
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
        <div className="grid gap-4 md:grid-cols-2" data-testid="favorite-games-list">
          {favoriteGames.map((game, index) => {
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
                        className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover"
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
                        <h3 className="text-base md:text-lg font-semibold text-white truncate">
                          {metadata.displayName}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          <span className="text-xs">{formatDateAdded(game.createdAt)}</span>
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

                    <div className="flex flex-col items-end gap-2">
                      <FavoriteButton 
                        gameName={game.gameName} 
                        className="opacity-70 hover:opacity-100"
                      />
                      <Button
                        onClick={() => handlePlayGame(metadata.path)}
                        className="bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold px-6 text-sm"
                        data-testid={`button-play-${game.gameName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      >
                        <Play className="w-5 h-5 mr-2" />
                        <span className="text-sm">Play</span>
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