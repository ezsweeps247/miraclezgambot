import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { 
  Home, 
  Gift, 
  User, 
  Crown, 
  BookOpen, 
  Users, 
  Shield, 
  Headphones,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Wallet,
  Lock,
  Receipt,
  Settings,
  Star,
  Rocket,
  Clock,
  Trophy,
  Sparkles,
  PlayCircle,
  Layers,
  Grid3x3,
  DicesIcon
} from 'lucide-react';
import { useLocation } from 'wouter';
import { ResponsibleGamingModal } from './responsible-gaming-modal';
import { FaBlackTie } from 'react-icons/fa';
import { GiPokerHand, GiCardJoker } from 'react-icons/gi';
import socialCasinoHeaderBg from '@assets/generated_images/Purple_gradient_geometric_background_3cc736e3.png';

interface RollUpMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchClick?: () => void;
}

export function RollUpMenu({ isOpen, onClose, onSearchClick }: RollUpMenuProps) {
  const [, navigate] = useLocation();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [responsibleGamingOpen, setResponsibleGamingOpen] = useState(false);
  const { user } = useAuth();

  // Fetch recent games data
  const { data: recentGames } = useQuery<{gameName: string, lastPlayed: string}[]>({
    queryKey: ['/api/games/recent'],
    enabled: !!user,
  });

  // Fetch favorite games data
  const { data: favoriteGames } = useQuery<{gameName: string, createdAt: string}[]>({
    queryKey: ['/api/games/favorites'],
    enabled: !!user,
  });

  // Fetch wagering status for real-time display
  const { data: wageringStatus } = useQuery<{
    hasActiveBonus: boolean;
    totalWageringRequired: number;
    totalWagered: number;
    remainingToWager: number;
    activeBonuses: Array<{
      bonusType: string;
      percentageComplete: number;
      wageringRequired: number;
      wagered: number;
      expiresAt: string;
    }>;
  }>({
    queryKey: ['/api/bonuses/wagering-requirements'],
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Fetch VIP status for additional wagering context
  const { data: vipStatus } = useQuery<{
    currentLevel: string;
    progress: number;
    nextLevel: string | null;
  }>({
    queryKey: ['/api/vip/status'],
    enabled: !!user,
    refetchInterval: 60000, // Refetch every minute
  });

  const recentCount = recentGames?.length || 0;
  const favoriteCount = favoriteGames?.length || 0;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const profileSubmenuItems = [
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: Lock, label: 'Vault', path: '/vault' },
    { icon: Receipt, label: 'Transactions', path: '/transactions' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  // First section - Game categories
  const gameCategories = [
    { icon: PlayCircle, label: 'Live Dealers', path: '/live-dealer' },
    { icon: FaBlackTie, label: 'Blackjack', path: '/blackjack', isComponent: true },
    { icon: Grid3x3, label: 'Roulette', path: '/roulette' },
    { icon: GiCardJoker, label: 'Baccarat', path: '/baccarat', isComponent: true },
  ];

  // Second section - Main menu items
  const mainMenuItems = [
    { icon: User, label: 'Profile', path: null, expandable: true, submenu: profileSubmenuItems },
    { icon: Crown, label: 'VIP', path: '/vip' },
    { icon: BookOpen, label: 'Blog', path: '/blog' },
    { icon: Users, label: 'Affiliate', path: '/affiliate' },
    { icon: Shield, label: 'Responsible Gaming', path: null, isSpecial: true },
  ];

  // Third section - Navigation items
  const navigationItems = [
    { icon: Home, label: 'Home', path: '/' },
    { 
      icon: Star, 
      label: 'Favorites', 
      path: '/favorites',
      count: user ? favoriteCount : undefined,
      disabled: !user || favoriteCount === 0
    },
    { icon: Rocket, label: 'Latest Releases', path: '/latest' },
    { 
      icon: Clock, 
      label: 'Recently Played', 
      path: '/recent', 
      isPurple: true,
      count: user ? recentCount : undefined,
      disabled: !user || recentCount === 0
    },
    { icon: Trophy, label: 'Challenges', path: '/challenges' },
    { icon: Gift, label: 'Promotions', path: null, expandable: true },
    { icon: Sparkles, label: 'Originals', path: '/originals' },
    { icon: DicesIcon, label: 'Slots', path: '/slots' },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/95 z-[250]"
            />

            {/* Menu */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-16 w-[72%] max-w-md bg-black z-[260] flex flex-col"
          >
            {/* Back to Casino Button */}
            <div className="p-3 border-b border-gray-800">
              <button
                onClick={() => handleNavigate('/')}
                className="w-full py-3 bg-gradient-to-r from-purple-700 via-purple-600 to-purple-700 hover:from-purple-800 hover:via-purple-700 hover:to-purple-800 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
                data-testid="menu-back-to-casino"
              >
                <Home className="w-5 h-5" />
                <span className="text-sm font-bold tracking-wide uppercase">Back to Casino</span>
              </button>
            </div>

            {/* Wagering Tracker Banner */}
            <div className="relative">
              <div 
                className="px-3 py-3 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${socialCasinoHeaderBg})` }}
              >
                {/* Wagering Requirement Tracker for SC Withdrawal */}
                {user && wageringStatus?.hasActiveBonus ? (
                  <div className="space-y-1.5">
                    <div className="bg-black/20 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/90 text-[12px] font-medium">Wagering to Withdraw</span>
                        <span className="text-[#D4AF37] text-[12px] font-bold">
                          {(() => {
                            const total = wageringStatus.totalWageringRequired || 0;
                            const wagered = wageringStatus.totalWagered || 0;
                            if (total <= 0) return '0';
                            const percent = Math.round((wagered / total) * 100);
                            return Math.min(100, Math.max(0, percent));
                          })()}%
                        </span>
                      </div>
                      <div className="w-full bg-black/30 rounded-full h-1.5 mb-1">
                        <div 
                          className="bg-gradient-to-r from-[#D4AF37] to-yellow-300 h-1.5 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(() => {
                              const total = wageringStatus.totalWageringRequired || 0;
                              const wagered = wageringStatus.totalWagered || 0;
                              if (total <= 0) return 0;
                              return Math.min(100, Math.max(0, (wagered / total) * 100));
                            })()}%` 
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[12px] text-white/70">
                          ${(wageringStatus.totalWagered || 0).toLocaleString()} wagered
                        </span>
                        <span className="text-[12px] text-white/70">
                          ${(wageringStatus.remainingToWager || 0).toLocaleString()} remaining
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* VIP Progress (shown when no wagering requirement) */
                  (user && vipStatus && vipStatus.nextLevel && vipStatus.progress < 100 && (<div className="space-y-1.5">
                    <div className="bg-black/20 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/90 font-medium text-[12px]">VIP Progress</span>
                        <span className="text-purple-300 font-bold text-[12px]">
                          {vipStatus.currentLevel} → {vipStatus.nextLevel}
                        </span>
                      </div>
                      <div className="w-full bg-black/30 rounded-full h-1 mb-1">
                        <div 
                          className="bg-gradient-to-r from-purple-400 to-purple-300 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${vipStatus.progress}%` }}
                        ></div>
                      </div>
                      <div className="text-center">
                        <span className="text-white/70 text-[12px]">
                          {vipStatus.progress}% to {vipStatus.nextLevel}
                        </span>
                      </div>
                    </div>
                  </div>))
                )}
              </div>
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto bg-black">
              {/* Search bar */}
              <div className="p-2.5">
                <div className="relative">
                  <Search style={{width: '3px', height: '3px'}} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full bg-[#1a1a1a] text-[12px] text-white placeholder-gray-500 pl-7 pr-2.5 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-purple-500/50 border border-gray-800 cursor-pointer"
                    data-testid="input-menu-search"
                    readOnly
                    onClick={() => {
                      if (onSearchClick) {
                        onClose(); // Close the menu
                        onSearchClick(); // Open the search modal
                      }
                    }}
                  />
                </div>
              </div>

              {/* Navigation Items */}
              <div className="pb-2">
                {navigationItems.map((item) => (
                  <div key={item.label}>
                    <button
                      onClick={() => {
                        if ((item as any).disabled) {
                          return; // Don't navigate if disabled
                        }
                        if (item.expandable) {
                          toggleSection(item.label);
                        } else if (item.path) {
                          handleNavigate(item.path);
                        }
                      }}
                      className={`group w-full flex items-center justify-between px-2.5 py-1.5 transition-colors ${
                        (item as any).disabled 
                          ? 'cursor-not-allowed opacity-50' 
                          : 'hover:bg-[#1a1a1a] cursor-pointer'
                      }`}
                      data-testid={`button-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon style={{width: '3px', height: '3px'}} className={`transition-colors ${item.isPurple ? 'text-purple-500 group-hover:text-purple-600' : 'text-gray-400 group-hover:text-purple-600'}`} />
                        <span className="transition-colors text-white group-hover:text-purple-600 text-[12px]">{item.label}</span>
                        {(item as any).count !== undefined && (
                          <span 
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              (item as any).count > 0 
                                ? 'bg-[#D4AF37] text-black' 
                                : 'bg-gray-700 text-gray-400'
                            }`}
                            data-testid={`badge-${item.label.toLowerCase().replace(/\s+/g, '-')}-count`}
                          >
                            {(item as any).count}
                          </span>
                        )}
                      </div>
                      {item.expandable && (
                        <div className="text-gray-400">
                          {expandedSection === item.label ? (
                            <ChevronUp style={{width: '3px', height: '3px'}} />
                          ) : (
                            <ChevronDown style={{width: '3px', height: '3px'}} />
                          )}
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-800 my-2"></div>

              {/* Game Categories */}
              <div className="pb-2">
                {gameCategories.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleNavigate(item.path)}
                    className="group w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[#1a1a1a] transition-colors"
                    data-testid={`button-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {item.isComponent ? (
                      <item.icon style={{width: '3px', height: '3px'}} className="text-gray-400 transition-colors group-hover:text-purple-600" />
                    ) : (
                      <item.icon style={{width: '3px', height: '3px'}} className="text-gray-400 transition-colors group-hover:text-purple-600" />
                    )}
                    <span className="text-white transition-colors group-hover:text-purple-600 text-[12px]">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-800 my-2"></div>

              {/* Main Menu Items */}
              <div className="pb-2">
                {mainMenuItems.map((item) => (
                  <div key={item.label}>
                    <button
                      onClick={() => {
                        if (item.label === 'Responsible Gaming') {
                          setResponsibleGamingOpen(true);
                          onClose();
                        } else if (item.expandable) {
                          toggleSection(item.label);
                        } else if (item.path) {
                          handleNavigate(item.path);
                        }
                      }}
                      className="group w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[#1a1a1a] transition-colors"
                      data-testid={`button-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon style={{width: '3px', height: '3px'}} className="text-gray-400 transition-colors group-hover:text-purple-600" />
                        <span className="text-white transition-colors group-hover:text-purple-600 text-[12px]">{item.label}</span>
                      </div>
                      {item.expandable && (
                        <div className="text-gray-400">
                          {expandedSection === item.label ? (
                            <ChevronUp style={{width: '3px', height: '3px'}} />
                          ) : (
                            <ChevronDown style={{width: '3px', height: '3px'}} />
                          )}
                        </div>
                      )}
                    </button>

                    {/* Expandable submenu for Profile */}
                    {item.submenu && expandedSection === item.label && (
                      <AnimatePresence>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="bg-[#0a0a0a] overflow-hidden"
                        >
                          {item.submenu.map((subItem) => (
                            <button
                              key={subItem.label}
                              onClick={() => handleNavigate(subItem.path)}
                              className="group w-full flex items-center gap-2 px-8 py-1.5 hover:bg-[#1a1a1a] transition-colors"
                              data-testid={`button-menu-${subItem.label.toLowerCase()}`}
                            >
                              <subItem.icon style={{width: '3px', height: '3px'}} className="text-gray-500 transition-colors group-hover:text-purple-600" />
                              <span className="text-gray-300 transition-colors group-hover:text-purple-600 text-[12px]">{subItem.label}</span>
                            </button>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                ))}
              </div>
            </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Responsible Gaming Modal */}
      <ResponsibleGamingModal 
        isOpen={responsibleGamingOpen} 
        onClose={() => setResponsibleGamingOpen(false)} 
      />
    </>
  );
}