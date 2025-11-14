import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DailyReward {
  day: number;
  goldCoins: number;
  sweepCoins: number;
}

interface DailyLoginStatus {
  currentStreak: number;
  canClaim: boolean;
  nextResetAt: string;
  rewards: DailyReward[];
  hasClaimedToday: boolean;
}

interface DailyLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DailyLoginModal({ isOpen, onClose }: DailyLoginModalProps) {
  const [countdown, setCountdown] = useState('');
  const { toast } = useToast();

  // Fetch daily login status
  const { data: loginStatus, refetch } = useQuery<DailyLoginStatus>({
    queryKey: ['/api/daily-login/status'],
    enabled: isOpen,
  });

  // Claim daily reward mutation
  const claimRewardMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/daily-login/claim', {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Daily Reward Claimed!',
        description: `You received ${data.goldCoins.toLocaleString()} Gold Coins and ${data.sweepCoins} SC!`,
      });
      
      // Refresh status and balance
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      
      // Close modal after successful claim
      setTimeout(() => {
        onClose();
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to claim daily reward',
        variant: 'destructive',
      });
    },
  });

  // Update countdown timer
  useEffect(() => {
    if (!loginStatus?.nextResetAt) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const resetTime = new Date(loginStatus.nextResetAt).getTime();
      const diff = resetTime - now;

      if (diff <= 0) {
        setCountdown('00h 00m until claim');
        clearInterval(timer);
        refetch(); // Refresh status when timer expires
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m until claim`);
    }, 1000);

    return () => clearInterval(timer);
  }, [loginStatus?.nextResetAt, refetch]);

  const handleClaim = () => {
    if (loginStatus?.canClaim && !claimRewardMutation.isPending) {
      claimRewardMutation.mutate();
    }
  };

  if (!loginStatus) return null;

  const nextClaimDay = Math.min(loginStatus.currentStreak + 1, 7);
  const currentDayReward = loginStatus.rewards.find(r => r.day === nextClaimDay);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
            className="fixed inset-0 flex items-center justify-center z-[101] p-4"
          >
            <div className="bg-[#0a0a0a] rounded-xl shadow-2xl max-w-md w-full border border-gray-800 overflow-hidden">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-purple-900/20 to-purple-700/20 px-6 py-6 text-center border-b border-gray-800">
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                  data-testid="daily-login-close-button"
                >
                  <X style={{width: '3px', height: '3px'}} />
                </Button>
                
                {/* Treasure Chest Icon */}
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center relative">
                  <div className="w-12 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-t-lg relative">
                    <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-2 h-1 bg-yellow-300 rounded"></div>
                  </div>
                  <div className="absolute bottom-0 w-14 h-6 bg-gradient-to-br from-yellow-600 to-orange-700 rounded-b-lg"></div>
                  {/* Lock */}
                  <div style={{width: '3px', height: '3px'}} className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full"></div>
                  {/* $ Symbol */}
                  <div className="absolute inset-0 flex items-center justify-center text-yellow-100 font-bold text-[10px]">$</div>
                </div>

                <h2 className="text-[10px] font-bold text-white mb-2">
                  You're on a {loginStatus.currentStreak + 1} day streak!
                </h2>
                <p className="text-gray-300 text-[8px] leading-relaxed">
                  Claim your Daily Bonus to keep your streak alive<br />
                  and unlock even better rewards to enjoy on<br />
                  Miraclez.
                </p>
              </div>

              {/* Rewards Grid */}
              <div className="p-6">
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {/* Top row - Days 1-4 */}
                  {loginStatus.rewards.slice(0, 4).map((reward) => {
                    const isCompleted = reward.day <= loginStatus.currentStreak;
                    const isCurrent = reward.day === loginStatus.currentStreak + 1;
                    const isLocked = reward.day > loginStatus.currentStreak + 1;

                    return (
                      <div key={reward.day} className="text-center">
                        <div className="text-[8px] text-gray-400 mb-1">Day</div>
                        <div className="text-[8px] font-semibold text-white mb-2">{reward.day}</div>
                        
                        {/* Reward Circle */}
                        <div className={`w-12 h-12 mx-auto rounded-full border-2 flex items-center justify-center mb-2 relative ${
                          isCompleted 
                            ? 'bg-green-500/20 border-green-500' 
                            : isCurrent 
                            ? 'bg-purple-500/20 border-purple-500' 
                            : 'bg-gray-800/50 border-gray-600'
                        }`}>
                          {isCompleted ? (
                            <div className="text-green-400 text-[10px]">✓</div>
                          ) : (
                            <div className="text-gray-400 text-[10px]">✓</div>
                          )}
                        </div>

                        {/* Reward Text */}
                        <div className="text-[8px]">
                          <div className="text-[10px] text-yellow-400 font-semibold">GC {reward.goldCoins.toLocaleString()}</div>
                          <div className="text-[10px] text-purple-400">SC {reward.sweepCoins}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom row - Days 5-7 */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {loginStatus.rewards.slice(4, 7).map((reward) => {
                    const isCompleted = reward.day <= loginStatus.currentStreak;
                    const isCurrent = reward.day === loginStatus.currentStreak + 1;
                    const isLocked = reward.day > loginStatus.currentStreak + 1;

                    return (
                      <div key={reward.day} className="text-center">
                        <div className="text-[8px] text-gray-400 mb-1">Day</div>
                        <div className="text-[8px] font-semibold text-white mb-2">{reward.day}</div>
                        
                        {/* Special treasure chest for day 7 */}
                        <div className={`w-12 h-12 mx-auto rounded-full border-2 flex items-center justify-center mb-2 relative ${
                          isCompleted 
                            ? 'bg-green-500/20 border-green-500' 
                            : isCurrent 
                            ? 'bg-purple-500/20 border-purple-500' 
                            : 'bg-gray-800/50 border-gray-600'
                        }`}>
                          {reward.day === 7 && !isCompleted ? (
                            // Special treasure chest icon for day 7
                            <div className="text-yellow-400 text-[8px]">📦</div>
                          ) : isCompleted ? (
                            <div className="text-green-400 text-[10px]">✓</div>
                          ) : (
                            <div className="text-gray-400 text-[10px]">✓</div>
                          )}
                        </div>

                        {/* Reward Text */}
                        <div className="text-[8px]">
                          <div className="text-[10px] text-yellow-400 font-semibold">GC {reward.goldCoins.toLocaleString()}</div>
                          <div className="text-[10px] text-purple-400">SC {reward.sweepCoins}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Countdown Timer */}
                <div className="bg-gray-900/50 rounded-lg p-3 text-center border border-gray-700 mb-4">
                  <div className="text-green-400 font-mono text-[8px]">
                    {countdown || 'Loading...'}
                  </div>
                </div>

                {/* Claim Button or Status */}
                {loginStatus.hasClaimedToday ? (
                  <div className="text-center">
                    <div className="text-green-400 font-semibold mb-2">✓ Claimed for today!</div>
                    <div className="text-gray-400 text-[8px]">Come back tomorrow for your next reward</div>
                  </div>
                ) : loginStatus.canClaim ? (
                  <Button
                    onClick={handleClaim}
                    disabled={claimRewardMutation.isPending}
                    className="w-full bg-gradient-to-b from-purple-700 to-purple-600 hover:from-purple-800 hover:to-purple-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    data-testid="claim-daily-reward-button"
                  >
                    {claimRewardMutation.isPending ? 'Claiming...' : `Claim ${currentDayReward?.goldCoins.toLocaleString()} GC + ${currentDayReward?.sweepCoins} SC`}
                  </Button>
                ) : (
                  <div className="text-center">
                    <div className="text-gray-400 text-[8px]">Your next reward will be available soon!</div>
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