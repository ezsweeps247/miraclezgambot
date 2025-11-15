import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, ArrowLeft, Play, Star } from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';

const latestGames = [
  {
    id: 'tower-defense',
    name: 'TOWER DEFENSE',
    displayName: 'TOWER DEFENSE',
    path: '/tower-defense',
    image: '/game-images/tower-defense.png',
    description: 'Build towers to defend against waves of enemies! Strategic gameplay with multiple tower types and upgrades.',
    rtp: '97.5%',
    volatility: 'Medium',
    isNew: true,
    releaseDate: '2024-12-15'
  },
  {
    id: 'enigma',
    name: 'ENIGMA',
    displayName: 'ENIGMA',
    path: '/enigma',
    image: '/game-images/enigma-marble.png',
    description: '🎮 FREE TO PLAY! Match Oxyd stones in this relaxing puzzle game. Five challenging levels await!',
    rtp: 'FREE',
    volatility: 'Low',
    isNew: true,
    releaseDate: '2024-12-10'
  }
];

export default function LatestReleases() {
  const [, setLocation] = useLocation();

  const handlePlayGame = (path: string) => {
    setLocation(path);
  };

  const formatReleaseDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/')}
          className="text-gray-400 hover:text-white mb-4 rounded-lg text-sm"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="w-6 h-6 text-[#D4AF37]" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">Latest Releases</h1>
        </div>
        <p className="text-gray-400">Discover our newest games and features</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2" data-testid="latest-games-list">
        {latestGames.map((game) => (
          <Card 
            key={game.id} 
            className="bg-casino-card border-casino-border hover:border-[#D4AF37] transition-all duration-300 group overflow-hidden"
          >
            <CardContent className="p-0">
              {/* Game Image */}
              <div className="relative aspect-[3/2] overflow-hidden">
                <img
                  src={game.image}
                  alt={game.displayName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = '/game-images/placeholder.png';
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-300">
                  <Play className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                {/* New Badge */}
                {game.isNew && (
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-[#D4AF37] text-black font-semibold text-xs">
                      <Star className="w-4 h-4 mr-1 fill-current" />
                      NEW
                    </Badge>
                  </div>
                )}

                {/* Favorite Button */}
                <div className="absolute top-3 right-3">
                  <FavoriteButton 
                    gameName={game.name} 
                    className="bg-black/50 hover:bg-black/70 backdrop-blur-sm"
                  />
                </div>
              </div>

              {/* Game Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">
                    {game.displayName}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {formatReleaseDate(game.releaseDate)}
                  </Badge>
                </div>
                
                <p className="text-gray-400 mb-3 text-sm line-clamp-2">
                  {game.description}
                </p>
                
                {/* Game Stats */}
                <div className="flex items-center justify-between mb-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">RTP:</span>
                    <span className="text-[#D4AF37] font-semibold">{game.rtp}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Volatility:</span>
                    <span className="text-[#D4AF37] font-semibold">{game.volatility}</span>
                  </div>
                </div>

                {/* Play Button */}
                <Button
                  onClick={() => handlePlayGame(game.path)}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold py-2 transition-all duration-200 text-sm"
                  data-testid={`button-play-${game.id}`}
                >
                  <Play className="w-5 h-5 mr-2" />
                  {game.rtp === 'FREE' ? 'Play for Free' : 'Play Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon Section */}
      <div className="mt-12">
        <div className="text-center bg-casino-card border-casino-border rounded-lg p-8">
          <Rocket className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h2 className="text-xl font-semibold mb-2 text-white">More Games Coming Soon</h2>
          <p className="text-gray-400 mb-4">
            We're constantly working on new and exciting games for you to enjoy.
          </p>
          <Button 
            onClick={() => setLocation('/')}
            variant="outline"
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black text-sm"
          >
            Explore All Games
          </Button>
        </div>
      </div>
    </div>
  );
}