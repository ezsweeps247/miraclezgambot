import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';
import { useGameMode } from '@/contexts/GameModeContext';

interface JackpotPool {
  id: string;
  tier: 'MINI' | 'MINOR' | 'MAJOR' | 'MEGA';
  currency: 'GC' | 'SC';
  amount: string;
  lastWonAt: string | null;
}

const tierColors = {
  MINI: 'from-blue-500 to-blue-600',
  MINOR: 'from-cyan-500 to-blue-600',
  MAJOR: 'from-purple-500 to-pink-600',
  MEGA: 'from-yellow-500 to-orange-600',
};

const tierIcons = {
  MINI: '🎯',
  MINOR: '💎',
  MAJOR: '👑',
  MEGA: '🏆',
};

export function JackpotTicker() {
  const { socket, isConnected } = useWebSocket();
  const { gameMode } = useGameMode();
  const [jackpots, setJackpots] = useState<JackpotPool[]>([]);
  const [animatingTier, setAnimatingTier] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Determine which currency to show based on game mode
  const currency = gameMode === 'real' ? 'SC' : 'GC';

  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('[JackpotTicker] No socket or not connected');
      return;
    }

    console.log('[JackpotTicker] Setting up WebSocket listener');

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[JackpotTicker] WebSocket message type:', data.type);
        
        if (data.type === 'allJackpots') {
          console.log('[JackpotTicker] Received jackpots:', data.jackpots?.length);
          const newJackpots = data.jackpots as JackpotPool[];
          
          // Check for amount changes to trigger animation
          setJackpots(prev => {
            newJackpots.forEach(newJackpot => {
              const oldJackpot = prev.find(j => j.id === newJackpot.id);
              if (oldJackpot && oldJackpot.amount !== newJackpot.amount) {
                setAnimatingTier(newJackpot.tier);
                setTimeout(() => setAnimatingTier(null), 1000);
              }
            });
            return newJackpots;
          });
        } else if (data.type === 'jackpotUpdate') {
          console.log('[JackpotTicker] Received jackpot update:', data.pool?.tier);
          // Single jackpot pool update
          const updatedPool = data.pool as JackpotPool;
          setJackpots(prev => {
            const index = prev.findIndex(j => j.id === updatedPool.id);
            if (index >= 0) {
              const newJackpots = [...prev];
              newJackpots[index] = updatedPool;
              return newJackpots;
            }
            return [...prev, updatedPool];
          });
          
          setAnimatingTier(updatedPool.tier);
          setTimeout(() => setAnimatingTier(null), 1000);
        }
      } catch (error) {
        console.error('[JackpotTicker] Error parsing WebSocket message:', error);
      }
    };

    socket.addEventListener('message', handleMessage);

    return () => {
      console.log('[JackpotTicker] Removing WebSocket listener');
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, isConnected]);

  // Filter jackpots by current currency
  const currentJackpots = jackpots
    .filter(j => j.currency === currency)
    .sort((a, b) => {
      const order = { MINI: 0, MINOR: 1, MAJOR: 2, MEGA: 3 };
      return order[a.tier] - order[b.tier];
    });

  // Carousel auto-rotation every 3 seconds
  useEffect(() => {
    if (currentJackpots.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % currentJackpots.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentJackpots.length]);

  // Always render to keep WebSocket listener active, but hide if no data
  if (currentJackpots.length === 0) {
    return <div className="hidden" data-testid="jackpot-ticker-loading" />;
  }

  // Get visible jackpots (show 3 at a time, cycling through)
  const getVisibleJackpots = () => {
    const visible = [];
    for (let i = 0; i < Math.min(3, currentJackpots.length); i++) {
      const index = (currentIndex + i) % currentJackpots.length;
      visible.push(currentJackpots[index]);
    }
    return visible;
  };

  const visibleJackpots = getVisibleJackpots();

  return (
    <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-y border-yellow-500/20 py-0.5 overflow-hidden mt-[13px] mb-[13px]" data-testid="jackpot-ticker">
      <div className="flex items-center justify-between max-w-7xl mx-auto px-2 gap-2 pt-[-2px] pb-[-2px] mt-[2px] mb-[2px]">
        {/* Left Icon */}
        <div className="flex items-center gap-0.5 text-yellow-500/90 flex-shrink-0">
          <Trophy className="w-6 h-6" />
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>

        {/* Carousel Container - Constrained to prevent overflow */}
        <div className="flex items-center justify-center gap-1.5 flex-1 overflow-hidden mt-[5px] mb-[5px]">
          <div className="flex items-center gap-1.5">
            <AnimatePresence>
              {visibleJackpots.map((jackpot, idx) => (
                <motion.div
                  key={`${jackpot.id}-${currentIndex}-${idx}`}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ 
                    duration: 0.5,
                    delay: idx * 0.1,
                    ease: "easeInOut"
                  }}
                  className="flex-shrink-0"
                  data-testid={`jackpot-${jackpot.tier.toLowerCase()}`}
                >
                  <div className={`bg-gradient-to-r ${tierColors[jackpot.tier]} px-2 py-1 rounded shadow-sm hover:shadow-md transition-shadow duration-300 border border-white/20`}>
                    <div className="flex items-center gap-1">
                      <span className="text-base">{tierIcons[jackpot.tier]}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white/90 uppercase tracking-wider leading-none">
                          {jackpot.tier}
                        </span>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={jackpot.amount}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.3 }}
                            className="font-black text-white text-sm stat-number leading-tight"
                            data-testid={`jackpot-${jackpot.tier.toLowerCase()}-amount`}
                          >
                            {parseFloat(jackpot.amount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })} {currency}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Status Indicator */}
        <div className="flex items-center gap-0.5 text-yellow-500/50 flex-shrink-0 ml-[0px] mr-[0px]">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="uppercase tracking-wide inline ml-[15px] mr-[15px] text-base">{isConnected ? 'Live' : 'Offline'}</span>
        </div>
      </div>
    </div>
  );
}
