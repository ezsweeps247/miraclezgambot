import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Coins, Gift, Sparkles, Star, TrendingUp, Dices, Cherry,
  LineChart, Target, Shield, Grid3x3, Puzzle, CircleDot,
  Bomb, Spade, ArrowUpDown, BarChart3, Home as HomeIcon, Trophy,
  LayoutGrid, Gamepad2, ChevronLeft, ChevronRight, Hand, CheckCircle, Flame, X, Boxes
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LiveBetsFeed } from "@/components/live-bets-feed";
import { DepositModal } from "@/components/deposit-modal";
import { GameCarousel } from "@/components/game-carousel";
import Footer from "@/components/Footer";
import { CommandBar } from "@/components/CommandBar";
import { RollUpMenu } from "@/components/roll-up-menu";
import { GameSearch } from "@/components/game-search";  
import ChatWidget from "@/components/ChatWidget";
import { PurchaseModal } from "@/components/purchase-modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import weeklyRaceImage from "@assets/US_100KWEEKLY_RACE_1759327652898.png";
import dailyRaceImage from "@assets/10m_dailyrace_en_1759327689839.png";
import enigmaPromoImage from "@assets/images (1)_1759328166604.jpeg";
import landedPromoImage from "@assets/2-WEVE_LANDED_1759327776529.png";
import solIcon from '@assets/Screenshot_20251018_230812_Chrome(3)_1760854208882.jpg';
import ltcIcon from '@assets/Screenshot_20251018_230812_Chrome(2)_1760854208975.jpg';
import bnbIcon from '@assets/Screenshot_20251018_230812_Chrome(1)_1760854208986.jpg';
import trxIcon from '@assets/Screenshot_20251018_230606_Chrome_1760854208999.jpg';
import xrpIcon from '@assets/Screenshot_20251018_230606_Chrome(2)_1760854209009.jpg';
import ethIcon from '@assets/Screenshot_20251018_230606_Chrome(1)_1760854209019.jpg';

