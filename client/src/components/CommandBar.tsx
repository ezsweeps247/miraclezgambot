import { useLocation } from 'wouter';
import { Menu, Search, MessageCircle, Crown, DollarSign } from 'lucide-react';

interface CommandBarProps {
  toggleMenu: () => void;
  toggleSearch: () => void;
  toggleChat: () => void;
  toggleVIP: () => void;
  togglePurchase: () => void;
  menuOpen?: boolean;
}

export function CommandBar({ toggleMenu, toggleSearch, toggleChat, toggleVIP, togglePurchase, menuOpen = false }: CommandBarProps) {
  const [location] = useLocation();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[200] bg-slate-900 border-t border-slate-800/50 safe-area-inset-bottom">
      <div className="flex flex-col">
        {/* Main Command Bar */}
        <div className="flex items-stretch h-20">
        <button
          onClick={toggleMenu}
          className="flex-1 flex flex-col items-center justify-center py-2 transition-colors text-white/80 hover:text-purple-600 min-h-[64px] border-t-2 border-purple-500"
          data-testid="button-menu"
        >
          <Menu className="w-7 h-7 md:w-9 md:h-9" />
        </button>
        <div className="h-12 w-px bg-slate-500/50 self-center"></div>
        <button
          onClick={toggleSearch}
          className="flex-1 flex flex-col items-center justify-center py-2 transition-colors text-white/80 hover:text-purple-600 min-h-[64px] border-t-2 border-cyan-500"
          data-testid="button-search"
        >
          <Search className="w-7 h-7 md:w-9 md:h-9" />
        </button>
        <div className="h-12 w-px bg-slate-500/50 self-center"></div>
        <button
          onClick={toggleChat}
          className="flex-1 flex flex-col items-center justify-center py-2 transition-colors text-white/80 hover:text-purple-600 min-h-[64px] border-t-2 border-emerald-500"
          data-testid="button-chat"
        >
          <MessageCircle className="w-7 h-7 md:w-9 md:h-9" />
        </button>
        <div className="h-12 w-px bg-slate-500/50 self-center"></div>
        <button
          onClick={toggleVIP}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors min-h-[64px] border-t-2 border-yellow-500 ${
            location === '/vip' ? 'text-purple-400 hover:text-purple-600' : 'text-white/80 hover:text-purple-600'
          }`}
          data-testid="button-rewards"
        >
          <Crown className="w-7 h-7 md:w-9 md:h-9" />
        </button>
        <div className="h-12 w-px bg-slate-500/50 self-center"></div>
        <button
          onClick={togglePurchase}
          className="flex-1 flex flex-col items-center justify-center py-2 transition-colors text-white/80 hover:text-purple-600 min-h-[64px] border-t-2 border-orange-500"
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