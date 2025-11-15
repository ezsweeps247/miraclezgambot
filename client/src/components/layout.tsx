import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dices, Cherry, TrendingUp, Home, Wallet, User, Bitcoin, Shield, Heart, Users, BarChart3, LineChart, Bomb, Grid3x3, CircleEllipsis, Spade, Target, Gamepad2, Sparkles, BarChart, Menu, Search, MessageSquare, Gift, Coins, ShoppingBag, Crown, Trophy, CreditCard, Boxes } from 'lucide-react';
import { BalanceToggle } from '@/components/BalanceToggle';
import { useQuery } from '@tanstack/react-query';
import { Logo } from './logo';
import { InlineThemeSelector } from './inline-theme-selector';
import { useState, useEffect } from 'react';
import ChatWidget from '@/components/ChatWidget';
import { RollUpMenu } from '@/components/roll-up-menu';
import { GameSearch } from '@/components/game-search';
import { CashoutModal } from '@/components/cashout-modal';
import { SettingsModal } from '@/components/settings-modal';
import { AffiliateModal } from '@/components/affiliate-modal';
import { CommandBar } from '@/components/CommandBar';
import { AvatarHub } from '@/components/avatar-hub';
import { JackpotTicker } from '@/components/JackpotTicker';
import { WalletModal } from '@/components/wallet-modal';
import MIRALOGO2 from "@assets/MIRALOGO2.png";
import CIRCLELOGO from "@assets/CIRCLE JERK_1760817139240.png";

import MIRACLEZ from "@assets/MIRACLEZ.png";

import miraclez from "@assets/miraclez.png";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { id: 'home', path: '/', icon: Home, label: 'Home' },
  { id: 'miraclez', path: '/miraclez-dice', icon: Dices, label: 'Miraclez' },
  { id: 'slots', path: '/slots', icon: Cherry, label: 'Slots' },
  { id: 'blackjack', path: '/blackjack', icon: Spade, label: 'Blackjack' },
  { id: 'roulette', path: '/roulette', icon: Target, label: 'Roulette' },
  { id: 'mines', path: '/mines', icon: Bomb, label: 'Mines' },
  { id: 'keno', path: '/keno', icon: Grid3x3, label: 'Keno' },
  { id: 'plinko', path: '/plinko', icon: CircleEllipsis, label: 'Plinko' },
  { id: 'limbo', path: '/limbo', icon: BarChart, label: 'Limbo' },
  { id: 'tower-defense', path: '/tower-defense', icon: Shield, label: 'Tower' },
  { id: 'enigma', path: '/enigma', icon: Sparkles, label: 'Enigma' },
  { id: 'fundora-blox', path: '/fundora-blox', icon: Boxes, label: 'Fundora Blox' },
  { id: 'miracoaster', path: '/miracoaster', icon: TrendingUp, label: 'Miracoaster' },
];

