import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowLeft, Play, Crown } from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';

const originalGames = [
  {
    id: 'miraclez-dice',
    name: 'MIRACLEZ DICE',
    displayName: 'MIRACLEZ DICE',
    path: '/miraclez-dice',
    image: '/miraclez-dice-preview.png',
    description: 'Roll the dice for instant multiplier wins with provably fair randomness',
    rtp: '99%',
    volatility: 'Low',
    houseEdge: '1%'
  },
  {
    id: 'slots',
    name: 'MIRACLEZ SLOTS',
    displayName: 'MIRACLEZ SLOTS', 
    path: '/slots',
    image: '/slot-bg.jpg',
    description: 'Spin the reels for big wins with expanding wilds and bonus rounds',
    rtp: '96%',
    volatility: 'Medium',
    houseEdge: '4%'
  },
  {
    id: 'crash',
    name: 'CRASH',
    displayName: 'CRASH',
    path: '/crash',
    image: '/game-images/crash.png',
    description: 'Watch the multiplier climb, but cash out before it crashes!',
    rtp: '99%',
    volatility: 'High',
    houseEdge: '1%'
  },
  {
    id: 'miracoaster',
    name: 'MIRACOASTER',
    displayName: 'CRYPTO COASTER',
    path: '/miracoaster',
    image: '/miraclez-logo-v2.png',
    description: 'Ride the price waves up and down for profits in this unique trading game',
    rtp: '98%',
    volatility: 'High',
    houseEdge: '2%'
  },
  {
    id: 'plinko',
    name: 'PLINKO',
    displayName: 'PLINKO',
    path: '/plinko',
    image: '/game-images/plinko.png',
    description: 'Drop balls through pegs for random payouts with customizable risk levels',
    rtp: '98%',
    volatility: 'Medium',
    houseEdge: '2%'
  },
  {
    id: 'mines',
    name: 'MINES',
    displayName: 'MINES',
    path: '/mines',
    image: '/game-images/mines.png',
    description: 'Navigate the minefield for increasing rewards with strategic choices',
    rtp: '97%',
    volatility: 'High',
    houseEdge: '3%'
  },
  {
    id: 'keno',
    name: 'KENO',
    displayName: 'KENO',
    path: '/keno',
    image: '/game-images/keno.png',
    description: 'Pick numbers and match them to win with multiple betting options',
    rtp: '96%',
    volatility: 'Medium',
    houseEdge: '4%'
  },
  {
    id: 'tower-defense',
    name: 'TOWER DEFENSE',
    displayName: 'TOWER DEFENSE',
    path: '/tower-defense',
    image: '/game-images/tower-defense.png',
    description: 'Build towers to defend against waves of enemies in this strategy game',
    rtp: '97.5%',
    volatility: 'Medium',
    houseEdge: '2.5%'
  },
  {
    id: 'enigma',
    name: 'ENIGMA',
    displayName: 'ENIGMA',
    path: '/enigma',
    image: '/game-images/enigma-marble.png',
    description: '🎮 FREE TO PLAY! Match Oxyd stones in this relaxing puzzle game',
    rtp: 'FREE',
    volatility: 'Low',
    houseEdge: 'FREE PLAY'
  }
];

export default function OriginalsPage() {
  const [, setLocation] = useLocation();

  const handlePlayGame = (path: string) => {
    setLocation(path);
  };

  const getVolatilityColor = (volatility: string) => {
    switch (volatility.toLowerCase()) {
      case 'low':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/')}
          className="text-sm text-gray-400 hover:text-white mb-4 rounded-lg"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-[#D4AF37]" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">Miraclez Originals</h1>
          <Crown className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <p className="text-sm text-gray-400">Exclusively designed and developed by Miraclez Gaming</p>
      </div>

      {/* Featured Banner */}
      <Card className="mb-8 bg-gradient-to-r from-[#D4AF37]/20 to-purple-500/20 border-[#D4AF37]">
        <CardContent className="p-6 md:p-8">
          <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-[#D4AF37]" />
              <h2 className="text-lg md:text-xl font-bold text-white">Exclusive Originals</h2>
              <Sparkles className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Experience unique games crafted exclusively for Miraclez Gaming. From innovative mechanics 
              to classic reimaginings, these games offer something you won't find anywhere else.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Provably Fair</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#D4AF37] rounded-full"></div>
                <span>High RTP</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Mobile Optimized</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Games Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="originals-games-list">
        {originalGames.map((game) => (
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
                  <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                {/* Original Badge */}
                <div className="absolute top-3 left-3">
                  <Badge className="text-xs bg-gradient-to-r from-[#D4AF37] to-yellow-500 text-black font-semibold">
                    <Crown className="w-3 h-3 mr-1" />
                    ORIGINAL
                  </Badge>
                </div>

                {/* Free Badge for Enigma */}
                {game.rtp === 'FREE' && (
                  <div className="absolute top-3 right-12">
                    <Badge className="text-xs bg-green-500 text-white font-semibold">
                      FREE
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
                  <Badge 
                    variant="secondary" 
                    className={`text-xs text-white ${getVolatilityColor(game.volatility)}`}
                  >
                    {game.volatility}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                  {game.description}
                </p>
                
                {/* Game Stats */}
                <div className="flex items-center justify-between mb-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">RTP:</span>
                    <span className="text-[#D4AF37] font-semibold">{game.rtp}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Edge:</span>
                    <span className="text-[#D4AF37] font-semibold">{game.houseEdge}</span>
                  </div>
                </div>

                {/* Play Button */}
                <Button
                  onClick={() => handlePlayGame(game.path)}
                  className="w-full text-sm bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold py-2 transition-all duration-200"
                  data-testid={`button-play-${game.id}`}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {game.rtp === 'FREE' ? 'Play for Free' : 'Play Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call to Action */}
      <Card className="mt-12 bg-casino-card border-casino-border">
        <CardContent className="p-8 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-4 text-[#D4AF37]" />
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-white">More Originals Coming Soon</h2>
          <p className="text-sm text-gray-400 mb-6 max-w-2xl mx-auto">
            Our team is constantly innovating and creating new gaming experiences. 
            Stay tuned for more exclusive Miraclez originals that will redefine online gaming.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              onClick={() => setLocation('/')}
              className="text-sm bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold"
            >
              Explore All Games
            </Button>
            <Button 
              onClick={() => setLocation('/latest')}
              variant="outline"
              className="text-sm border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black"
            >
              View Latest Releases
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}