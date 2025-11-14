import { useState, useMemo } from 'react';
import { X, Gamepad2, Cherry, Sparkles, Puzzle } from 'lucide-react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GameSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const allGames = [
  // Miraclez Original Games
  { 
    id: 'dice', 
    name: 'MIRACLEZ\nDICE', 
    displayName: 'MIRACLEZ\nDICE',
    path: '/miraclez-dice', 
    category: 'Originals', 
    provider: 'MIRACLEZ',
    image: '/game-images/dice.png'
  },
  { 
    id: 'slots', 
    name: 'MIRACLEZ\nSLOTS', 
    displayName: 'MIRACLEZ\nSLOTS',
    path: '/slots', 
    category: 'Slots', 
    provider: 'MIRACLEZ',
    image: '/slot-bg.jpg'
  },
  { 
    id: 'crash', 
    name: 'CRASH', 
    displayName: 'CRASH',
    path: '/crash', 
    category: 'Originals', 
    provider: 'MIRACLEZ',
    image: '/game-images/crash.png'
  },
  { 
    id: 'cryptocoaster', 
    name: 'CRYPTO\nCOASTER', 
    displayName: 'CRYPTO\nCOASTER',
    path: '/miracoaster', 
    category: 'Originals', 
    provider: 'MIRACLEZ',
    image: '/game-images/crash.png'
  },
  { 
    id: 'plinko', 
    name: 'PLINKO', 
    displayName: 'PLINKO',
    path: '/plinko', 
    category: 'Originals', 
    provider: 'MIRACLEZ',
    image: '/game-images/plinko.png'
  },
  { 
    id: 'keno', 
    name: 'KENO', 
    displayName: 'KENO',
    path: '/keno', 
    category: 'Originals', 
    provider: 'MIRACLEZ',
    image: '/game-images/keno.png'
  },
  { 
    id: 'tower', 
    name: 'TOWER\nDEFENSE', 
    displayName: 'TOWER\nDEFENSE',
    path: '/tower-defense', 
    category: 'Originals', 
    provider: 'MIRACLEZ',
    image: '/game-images/tower-defense.png'
  },
  { 
    id: 'enigma', 
    name: 'ENIGMA', 
    displayName: 'ENIGMA',
    path: '/enigma', 
    category: 'Puzzle', 
    provider: 'MIRACLEZ',
    image: '/game-images/enigma-marble.png'
  },
  { 
    id: 'mines', 
    name: 'MINES', 
    displayName: 'MINES',
    path: '/mines', 
    category: 'Originals', 
    provider: 'MIRACLEZ',
    image: '/game-images/mines.png'
  }
];

