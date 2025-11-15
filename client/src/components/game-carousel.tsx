import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, ChevronRight, Gamepad2, Cherry, Sparkles, Puzzle } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  path: string;
  image: string;
  description: string;
  rtp: string;
  volatility: 'low' | 'medium' | 'high';
  houseEdge: string;
  category: 'Originals' | 'Slots' | 'Puzzle';
}

const games: Game[] = [
  {
    id: 'miraclez-dice',
    name: 'MIRACLEZ DICE',
    path: '/miraclez-dice',
    image: '/miraclez-dice-preview.png',
    description: 'Roll the dice for instant multiplier wins',
    rtp: '99%',
    volatility: 'low',
    houseEdge: '1%',
    category: 'Originals'
  },
  {
    id: 'plinko',
    name: 'PLINKO',
    path: '/plinko',
    image: '/game-images/plinko.png',
    description: 'Drop balls through pegs for random payouts',
    rtp: '98%',
    volatility: 'medium',
    houseEdge: '2%',
    category: 'Originals'
  },
  {
    id: 'mines',
    name: 'MINES',
    path: '/mines',
    image: '/game-images/mines.png',
    description: 'Navigate the minefield for increasing rewards',
    rtp: '97%',
    volatility: 'high',
    houseEdge: '3%',
    category: 'Originals'
  },
  {
    id: 'limbo',
    name: 'LIMBO',
    path: '/limbo',
    image: '/game-images/limbo.png',
    description: 'Predict if the result will be above your target',
    rtp: '98.5%',
    volatility: 'medium',
    houseEdge: '1.5%',
    category: 'Originals'
  },
  {
    id: 'coinflip',
    name: 'COIN FLIP',
    path: '/coinflip',
    image: '/game-images/coinflip.png',
    description: 'Flip a coin and predict heads or tails',
    rtp: '98%',
    volatility: 'low',
    houseEdge: '2%',
    category: 'Originals'
  },
  {
    id: 'keno',
    name: 'KENO',
    path: '/keno',
    image: '/game-images/keno.png',
    description: 'Pick numbers and match them to win',
    rtp: '96%',
    volatility: 'medium',
    houseEdge: '4%',
    category: 'Originals'
  },
  {
    id: 'tower-defense',
    name: 'TOWER DEFENSE',
    path: '/tower-defense',
    image: '/game-images/tower-defense.png',
    description: 'Build towers to defend against waves of enemies',
    rtp: '97.5%',
    volatility: 'medium',
    houseEdge: '2.5%',
    category: 'Originals'
  },
  {
    id: 'enigma',
    name: 'ENIGMA',
    path: '/enigma',
    image: '/game-images/enigma-marble.png',
    description: '🎮 FREE TO PLAY! Match Oxyd stones in this relaxing puzzle game',
    rtp: 'FREE',
    volatility: 'low',
    houseEdge: 'FREE PLAY',
    category: 'Puzzle'
  },
  {
    id: 'fundora-blox',
    name: 'FUNDORA BLOX',
    path: '/fundora-blox-game',
    image: '/game-images/fundora-blox-new.png',
    description: 'Stack blocks to reach prize levels - perfect placement multiplies rewards!',
    rtp: '98.5%',
    volatility: 'medium',
    houseEdge: '1.5%',
    category: 'Originals'
  },
  {
    id: 'hilo',
    name: 'HI-LO',
    path: '/hilo',
    image: '/game-images/hilo.png',
    description: 'Guess if the next card is higher or lower',
    rtp: '98%',
    volatility: 'low',
    houseEdge: '2%',
    category: 'Originals'
  },
  {
    id: 'blackjack',
    name: 'BLACKJACK',
    path: '/blackjack',
    image: '/game-images/blackjack.png',
    description: 'Beat the dealer in this classic card game',
    rtp: '99.5%',
    volatility: 'low',
    houseEdge: '0.5%',
    category: 'Originals'
  },
  {
    id: 'roulette',
    name: 'ROULETTE',
    path: '/roulette',
    image: '/game-images/roulette.png',
    description: 'Spin the wheel and predict where it lands',
    rtp: '97.3%',
    volatility: 'medium',
    houseEdge: '2.7%',
    category: 'Originals'
  },
  {
    id: 'slots',
    name: 'MIRACLEZ SLOTS',
    path: '/slots',
    image: '/slot-bg.jpg',
    description: 'Spin the reels for exciting slot machine wins',
    rtp: '96%',
    volatility: 'medium',
    houseEdge: '4%',
    category: 'Slots'
  }
];

