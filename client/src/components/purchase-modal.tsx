import { X, Wallet, AlertCircle, Gift, Clock, Star, Timer, Info, Shield, Lock } from 'lucide-react';
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

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Package {
  id: string;
  price: number;
  goldCoins: number;
  bonusCoins: number;
  popular?: boolean;
}

const PACKAGES: Package[] = [
  { id: 'pkg-5', price: 5, goldCoins: 50000, bonusCoins: 5 },
  { id: 'pkg-10', price: 10, goldCoins: 100000, bonusCoins: 10 },
  { id: 'pkg-20', price: 20, goldCoins: 200000, bonusCoins: 20, popular: true },
  { id: 'pkg-50', price: 50, goldCoins: 500000, bonusCoins: 50 },
  { id: 'pkg-100', price: 100, goldCoins: 1000000, bonusCoins: 100 },
  { id: 'pkg-300', price: 300, goldCoins: 3000000, bonusCoins: 300 },
  { id: 'pkg-500', price: 500, goldCoins: 5000000, bonusCoins: 500 },
  { id: 'pkg-1000', price: 1000, goldCoins: 10000000, bonusCoins: 1000 },
];

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
          Come back tomorrow
        </Button>
      )}
      
      {/* Info */}
      <div className="bg-[#1a1a1a] rounded-lg p-3 mt-4">
        <div className="flex items-start gap-2">
          <AlertCircle style={{width: '3.5px', height: '3.5px'}} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-left text-[8px] text-gray-300">
            <p className="mb-1">• Login daily to maintain your streak</p>
            <p className="mb-1">• Rewards increase with streak length</p>
            <p className="text-[8px] text-gray-400">• Streak resets if you miss a day</p>
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
                <p className="text-[8px] text-green-100 mb-4">
                  You received <span className="font-bold">{claimData.goldCoins?.toLocaleString()} GC</span> + <span className="font-bold">{claimData.sweepCoins} SC</span>
                </p>
                <Button
                  onClick={closePopup}
                  variant="secondary"
                  size="sm"
                  className="text-[8px] bg-white/20 hover:bg-white/30 text-white border-white/30"
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
            <Info style={{width: '3px', height: '3px'}} className="text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-[10px] text-white font-medium mb-1">
                Please verify your identity to use this feature.
              </h3>
              <p className="text-gray-400 text-[8px] mb-3">
                You can only use this feature if you have successfully verified your identity.{' '}
                <button
                  onClick={handleVerifyNow}
                  className="text-[8px] text-blue-400 hover:text-blue-300 underline"
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
          <span className="text-[8px] text-gray-400">Total balance</span>
          <div className="flex items-center gap-1">
            <Shield style={{width: '3.5px', height: '3.5px'}} className="text-green-400" />
            <span className="text-[10px] text-green-400 font-medium">{sweepsTotal.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-gray-400">Redeemable balance</span>
          <div className="flex items-center gap-1">
            <Shield style={{width: '3.5px', height: '3.5px'}} className="text-green-400" />
            <span className="text-[10px] text-green-400 font-medium">{sweepsRedeemable.toFixed(2)}</span>
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

export function PurchaseModal({ isOpen, onClose }: PurchaseModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState('buy');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's balance and limits
  const { data: balance } = useQuery<{
    available: number;
    locked: number;
    currency: string;
    total: number;
    sweepsCashTotal: number;
    sweepsCashRedeemable: number;
    balanceMode: 'GC' | 'SC';
  }>({
    queryKey: ["/api/balance"],
  });

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Purchase mutation using NOWPayments
  const purchaseMutation = useMutation({
    mutationFn: async (pkg: Package) => {
      // Create a deposit via NOWPayments
      const response = await apiRequest('POST', '/api/crypto/deposit', {
        currency: 'USDT', // Default to USDT for purchases
        usdAmount: pkg.price,
        goldCoins: pkg.goldCoins,
        sweepsCash: pkg.bonusCoins
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
        orderId: data.payment?.orderId || `order_${Date.now()}`,
        usdAmount: pkg.price,
        goldCoins: pkg.goldCoins,
        bonusCoins: pkg.bonusCoins
      };
      
      setPaymentData(paymentInfo);
      setShowPaymentModal(true);
      
      // Invalidate purchase limit to refresh after payment is initiated
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-limit'] });
      
      toast({
        title: "Payment Created",
        description: `Complete your payment to receive ${pkg.goldCoins.toLocaleString()} Gold Coins`,
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Payment Creation Failed",
        description: error.message || "Failed to create payment. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handlePackageSelect = (pkg: Package) => {
    // Check if user is in SC mode before allowing real money purchase
    if (balance?.balanceMode !== 'SC') {
      toast({
        title: "Switch to Sweeps Cash Mode",
        description: "Real money purchases require SC mode. Use the balance toggle to switch.",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedPackage(pkg);
    purchaseMutation.mutate(pkg);
  };

  const formatCoins = (amount: number) => {
    return amount.toLocaleString();
  };

  // Fetch daily purchase limit data from API
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full Screen Window */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-modal-title"
            className="fixed inset-0 bg-[#0A0A0A] z-[130] overflow-hidden flex flex-col"
          >
            {/* Taskbar - Action Buttons Row at TOP */}
            <div className="flex gap-2 p-3 bg-[#0f0f0f] border-b border-[#1a1a1a] flex-shrink-0">
              <Button 
                size="sm" 
                variant="outline"
                className="text-[8px] h-9 px-4 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 flex-1"
                onClick={() => setSelectedTab('buy')}
                data-testid="button-quick-buy"
              >
                Buy Now
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-[8px] h-9 px-4 border-green-500/30 text-green-400 hover:bg-green-500/10 flex-1"
                onClick={() => setSelectedTab('redeem')}
                data-testid="button-quick-redeem"
              >
                Redeem
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-[8px] h-9 px-4 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 flex-1"
                onClick={() => setSelectedTab('daily')}
                data-testid="button-quick-daily"
              >
                Daily Bonus
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-[8px] h-9 px-4 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 flex-1"
                onClick={() => setSelectedTab('topup')}
                data-testid="button-quick-topup"
              >
                Top Up
              </Button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors"
                aria-label="Close purchase window"
                data-testid="button-close-purchase"
              >
                <X style={{width: '3px', height: '3px'}} className="text-gray-400" />
              </button>
            </div>

            {/* Header with Title */}
            <div className="flex items-center justify-center p-3 border-b border-[#1a1a1a] flex-shrink-0">
              <div className="flex items-center gap-2">
                <Wallet style={{width: '3px', height: '3px'}} className="text-purple-400" />
                <h2 id="purchase-modal-title" className="text-[10px] font-bold text-white">Purchase</h2>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col">
              <div className="flex flex-col">
                <TabsList className="grid w-full grid-cols-4 bg-[#1a1a1a] rounded-none h-12">
                  <TabsTrigger value="buy" data-testid="tab-buy-coins" className="text-[8px] py-2">Buy Coins</TabsTrigger>
                  <TabsTrigger value="redeem" data-testid="tab-redeem" className="text-[8px] py-2">Redeem</TabsTrigger>
                  <TabsTrigger value="daily" data-testid="tab-daily-bonus" className="text-[8px] py-2">Daily Bonus</TabsTrigger>
                  <TabsTrigger value="topup" data-testid="tab-top-up" className="text-[8px] py-2">Top Up</TabsTrigger>
                </TabsList>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto purchase-modal-content min-h-0" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#8b5cf6 rgba(26, 26, 26, 0.5)'
              }}>
                <TabsContent value="buy" className="p-3 md:p-4 space-y-3 md:space-y-4">
                  {/* GC Mode Warning */}
                  {balance?.balanceMode === 'GC' && (
                    <div className="bg-yellow-900/20 border border-yellow-900/30 rounded-lg p-3 md:p-4">
                      <div className="flex items-start gap-3">
                        <Lock style={{width: '3px', height: '3px'}} className="text-yellomt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-yellow-400 font-semibold mb-1 text-[8px] md:text-[10px]">
                            Real Money Purchases Restricted
                          </h3>
                          <p className="text-[8px] md:text-[8px] text-yellow-300 mb-2">
                            You're currently in Gold Credits (GC) mode. To make real money purchases, please switch to Sweeps Cash (SC) mode using the balance toggle.
                          </p>
                          <p className="text-[8px] text-yellow-400">
                            GC = Play money only • SC = Real money that can be redeemed
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

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
                        className={`bg-[#1a1a1a] border-2 transition-all relative overflow-hidden ${
                          balance?.balanceMode !== 'SC' 
                            ? 'opacity-50 cursor-not-allowed border-gray-600' 
                            : `cursor-pointer hover:border-purple-500 ${
                                pkg.popular ? 'border-purple-500/50' : 'border-[#2a2a2a]'
                              }`
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
                        
                        <div className="p-2.5 md:p-4 text-center mobile-card">
                          {/* Coin Stack Icon */}
                          <div className="text-[10px] md:text-[10px] mb-1.5 md:mb-2">
                            {pkg.price >= 100 ? '💰' : '🪙'}
                          </div>
                          
                          {/* Gold Coins Amount */}
                          <div className="mb-1.5 md:mb-2">
                            <p className="text-[10px] md:text-[10px] font-bold text-yellow-400 leading-tight">
                              {formatCoins(pkg.goldCoins)}
                            </p>
                            <p className="text-[8px] text-gray-400">Gold Coins</p>
                          </div>
                          
                          {/* Bonus SC */}
                          <div className="bg-green-900/20 border border-green-500/30 rounded-lg px-2 md:px-3 py-1.5 md:py-2 mb-2 md:mb-3">
                            <div className="flex items-center justify-center gap-1">
                              <Gift style={{width: '3px', height: '3px'}} className="text-green-400" />
                              <span className="text-green-400 font-semibold text-[8px] md:text-[8px]">
                                + {pkg.bonusCoins} Free SC
                              </span>
                            </div>
                          </div>
                          
                          {/* Price Button */}
                          <Button
                            className={
                              balance?.balanceMode === 'SC'
                                ? "w-full bg-gradient-to-b from-purple-700 to-purple-500 hover:from-purple-800 hover:to-purple-600 text-white font-bold text-[8px] md:text-[8px] py-2 h-8 md:h-10 touch-friendly-button shadow-md hover:shadow-lg transition-all"
                                : "w-full bg-gray-600 text-gray-300 cursor-not-allowed font-bold text-[8px] md:text-[8px] py-2 h-8 md:h-10"
                            }
                            disabled={balance?.balanceMode !== 'SC' || purchaseMutation.isPending}
                          >
                            {balance?.balanceMode === 'SC' 
                              ? `$${pkg.price}`
                              : 'Switch to SC Mode'
                            }
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="redeem" className="p-3 md:p-4">
                  <RedeemSweepsCashComponent />
                </TabsContent>

                <TabsContent value="daily" className="p-0 m-0 data-[state=active]:mt-0">
                  <DailyStreakComponent />
                </TabsContent>

                <TabsContent value="topup" className="p-4">
                  <TopUpBonusComponent />
                </TabsContent>
              </div>
            </Tabs>

            {/* Info Footer */}
            <div className="p-4 border-t border-[#1a1a1a]">
              <div className="flex items-start gap-2">
                <AlertCircle style={{width: '3.5px', height: '3.5px'}} className="text-yellow-500 mt-0.5" />
                <div className="text-[8px] text-gray-400">
                  <p className="mb-1">All purchases are processed via NOWPayments</p>
                  <p>Crypto payments accepted: BTC, ETH, USDT & 100+ more</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Payment Modal */}
          {showPaymentModal && paymentData && (
            <PaymentModal
              isOpen={showPaymentModal}
              onClose={() => {
                setShowPaymentModal(false);
                setPaymentData(null);
                setSelectedPackage(null);
              }}
              paymentData={{
                ...paymentData,
                title: `Purchase ${paymentData.goldCoins?.toLocaleString() || ''} Gold Coins`,
                description: `You will receive ${paymentData.goldCoins?.toLocaleString() || ''} Gold Coins + ${paymentData.bonusCoins || 0} Bonus SC`
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

// Top Up Bonus Component
function TopUpBonusComponent() {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get Top Up Bonus status
  const { data: topUpStatus, isLoading } = useQuery<{
    nextAvailableAt?: string;
    totalClaims?: number;
  }>({
    queryKey: ['/api/top-up-bonus/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutation to claim Top Up Bonus
  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/top-up-bonus/claim', {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Top Up Bonus Claimed!",
        description: `You received ${data.goldCoins.toLocaleString()} Gold Coins!`,
        variant: "default"
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/top-up-bonus/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Please try again later",
        variant: "destructive"
      });
    }
  });

  // Calculate time remaining until next claim
  useEffect(() => {
    if (!topUpStatus || !topUpStatus.nextAvailableAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const nextAvailable = new Date(topUpStatus.nextAvailableAt!).getTime();
      const difference = nextAvailable - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('');
        // Refetch status when time is up
        queryClient.invalidateQueries({ queryKey: ['/api/top-up-bonus/status'] });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [topUpStatus?.nextAvailableAt, queryClient]);

  const canClaim = !topUpStatus?.nextAvailableAt || new Date() >= new Date(topUpStatus.nextAvailableAt);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="text-center py-4 md:py-8 px-3 md:px-4">
      {/* Gift Box Icon */}
      <div className="text-[10px] md:text-[10px] mb-3 md:mb-6">🎁</div>
      
      {/* Title */}
      <h3 className="text-[10px] md:text-[10px] font-bold text-white mb-2">Top Up Bonus</h3>
      <p className="text-[8px] md:text-[8px] text-gray-400 mb-4 md:mb-6">Get 2,500 free Gold Coins every 6 hours!</p>
      
      {/* Bonus Card */}
      <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-500/30 p-4 md:p-6 max-w-md mx-auto mb-4 md:mb-6 mobile-card">
        <div className="text-center">
          {/* Coins Amount */}
          <div className="text-[10px] md:text-[10px] font-bold text-yellow-400 mb-2">
            2,500
          </div>
          <div className="text-[8px] md:text-[8px] text-gray-300 mb-3 md:mb-4">Gold Coins</div>
          
          {canClaim ? (
            <>
              <div className="text-green-400 text-[8px] mb-4 flex items-center justify-center gap-2">
                <div style={{width: '2.5px', height: '2.5px'}} className="bg-green-400 rounded-full animate-pulse"></div>
                Available Now!
              </div>
              <Button
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending}
                className="w-full bg-gradient-to-b from-green-700 to-green-500 hover:from-green-800 hover:to-green-600 text-white font-bold py-2.5 md:py-3 text-[8px] md:text-[10px] h-10 md:h-12 touch-friendly-button shadow-md hover:shadow-lg transition-all"
                data-testid="button-claim-top-up"
              >
                {claimMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Claiming...
                  </div>
                ) : (
                  'Claim Now'
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="text-orange-400 text-[8px] mb-4 flex items-center justify-center gap-2">
                <Timer style={{width: '3.5px', height: '3.5px'}} className="" />
                Next available in:
              </div>
              <div className="text-[10px] md:text-[10px] font-mono text-white mb-3 md:mb-4 bg-black/20 rounded-lg py-1.5 md:py-2">
                {timeLeft || '00:00:00'}
              </div>
              <Button
                disabled
                className="w-full bg-gray-700 text-gray-400 font-bold py-2.5 md:py-3 cursor-not-allowed text-[8px] md:text-[10px] h-10 md:h-12"
                data-testid="button-claim-top-up-disabled"
              >
                Claim in {timeLeft || '00:00:00'}
              </Button>
            </>
          )}
        </div>
      </Card>
      
      {/* Info */}
      <div className="bg-[#1a1a1a] rounded-lg p-3 md:p-4 max-w-md mx-auto mobile-spacing">
        <div className="flex items-start gap-2 md:gap-3">
          <AlertCircle style={{width: '3.5px', height: '3.5px'}} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-left text-[8px] md:text-[8px] text-gray-300">
            <p className="mb-1.5 md:mb-2">• Free 2,500 Gold Coins every 6 hours</p>
            <p className="mb-1.5 md:mb-2">• Perfect for testing games</p>
            <p className="text-[8px] text-gray-400">• Cannot be withdrawn</p>
          </div>
        </div>
      </div>
      
      {/* Statistics */}
      {topUpStatus && topUpStatus.totalClaims && (
        <div className="mt-4 md:mt-6 text-center">
          <p className="text-[8px] text-gray-500">
            Total claims: {topUpStatus.totalClaims}
          </p>
        </div>
      )}
    </div>
  );
}