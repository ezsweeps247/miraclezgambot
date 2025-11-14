import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Coins, DollarSign, ChevronDown } from 'lucide-react';

interface BalanceData {
  available: number;
  locked: number;
  currency: string;
  total: number;
  sweepsCashTotal: number;
  sweepsCashRedeemable: number;
  balanceMode: 'GC' | 'SC';
}

export function BalanceToggle() {
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch balance data (includes user's current balance mode)
  const { data: balance } = useQuery<BalanceData>({
    queryKey: ['/api/balance'],
    refetchInterval: 3000, // Reduced from 5000 to 3000 for faster updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
    staleTime: 1000, // Consider data stale after 1 second
  });

  // Mutation to update user's balance mode preference
  const updateBalanceMode = useMutation({
    mutationFn: async (newMode: 'GC' | 'SC') => {
      const response = await apiRequest('POST', '/api/balance-mode', { balanceMode: newMode });
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate balance query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update balance mode. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleModeChange = (newMode: 'GC' | 'SC') => {
    if (!balance || updateBalanceMode.isPending || balance.balanceMode === newMode) return;
    
    setIsAnimating(true);
    updateBalanceMode.mutate(newMode);
    
    // Reset animation after a short delay
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  // Get current balance mode from server data
  const currentMode = balance?.balanceMode || 'GC';

  // Calculate displayed balance based on current mode
  const displayBalance = currentMode === 'SC' 
    ? (balance?.sweepsCashTotal || 0)
    : (balance?.total || 0);

  return (
    <button 
      onClick={() => handleModeChange(currentMode === 'GC' ? 'SC' : 'GC')} 
      className="flex items-center justify-center bg-[#1a1a1a] rounded-lg px-1.5 md:px-3 h-9 md:h-12 min-w-[60px] md:min-w-[100px] transition-all duration-200 border border-gray-700/50 hover:border-gray-600 hover:shadow-md relative group"
      data-testid="balance-display" 
      title={`Switch to ${currentMode === 'GC' ? 'SC' : 'GC'}`}
      disabled={updateBalanceMode.isPending}
      aria-label={`Current balance: ${displayBalance.toFixed(2)} ${currentMode}. Click to switch to ${currentMode === 'GC' ? 'SC' : 'GC'}`}
    >
      {/* Animated background on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none" />
      {/* Currency Icon */}
      <div className={`mr-1 md:mr-1.5 transition-all duration-200 ${isAnimating ? 'animate-bounce' : ''} group-hover:scale-110`}>
        {currentMode === 'SC' ? (
          <span className="text-xs md:text-sm font-bold text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.5)]">SC</span>
        ) : (
          <Coins className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" />
        )}
      </div>
      {/* Balance Amount - Horizontal Layout */}
      <div className={`flex items-center gap-1 md:gap-1.5 relative z-10 ${isAnimating ? 'animate-pulse' : ''}`}>
        <span className="text-white font-semibold tabular-nums text-xs md:text-sm">
          {displayBalance.toFixed(2)}
        </span>
        <ChevronDown className={`
          w-3 h-3 md:w-4 md:h-4 transition-all duration-200
          ${currentMode === 'SC' ? 'text-green-400' : 'text-yellow-400'}
          group-hover:scale-110
        `} />
      </div>
      {/* Loading indicator */}
      {updateBalanceMode.isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]/80 rounded-lg">
          <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
}