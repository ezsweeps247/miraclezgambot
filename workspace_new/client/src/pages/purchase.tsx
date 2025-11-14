import { X, Wallet, AlertCircle, Gift, Clock, Star, Timer, Info, Shield } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import PaymentModal from '@/components/payment-modal';

interface Package {
  id: string;
  price: number;
  sweepsCash: number;  // Main purchase item with value
  goldCoins: number;   // Free bonus with no value
  popular?: boolean;
}

const PACKAGES: Package[] = [
  { id: 'pkg-5', price: 5, sweepsCash: 5, goldCoins: 50000 },
  { id: 'pkg-10', price: 10, sweepsCash: 10, goldCoins: 100000 },
  { id: 'pkg-20', price: 20, sweepsCash: 20, goldCoins: 200000, popular: true },
  { id: 'pkg-50', price: 50, sweepsCash: 50, goldCoins: 500000 },
  { id: 'pkg-100', price: 100, sweepsCash: 100, goldCoins: 1000000 },
  { id: 'pkg-300', price: 300, sweepsCash: 300, goldCoins: 3000000 },
  { id: 'pkg-500', price: 500, sweepsCash: 500, goldCoins: 5000000 },
  { id: 'pkg-1000', price: 1000, sweepsCash: 1000, goldCoins: 10000000 },
];

