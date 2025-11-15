import { ArrowLeft, Trophy, TrendingUp, Calendar, Gamepad2, Bitcoin, User, Loader2, Gift, Clock, Send, History, RefreshCw, X, Edit3, Palette } from 'lucide-react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
  avatarType?: string;
  avatarBackgroundColor?: string;
}

// Avatar icons mapping (same as UserAvatar component)
const avatarIcons = {
  // Classic Avatars
  default: '👤',
  boy: '👦',
  girl: '👧',
  man: '👨',
  woman: '👩',
  
  // Gaming & Tech (2025 Trends)
  gamer: '🎮',
  robot: '🤖',
  cyborg: '👾',
  hacker: '🔥',
  esports: '🎯',
  champion: '🏆',
  
  // Cyberpunk & Futuristic
  alien: '👽',
  android: '⚡',
  neon: '💎',
  cyber: '🌟',
  matrix: '🔮',
  spacer: '🛸',
  
  // Fantasy & Mythical (Modern Twist)
  knight: '⚔️',
  wizard: '🧙‍♂️',
  ninja: '🥷',
  dragon: '🐲',
  phoenix: '🔥',
  unicorn: '🦄',
  mystic: '🎭',
  
  // Cool Animals & Creatures
  wolf: '🐺',
  fox: '🦊',
  eagle: '🦅',
  tiger: '🐅',
  shark: '🦈',
  cat: '🐱',
  dog: '🐶',
  panda: '🐼',
  lion: '🦁',
  
  // Pirates & Warriors
  pirate: '🏴‍☠️',
  warrior: '⚡',
  samurai: '🗾',
  
  // Modern Icons
  diamond: '💎',
  fire: '🔥',
  lightning: '⚡',
  star: '⭐',
  crown: '👑'
};

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

interface UserProfileProps {
  params?: { userId?: string };
}