// Category section component
function CategorySection({ 
  category, 
  categoryGames, 
  isMobile, 
  hoveredGame, 
  setHoveredGame, 
  tappedGame, 
  setTappedGame,
  navigate 
}: {
  category: string;
  categoryGames: Game[];
  isMobile: boolean;
  hoveredGame: string | null;
  setHoveredGame: (id: string | null) => void;
  tappedGame: string | null;
  setTappedGame: (id: string | null) => void;
  navigate: (path: string) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const getCategoryIcon = () => {
    switch (category) {
      case 'Originals': return <Gamepad2 className="w-5 h-5 text-blue-500" />;
      case 'Slots': return <Cherry className="w-5 h-5 text-blue-500" />;
      case 'Puzzle': return <Puzzle className="w-5 h-5 text-blue-500" />;
      default: return <Gamepad2 className="w-5 h-5 text-blue-500" />;
    }
  };

  const getCategoryTitle = () => {
    switch (category) {
      case 'Originals': return 'Miraclez';
      case 'Slots': return 'Slots';
      case 'Puzzle': return 'Puzzle Games';
      default: return category;
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollToDirection = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 176;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll();
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const getVolatilityColor = (volatility: string) => {
    switch (volatility) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="relative px-3 py-4 mt-[24px] mb-[24px]">
      {/* Category Header with Blue Icon */}
      <div className="flex items-center gap-3 mb-4">
        {getCategoryIcon()}
        <h3 className="font-bold text-white text-xl">{getCategoryTitle()}</h3>
        
        {/* Navigation Arrows in Header */}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => scrollToDirection('left')}
            className={`p-2 rounded-full transition-all duration-200 ${
              showLeftArrow 
                ? 'bg-gradient-to-b from-purple-900 to-purple-600 hover:from-purple-800 hover:to-purple-500 text-white shadow-lg hover:shadow-purple-500/50' 
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!showLeftArrow}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scrollToDirection('right')}
            className={`p-2 rounded-full transition-all duration-200 ${
              showRightArrow 
                ? 'bg-gradient-to-b from-purple-900 to-purple-600 hover:from-purple-800 hover:to-purple-500 text-white shadow-lg hover:shadow-purple-500/50' 
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!showRightArrow}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Scrollable Container */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto hide-scrollbar scroll-smooth"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none'
        }}
      >
        <div className="flex gap-4 pb-4">
          {categoryGames.map((game) => (
            <div
              key={game.id}
              className="relative cursor-pointer group flex-shrink-0"
              onClick={(e) => {
                if (isMobile) {
                  if (tappedGame === game.id) {
                    navigate(game.path);
                  } else {
                    e.stopPropagation();
                    const currentGameId = game.id;
                    setTappedGame(currentGameId);
                    setTimeout(() => {
                      setTappedGame(null);
                    }, 3000);
                  }
                } else {
                  navigate(game.path);
                }
              }}
              onMouseEnter={() => !isMobile && setHoveredGame(game.id)}
              onMouseLeave={() => !isMobile && setHoveredGame(null)}
            >
              {/* Game Card */}
              <div className="relative w-48 h-52 rounded-xl overflow-hidden bg-gradient-to-b from-gray-900 to-black border-2 border-gray-800 hover:border-[#D4AF37]/50 transition-all duration-300 transform hover:scale-105">
                {/* Game Image */}
                <div className="relative h-28 overflow-hidden">
                  <img 
                    src={game.image} 
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>

                {/* FREE TO PLAY Badge for Enigma */}
                {game.id === 'enigma' && (
                  <div className="absolute top-1 right-1 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-lg animate-pulse">
                    FREE
                  </div>
                )}

                {/* Game Name */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black via-black/95 to-transparent">
                  <h4 className="text-white font-bold mb-1 text-center text-base">{game.name}</h4>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-yellow-400 font-bold text-sm">
                      {game.id === 'enigma' ? '🎮 FREE' : `RTP: ${game.rtp}`}
                    </span>
                    <span className="font-semibold text-green-400 text-sm">
                      {game.id === 'enigma' ? 'PUZZLE' : game.volatility.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Hover/Tap Overlay */}
                <div className={`absolute inset-0 bg-black/95 flex flex-col justify-center p-2 transition-opacity duration-300 ${
                  (hoveredGame === game.id || tappedGame === game.id) ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}>
                  <h4 className="text-[#D4AF37] font-bold text-sm mb-1">{game.name}</h4>
                  <p className="text-gray-300 text-xs mb-1 line-clamp-2">{game.description}</p>
                  
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-xs text-gray-400">RTP</span>
                      <span className="text-sm text-white font-semibold">{game.rtp}</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-xs text-gray-400">Edge</span>
                      <span className="text-sm text-white font-semibold">{game.houseEdge}</span>
                    </div>
                  </div>

                  <button 
                    className="mt-2 bg-gradient-to-b from-purple-900 to-purple-600 text-white font-bold py-1 px-2 text-sm rounded hover:from-purple-800 hover:to-purple-500 transition-all shadow-lg hover:shadow-purple-500/50"
                    onClick={(e) => {
                      if (isMobile) {
                        e.stopPropagation();
                        navigate(game.path);
                      }
                    }}
                  >
                    PLAY NOW
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GameCarousel() {
  const [, navigate] = useLocation();
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);
  const [tappedGame, setTappedGame] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Group games by category
  const gamesByCategory = games.reduce((acc, game) => {
    if (!acc[game.category]) {
      acc[game.category] = [];
    }
    acc[game.category].push(game);
    return acc;
  }, {} as Record<string, Game[]>);

  // Define category order for consistent display
  const categoryOrder = ['Originals', 'Slots', 'Puzzle'];

  return (
    <div className="space-y-6">
      {categoryOrder.map(category => {
        const categoryGames = gamesByCategory[category];
        if (!categoryGames || categoryGames.length === 0) return null;
        
        return (
          <CategorySection
            key={category}
            category={category}
            categoryGames={categoryGames}
            isMobile={isMobile}
            hoveredGame={hoveredGame}
            setHoveredGame={setHoveredGame}
            tappedGame={tappedGame}
            setTappedGame={setTappedGame}
            navigate={navigate}
          />
        );
      })}
    </div>
  );
}