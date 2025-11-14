import { useLocation } from 'wouter';
import { Menu, Search, MessageCircle, Crown, DollarSign, Home } from 'lucide-react';

interface CommandBarProps {
  toggleMenu: () => void;
  toggleSearch: () => void;
  toggleChat: () => void;
  toggleVIP: () => void;
  togglePurchase: () => void;
  menuOpen?: boolean;
}

export function CommandBar({ toggleMenu, toggleSearch, toggleChat, toggleVIP, togglePurchase, menuOpen = false }: CommandBarProps) {
  const [location, setLocation] = useLocation();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[200] bg-slate-900 border-t border-slate-800/50 safe-area-inset-bottom">
      <div className="flex flex-col">
        {/* Back to Casino Button - Hidden on main page, Fundora Blox game, or when menu is open */}
        {location !== '/' && location !== '/fundora-blox-game' && !menuOpen && (
          <button
            onClick={() => setLocation('/')}
            className="w-full py-2.5 bg-gradient-to-r from-purple-700 via-purple-600 to-purple-700 hover:from-purple-800 hover:via-purple-700 hover:to-purple-800 transition-all duration-300 flex items-center justify-center gap-2 border-b border-purple-500/30"
            data-testid="button-back-to-casino"
          >
            <Home className="w-5 h-5" />
            <span className="text-sm font-semibold tracking-wide">BACK TO CASINO</span>
          </button>
        )}
        
        {/* Main Command Bar */}
        <div className="flex items-center h-20 px-2 mt-[-6px] mb-[-6px]">
        <button
          onClick={toggleMenu}
          className="flex-1 flex items-center justify-center py-2 transition-colors text-white/80 hover:text-purple-600 min-h-[64px]"
          data-testid="button-menu"
        >
          <Menu className="w-7 h-7 md:w-9 md:h-9" />
        </button>
        <div className="h-12 w-px bg-slate-500/50"></div>
        <button
          onClick={toggleSearch}
          className="flex-1 flex items-center justify-center py-2 transition-colors text-white/80 hover:text-purple-600 min-h-[64px]"
          data-testid="button-search"
        >
          <Search className="w-7 h-7 md:w-9 md:h-9" />
        </button>
        <div className="h-12 w-px bg-slate-500/50"></div>
        <button
          onClick={toggleChat}
          className="flex-1 flex items-center justify-center py-2 transition-colors text-white/80 hover:text-purple-600 min-h-[64px]"
          data-testid="button-chat"
        >
          <MessageCircle className="w-7 h-7 md:w-9 md:h-9" />
        </button>
        <div className="h-12 w-px bg-slate-500/50"></div>
        <button
          onClick={toggleVIP}
          className={`flex-1 flex items-center justify-center py-2 transition-colors min-h-[64px] ${
            location === '/vip' ? 'text-purple-400 hover:text-purple-600' : 'text-white/80 hover:text-purple-600'
          }`}
          data-testid="button-rewards"
        >
          <Crown className="w-7 h-7 md:w-9 md:h-9" />
        </button>
        <div className="h-12 w-px bg-slate-500/50"></div>
        <button
          onClick={togglePurchase}
          className="flex-1 flex items-center justify-center py-2 transition-colors text-white/80 hover:text-purple-600 min-h-[64px]"
          data-testid="button-purchase"
        >
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-current flex items-center justify-center">
            <DollarSign className="w-6 h-6 md:w-8 md:h-8" />
          </div>
        </button>
      </div>
      </div>
    </nav>
  );
}