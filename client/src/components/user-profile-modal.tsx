import { X, Trophy, TrendingUp, Calendar, Gamepad2, Bitcoin, User, Loader2, Gift, Clock, Send, History, RefreshCw, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string; // Optional user ID to show different profiles
  onOpenTip?: (userId: string, username: string) => void; // Callback to open tip modal
}

interface ProfileData {
  username: string;
  joinedOn: string;
  totalBets: number;
  totalWagered: number;
  totalRewarded: number;
  totalTipsReceived?: number;
  rank: string;
  rankLevel: number;
  nextRank: string;
  nextRankLevel: number;
  nextRankRequirement: number;
  currentProgress: number;
  favoriteGame: string | null;
  favoriteCrypto: string;
}

interface ActiveBonus {
  id: string;
  bonusId: string;
  userId: string;
  bonusAmount: string;
  bonusType: string;
  percentage: number;
  wageredAmount: string;
  wageringRequirement: string;
  status: 'active' | 'completed' | 'expired';
  claimedAt: string;
  completedAt?: string;
  expiresAt?: string;
}

interface BonusHistoryItem {
  id: string | number;
  type: 'bonus_claimed' | 'bonus_reset';
  bonusType?: string;
  percentage?: number;
  depositAmount?: number;
  bonusAmount?: number;
  wageringRequirement?: number;
  wageredAmount?: number;
  status?: string;
  claimedAt?: string;
  completedAt?: string;
  resetType?: string;
  balanceAtReset?: number;
  previousBonusStatus?: string;
  resetAt?: string;
  metadata?: any;
}

interface CurrentUser {
  id: string;
  username?: string;
  email?: string;
}