export function GameSearch({ isOpen, onClose }: GameSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'slots' | 'originals' | 'puzzle'>('all');
  const [, navigate] = useLocation();

  // Function to get gradient color based on game category
  const getBadgeGradient = (category: string) => {
    switch (category.toLowerCase()) {
      case 'slots':
        return 'bg-gradient-to-r from-yellow-500/80 via-yellow-600/80 to-yellow-500/80';
      case 'originals':
        return 'bg-gradient-to-r from-purple-600/80 via-purple-700/80 to-purple-600/80';
      case 'puzzle':
        return 'bg-gradient-to-r from-green-500/80 via-green-600/80 to-green-500/80';
      default:
        return 'bg-gradient-to-r from-blue-500/80 via-blue-600/80 to-blue-500/80';
    }
  };

  const filteredGames = useMemo(() => {
    let games = allGames;
    
    // Filter by category
    if (selectedCategory === 'slots') {
      games = games.filter(game => game.category === 'Slots');
    } else if (selectedCategory === 'originals') {
      games = games.filter(game => game.category === 'Originals');
    } else if (selectedCategory === 'puzzle') {
      games = games.filter(game => game.category === 'Puzzle');
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      games = games.filter(game => 
        game.name.toLowerCase().includes(query) ||
        game.category.toLowerCase().includes(query)
      );
    }
    
    return games;
  }, [searchQuery, selectedCategory]);

  const handleSelectGame = (path: string) => {
    navigate(path);
    onClose();
    setSearchQuery('');
    setSelectedCategory('all');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/95 z-[140]"
          />

          {/* Search Modal */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-0 bottom-16 z-[150] flex flex-col"
          >
            {/* Search Bar */}
            <div className="p-2.5 mt-[-7px] mb-[-7px]">
              <div className="bg-[#2a2a2a] rounded-lg flex items-center px-3 h-9 max-w-md mx-auto mt-[1px] mb-[1px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search games"
                  autoFocus
                  className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-[10px]"
                />
                <button
                  onClick={onClose}
                  className="ml-2 p-0.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="mb-3 px-2">
              <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as 'all' | 'slots' | 'originals' | 'puzzle')} className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border border-purple-500/20 rounded-lg h-8 gap-0.5 p-1">
                  <TabsTrigger 
                    value="all" 
                    data-testid="tab-all-games" 
                    className="relative text-[12px] font-semibold text-gray-400 hover:text-white transition-all duration-200 data-[state=active]:text-white data-[state=active]:bg-purple-600 data-[state=active]:shadow-md hover:bg-[#2a2a2a] rounded-md"
                  >
                    <div className="flex items-center gap-1">
                      <Gamepad2 className="w-3.5 h-3.5" />
                      <span>All</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="slots" 
                    data-testid="tab-slots" 
                    className="relative text-[12px] font-semibold text-gray-400 hover:text-white transition-all duration-200 data-[state=active]:text-white data-[state=active]:bg-purple-600 data-[state=active]:shadow-md hover:bg-[#2a2a2a] rounded-md"
                  >
                    <div className="flex items-center gap-1">
                      <Cherry className="w-3.5 h-3.5" />
                      <span>Slots</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="originals" 
                    data-testid="tab-originals" 
                    className="relative text-[12px] font-semibold text-gray-400 hover:text-white transition-all duration-200 data-[state=active]:text-white data-[state=active]:bg-purple-600 data-[state=active]:shadow-md hover:bg-[#2a2a2a] rounded-md"
                  >
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Original</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="puzzle" 
                    data-testid="tab-puzzle" 
                    className="relative text-[12px] font-semibold text-gray-400 hover:text-white transition-all duration-200 data-[state=active]:text-white data-[state=active]:bg-purple-600 data-[state=active]:shadow-md hover:bg-[#2a2a2a] rounded-md"
                  >
                    <div className="flex items-center gap-1">
                      <Puzzle className="w-3.5 h-3.5" />
                      <span>Puzzle</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Game Carousel - Single Line */}
            <div className="flex-1 overflow-hidden pb-16 mt-[34px] mb-[34px]">
              <div className="overflow-x-auto hide-scrollbar mt-[23px] mb-[23px]">
                {filteredGames.length > 0 ? (
                  <div className="flex gap-2 px-2.5 pb-3">
                    {filteredGames.map((game) => (
                      <button
                        key={game.id}
                        onClick={() => handleSelectGame(game.path)}
                        className="relative group overflow-hidden rounded-lg transition-transform hover:scale-105 active:scale-95 flex-shrink-0 mt-[-12px] mb-[-12px]"
                      >
                        {/* Game Card */}
                        <div className="relative w-24 h-32 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg overflow-hidden">
                          {/* Game Cover Image */}
                          <div 
                            className="absolute inset-0 bg-cover bg-center"
                            style={{
                              backgroundImage: `url(${game.image})`,
                              backgroundColor: '#1a1a1a'
                            }}
                          />
                          
                          {/* Provider Badge - Stained Glass Effect */}
                          <div className="absolute top-1.5 left-1.5 right-1.5">
                            <div className={`${getBadgeGradient(game.category)} backdrop-blur-md rounded px-1.5 py-0.5 text-center shadow-lg border border-white/30 relative overflow-hidden`}>
                              {/* Stained glass overlay effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 pointer-events-none" />
                              <span className="text-[8px] font-bold text-white tracking-wider relative z-10 drop-shadow-md">
                                {game.provider}
                              </span>
                            </div>
                          </div>
                          
                          {/* Game Name */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-6 pb-2 px-1.5">
                            <div className="text-white font-bold text-[8px] leading-tight text-center whitespace-pre-line">
                              {game.displayName}
                            </div>
                          </div>
                          
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <p className="text-gray-400 text-[10px] mb-1.5">No games found</p>
                    <p className="text-[8px] text-gray-500">Try searching with different keywords</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}