export default function UserProfile({ params }: UserProfileProps) {
  const [, navigate] = useLocation();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(params?.userId);
  const [showBonusHistory, setShowBonusHistory] = useState(false);
  
  // Fetch current user data if no userId is provided
  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ['/api/me'],
    enabled: !params?.userId
  });
  
  // Use either provided userId or current user's ID
  useEffect(() => {
    if (!params?.userId && currentUser?.id) {
      setCurrentUserId(currentUser.id);
    } else if (params?.userId) {
      setCurrentUserId(params.userId);
    }
  }, [params?.userId, currentUser]);
  
  // Fetch user profile data
  const { data: profile, isLoading, isError } = useQuery<ProfileData>({
    queryKey: [`/api/user/${currentUserId}/profile`],
    enabled: !!currentUserId
  });
  
  // Fetch active bonuses
  const { data: activeBonuses } = useQuery<ActiveBonus[]>({
    queryKey: ['/api/bonuses/active'],
    enabled: !params?.userId, // Only fetch for current user
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
    enabled: !params?.userId && showBonusHistory, // Only fetch when viewing history
    refetchInterval: 30000 // Refresh every 30 seconds for real-time updates
  });
  
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
    return <Gamepad2 className="w-5 h-5" />;
  };
  
  // Get crypto icon
  const getCryptoIcon = (crypto: string) => {
    return <Bitcoin className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0d14] via-[#1a1d2e] to-[#0a0d14]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#1a1a2e]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="xs"
                onClick={() => navigate('/')}
                className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black text-sm px-2 py-1 h-auto"
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span className="text-sm">Back</span>
              </Button>
            </div>
            <h1 className="font-bold text-white text-2xl">User Information</h1>
            <div className="w-20" /> {/* Spacer for center alignment */}
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Loading or Error State */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
              <p className="text-sm text-gray-400">Loading profile...</p>
            </div>
          </div>
        )}
        
        {isError && (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <X className="w-6 h-6 text-red-500" />
              <p className="text-sm text-red-400">Failed to load profile data</p>
              <Button onClick={() => navigate('/')} variant="outline">
                Return Home
              </Button>
            </div>
          </div>
        )}

        {profile && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Profile Header */}
            <Card className="casino-card p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-4">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: profile.avatarBackgroundColor || '#9333ea' 
                    }}
                  >
                    <span className="text-white text-4xl" role="img" aria-label={`${profile.avatarType || 'default'} avatar`}>
                      {avatarIcons[profile.avatarType as keyof typeof avatarIcons] || avatarIcons.default}
                    </span>
                  </div>
                  {/* Only show edit button for current user */}
                  {!params?.userId && (
                    <Button
                      onClick={() => navigate('/edit-avatar')}
                      size="sm"
                      variant="golden"
                      className="absolute -bottom-2 -right-2 px-3 py-1 h-auto rounded-full shadow-2xl shadow-[#D4AF37]/50 border-2 border-white hover:scale-110 transition-all duration-300"
                      data-testid="button-edit-avatar"
                    >
                      <span className="text-sm font-bold text-[#FFFFFF]">Edit</span>
                    </Button>
                  )}
                </div>
                <h2 className="casino-heading mb-2 text-lg">{profile.username}</h2>
                <p className="casino-body text-base">Joined {format(new Date(profile.joinedOn), 'MMMM yyyy')}</p>
              </div>

              {/* Rank Section */}
              <div className="casino-glass p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-md bg-gradient-to-r from-cyan-400 to-cyan-300 text-white font-bold text-base">
                      {profile?.rank || 'BRONZE'} {profile?.rankLevel || 1}
                    </div>
                    <Trophy className="w-5 h-5 text-yello" />
                  </div>
                  <span className="casino-body text-base">
                    Next: {profile?.nextRank || 'SILVER'}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, parseFloat(rankProgress))}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="casino-body text-base">{formatCurrency(profile.currentProgress)}</p>
                  <p className="casino-body text-base">{rankProgress}%</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="casino-glass p-4 text-center">
                  <p className="casino-body mb-1 text-sm">Total Bets</p>
                  <p className="casino-heading text-lg stat-number">{formatNumber(profile.totalBets)}</p>
                </div>
                <div className="casino-glass p-4 text-center">
                  <p className="casino-body mb-1 text-sm">Wagered</p>
                  <p className="casino-heading text-lg stat-number">{formatCurrency(profile.totalWagered)}</p>
                </div>
                <div className="casino-glass p-4 text-center">
                  <p className="casino-body mb-1 text-sm">Rewarded</p>
                  <p className="casino-heading text-lg text-green-400 stat-number">{formatCurrency(profile.totalRewarded)}</p>
                </div>
                <div className="casino-glass p-4 text-center">
                  <p className="casino-body mb-1 text-sm">Joined</p>
                  <p className="casino-heading text-lg stat-number">{format(new Date(profile.joinedOn), 'MMM yyyy')}</p>
                </div>
              </div>
            </Card>

            {/* Active Bonuses */}
            {activeBonuses && activeBonuses.length > 0 && (
              <Card className="casino-card p-6">
                <h3 className="casino-gradient-text text-lg mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Active Bonuses
                </h3>
                <div className="space-y-4">
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
                      <div key={bonus.id} className="bg-[#2a2a3e] rounded-lg p-4 border border-[#D4AF37]/20">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Gift className={`w-5 h-5 ${iconColor}`} />
                              <p className="text-base font-semibold text-white">{bonusTitle}</p>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                              ${bonusAmount.toFixed(2)} bonus ({bonus.percentage}%)
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className={`w-6 h-6 ${isExpiringSoon ? 'text-red-400' : 'text-gray-400'}`} />
                            <span className={isExpiringSoon ? 'text-red-400' : 'text-gray-400'}>
                              {hoursRemaining}h {minutesRemaining}m
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Wagering Progress</span>
                            <span className="text-[#D4AF37] font-semibold">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#D4AF37] to-yellow-500 transition-all duration-300"
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-sm text-gray-400">
                            <span>${(wagered / 100).toFixed(2)}</span>
                            <span>${(requirement / 100).toFixed(2)}</span>
                          </div>
                        </div>
                        
                        {percentage >= 100 && (
                          <div className="mt-3 text-sm text-green-400 font-semibold text-center">
                            ✓ Wagering requirement completed!
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Bonus History */}
            {!params?.userId && (
              <Card className="bg-[#1a1a2e] border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#D4AF37] flex items-center gap-2 text-lg">
                    <History className="w-5 h-5" />
                    Bonus History
                  </h3>
                  <Button
                    onClick={() => setShowBonusHistory(!showBonusHistory)}
                    variant="outline"
                    size="sm"
                    className="text-[#D4AF37] border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black text-sm"
                    data-testid="button-toggle-bonus-history"
                  >
                    <span className="text-sm">{showBonusHistory ? 'Hide' : 'Show'} History</span>
                    <RefreshCw className="w-5 h-5 ml-2" />
                  </Button>
                </div>
                
                {showBonusHistory && bonusHistoryData?.history && (
                  <div className="bg-[#2a2a3e] rounded-lg p-4 border border-[#D4AF37]/20 max-h-96 overflow-y-auto">
                    {bonusHistoryData.history.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No bonus history yet</p>
                    ) : (
                      <div className="space-y-3">
                        {bonusHistoryData.history.slice(0, 10).map((item) => (
                          <div key={item.id} className="border-b border-gray-700 last:border-0 pb-3 last:pb-0">
                            {item.type === 'bonus_claimed' ? (
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Gift className="w-6 h-6 text-green-400" />
                                    <span className="font-medium text-white">
                                      {item.bonusType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Bonus
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-400 mt-1">
                                    ${item.depositAmount?.toFixed(2)} deposit • ${item.bonusAmount?.toFixed(2)} bonus
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {item.claimedAt ? format(new Date(item.claimedAt), 'MMM d, yyyy') : ''}
                                  </div>
                                </div>
                                <span className={`text-sm px-3 py-1 rounded ${
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
                                    <RefreshCw className="w-6 h-6 text-purple-400" />
                                    <span className="font-medium text-white">
                                      Bonus Reset
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-400 mt-1">
                                    Balance: ${item.balanceAtReset?.toFixed(2)} • {item.resetType?.replace(/_/g, ' ')}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {item.resetAt ? format(new Date(item.resetAt), 'MMM d, yyyy HH:mm') : ''}
                                  </div>
                                </div>
                                <span className="text-sm px-3 py-1 rounded bg-purple-500/20 text-purple-400">
                                  reset
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                        {bonusHistoryData.history.length > 10 && (
                          <p className="text-xs text-gray-400 text-center pt-3">
                            Showing 10 of {bonusHistoryData.history.length} entries
                          </p>
                        )}
                      </div>
                    )}
                    {bonusHistoryData && (
                      <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-gray-400">Total Bonuses</p>
                          <p className="text-[#D4AF37] font-bold text-base">{bonusHistoryData.totalBonuses}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400">Total Resets</p>
                          <p className="text-purple-400 font-bold text-base">{bonusHistoryData.totalResets}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Favorites */}
            <Card className="bg-[#1a1a2e] border-gray-800 p-6">
              <h3 className="font-bold text-white mb-4 text-lg">Favorites</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#2a2a3e] rounded-lg p-4">
                  <p className="text-gray-400 mb-2">Favorite Game</p>
                  <div className="flex items-center gap-3">
                    <div className="text-purple-400">
                      {getGameIcon(profile.favoriteGame || 'Unknown')}
                    </div>
                    <span className="text-white font-medium">{profile.favoriteGame || 'None'}</span>
                  </div>
                </div>
                
                <div className="bg-[#2a2a3e] rounded-lg p-4">
                  <p className="text-gray-400 mb-2">Favorite Asset</p>
                  <div className="flex items-center gap-3">
                    <div className="text-yellow-500">
                      {getCryptoIcon(profile.favoriteCrypto)}
                    </div>
                    <span className="text-white font-medium">{profile.favoriteCrypto}</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}