export function UserProfileModal({ isOpen, onClose, userId, onOpenTip }: UserProfileModalProps) {
  const [, navigate] = useLocation();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(userId);
  const [showBonusHistory, setShowBonusHistory] = useState(false);
  
  // Fetch current user data if no userId is provided
  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ['/api/me'],
    enabled: isOpen && !userId
  });
  
  // Use either provided userId or current user's ID
  useEffect(() => {
    if (!userId && currentUser?.id) {
      setCurrentUserId(currentUser.id);
    } else if (userId) {
      setCurrentUserId(userId);
    }
  }, [userId, currentUser]);
  
  // Fetch user profile data
  const { data: profile, isLoading, isError } = useQuery<ProfileData>({
    queryKey: [`/api/user/${currentUserId}/profile`],
    enabled: isOpen && !!currentUserId
  });
  
  // Fetch active bonuses
  const { data: activeBonuses } = useQuery<ActiveBonus[]>({
    queryKey: ['/api/bonuses/active'],
    enabled: isOpen && !userId, // Only fetch for current user
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  // Fetch bonus history
  const { data: bonusHistoryData } = useQuery<{
    success: boolean;
    history: BonusHistoryItem[];
    totalBonuses: number;
    totalResets: number;
  }>({
    queryKey: ['/api/bonuses/bonus-history'],
    enabled: isOpen && !userId && showBonusHistory // Only fetch when viewing history
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
  
  // Calculate rank progress percentage
  const rankProgress = profile ? ((profile.currentProgress / profile.nextRankRequirement) * 100).toFixed(1) : '0';
  
  // Get rank color based on rank name
  const getRankColor = (rank: string) => {
    switch(rank) {
      case 'BRONZE': return 'from-amber-700 to-amber-600';
      case 'SILVER': return 'from-gray-500 to-gray-400';
      case 'GOLD': return 'from-yellow-500 to-yellow-400';
      case 'PLATINUM': return 'from-purple-500 to-purple-400';
      case 'DIAMOND': return 'from-cyan-400 to-cyan-300';
      default: return 'from-purple-600 to-purple-500';
    }
  };
  
  // Format large numbers
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Get game icon
  const getGameIcon = (game: string) => {
    // For simplicity, using Gamepad2 for all games
    // In real app, you'd have specific icons per game
    return <Gamepad2 style={{width: '3.5px', height: '3.5px'}} className="" />;
  };
  
  // Get crypto icon
  const getCryptoIcon = (crypto: string) => {
    // For simplicity, using Bitcoin for all cryptos
    // In real app, you'd have specific icons per crypto
    return <Bitcoin style={{width: '3.5px', height: '3.5px'}} className="" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[180]"
          />

          {/* Modal - Optimized for mobile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
            className="fixed inset-x-4 top-8 max-w-md mx-auto bg-[#1a1a2e] rounded-2xl z-[181] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Scrollable Content Wrapper */}
            <div className="flex flex-col max-h-[90vh]">
              {/* Header - Fixed */}
              <div className="relative px-4 py-3 flex-shrink-0 border-b border-gray-800">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Close profile modal"
                >
                  <X style={{width: '3px', height: '3px'}} className="text-gray-400 hover:text-white" />
                </button>
                
                {/* Avatar and Username */}
                <div className="flex flex-col items-center pt-2">
                  {isLoading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 style={{width: '3.5px', height: '3.5px'}} className="text-purple-500 animate-spin mb-2" />
                      <p className="text-gray-400 text-[8px]">Loading profile...</p>
                    </div>
                  ) : isError ? (
                    <div className="flex flex-col items-center">
                      <X style={{width: '3.5px', height: '3.5px'}} className="text-red-500 mb-2" />
                      <p className="text-red-400 text-[8px]">Failed to load profile</p>
                    </div>
                  ) : profile ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center mb-2">
                        <span className="text-white text-[10px] font-bold">
                          {profile.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <h2 id="profile-modal-title" className="text-[10px] font-bold text-white truncate max-w-[200px]">{profile.username}</h2>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {/* Show loading or error state */}
                {isLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 style={{width: '3.5px', height: '3.5px'}} className="text-purple-500 animate-spin" />
                  </div>
                )}
                {isError && (
                  <div className="text-[8px] text-center text-red-400 py-8">
                    Failed to load profile data
                  </div>
                )}
                {profile && (
                  <>
                    {/* Rank Section */}
                    <div className="mb-4">
                  <div className="bg-[#2a2a3e] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`px-2.5 py-0.5 rounded-md bg-gradient-to-r ${getRankColor(profile?.rank || 'BRONZE')} text-white text-[8px] font-bold`}>
                          {profile?.rank || 'BRONZE'} {profile?.rankLevel || 1}
                        </div>
                        <Trophy style={{width: '3.5px', height: '3.5px'}} className="text-yellow-500" />
                      </div>
                      <span className="text-[8px] text-gray-400 truncate max-w-[120px]">
                        Next: {profile?.nextRank || 'SILVER'}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-600 to-purple-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, parseFloat(rankProgress))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[8px] text-gray-400">{formatCurrency(profile.currentProgress)}</p>
                      <p className="text-[8px] text-gray-400">{rankProgress}%</p>
                    </div>
                  </div>
                </div>

                {/* Stats Section */}
                <div className="mb-4">
                  <div className="bg-[#2a2a3e] rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[8px] text-gray-400 mb-1">Total Bets</p>
                        <p className="text-white font-semibold text-[8px]">{formatNumber(profile.totalBets)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-gray-400 mb-1">Wagered</p>
                        <p className="text-white font-semibold text-[8px] truncate">{formatCurrency(profile.totalWagered)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-gray-400 mb-1">Rewarded</p>
                        <p className="text-green-400 font-semibold text-[8px] truncate">{formatCurrency(profile.totalRewarded)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-gray-400 mb-1">Joined</p>
                        <p className="text-white font-semibold text-[8px]">
                          {format(new Date(profile.joinedOn), 'MMM yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Bonuses Section */}
                {activeBonuses && activeBonuses.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-[8px] font-semibold text-[#D4AF37] mb-2 flex items-center gap-2">
                      <Gift style={{width: '3.5px', height: '3.5px'}} className="" />
                      Active Bonuses
                    </h3>
                    <div className="space-y-3">
                      {activeBonuses.map((bonus) => {
                        const wagered = parseFloat(bonus.wageredAmount);
                        const requirement = parseFloat(bonus.wageringRequirement);
                        const percentage = (wagered / requirement) * 100;
                        const bonusAmount = parseFloat(bonus.bonusAmount) / 100;
                        
                        // Calculate time remaining (24 hours from claim)
                        const claimedDate = new Date(bonus.claimedAt);
                        const expiresDate = new Date(claimedDate.getTime() + 24 * 60 * 60 * 1000);
                        const now = new Date();
                        const hoursRemaining = Math.max(0, differenceInHours(expiresDate, now));
                        const minutesRemaining = Math.max(0, differenceInMinutes(expiresDate, now) % 60);
                        const isExpiringSoon = hoursRemaining < 6;
                        
                        // Determine bonus title and icon color
                        let bonusTitle = "First Deposit Bonus";
                        let iconColor = "text-green-400";
                        if (bonus.bonusType === 'second_deposit') {
                          bonusTitle = "Second Deposit Bonus";
                          iconColor = "text-blue-400";
                        } else if (bonus.bonusType === 'third_deposit') {
                          bonusTitle = "Third Deposit Bonus";
                          iconColor = "text-purple-400";
                        }
                        
                        return (
                          <div key={bonus.id} className="bg-[#2a2a3e] rounded-lg p-3 border border-[#D4AF37]/20">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Gift style={{width: '3.5px', height: '3.5px'}} className={` ${iconColor}`} />
                                  <p className="text-[8px] font-semibold text-white">{bonusTitle}</p>
                                </div>
                                <p className="text-[8px] text-gray-400 mt-0.5">
                                  ${bonusAmount.toFixed(2)} bonus ({bonus.percentage}%)
                                </p>
                              </div>
                              <div className="flex items-center gap-1 text-[8px]">
                                <Clock style={{width: '3px', height: '3px'}} className={` ${isExpiringSoon ? 'text-red-400' : 'text-gray-400'}`} />
                                <span className={isExpiringSoon ? 'text-red-400' : 'text-gray-400'}>
                                  {hoursRemaining}h {minutesRemaining}m
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex justify-between text-[8px]">
                                <span className="text-[8px] text-gray-400">Wagering Progress</span>
                                <span className="text-[#D4AF37] font-semibold">
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#D4AF37] to-yellow-500 transition-all duration-300"
                                  style={{ width: `${Math.min(100, percentage)}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[8px] text-gray-400">
                                <span>${(wagered / 100).toFixed(2)}</span>
                                <span>${(requirement / 100).toFixed(2)}</span>
                              </div>
                            </div>
                            
                            {percentage >= 100 && (
                              <div className="mt-2 text-[8px] text-green-400 font-semibold text-center">
                                ✓ Wagering requirement completed!
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bonus History Section */}
                {!userId && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[8px] font-semibold text-[#D4AF37] flex items-center gap-2">
                        <History style={{width: '3.5px', height: '3.5px'}} className="" />
                        Bonus History
                      </h3>
                      <button
                        onClick={() => setShowBonusHistory(!showBonusHistory)}
                        className="text-[8px] text-[#D4AF37] hover:text-yellow-400 transition-colors flex items-center gap-1"
                        data-testid="button-toggle-bonus-history"
                      >
                        {showBonusHistory ? 'Hide' : 'Show'}
                        <RefreshCw style={{width: '3px', height: '3px'}} className="" />
                      </button>
                    </div>
                    
                    {showBonusHistory && bonusHistoryData?.history && (
                      <div className="bg-[#2a2a3e] rounded-lg p-3 border border-[#D4AF37]/20 max-h-60 overflow-y-auto">
                        {bonusHistoryData.history.length === 0 ? (
                          <p className="text-[8px] text-gray-400 text-center py-4">No bonus history yet</p>
                        ) : (
                          <div className="space-y-2">
                            {bonusHistoryData.history.slice(0, 10).map((item) => (
                              <div key={item.id} className="border-b border-gray-700 last:border-0 pb-2 last:pb-0">
                                {item.type === 'bonus_claimed' ? (
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <Gift style={{width: '3px', height: '3px'}} className="text-green-400" />
                                        <span className="text-[8px] font-medium text-white">
                                          {item.bonusType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Bonus
                                        </span>
                                      </div>
                                      <div className="text-[8px] text-gray-400 mt-1">
                                        ${item.depositAmount?.toFixed(2)} deposit • ${item.bonusAmount?.toFixed(2)} bonus
                                      </div>
                                      <div className="text-[8px] text-gray-500 mt-0.5">
                                        {item.claimedAt ? format(new Date(item.claimedAt), 'MMM d, yyyy') : ''}
                                      </div>
                                    </div>
                                    <span className={`text-[8px] px-2 py-0.5 rounded ${
                                      item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                      item.status === 'expired' ? 'bg-red-500/20 text-red-400' :
                                      'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <RefreshCw style={{width: '3px', height: '3px'}} className="text-purple-400" />
                                        <span className="text-[8px] font-medium text-white">
                                          Bonus Reset
                                        </span>
                                      </div>
                                      <div className="text-[8px] text-gray-400 mt-1">
                                        Balance: ${item.balanceAtReset?.toFixed(2)} • {item.resetType?.replace(/_/g, ' ')}
                                      </div>
                                      <div className="text-[8px] text-gray-500 mt-0.5">
                                        {item.resetAt ? format(new Date(item.resetAt), 'MMM d, yyyy HH:mm') : ''}
                                      </div>
                                    </div>
                                    <span className="text-[8px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                                      reset
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                            {bonusHistoryData.history.length > 10 && (
                              <p className="text-[8px] text-gray-400 text-center pt-2">
                                Showing 10 of {bonusHistoryData.history.length} entries
                              </p>
                            )}
                          </div>
                        )}
                        {bonusHistoryData && (
                          <div className="mt-3 pt-3 border-t border-gray-700 flex justify-around text-[8px]">
                            <div className="text-center">
                              <p className="text-gray-400">Total Bonuses</p>
                              <p className="text-[#D4AF37] font-semibold">{bonusHistoryData.totalBonuses}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-400">Total Resets</p>
                              <p className="text-purple-400 font-semibold">{bonusHistoryData.totalResets}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Favorites Section */}
                <div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#2a2a3e] rounded-lg p-2.5">
                      <p className="text-[8px] text-gray-400 mb-1.5">Favorite Game</p>
                      <div className="flex items-center gap-1.5">
                        <div className="text-purple-400">
                          {getGameIcon(profile.favoriteGame || 'Unknown')}
                        </div>
                        <span className="text-white text-[8px] font-medium truncate">{profile.favoriteGame || 'None'}</span>
                      </div>
                    </div>
                    
                    <div className="bg-[#2a2a3e] rounded-lg p-2.5">
                      <p className="text-[8px] text-gray-400 mb-1.5">Favorite Asset</p>
                      <div className="flex items-center gap-1.5">
                        <div className="text-yellow-500">
                          {getCryptoIcon(profile.favoriteCrypto)}
                        </div>
                        <span className="text-white text-[8px] font-medium truncate">{profile.favoriteCrypto}</span>
                      </div>
                    </div>
                  </div>
                </div>
                  </>
                )}

                {/* Back to Home Button */}
                <div className="mt-6 pt-4 border-t border-gray-800">
                  <Button
                    onClick={() => {
                      onClose();
                      navigate('/');
                    }}
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-400 hover:text-white"
                    data-testid="button-back-home-profile"
                  >
                    <ArrowLeft className=" mr-2"style={{width: '3px', height: '3px'}} />
                    Back to Home
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}