// Define game cards with unique gradient backgrounds and icons
const games = [
  {
    id: 'dice',
    name: 'DICE',
    path: '/miraclez-dice',
    gradient: 'from-blue-600 to-blue-400',
    borderColor: 'border-green-400 shadow-green-400/50',
    badgeColor: 'bg-green-500',
    tag: 'CLASSIC',
    icon: Dices,
    bgImage: '/game-backgrounds/dice.png',
    description: 'Roll the dice and predict the outcome. Simple, fast, and provably fair.',
    rtp: 98.5,
    category: 'originals' as const
  },
  {
    id: 'slots',
    name: 'SLOTS',
    path: '/slots',
    gradient: 'from-purple-600 to-purple-400',
    borderColor: 'border-purple-400 shadow-purple-400/50',
    badgeColor: 'bg-purple-500',
    tag: 'HOT',
    icon: Cherry,
    bgImage: '/game-backgrounds/slots-bg.jpg',
    description: 'Classic 5x3 slot machine with multiple paylines and bonus features.',
    rtp: 96.2,
    category: 'slots' as const
  },
  {
    id: 'miracoaster',
    name: 'CRYPTO COASTER',
    path: '/miracoaster',
    gradient: 'from-red-600 to-orange-400',
    borderColor: 'border-orange-400 shadow-orange-400/50',
    badgeColor: 'bg-orange-500',
    tag: 'LIVE',
    icon: LineChart,
    bgImage: '/game-backgrounds/miracoaster.png',
    description: 'Watch the multiplier rise and cash out before it crashes!',
    rtp: 97.0,
    category: 'originals' as const
  },
  {
    id: 'limbo',
    name: 'LIMBO',
    path: '/limbo',
    gradient: 'from-green-600 to-emerald-400',
    borderColor: 'border-yellow-400 shadow-yellow-400/50',
    badgeColor: 'bg-yellow-500',
    tag: 'INSTANT',
    icon: BarChart3,
    bgImage: '/game-backgrounds/limbo.png',
    description: 'Bet on a target multiplier. Higher risk, higher rewards!',
    rtp: 98.0
  },
  {
    id: 'roulette',
    name: 'ROULETTE',
    path: '/roulette',
    gradient: 'from-red-600 to-pink-400',
    borderColor: 'border-purple-400 shadow-purple-400/50',
    badgeColor: 'bg-purple-500',
    tag: 'CLASSIC',
    icon: Target,
    bgImage: '/game-backgrounds/roulette.png',
    description: 'European roulette wheel with single zero. Place your bets!',
    rtp: 97.3,
    category: 'originals' as const
  },
  {
    id: 'tower-defense',
    name: 'TOWER DEFENSE',
    path: '/tower-defense',
    gradient: 'from-indigo-600 to-blue-400',
    borderColor: 'border-blue-400 shadow-blue-400/50',
    badgeColor: 'bg-blue-500',
    tag: 'STRATEGY',
    icon: Shield,
    bgImage: '/game-backgrounds/tower-defense-bg.png',
    description: 'Climb the tower selecting safe tiles. Each level increases rewards!',
    rtp: 98.2,
    category: 'originals' as const
  },
  {
    id: 'keno',
    name: 'KENO',
    path: '/keno',
    gradient: 'from-yellow-600 to-orange-400',
    borderColor: 'border-orange-400 shadow-orange-400/50',
    badgeColor: 'bg-orange-500',
    tag: 'LOTTERY',
    icon: Grid3x3,
    bgImage: '/game-backgrounds/keno.png',
    description: 'Pick your lucky numbers and watch them get drawn.',
    rtp: 95.5,
    category: 'originals' as const
  },
  {
    id: 'enigma',
    name: 'ENIGMA',
    path: '/enigma',
    gradient: 'from-purple-600 to-pink-400',
    borderColor: 'border-pink-400 shadow-pink-400/50',
    badgeColor: 'bg-pink-500',
    tag: 'PUZZLE',
    icon: Puzzle,
    bgImage: '/game-backgrounds/enigma-bg.png',
    description: 'Solve challenging puzzles with physics-based marble mechanics.',
    rtp: 99.0,
    category: 'freetoplay' as const
  },
  {
    id: 'fundora-blox',
    name: 'FUNDORA BLOX',
    path: '/fundora-blox-game',
    gradient: 'from-orange-600 to-red-400',
    borderColor: 'border-red-400 shadow-red-400/50',
    badgeColor: 'bg-red-500',
    tag: 'PUZZLE',
    icon: Boxes,
    bgImage: '/game-images/fundora-blocks-bg.png',
    description: 'Stack blocks to reach higher rows and win bigger prizes! Reach row 13 for 100x!',
    rtp: 98.5,
    category: 'freetoplay' as const
  },
  {
    id: 'plinko',
    name: 'PLINKO',
    path: '/plinko',
    gradient: 'from-cyan-600 to-teal-400',
    borderColor: 'border-pink-400 shadow-pink-400/50',
    badgeColor: 'bg-pink-500',
    tag: 'DROP',
    icon: CircleDot,
    bgImage: '/game-backgrounds/plinko.png',
    description: 'Drop balls through pegs and watch them bounce to multipliers.',
    rtp: 97.0,
    category: 'originals' as const
  },
  {
    id: 'mines',
    name: 'MINES',
    path: '/mines',
    gradient: 'from-gray-700 to-gray-500',
    borderColor: 'border-red-400 shadow-red-400/50',
    badgeColor: 'bg-red-500',
    tag: 'RISK',
    icon: Bomb,
    bgImage: '/game-backgrounds/mines.png',
    description: 'Navigate the minefield. Avoid bombs and collect rewards!',
    rtp: 97.5,
    category: 'originals' as const
  },
  {
    id: 'blackjack',
    name: 'BLACKJACK',
    path: '/blackjack',
    gradient: 'from-black via-gray-800 to-gray-600',
    borderColor: 'border-rose-400 shadow-rose-400/50',
    badgeColor: 'bg-rose-500',
    tag: 'CARDS',
    icon: Spade,
    bgImage: '/game-backgrounds/blackjack.png',
    description: 'Beat the dealer to 21. Classic card game with perfect play.',
    rtp: 99.5,
    category: 'originals' as const
  },
  {
    id: 'hilo',
    name: 'HI-LO',
    path: '/hilo',
    gradient: 'from-amber-600 to-yellow-400',
    borderColor: 'border-blue-400 shadow-blue-400/50',
    badgeColor: 'bg-blue-500',
    tag: 'CARDS',
    icon: ArrowUpDown,
    bgImage: '/game-backgrounds/hilo.png',
    description: 'Predict if the next card is higher or lower. Chain wins for big multipliers!',
    rtp: 98.8,
    category: 'originals' as const
  },
  {
    id: 'coinflip',
    name: 'COIN FLIP',
    path: '/coinflip',
    gradient: 'from-blue-600 via-purple-600 to-red-600',
    borderColor: 'border-yellow-400 shadow-yellow-400/50',
    badgeColor: 'bg-yellow-500',
    tag: 'INSTANT',
    icon: Coins,
    bgImage: '/game-backgrounds/coinflip-bg.png',
    description: 'Pick heads or tails in this classic game of chance. Double your bet with a 50/50 chance!',
    rtp: 98.0,
    category: 'originals' as const
  }
];

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'originals' | 'slots' | 'freetoplay'>('all');
  const [bannerImage, setBannerImage] = useState('/casino-challenges-banner.png'); // Default banner
  
  // Banner carousel states - using native scroll-snap for universal compatibility
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const autoPlayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  
  // Banner data matching the promotional banners from screenshots
  const banners = [
    {
      id: 'welcome',
      badge: 'Brand New!',
      title: 'Welcome to our mobile casino. The place where Miraclez happen!',
      subtitle: 'Your journey to incredible wins starts here.',
      gradient: 'from-purple-900/70 via-purple-800/60 to-purple-700/50',
      backgroundImage: bannerImage,
      buttons: [
        { text: 'Get Bonus', icon: Gift, action: () => navigate('/purchase'), variant: 'primary' },
        { text: 'Deposit', icon: Coins, action: () => setDepositModalOpen(true), variant: 'secondary' }
      ]
    },
    {
      id: 'devils-deal',
      badge: 'Free to Play!',
      title: 'Try out our Free to play skill based Game!',
      subtitle: 'Test your logic and puzzle-solving skills with Enigma!',
      gradient: 'from-red-900/80 via-orange-800/70 to-red-700/60',
      backgroundImage: enigmaPromoImage,
      buttons: [
        { text: 'Play Now', icon: TrendingUp, action: () => navigate('/coming-soon'), variant: 'primary' },
        { text: 'Rules', icon: Target, action: () => navigate('/coming-soon'), variant: 'secondary' }
      ]
    },
    {
      id: 'weekly-race',
      badge: 'Brand New!',
      title: '10,000 SC\nWEEKLY\nRACE!',
      subtitle: 'Compete with players worldwide for epic prizes!',
      gradient: 'from-blue-900/80 via-indigo-800/70 to-purple-700/60',
      backgroundImage: weeklyRaceImage,
      buttons: [
        { text: 'Join Race', icon: Trophy, action: () => navigate('/coming-soon'), variant: 'primary' },
        { text: 'Leaderboard', icon: BarChart3, action: () => navigate('/coming-soon'), variant: 'secondary' }
      ]
    },
    {
      id: 'daily-prize',
      badge: 'Daily Race!',
      title: '10,000,000 GC\nIN PRIZES\nTO BE WON!',
      subtitle: 'Top 100 users with the most played in GC score rewards!',
      gradient: 'from-pink-900/80 via-purple-800/70 to-blue-700/60',
      backgroundImage: dailyRaceImage,
      buttons: [
        { text: 'Play Games', icon: Gamepad2, action: () => navigate('/coming-soon'), variant: 'primary' },
        { text: 'Rankings', icon: Trophy, action: () => navigate('/coming-soon'), variant: 'secondary' }
      ]
    },
    {
      id: 'landed',
      badge: 'Welcome!',
      title: 'WE\'VE\nLANDED!',
      subtitle: 'Experience next-generation gaming with us!',
      gradient: 'from-cyan-900/80 via-blue-800/70 to-indigo-700/60',
      backgroundImage: landedPromoImage,
      buttons: [
        { text: 'Explore', icon: Star, action: () => navigate('/coming-soon'), variant: 'primary' },
        { text: 'Learn More', icon: Sparkles, action: () => navigate('/coming-soon'), variant: 'secondary' }
      ]
    }
  ];

  // Command bar states
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  // Streak notification state
  const [streakNotification, setStreakNotification] = useState<{
    type: 'reward' | 'info';
    streak: number;
    rewardAmount?: number;
    longestStreak?: number;
  } | null>(null);

  // Check for streak data on component mount
  useEffect(() => {
    const streakReward = localStorage.getItem('streak_reward');
    const streakInfo = localStorage.getItem('streak_info');
    
    if (streakReward) {
      try {
        const data = JSON.parse(streakReward);
        // Only show if less than 10 seconds old (to avoid showing old data)
        if (Date.now() - data.timestamp < 10000) {
          setStreakNotification({
            type: 'reward',
            streak: data.streak,
            rewardAmount: data.rewardAmount
          });
          localStorage.removeItem('streak_reward');
        }
      } catch (e) {
        console.error('Failed to parse streak reward:', e);
      }
    } else if (streakInfo) {
      try {
        const data = JSON.parse(streakInfo);
        // Only show if less than 10 seconds old
        if (Date.now() - data.timestamp < 10000) {
          setStreakNotification({
            type: 'info',
            streak: data.streak,
            longestStreak: data.longestStreak
          });
          localStorage.removeItem('streak_info');
        }
      } catch (e) {
        console.error('Failed to parse streak info:', e);
      }
    }
  }, []);

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (streakNotification) {
      const timer = setTimeout(() => {
        setStreakNotification(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [streakNotification]);

  // Command bar toggle functions
  const toggleMenu = () => setMenuOpen(!menuOpen);
  const toggleSearch = () => setSearchOpen(!searchOpen);
  const toggleChat = () => setChatOpen(!chatOpen);
  const toggleVIP = () => navigate('/vip');
  const togglePurchase = () => setPurchaseOpen(!purchaseOpen);

  const { data: balance } = useQuery({
    queryKey: ["/api/balance"],
    enabled: !!user,
    staleTime: 5000,
    gcTime: 30000,
    refetchInterval: false,
    refetchOnWindowFocus: false
  });

  const { data: bets } = useQuery({
    queryKey: ["/api/bets"],
    enabled: !!user
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    enabled: !!user,
    queryFn: () => {
      // Calculate stats from bets
      if (!bets) return null;
      
      const totalWagered = (bets as any[]).reduce((sum: number, bet: any) => sum + bet.amount, 0);
      const totalWon = (bets as any[])
        .filter((bet: any) => bet.result === 'WIN')
        .reduce((sum: number, bet: any) => sum + (bet.amount + bet.profit), 0);
      
      return { totalWagered, totalWon };
    }
  });
  
  // Fetch site settings for banner
  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ['/api/site-settings'],
    retry: 1,
  });
  
  // Update banner when site settings change
  useEffect(() => {
    if (siteSettings?.banner_image) {
      setBannerImage(siteSettings.banner_image);
    }
  }, [siteSettings]);

  // Banner carousel functionality - using native scroll-snap with robust positioning
  const nextBanner = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const newIndex = (currentBannerIndex + 1) % banners.length;
    const slides = container.querySelectorAll('[data-banner-index]');
    const targetSlide = slides[newIndex] as HTMLElement;
    
    if (targetSlide) {
      container.scrollTo({
        left: targetSlide.offsetLeft,
        behavior: 'smooth'
      });
    }
  }, [currentBannerIndex, banners.length]);

  const prevBanner = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const newIndex = (currentBannerIndex - 1 + banners.length) % banners.length;
    const slides = container.querySelectorAll('[data-banner-index]');
    const targetSlide = slides[newIndex] as HTMLElement;
    
    if (targetSlide) {
      container.scrollTo({
        left: targetSlide.offsetLeft,
        behavior: 'smooth'
      });
    }
  }, [currentBannerIndex, banners.length]);

  const goToBanner = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const slides = container.querySelectorAll('[data-banner-index]');
    const targetSlide = slides[index] as HTMLElement;
    
    if (targetSlide) {
      container.scrollTo({
        left: targetSlide.offsetLeft,
        behavior: 'smooth'
      });
    }
  }, []);

  // Auto-play functionality with pause/resume
  const startAutoPlay = useCallback(() => {
    if (autoPlayIntervalRef.current) clearInterval(autoPlayIntervalRef.current);
    autoPlayIntervalRef.current = setInterval(nextBanner, 6000);
  }, [nextBanner]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, [startAutoPlay, stopAutoPlay]);

  // IntersectionObserver to track current banner index during manual scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-banner-index') || '0');
            setCurrentBannerIndex(index);
          }
        });
      },
      {
        root: container,
        rootMargin: '0px',
        threshold: 0.5
      }
    );

    // Observe all banner slides
    const slides = container.querySelectorAll('[data-banner-index]');
    slides.forEach((slide) => observer.observe(slide));

    return () => {
      slides.forEach((slide) => observer.unobserve(slide));
      observer.disconnect();
    };
  }, [banners.length]);
  

  // Handle scroll events to detect manual swiping and pause autoplay
  const handleScroll = useCallback(() => {
    // Stop current autoplay
    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
    }
    
    // Clear any existing restart timer
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    // Set new restart timer
    restartTimeoutRef.current = setTimeout(() => {
      startAutoPlay();
    }, 3000);
  }, [startAutoPlay]);

  return (
    <div className="w-full pb-16">
      {/* Streak Notification */}
      {streakNotification && (
        <div className="mx-4 mt-4 mb-2 animate-in slide-in-from-top duration-500" data-testid="streak-notification">
          <Alert className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/50 relative">
            <button
              onClick={() => setStreakNotification(null)}
              className="absolute top-2 right-2 p-2 rounded-full hover:bg-white/20 transition-colors z-10"
              data-testid="button-close-streak"
              aria-label="Close notification"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <Flame className="w-5 h-5 text-amber-500" />
            <AlertDescription className="ml-2">
              {streakNotification.type === 'reward' ? (
                <div className="text-white">
                  <span className="font-bold text-amber-400">{streakNotification.streak} Day Streak!</span>
                  {' '}You've earned{' '}
                  <span className="font-bold text-green-400">{streakNotification.rewardAmount} GC</span>
                  {' '}as your daily login reward! 🎉
                </div>
              ) : (
                <div className="text-white">
                  <span className="font-bold text-amber-400">Day {streakNotification.streak} Streak!</span>
                  {' '}Keep logging in daily to earn rewards starting from day 3!
                  {streakNotification.longestStreak && streakNotification.longestStreak > streakNotification.streak && (
                    <span className="text-gray-300 text-xs ml-1">
                      (Best: {streakNotification.longestStreak} days)
                    </span>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}
      {/* Native Scroll-Snap Banner Carousel - Universal Compatibility */}
      <section 
        className="relative mx-4 mt-4 rounded-xl h-52"
        ref={carouselRef}
        data-testid="banner-carousel"
      >
        {/* Scrollable banner container with native scroll-snap */}
        <div 
          ref={scrollContainerRef}
          className="flex h-full overflow-x-auto scrollbar-hide relative"
          style={{ 
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
            overscrollBehaviorX: 'contain'
          }}
          onScroll={handleScroll}
        >
          {banners.map((banner, index) => (
            <div 
              key={banner.id} 
              data-banner-index={index}
              className="w-full h-full flex-shrink-0 relative rounded-xl overflow-hidden"
              style={{ 
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always'
              }}
            >
              {/* Background image */}
              <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url('${banner.backgroundImage}')`,
                }}
              />
              
              {/* Colored overlay for better text contrast */}
              <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient}`} />
              
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)`,
                  animation: 'slide 20s linear infinite'
                }} />
              </div>

              {/* Badge */}
              <div className="absolute top-2 left-2">
                <div className="bg-black/50 backdrop-blur text-white px-2 py-0.5 rounded-full text-xs font-semibold border border-white/20">
                  ✨ {banner.badge}
                </div>
              </div>

              {/* Content */}
              <div className="relative h-full flex flex-col items-center justify-center text-white px-4 py-8 pt-[12px] pb-[12px] ml-[0px] mr-[0px] pl-[8px] pr-[8px] font-bold text-center mt-[0px] mb-[0px]">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="font-bold tracking-tight text-center whitespace-pre-line text-lg">
                    Try out our Free to play skill based Game!
                  </h1>
                </div>
                <p className="opacity-90 mb-3 text-center max-w-md text-sm">
                  {banner.subtitle}
                </p>
                <div className="flex gap-6 flex-wrap justify-center">
                  {banner.buttons.map((button, btnIndex) => {
                    const Icon = button.icon;
                    
                    // Create banner-specific button styles that blend with the gradient - sleek minimalistic design
                    const getBannerButtonStyles = (bannerId: string, variant: string) => {
                      const baseStyles = "font-bold px-4 py-2 rounded-lg transition-all duration-300 border backdrop-blur-md";
                      
                      switch (bannerId) {
                        case 'welcome':
                          return variant === 'primary'
                            ? `${baseStyles} bg-purple-700/60 hover:bg-purple-600/70 text-white border-purple-400/30 hover:border-purple-300/50 shadow-sm hover:shadow-md`
                            : `${baseStyles} bg-purple-700/40 hover:bg-purple-600/50 text-white border-purple-400/20 hover:border-purple-300/30 shadow-sm`;
                        
                        case 'devils-deal':
                          return variant === 'primary'
                            ? `${baseStyles} bg-gradient-to-r from-red-700/60 to-orange-700/60 hover:from-red-600/70 hover:to-orange-600/70 text-white border-orange-400/30 hover:border-orange-300/50 shadow-sm hover:shadow-md`
                            : `${baseStyles} bg-gradient-to-r from-red-700/40 to-orange-700/40 hover:from-red-600/50 hover:to-orange-600/50 text-white border-orange-400/20 hover:border-orange-300/30 shadow-sm`;
                        
                        case 'weekly-race':
                          return variant === 'primary'
                            ? `${baseStyles} bg-gradient-to-r from-blue-700/60 to-indigo-700/60 hover:from-blue-600/70 hover:to-indigo-600/70 text-white border-indigo-400/30 hover:border-indigo-300/50 shadow-sm hover:shadow-md`
                            : `${baseStyles} bg-gradient-to-r from-blue-700/40 to-indigo-700/40 hover:from-blue-600/50 hover:to-indigo-600/50 text-white border-indigo-400/20 hover:border-indigo-300/30 shadow-sm`;
                        
                        case 'daily-prize':
                          return variant === 'primary'
                            ? `${baseStyles} bg-gradient-to-r from-pink-700/60 to-purple-700/60 hover:from-pink-600/70 hover:to-purple-600/70 text-white border-pink-400/30 hover:border-pink-300/50 shadow-sm hover:shadow-md`
                            : `${baseStyles} bg-gradient-to-r from-pink-700/40 to-purple-700/40 hover:from-pink-600/50 hover:to-purple-600/50 text-white border-pink-400/20 hover:border-pink-300/30 shadow-sm`;
                        
                        case 'landed':
                          return variant === 'primary'
                            ? `${baseStyles} bg-gradient-to-r from-cyan-700/60 to-blue-700/60 hover:from-cyan-600/70 hover:to-blue-600/70 text-white border-cyan-400/30 hover:border-cyan-300/50 shadow-sm hover:shadow-md`
                            : `${baseStyles} bg-gradient-to-r from-cyan-700/40 to-blue-700/40 hover:from-cyan-600/50 hover:to-blue-600/50 text-white border-cyan-400/20 hover:border-cyan-300/30 shadow-sm`;
                        
                        default:
                          return variant === 'primary'
                            ? `${baseStyles} bg-golden/60 hover:bg-golden/70 text-black border-golden/30 hover:border-golden/50 shadow-sm hover:shadow-md`
                            : `${baseStyles} bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30`;
                      }
                    };
                    
                    return (
                      <Button
                        key={btnIndex}
                        onClick={button.action}
                        className={`${getBannerButtonStyles(banner.id, button.variant || 'primary')} h-10 text-sm font-bold transform hover:scale-105 active:scale-95`}
                        data-testid={`button-${button.text.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Icon className="w-4 h-4 mr-1.5" />
                        {button.text}
                      </Button>
                    );
                  })}
                </div>
              </div>


              {/* Decorative elements */}
              <div className="absolute top-2 right-2">
                <Star className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
              <div className="absolute bottom-2 left-2">
                <Star className="w-6 h-6 text-yellow-300 animate-pulse" style={{animationDelay: '0.5s'}} />
              </div>
              <div className="absolute top-1/3 left-4">
                <Star className="w-6 h-6 text-yellow-300 animate-pulse" style={{animationDelay: '1s'}} />
              </div>
            </div>
          ))}
        </div>
        
        {/* Subtle swipe hint for first-time users */}
        {currentBannerIndex === 0 && (
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium animate-pulse">
            <span className="flex items-center gap-1">
              👆 Swipe to explore
              <div className="flex gap-0.5">
                <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </span>
          </div>
        )}
        
        {/* Always-visible navigation arrows for clear carousel control */}
        <button
          onClick={prevBanner}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-1 rounded-full transition-all shadow-lg border-2 border-white/20 hover:border-white/40 hover:scale-110 z-10"
          data-testid="banner-prev-arrow"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <button
          onClick={nextBanner}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-1 rounded-full transition-all shadow-lg border-2 border-white/20 hover:border-white/40 hover:scale-110 z-10"
          data-testid="banner-next-arrow"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </section>
      {/* Quick Play Section - 2 Row Carousel */}
      <GameCarousel />
      {/* Navigation Tabs - Between Quick Play and All Games */}
      <section className="py-0.5 mt-2 text-base">
        <div className="bg-black/40 backdrop-blur-sm border-t border-b border-gray-800/30 p-2">
          <div className="flex items-center gap-1 px-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex-1 flex items-center justify-center h-14 rounded-lg transition-all whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-purple-600/30 text-purple-300 shadow-lg shadow-purple-500/30'
                  : 'hover:bg-white/5 text-gray-400 hover:text-white'
              }`}
              data-testid="tab-lobby"
            >
              <span className="font-semibold tracking-wide text-lg">Lobby</span>
            </button>
            
            <div className="w-px bg-gray-700/50 my-1 flex-shrink-0" />
            
            <button
              onClick={() => setActiveCategory('originals')}
              className={`flex-1 flex items-center justify-center h-14 rounded-lg transition-all whitespace-nowrap ${
                activeCategory === 'originals'
                  ? 'bg-purple-600/30 text-purple-300 shadow-lg shadow-purple-500/30'
                  : 'hover:bg-white/5 text-gray-400 hover:text-white'
              }`}
              data-testid="tab-originals"
            >
              <span className="font-semibold tracking-wide text-lg">Originals</span>
            </button>
            
            <div className="w-px bg-gray-700/50 my-1 flex-shrink-0" />
            
            <button
              onClick={() => setActiveCategory('slots')}
              className={`flex-1 flex items-center justify-center h-14 rounded-lg transition-all whitespace-nowrap ${
                activeCategory === 'slots'
                  ? 'bg-purple-600/30 text-purple-300 shadow-lg shadow-purple-500/30'
                  : 'hover:bg-white/5 text-gray-400 hover:text-white'
              }`}
              data-testid="tab-slots"
            >
              <span className="font-semibold tracking-wide text-lg">Slots</span>
            </button>
            
            <div className="w-px bg-gray-700/50 my-1 flex-shrink-0" />
            
            <button
              onClick={() => setActiveCategory('freetoplay')}
              className={`flex-1 flex items-center justify-center h-14 rounded-lg transition-all whitespace-nowrap ${
                activeCategory === 'freetoplay'
                  ? 'bg-purple-600/30 text-purple-300 shadow-lg shadow-purple-500/30'
                  : 'hover:bg-white/5 text-gray-400 hover:text-white'
              }`}
              data-testid="tab-freetoplay"
            >
              <span className="font-semibold tracking-wide text-lg">Free</span>
            </button>
          </div>
        </div>
      </section>
      {/* Games Grid */}
      <section className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-2xl">
            {activeCategory === 'all' ? 'All Games' : 
             activeCategory === 'originals' ? 'Originals' :
             activeCategory === 'slots' ? 'Slots' : 'Free to Play'}
          </h2>
          <span className="text-gray-400 text-lg">
            {games.filter((game) => {
              if (activeCategory === 'all') return true;
              return game.category === activeCategory;
            }).length} games available
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {games
            .filter((game) => {
              if (activeCategory === 'all') return true;
              return game.category === activeCategory;
            })
            .map((game) => (
            <div
              key={game.id}
              onClick={() => navigate(game.path)}
              className="relative group cursor-pointer transform transition-all duration-200 hover:scale-105"
            >
              {/* Game Card */}
              <div className={`relative h-32 rounded-xl overflow-hidden border-2 ${game.borderColor}`}>
                {/* Background image or gradient - stretched to cover entire card */}
                {game.bgImage ? (
                  <div 
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url('${game.bgImage}')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient}`}>
                    {/* Game Icon for cards without images */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <game.icon className="w-12 h-12 text-white/20" />
                    </div>
                  </div>
                )}

                {/* Enhanced dark overlay for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/40" />

                {/* Top section with MIRACLEZ badge, description and RTP */}
                <div className="absolute top-0 left-0 right-0 p-1 z-10">
                  {/* Miraclez Logo centered at top */}
                  <div className="flex justify-center mb-1">
                    <div className={`px-3 py-1 ${game.badgeColor} rounded-md flex items-center justify-center`}>
                      <span className="font-bold text-white tracking-wider text-base">MIRACLEZ</span>
                    </div>
                  </div>

                  {/* Game Description and RTP - only visible on hover */}
                  <div className="px-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 translate-y-1 group-hover:translate-y-0 group-focus-within:translate-y-0 transition-all duration-200">
                    <p className="text-white/90 text-center mb-1.5 line-clamp-2 text-base">
                      {game.description}
                    </p>
                    
                    {/* RTP Badge - only visible on hover */}
                    <div className="flex justify-center">
                      <div className="bg-green-500/30 backdrop-blur-sm rounded-full px-3 py-1 border border-green-400/50 shadow-lg shadow-green-500/20">
                        <span className="font-bold text-green-300 text-base">RTP: {game.rtp}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Game Name at bottom center - prominent and centered */}
                <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
                  <h3 className="text-white font-black text-center tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase text-xl">
                    {game.name}
                  </h3>
                </div>

                {/* Hover effect - subtle glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* Live Bets Feed */}
      <LiveBetsFeed />
      {/* Smart Contract Wallet Section */}
      <section className="px-4 py-6 bg-[#0a0a0a] border-t border-gray-800">
        <h3 className="text-white text-center mb-6 text-xl font-bold">Smart Contract Wallet</h3>
        <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
          {/* Row 1 */}
          <Link 
            href="/crypto?currency=ETH&tab=deposit"
            className="flex justify-center hover:opacity-80 hover:scale-110 transition-all cursor-pointer"
            data-testid="link-crypto-eth"
            title="Buy with Ethereum (ETH)"
          >
            <img src={ethIcon} alt="Ethereum" className="w-[50px] h-[50px] rounded-full" />
          </Link>
          <Link 
            href="/crypto?currency=SOL&tab=deposit"
            className="flex justify-center hover:opacity-80 hover:scale-110 transition-all cursor-pointer"
            data-testid="link-crypto-sol"
            title="Buy with Solana (SOL)"
          >
            <img src={solIcon} alt="Solana" className="w-[50px] h-[50px] rounded-full" />
          </Link>
          <Link 
            href="/crypto?currency=BNB&tab=deposit"
            className="flex justify-center hover:opacity-80 hover:scale-110 transition-all cursor-pointer"
            data-testid="link-crypto-bnb"
            title="Buy with BNB"
          >
            <img src={bnbIcon} alt="BNB" className="w-[50px] h-[50px] rounded-full" />
          </Link>
          
          {/* Row 2 */}
          <Link 
            href="/crypto?currency=LTC&tab=deposit"
            className="flex justify-center hover:opacity-80 hover:scale-110 transition-all cursor-pointer"
            data-testid="link-crypto-ltc"
            title="Buy with Litecoin (LTC)"
          >
            <img src={ltcIcon} alt="Litecoin" className="w-[50px] h-[50px] rounded-full" />
          </Link>
          <Link 
            href="/crypto?currency=XRP&tab=deposit"
            className="flex justify-center hover:opacity-80 hover:scale-110 transition-all cursor-pointer"
            data-testid="link-crypto-xrp"
            title="Buy with XRP"
          >
            <img src={xrpIcon} alt="XRP" className="w-[50px] h-[50px] rounded-full" />
          </Link>
          <Link 
            href="/crypto?currency=TRX&tab=deposit"
            className="flex justify-center hover:opacity-80 hover:scale-110 transition-all cursor-pointer"
            data-testid="link-crypto-trx"
            title="Buy with TRON (TRX)"
          >
            <img src={trxIcon} alt="TRON" className="w-[50px] h-[50px] rounded-full" />
          </Link>
        </div>
      </section>
      {/* Add slide animation keyframe */}
      <style>{`
        @keyframes slide {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100px);
          }
        }
      `}</style>
      {/* Deposit Modal */}
      <DepositModal isOpen={depositModalOpen} onClose={() => setDepositModalOpen(false)} />
      {/* Footer */}
      <Footer />
      {/* Command Bar - Fixed at Bottom */}
      <CommandBar 
        toggleMenu={toggleMenu}
        toggleSearch={toggleSearch}
        toggleChat={toggleChat}
        toggleVIP={toggleVIP}
        togglePurchase={togglePurchase}
      />
      {/* Modal Components */}
      <RollUpMenu 
        isOpen={menuOpen} 
        onClose={() => setMenuOpen(false)}
        onSearchClick={() => {
          setMenuOpen(false);
          setSearchOpen(true);
        }}
      />
      <GameSearch 
        isOpen={searchOpen} 
        onClose={() => setSearchOpen(false)}
      />
      <ChatWidget 
        isOpen={chatOpen} 
        onClose={() => setChatOpen(false)}
      />
      <PurchaseModal 
        isOpen={purchaseOpen} 
        onClose={() => setPurchaseOpen(false)}
      />
    </div>
  );
}