// Free Top Up Component - 2,500 GC every 6 hours
function FreeTopUpComponent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState('');
  const [showClaimPopup, setShowClaimPopup] = useState(false);
  const [claimData, setClaimData] = useState<any>(null);
  
  // Refs for cleanup
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Fetch free top up status
  const { data: topUpStatus, isLoading } = useQuery<{
    canClaim: boolean;
    nextAvailableAt?: string;
    timeUntilNext: number;
    totalClaims: number;
    rewardAmount: number;
  }>({ 
    queryKey: ['/api/top-up-bonus/status']
  });
  
  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/top-up-bonus/claim', {});
      return response.json();
    },
    onSuccess: (data) => {
      // Show auto-disappearing popup
      setClaimData(data);
      setShowClaimPopup(true);
      
      // Auto-hide popup after 3 seconds
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
      }
      popupTimerRef.current = setTimeout(() => {
        setShowClaimPopup(false);
        setClaimData(null);
      }, 3000);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/top-up-bonus/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      
      toast({
        title: 'Free Top Up Claimed!',
        description: `You received ${data.goldCoins?.toLocaleString() || '2,500'} Gold Coins for free play!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Claim Failed',
        description: error.message || 'Failed to claim free top up',
        variant: 'destructive',
      });
    },
  });
  
  // Manual close popup
  const closePopup = () => {
    setShowClaimPopup(false);
    setClaimData(null);
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
  };

  // Update countdown timer
  useEffect(() => {
    if (!topUpStatus?.nextAvailableAt) return;
    
    // Clear existing timers
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    
    const resetTime = new Date(topUpStatus.nextAvailableAt);
    const now = new Date();
    const msUntilReset = resetTime.getTime() - now.getTime();
    
    const updateCountdown = () => {
      const currentTime = new Date();
      const timeDiff = resetTime.getTime() - currentTime.getTime();
      
      if (timeDiff <= 0) {
        setCountdown('Available now!');
        queryClient.invalidateQueries({ queryKey: ['/api/free-topup/status'] });
        
        // Clear interval to prevent redundant refetches
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
          resetTimerRef.current = null;
        }
        return;
      }
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`${hours}h ${minutes}m until next claim`);
    };
    
    // Set up immediate countdown display
    updateCountdown();
    
    // Schedule precise refetch when cooldown expires
    if (msUntilReset > 0) {
      resetTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/free-topup/status'] });
      }, msUntilReset + 500); // 500ms buffer
    }
    
    // Update countdown display every minute
    countdownIntervalRef.current = setInterval(updateCountdown, 60000);
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [topUpStatus?.nextAvailableAt, queryClient]);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }
  
  const canClaim = topUpStatus?.canClaim || false;
  const gcAmount = topUpStatus?.rewardAmount || 2500;
  
  return (
    <div className="space-y-4 p-4 max-w-md mx-auto">
      {/* Header with coin icon */}
      <div className="text-center mb-6">
        <div className="relative inline-block mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
            <div className="text-[10px]">🪙</div>
          </div>
          {canClaim && (
            <div style={{width: '3.5px', height: '3.5px'}} className="absolute -top-1 -right-1 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </div>
        <h3 className="text-[10px] font-bold text-white mb-1" data-testid="text-free-topup">
          Free Play Top Up
        </h3>
        <p className="text-[8px] text-gray-400">
          Get 2,500 Gold Coins every 6 hours for free play. No purchase required!
        </p>
      </div>
      
      {/* Reward Display */}
      <div className="bg-[#1a1a1a] rounded-lg p-6 mb-4 text-center">
        <div className="text-[10px] font-bold text-yellow-400 mb-2">
          {gcAmount.toLocaleString()}
        </div>
        <div className="text-[8px] text-gray-400 mb-3">Gold Coins</div>
        <div className="flex items-center justify-center gap-2 text-[8px] text-gray-500">
          <Timer style={{width: '3.5px', height: '3.5px'}} className="" />
          <span>Available every 6 hours</span>
        </div>
      </div>
      
      {/* Countdown Timer */}
      {!canClaim && countdown && (
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center mb-4">
          <div className="text-[8px] text-gray-300">{countdown}</div>
        </div>
      )}
      
      {/* Claim Button */}
      {canClaim ? (
        <Button
          onClick={() => claimMutation.mutate()}
          disabled={claimMutation.isPending}
          className="w-full bg-gradient-to-b from-yellow-600 to-orange-500 hover:from-yellow-700 hover:to-orange-600 text-black font-bold py-3 text-[10px] h-12 touch-friendly-button shadow-md hover:shadow-lg transition-all"
          data-testid="button-claim-free-topup"
        >
          {claimMutation.isPending ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
              Claiming...
            </div>
          ) : (
            'Claim Free Coins'
          )}
        </Button>
      ) : (
        <Button
          disabled
          className="w-full bg-gray-700 text-gray-400 font-bold py-3 cursor-not-allowed text-[10px] h-12"
          data-testid="button-claim-free-topup-disabled"
        >
          Claim Free Coins
        </Button>
      )}
      
      {/* Info */}
      <div className="bg-[#1a1a1a] rounded-lg p-3 mt-4">
        <div className="flex items-start gap-2">
          <AlertCircle style={{width: '3.5px', height: '3.5px'}} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-left text-[8px] text-gray-300">
            <p className="mb-1">• Completely free - no purchase required</p>
            <p className="mb-1">• Available every 6 hours</p>
            <p className="text-gray-400">• Perfect for free play and trying new games</p>
          </div>
        </div>
      </div>
      
      {/* Auto-disappearing Claim Success Popup */}
      <AnimatePresence>
        {showClaimPopup && claimData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 flex items-center justify-center z-[300] pointer-events-none"
            data-testid="popup-claimed-topup"
          >
            <motion.div 
              className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-6 mx-4 shadow-2xl border border-yellow-400/30 pointer-events-auto"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-[10px]">🪙</div>
                </div>
                <h3 className="text-[10px] font-bold text-black mb-2" data-testid="text-award-topup">
                  Free Top Up Claimed!
                </h3>
                <p className="text-yellow-900 mb-4">
                  You received <span className="font-bold">2,500 Gold Coins</span> for free play!
                </p>
                <Button
                  onClick={closePopup}
                  variant="secondary"
                  size="sm"
                  className="bg-black/20 hover:bg-black/30 text-black border-black/30"
                  data-testid="button-close-topup"
                >
                  <X style={{width: '3.5px', height: '3.5px'}} className="" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Daily Streak Component
function DailyStreakComponent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState('');
  const [showClaimPopup, setShowClaimPopup] = useState(false);
  const [claimData, setClaimData] = useState<any>(null);
  
  // Refs for cleanup
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Fetch daily login status
  const { data: streakData, isLoading } = useQuery<{
    currentStreak: number;
    nextClaimDay: number;
    canClaim: boolean;
    hasClaimedToday: boolean;
    rewards: Array<{
      day: number;
      goldCoins: number;
      sweepCoins: number;
      isActive: boolean;
    }>;
    nextResetAt?: string;
  }>({ queryKey: ['/api/daily-login/status'] });
  
  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/daily-login/claim', {});
      return response.json();
    },
    onSuccess: (data) => {
      // Show auto-disappearing popup
      setClaimData(data);
      setShowClaimPopup(true);
      
      // Auto-hide popup after 3 seconds
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
      }
      popupTimerRef.current = setTimeout(() => {
        setShowClaimPopup(false);
        setClaimData(null);
      }, 3000);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/daily-login/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Claim Failed',
        description: error.message || 'Failed to claim daily bonus',
        variant: 'destructive',
      });
    },
  });
  
  // Manual close popup
  const closePopup = () => {
    setShowClaimPopup(false);
    setClaimData(null);
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
  };

  // Enhanced UTC-based countdown and reset scheduling
  useEffect(() => {
    if (!streakData?.nextResetAt) return;
    
    // Clear existing timers
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    
    const resetTime = new Date(streakData.nextResetAt);
    const now = new Date();
    const msUntilReset = resetTime.getTime() - now.getTime();
    
    const updateCountdown = () => {
      const currentTime = new Date();
      const timeDiff = resetTime.getTime() - currentTime.getTime();
      
      if (timeDiff <= 0) {
        setCountdown('Available now!');
        queryClient.invalidateQueries({ queryKey: ['/api/daily-login/status'] });
        
        // Clear interval to prevent redundant refetches
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
          resetTimerRef.current = null;
        }
        return;
      }
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`${hours}h ${minutes}m until claim`);
    };
    
    // Set up immediate countdown display
    updateCountdown();
    
    // Schedule precise refetch at UTC midnight (with small buffer)
    if (msUntilReset > 0) {
      resetTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/daily-login/status'] });
      }, msUntilReset + 500); // 500ms buffer to ensure backend reset has occurred
    }
    
    // Update countdown display every minute for visual countdown
    countdownIntervalRef.current = setInterval(updateCountdown, 60000);
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [streakData?.nextResetAt, queryClient]);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);
  
  // Refetch on window focus/visibility change to handle sleep/resume
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        queryClient.invalidateQueries({ queryKey: ['/api/daily-login/status'] });
      }
    };
    
    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-login/status'] });
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [queryClient]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }
  
  const currentStreak = streakData?.currentStreak || 0;
  const canClaim = streakData?.canClaim || false;
  const hasClaimedToday = streakData?.hasClaimedToday || false;
  const rewards = streakData?.rewards || [];
  
  // Compute claimed status for each reward based on current streak
  const rewardsWithClaimed = rewards.map(reward => ({
    ...reward,
    claimed: reward.day < currentStreak || (reward.day === currentStreak && hasClaimedToday)
  }));
  
  return (
    <div className="space-y-4 p-4 max-w-md mx-auto">
      {/* Header with treasure chest */}
      <div className="text-center mb-6">
        <div className="relative inline-block mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-600 to-orange-700 rounded-lg flex items-center justify-center transform rotate-3 shadow-lg">
            <div className="text-[10px]">💰</div>
          </div>
          {canClaim && (
            <div style={{width: '3.5px', height: '3.5px'}} className="absolute -top-1 -right-1 bg-green-500 rounded-full animate-pulse"></div>
          )}
        </div>
        <h3 className="text-[10px] font-bold text-white mb-1" data-testid="text-streak">
          You're on a {currentStreak} day streak!
        </h3>
        <p className="text-[8px] text-gray-400">
          Claim your Daily Bonus to keep your streak alive and unlock even better rewards to enjoy on Shuffle.
        </p>
      </div>
      
      {/* 7-Day Calendar Grid */}
      <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
        <div className="grid grid-cols-4 gap-3 mb-4">
          {rewardsWithClaimed.slice(0, 4).map((reward) => (
            <div key={reward.day} className="text-center" data-testid={`cell-day-${reward.day}`}>
              <div className="text-[8px] text-gray-400 mb-1">Day</div>
              <div className="text-[8px] font-medium text-white mb-2">{reward.day}</div>
              <div className={`w-12 h-12 mx-auto rounded-full border-2 flex items-center justify-center mb-2 ${
                reward.claimed 
                  ? 'border-green-500 bg-green-500/20' 
                  : reward.day === (currentStreak + 1) && canClaim
                  ? 'border-yellow-500 bg-yellow-500/20 animate-pulse'
                  : 'border-gray-600 bg-gray-600/20'
              }`} data-testid={`status-claimed-${reward.day}`}>
                {reward.claimed ? (
                  <div className="text-green-400 text-[10px]">✓</div>
                ) : reward.day === (currentStreak + 1) && canClaim ? (
                  <div className="text-yellow-400 text-[10px]">⭐</div>
                ) : (
                  <div className="text-gray-600 text-[10px]">✓</div>
                )}
              </div>
              <div className="text-[8px] text-gray-300" data-testid={`text-gc-${reward.day}`}>
                GC {reward.goldCoins.toLocaleString()}
              </div>
              <div className="text-[8px] text-gray-300" data-testid={`text-sc-${reward.day}`}>
                SC {reward.sweepCoins}
              </div>
            </div>
          ))}
        </div>
        
        {/* Days 5-7 */}
        <div className="grid grid-cols-3 gap-4">
          {rewardsWithClaimed.slice(4, 7).map((reward) => (
            <div key={reward.day} className="text-center" data-testid={`cell-day-${reward.day}`}>
              <div className="text-[8px] text-gray-400 mb-1">Day</div>
              <div className="text-[8px] font-medium text-white mb-2">{reward.day}</div>
              <div className={`w-12 h-12 mx-auto rounded-full border-2 flex items-center justify-center mb-2 ${
                reward.claimed 
                  ? 'border-green-500 bg-green-500/20' 
                  : reward.day === (currentStreak + 1) && canClaim
                  ? 'border-yellow-500 bg-yellow-500/20 animate-pulse'
                  : 'border-gray-600 bg-gray-600/20'
              }`} data-testid={`status-claimed-${reward.day}`}>
                {reward.claimed ? (
                  <div className="text-green-400 text-[10px]">✓</div>
                ) : reward.day === 7 && !reward.claimed ? (
                  <div className="text-yellow-400 text-[10px]">💰</div>
                ) : reward.day === (currentStreak + 1) && canClaim ? (
                  <div className="text-yellow-400 text-[10px]">⭐</div>
                ) : (
                  <div className="text-gray-600 text-[10px]">✓</div>
                )}
              </div>
              <div className="text-[8px] text-gray-300" data-testid={`text-gc-${reward.day}`}>
                GC {reward.goldCoins.toLocaleString()}
              </div>
              <div className="text-[8px] text-gray-300" data-testid={`text-sc-${reward.day}`}>
                SC {reward.sweepCoins}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Countdown Timer */}
      {!canClaim && countdown && (
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center mb-4">
          <div className="text-[8px] text-gray-300">{countdown}</div>
        </div>
      )}
      
      {/* Claim Button */}
      {canClaim ? (
        <Button
          onClick={() => claimMutation.mutate()}
          disabled={claimMutation.isPending}
          className="w-full bg-gradient-to-b from-green-700 to-green-500 hover:from-green-800 hover:to-green-600 text-white font-bold py-3 text-[10px] h-12 touch-friendly-button shadow-md hover:shadow-lg transition-all"
          data-testid="button-claim-daily-streak"
        >
          {claimMutation.isPending ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Claiming...
            </div>
          ) : (
            'Get Bonus'
          )}
        </Button>
      ) : (
        <Button
          disabled
          className="w-full bg-gray-700 text-gray-400 font-bold py-3 cursor-not-allowed text-[10px] h-12"
          data-testid="button-claim-daily-streak-disabled"
        >
          Claim Now
        </Button>
      )}
      
      {/* Info */}
      <div className="bg-[#1a1a1a] rounded-lg p-3 mt-4">
        <div className="flex items-start gap-2">
          <AlertCircle style={{width: '3.5px', height: '3.5px'}} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-left text-[8px] text-gray-300">
            <p className="mb-1">• Login daily to maintain your streak</p>
            <p className="mb-1">• Rewards increase with streak length</p>
            <p className="text-gray-400">• Streak resets if you miss a day</p>
          </div>
        </div>
      </div>
      
      {/* Auto-disappearing Claim Success Popup */}
      <AnimatePresence>
        {showClaimPopup && claimData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 flex items-center justify-center z-[300] pointer-events-none"
            data-testid="popup-claimed"
          >
            <motion.div 
              className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 mx-4 shadow-2xl border border-green-500/30 pointer-events-auto"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-[10px]">🎉</div>
                </div>
                <h3 className="text-[10px] font-bold text-white mb-2" data-testid="text-award">
                  Daily Bonus Claimed!
                </h3>
                <p className="text-green-100 mb-4">
                  You received <span className="font-bold">{claimData.goldCoins?.toLocaleString()} GC</span> + <span className="font-bold">{claimData.sweepCoins} SC</span>
                </p>
                <Button
                  onClick={closePopup}
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  data-testid="button-close"
                >
                  <X style={{width: '3.5px', height: '3.5px'}} className="" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Redeem Sweeps Cash Component
function RedeemSweepsCashComponent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Fetch user's KYC status
  const { data: kycStatus, isLoading: kycLoading } = useQuery<{
    status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_ADDITIONAL_INFO';
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reviewNotes?: string;
  }>({
    queryKey: ['/api/kyc/status'],
    retry: false,
  });
  
  // Fetch sweeps cash balance
  const { data: balance } = useQuery<{
    available: number;
    locked: number;
    currency: string;
    sweepsCashTotal: number;
    sweepsCashRedeemable: number;
  }>({
    queryKey: ['/api/balance'],
  });
  
  // Redemption mutation
  const redeemMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest('POST', '/api/redeem/sweeps-cash', { amount });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Redemption Initiated',
        description: 'Your cash redemption request has been submitted.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Redemption Failed',
        description: error.message || 'Failed to process redemption',
        variant: 'destructive',
      });
    },
  });
  
  const isVerified = kycStatus?.status === 'APPROVED';
  const sweepsTotal = balance?.sweepsCashTotal || 0;
  const sweepsRedeemable = balance?.sweepsCashRedeemable || 0;
  
  const handleRedeem = () => {
    if (!isVerified) {
      toast({
        title: 'Verification Required',
        description: 'Please complete identity verification first.',
        variant: 'destructive',
      });
      return;
    }
    
    if (sweepsRedeemable < 0.01) {
      toast({
        title: 'Insufficient Balance',
        description: 'Minimum redemption amount is $0.01',
        variant: 'destructive',
      });
      return;
    }
    
    redeemMutation.mutate(sweepsRedeemable);
  };
  
  const handleVerifyNow = () => {
    // Navigate to KYC verification page
    setLocation('/kyc');
  };
  
  return (
    <div className="space-y-6">
      {/* Verification Section */}
      {!isVerified && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-white text-[8px] font-medium mb-1">
                Please verify your identity to use this feature.
              </h3>
              <p className="text-gray-400 text-[8px] mb-3">
                You can only use this feature if you have successfully verified your identity.{' '}
                <button
                  onClick={handleVerifyNow}
                  className="text-blue-400 hover:text-blue-300 underline"
                  data-testid="link-verify-now"
                >
                  Verify now
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Sparkling Icon */}
      <div className="text-center">
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/30 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
            <Star style={{width: '3px', height: '3px'}} className="text-white fill-current" />
          </div>
          {/* Sparkle effects */}
          <Star style={{width: '3px', height: '3px'}} className="text-green-400 absolute -top-1 -right-1 fill-current" />
          <Star style={{width: '2.5px', height: '2.5px'}} className="text-green-400 absolute top-2 -left-2 fill-current" />
          <Star style={{width: '2.5px', height: '2.5px'}} className="text-green-400 absolute -bottom-1 left-3 fill-current" />
        </div>
      </div>
      
      {/* Title and Description */}
      <div className="text-center space-y-3">
        <h2 className="text-[10px] font-bold text-white">
          Play with Sweeps Cash (SC)
          <br />
          and redeem cash prizes!
        </h2>
        
        <p className="text-gray-400 text-[8px] leading-relaxed max-w-md mx-auto">
          Sweeps Cash (SC) must be played through before redeeming for prizes. Eligible SC can be redeemed at US $1.00 for 100 SC. SC are always FREE. No purchase necessary.
        </p>
      </div>
      
      {/* Balance Display */}
      <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total balance</span>
          <div className="flex items-center gap-1">
            <Shield style={{width: '3.5px', height: '3.5px'}} className="text-green-400" />
            <span className="text-green-400 font-medium">{sweepsTotal.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Redeemable balance</span>
          <div className="flex items-center gap-1">
            <Shield style={{width: '3.5px', height: '3.5px'}} className="text-green-400" />
            <span className="text-green-400 font-medium">{sweepsRedeemable.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Redeem Button */}
      <Button
        onClick={handleRedeem}
        disabled={!isVerified || sweepsRedeemable < 0.01 || redeemMutation.isPending}
        className="w-full h-12 text-[10px] font-medium bg-gray-500 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="button-redeem-sweeps"
      >
        {redeemMutation.isPending ? 'Processing...' : 'Redeem'}
      </Button>
    </div>
  );
}

export default function PurchasePage() {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState('buy');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's balance and limits
  const { data: balance } = useQuery<{ available: number; locked: number; currency: string }>({
    queryKey: ["/api/balance"],
  });

  // Purchase mutation using NOWPayments
  const purchaseMutation = useMutation({
    mutationFn: async (pkg: Package) => {
      // Create a deposit via NOWPayments
      const response = await apiRequest('POST', '/api/crypto/deposit', {
        currency: 'USDT', // Default to USDT for purchases
        usdAmount: pkg.price
      });
      return response.json();
    },
    onSuccess: (data, pkg) => {
      // Prepare payment data for modal
      const paymentInfo = {
        depositId: data.payment?.id || crypto.randomUUID(),
        paymentId: data.payment?.paymentId || crypto.randomUUID(),
        payAddress: data.payment?.address || data.payment?.paymentUrl || 'Payment address will be generated',
        payAmount: data.payment?.amount || pkg.price,
        payCurrency: 'USDT',
        usdAmount: pkg.price,  // Fix: use usdAmount instead of priceAmount
        priceCurrency: 'USD',
        package: pkg
      };
      
      setPaymentData(paymentInfo);
      setShowPaymentModal(true);
      
      // Invalidate purchase limit to refresh after payment is initiated
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-limit'] });
      
      // Show success notification
      toast({
        title: "Payment Created",
        description: `Please complete your ${pkg.price} USD payment to receive ${pkg.sweepsCash} SC + ${pkg.goldCoins.toLocaleString()} bonus GC.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
    purchaseMutation.mutate(pkg);
  };

  const formatCoins = (amount: number) => {
    return amount.toLocaleString();
  };

  // Fetch daily purchase limit from API
  const { data: purchaseLimitData } = useQuery<{
    dailyLimit: number;
    spent: number;
    remaining: number;
    resetsAt: string;
  }>({
    queryKey: ['/api/purchase-limit'],
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Calculate daily limit remaining
  const dailyPurchaseLimit = purchaseLimitData?.dailyLimit || 10000;
  const dailySpent = purchaseLimitData?.spent || 0;
  const dailyRemaining = purchaseLimitData?.remaining || dailyPurchaseLimit;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header with Title */}
      <div className="flex items-center justify-center p-3 border-b border-[#1a1a1a] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Wallet style={{width: '3px', height: '3px'}} className="text-purple-400" />
          <h2 className="text-[10px] font-bold text-white">Purchase</h2>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col">
        <div className="flex flex-col">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] border-b border-[#2a2a2a] rounded-none h-auto gap-[1px]">
            <TabsTrigger 
              value="buy" 
              data-testid="tab-buy-coins" 
              className="relative text-[10px] py-3 px-2 font-medium text-gray-400 hover:text-white transition-all duration-200 border-r border-[#2a2a2a] data-[state=active]:text-white data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-600/20 data-[state=active]:to-purple-700/30 data-[state=active]:border-b-2 data-[state=active]:border-b-purple-500 data-[state=active]:shadow-sm hover:bg-[#222222]"
            >
              <div className="flex flex-col items-center gap-1">
                <Wallet style={{width: '3.5px', height: '3.5px'}} className="" />
                <span className="text-[8px] whitespace-nowrap">Buy</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="redeem" 
              data-testid="tab-redeem" 
              className="relative text-[10px] py-3 px-2 font-medium text-gray-400 hover:text-white transition-all duration-200 border-r border-[#2a2a2a] data-[state=active]:text-white data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-600/20 data-[state=active]:to-purple-700/30 data-[state=active]:border-b-2 data-[state=active]:border-b-purple-500 data-[state=active]:shadow-sm hover:bg-[#222222]"
            >
              <div className="flex flex-col items-center gap-1">
                <Gift style={{width: '3.5px', height: '3.5px'}} className="" />
                <span className="text-[8px] whitespace-nowrap">Redeem</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="daily" 
              data-testid="tab-daily-bonus" 
              className="relative text-[10px] py-3 px-2 font-medium text-gray-400 hover:text-white transition-all duration-200 border-r border-[#2a2a2a] data-[state=active]:text-white data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-600/20 data-[state=active]:to-purple-700/30 data-[state=active]:border-b-2 data-[state=active]:border-b-purple-500 data-[state=active]:shadow-sm hover:bg-[#222222]"
            >
              <div className="flex flex-col items-center gap-1">
                <Star style={{width: '3.5px', height: '3.5px'}} className="" />
                <span className="text-[8px] whitespace-nowrap">Daily</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="topup" 
              data-testid="tab-top-up" 
              className="relative text-[10px] py-3 px-2 font-medium text-gray-400 hover:text-white transition-all duration-200 data-[state=active]:text-white data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-600/20 data-[state=active]:to-purple-700/30 data-[state=active]:border-b-2 data-[state=active]:border-b-purple-500 data-[state=active]:shadow-sm hover:bg-[#222222]"
            >
              <div className="flex flex-col items-center gap-1">
                <Clock style={{width: '3.5px', height: '3.5px'}} className="" />
                <span className="text-[8px] whitespace-nowrap">Top Up</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto purchase-modal-content min-h-0" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#8b5cf6 rgba(26, 26, 26, 0.5)'
        }}>
          <TabsContent value="buy" className="p-3 md:p-4 space-y-3 md:space-y-4">
            {/* Daily Purchase Limit */}
            <div className="bg-[#1a1a1a] rounded-lg p-3 md:p-4 flex items-center justify-between mobile-spacing">
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="text-[8px] md:text-[8px] text-gray-400">Daily limit is</span>
                <span className="text-green-400 font-semibold text-[8px] md:text-[8px]">${formatCoins(dailyRemaining)}.00</span>
              </div>
              <div className="flex items-center gap-1 text-[8px] text-gray-500">
                <span className="hidden md:inline">Resets In:</span>
                <Clock style={{width: '3px', height: '3px'}} className="" />
                <span>14h 3m</span>
              </div>
            </div>

            {/* Package Grid - Enhanced for scrolling with max height */}
            <div className="grid grid-cols-2 gap-2 md:gap-3 pb-4 max-h-[60vh] overflow-y-auto" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#8b5cf6 rgba(26, 26, 26, 0.3)'
            }}>
              {PACKAGES.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`bg-[#1a1a1a] border-2 cursor-pointer transition-all hover:border-purple-500 relative overflow-hidden ${
                    pkg.popular ? 'border-purple-500/50' : 'border-[#2a2a2a]'
                  }`}
                  onClick={() => handlePackageSelect(pkg)}
                  data-testid={`package-${pkg.price}`}
                >
                  {pkg.popular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-b from-purple-700 to-purple-500 text-white text-[8px] px-2 py-1 rounded-bl-lg shadow-lg">
                      <Star style={{width: '3px', height: '3px'}} className="inline mr-1" />
                      Popular
                    </div>
                  )}
                  
                  <div className="p-3 md:p-4 text-center">
                    <div className="text-[10px] md:text-[10px] font-bold text-white mb-1">
                      ${pkg.price}
                    </div>
                    
                    {/* Primary Purchase Item - SC with value */}
                    <div className="text-[8px] md:text-[10px] text-green-400 font-semibold mb-1">
                      Free {pkg.sweepsCash} SC
                    </div>
                    
                    {/* Free Bonus - GC with no value */}
                    <div className="text-[8px] text-yellow-400 mb-3">
                      + {formatCoins(pkg.goldCoins)} GC
                    </div>
                    
                    <Button
                      disabled={purchaseMutation.isPending}
                      className="w-full bg-gradient-to-b from-purple-700 to-purple-500 hover:from-purple-800 hover:to-purple-600 text-white text-[8px] md:text-[8px] h-8 md:h-9 touch-friendly-button shadow-md hover:shadow-lg transition-all"
                    >
                      {purchaseMutation.isPending ? 'Processing...' : 'Purchase'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="redeem" className="p-3 md:p-4">
            <RedeemSweepsCashComponent />
          </TabsContent>

          <TabsContent value="daily" className="p-3 md:p-4">
            <DailyStreakComponent />
          </TabsContent>

          <TabsContent value="topup" className="p-3 md:p-4 space-y-4">
            <FreeTopUpComponent />
          </TabsContent>
        </div>
      </Tabs>

      {/* Payment Modal */}
      {showPaymentModal && paymentData && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          paymentData={paymentData}
        />
      )}
    </div>
  );
}