export default function Layout({ children }: LayoutProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [forceLoaded, setForceLoaded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [affiliateOpen, setAffiliateOpen] = useState(false);
  const [avatarHubOpen, setAvatarHubOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  // Helper function to close all modals except the one specified
  const closeAllModals = (except?: 'menu' | 'search' | 'chat' | 'cashout' | 'affiliate' | 'avatar' | 'wallet') => {
    if (except !== 'menu') setMenuOpen(false);
    if (except !== 'search') setSearchOpen(false);
    if (except !== 'chat') setChatOpen(false);
    if (except !== 'cashout') setCashoutOpen(false);
    if (except !== 'affiliate') setAffiliateOpen(false);
    if (except !== 'avatar') setAvatarHubOpen(false);
    if (except !== 'wallet') setWalletOpen(false);
    // Navigate away from VIP page when opening other features
    if (location === '/vip' && except) {
      setLocation('/');
    }
  };

  // Toggle functions for each feature with exclusive opening
  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
    } else {
      closeAllModals('menu');
      setMenuOpen(true);
    }
  };

  const toggleSearch = () => {
    if (searchOpen) {
      setSearchOpen(false);
    } else {
      closeAllModals('search');
      setSearchOpen(true);
    }
  };

  const toggleChat = () => {
    if (chatOpen) {
      setChatOpen(false);
    } else {
      closeAllModals('chat');
      setChatOpen(true);
    }
  };

  const toggleCashout = () => {
    if (cashoutOpen) {
      setCashoutOpen(false);
    } else {
      closeAllModals('cashout');
      setCashoutOpen(true);
    }
  };

  const toggleWallet = () => {
    if (walletOpen) {
      setWalletOpen(false);
    } else {
      closeAllModals('wallet');
      setWalletOpen(true);
    }
  };

  const toggleProfile = () => {
    if (avatarHubOpen) {
      setAvatarHubOpen(false);
    } else {
      closeAllModals('avatar');
      setAvatarHubOpen(true);
    }
  };
  
  const togglePurchase = () => {
    if (location === '/purchase') {
      // If already on purchase page, navigate to home
      setLocation('/');
    } else {
      // Navigate to purchase page and close all modals
      closeAllModals();
      setLocation('/purchase');
    }
  };

  const toggleAffiliate = () => {
    if (affiliateOpen) {
      setAffiliateOpen(false);
    } else {
      closeAllModals('affiliate');
      setAffiliateOpen(true);
    }
  };

  // Toggle VIP page
  const toggleVIP = () => {
    if (location === '/vip') {
      // If already on VIP page, navigate to home
      setLocation('/');
    } else {
      // Navigate to VIP page and close all modals
      closeAllModals();
      setLocation('/vip');
    }
  };

  // Force loading to complete after 2 seconds maximum
  useEffect(() => {
    const timeout = setTimeout(() => {
      setForceLoaded(true);
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  const { data: balance, error: balanceError } = useQuery({
    queryKey: ["/api/balance"],
    enabled: isAuthenticated,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });

  // Log balance data for debugging
  useEffect(() => {
    if (balance) {
      console.log('Balance data:', balance);
    }
    if (balanceError) {
      console.error('Balance error:', balanceError);
    }
  }, [balance, balanceError]);

  // Never show loading screen for more than 2 seconds
  if (isLoading && !forceLoaded) {
    return (
      <div className="min-h-screen bg-casino-dark flex items-center justify-center">
        <div className="text-center">
          <Logo variant="icon" size="xl" className="mx-auto mb-4 animate-pulse text-casino-neon" />
          <div className="text-[10px] font-bold mb-2">MIRACLEZ</div>
          <div className="text-casino-text">Loading...</div>
        </div>
      </div>
    );
  }

  // While authenticating or redirecting, show loading state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-casino-dark flex items-center justify-center">
        <div className="text-center">
          <Logo variant="icon" size="xl" className="mx-auto mb-4 animate-pulse text-casino-neon" />
          <div className="text-[10px] font-bold mb-2">MIRACLEZ</div>
          <div className="text-casino-text">Authenticating...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-casino-dark text-white">
      {/* Miraclez-style Header */}
      <header className="bg-black border-b border-[#1a1a1a] px-1 md:px-3 pt-3 h-16 md:h-18 sticky top-0 z-50 mobile-header">
        <div className="h-full flex items-center justify-between max-w-screen-xl mx-auto gap-0.5 md:gap-2">
          {/* LEFT: MIRACLEZ Title */}
          <button 
            onClick={() => setLocation('/')}
            className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0"
            data-testid="button-logo-home"
          >
            <div className="relative">
              <span className="text-base md:text-2xl font-bold tracking-tight cursor-pointer" style={{ color: '#D4AF37' }}>
                MIRACLEZ
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-transparent to-purple-500/20 pointer-events-none" />
            </div>
          </button>
          
          {/* CENTER: Home, Balance, and Wallet */}
          <div className="flex items-center gap-0.5 md:gap-2 flex-1 justify-center">
            {/* Home Button (left of balance) */}
            <button
              onClick={() => setLocation('/')}
              className="flex items-center justify-center h-9 md:h-12 w-9 md:w-12 rounded-lg transition-all duration-200 bg-gradient-to-b from-purple-700 to-purple-500 hover:from-purple-800 hover:to-purple-600 text-white shadow-md hover:shadow-lg flex-shrink-0"
              data-testid="button-home"
            >
              <Home className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            
            {/* Balance Toggle */}
            <BalanceToggle />
            
            {/* Wallet Button (right of balance) */}
            <button
              onClick={toggleWallet}
              className="flex items-center justify-center h-9 md:h-12 w-9 md:w-12 rounded-lg transition-all duration-200 bg-gradient-to-b from-purple-700 to-purple-500 hover:from-purple-800 hover:to-purple-600 text-white shadow-md hover:shadow-lg flex-shrink-0"
              data-testid="button-wallet"
            >
              <Wallet className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          
          {/* RIGHT: Wider Profile Logo */}
          <button
            onClick={toggleProfile}
            className="flex items-center justify-center h-9 md:h-12 w-16 md:w-20 rounded-full transition-all duration-200 hover:opacity-80 flex-shrink-0 overflow-hidden from-purple-700/20 to-purple-500/20 p-0.5 bg-[#000000]"
            data-testid="button-profile"
          >
            <img 
              src={miraclez} 
              alt="Profile" 
              className="h-full w-full object-cover rounded-full"
            />
          </button>
        </div>
      </header>
      {/* Jackpot Ticker */}
      <JackpotTicker />
      {/* Main Content */}
      <main className="min-h-[calc(100vh-112px)] md:min-h-[calc(100vh-128px)] pb-14 md:pb-16 lg:pb-0">
        {children}
      </main>
      {/* Chat Widget */}
      <ChatWidget isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      {/* Roll-up Menu */}
      <RollUpMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} onSearchClick={toggleSearch} />
      {/* Game Search */}
      <GameSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      {/* Cashout Modal */}
      <CashoutModal isOpen={cashoutOpen} onClose={() => setCashoutOpen(false)} />
      {/* Wallet Modal */}
      <WalletModal isOpen={walletOpen} onClose={() => setWalletOpen(false)} />
      {/* Settings Modal */}
      <SettingsModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      {/* Affiliate Modal */}
      <AffiliateModal isOpen={affiliateOpen} onClose={() => setAffiliateOpen(false)} />
      {/* Avatar Hub */}
      <AvatarHub isOpen={avatarHubOpen} onClose={() => setAvatarHubOpen(false)} />
      {/* Command Bar - Fixed at bottom */}
      <CommandBar 
        toggleMenu={toggleMenu}
        toggleSearch={toggleSearch}
        toggleChat={toggleChat}
        toggleVIP={toggleVIP}
        togglePurchase={togglePurchase}
        menuOpen={menuOpen}
      />
    </div>
  );
}
