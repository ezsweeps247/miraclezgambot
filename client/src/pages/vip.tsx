import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Crown, Gem, Trophy, Star, Gift, TrendingUp, Users, Calendar, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface VipStatus {
  currentLevel: string;
  currentExperience: number;
  nextLevel: string | null;
  nextLevelExperience: number | null;
  progress: number;
  levelColor: string;
  levelIcon: string;
  vipLevelReachedAt: string | null;
}

interface VipLevel {
  id: number;
  level: string;
  experienceRequired: number;
  levelOrder: number;
  color: string;
  icon: string;
  benefits: {
    type: string;
    value: number;
    description: string;
  }[];
}

interface VipReward {
  id: number;
  type: string;
  amount: number;
  vipLevel: string;
  status: string;
  claimedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const levelIcons: { [key: string]: JSX.Element } = {
  UNRANKED: <Users className="w-6 h-6" />,
  WOOD: <Star className="w-6 h-6" />,
  BRONZE: <Trophy className="w-6 h-6 text-orange-600" />,
  SILVER: <Trophy className="w-6 h-6 text-gray-400" />,
  GOLD: <Trophy className="w-6 h-6 text-yellow-500" />,
  PLATINUM: <Crown className="w-6 h-6 text-gray-300" />,
  JADE: <Gem className="w-6 h-6 text-green-500" />,
  SAPPHIRE: <Gem className="w-6 h-6 text-blue-500" />,
  RUBY: <Gem className="w-6 h-6 text-red-500" />,
  DIAMOND: <Gem className="w-6 h-6 text-cyan-400" />
};

const benefitIcons: { [key: string]: JSX.Element } = {
  INSTANT_RAKEBACK: <TrendingUp className="w-5 h-5" />,
  WEEKLY_BONUS: <Calendar className="w-5 h-5" />,
  LEVEL_UP_BONUS: <Star className="w-5 h-5" />,
  RANK_UP_BONUS: <Trophy className="w-5 h-5" />,
  MONTHLY_BONUS: <Calendar className="w-5 h-5" />,
  BONUS_INCREASE: <TrendingUp className="w-5 h-5" />,
  VIP_HOST: <Users className="w-5 h-5" />,
  MIRACLEZ_EVENTS: <Gift className="w-5 h-5" />
};

function formatBenefitName(type: string): string {
  // Special case for MIRACLEZ_EVENTS to display as "Miraclez Events"
  if (type === 'MIRACLEZ_EVENTS') {
    return 'Miraclez Events';
  }
  return type.split('_').map(word => 
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ');
}

export default function VIPPage() {
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: vipStatus, isLoading: statusLoading } = useQuery<VipStatus>({
    queryKey: ['/api/vip/status']
  });

  const { data: vipLevels, isLoading: levelsLoading } = useQuery<VipLevel[]>({
    queryKey: ['/api/vip/levels']
  });

  const { data: vipRewards } = useQuery<VipReward[]>({
    queryKey: ['/api/vip/rewards']
  });

  const claimRewardMutation = useMutation({
    mutationFn: async (rewardId: number) => {
      return apiRequest('POST', `/api/vip/claim-reward/${rewardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vip/rewards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vip/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      toast({
        title: "Success",
        description: "Reward claimed successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to claim reward",
        variant: "destructive",
      });
    }
  });

  const handleLevelClick = (level: string) => {
    setExpandedLevel(expandedLevel === level ? null : level);
  };

  if (statusLoading || levelsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const pendingRewards = vipRewards?.filter(r => r.status === 'PENDING') || [];
  const currentLevelInfo = vipLevels?.find(l => l.level === vipStatus?.currentLevel);

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6">
      {/* VIP Status Overview */}
      <Card className="casino-card border-gray-700 bg-[#1a1a1a]" data-testid="card-vip-overview">
        <CardHeader className="p-6">
          <CardTitle className="flex items-center gap-3 text-3xl font-bold text-white">
            <Crown className="w-8 h-8 text-purple-500" />
            VIP Program
          </CardTitle>
          <CardDescription className="text-base text-gray-300 mt-2">
            Earn experience with every bet and unlock exclusive rewards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Current Level Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                style={{ backgroundColor: vipStatus?.levelColor + '30', border: `2px solid ${vipStatus?.levelColor}` }}
              >
                {levelIcons[vipStatus?.currentLevel || 'UNRANKED']}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white" data-testid="text-current-level">
                  {vipStatus?.currentLevel || 'UNRANKED'}
                </h3>
                <p className="text-lg text-gray-300" data-testid="text-experience">
                  {vipStatus?.currentExperience?.toLocaleString() || 0} Experience
                </p>
              </div>
            </div>
            {vipStatus?.nextLevel && (
              <div className="text-right">
                <p className="text-base text-gray-400 mb-1">Next Level</p>
                <p className="text-xl font-bold flex items-center gap-2 text-white" data-testid="text-next-level">
                  {levelIcons[vipStatus.nextLevel]}
                  {vipStatus.nextLevel}
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {vipStatus?.nextLevel && (
            <div className="space-y-3">
              <div className="flex justify-between text-base font-medium">
                <span className="text-gray-300" data-testid="text-progress-current">
                  {vipStatus.currentExperience?.toLocaleString()} XP
                </span>
                <span className="text-gray-300" data-testid="text-progress-next">
                  {vipStatus.nextLevelExperience?.toLocaleString()} XP
                </span>
              </div>
              <Progress 
                value={vipStatus.progress} 
                className="h-3 bg-gray-700"
                data-testid="progress-vip"
              />
              <p className="text-center text-lg text-gray-300">
                {vipStatus.progress}% Complete
              </p>
            </div>
          )}

          {/* Current Benefits */}
          {currentLevelInfo && currentLevelInfo.benefits.length > 0 && (
            <div>
              <h4 className="font-bold text-xl mb-4 text-white">Your Current Benefits</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentLevelInfo.benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-4 bg-purple-900/30 rounded-lg border border-purple-600/30"
                    data-testid={`benefit-current-${benefit.type}`}
                  >
                    {benefitIcons[benefit.type]}
                    <div>
                      <p className="text-base font-semibold text-white">
                        {formatBenefitName(benefit.type)}
                      </p>
                      <p className="text-sm text-gray-300">
                        {benefit.type.includes('RAKEBACK') || benefit.type.includes('INCREASE') 
                          ? `${benefit.value}%` 
                          : `${benefit.value} SC`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Rewards */}
          {pendingRewards.length > 0 && (
            <div className="border-t border-gray-600 pt-6">
              <h4 className="font-bold text-xl mb-4 text-white">Available Rewards</h4>
              <div className="space-y-3">
                {pendingRewards.map(reward => (
                  <div 
                    key={reward.id}
                    className="flex items-center justify-between p-4 bg-green-900/20 rounded-lg border border-green-500/30"
                    data-testid={`reward-pending-${reward.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Gift className="w-6 h-6 text-green-400" />
                      <div>
                        <p className="font-semibold text-lg text-white">
                          {formatBenefitName(reward.type)}
                        </p>
                        <p className="text-base text-gray-300">
                          {reward.amount} SC
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="default" 
                      className="bg-green-600 hover:bg-green-700 px-6 py-3 text-base font-semibold h-12"
                      data-testid={`button-claim-${reward.id}`}
                      onClick={() => claimRewardMutation.mutate(reward.id)}
                      disabled={claimRewardMutation.isPending}
                    >
                      {claimRewardMutation.isPending ? 'Claiming...' : 'Claim'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VIP Levels List */}
      <Card className="border-gray-700 bg-[#1a1a1a]" data-testid="card-vip-levels">
        <CardHeader className="p-6">
          <CardTitle className="text-2xl font-bold text-white">VIP Levels</CardTitle>
          <CardDescription className="text-base text-gray-300">
            Click on any level to see its benefits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-6">
          {vipLevels?.map(level => {
            const isCurrentLevel = level.level === vipStatus?.currentLevel;
            const isExpanded = expandedLevel === level.level;
            
            return (
              <div key={level.id} className="border border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => handleLevelClick(level.level)}
                  className={`w-full p-5 flex items-center justify-between transition-colors ${
                    isCurrentLevel ? 'bg-purple-900/30' : 'hover:bg-gray-800/50'
                  }`}
                  data-testid={`button-level-${level.level}`}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center shadow-md"
                      style={{ 
                        backgroundColor: level.color + '30', 
                        border: `2px solid ${level.color}` 
                      }}
                    >
                      {levelIcons[level.level]}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg flex items-center gap-2 text-white">
                        {level.level}
                        {isCurrentLevel && (
                          <Badge variant="default" className="bg-purple-600 text-xs px-2 py-1">
                            Current
                          </Badge>
                        )}
                      </p>
                      <p className="text-base text-gray-300">
                        {level.experienceRequired.toLocaleString()} XP Required
                      </p>
                    </div>
                  </div>
                  {isExpanded ? 
                    <ChevronUp className="w-6 h-6 text-gray-400" /> : 
                    <ChevronDown className="w-6 h-6 text-gray-400" />
                  }
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 bg-gray-800/30 border-t border-gray-600">
                        {level.benefits.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {level.benefits.map((benefit, index) => (
                              <div 
                                key={index}
                                className="flex items-start gap-3 p-3"
                                data-testid={`benefit-${level.level}-${benefit.type}`}
                              >
                                {benefitIcons[benefit.type]}
                                <div>
                                  <p className="text-base font-semibold text-white">
                                    {formatBenefitName(benefit.type)}
                                  </p>
                                  <p className="text-sm text-gray-300">
                                    {benefit.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-base text-gray-400">No benefits at this level</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* How VIP Works */}
      <Card className="border-gray-700 bg-[#1a1a1a]" data-testid="card-vip-info">
        <CardHeader className="p-6">
          <CardTitle className="text-2xl font-bold text-white">How VIP Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                1
              </div>
              <div>
                <h4 className="font-bold text-lg text-white">Play & Earn Experience</h4>
                <p className="text-base text-gray-300 mt-1">
                  Every $1 wagered = 1 Experience Point. The more you play, the faster you level up!
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                2
              </div>
              <div>
                <h4 className="font-bold text-lg text-white">Level Up & Unlock Benefits</h4>
                <p className="text-base text-gray-300 mt-1">
                  Progress through 9 VIP levels, each with increasingly better rewards and perks.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                3
              </div>
              <div>
                <h4 className="font-bold text-lg text-white">Claim Your Rewards</h4>
                <p className="text-base text-gray-300 mt-1">
                  Receive instant rakeback, weekly bonuses, level-up bonuses, and exclusive perks!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back to Home Button */}
      <div className="mt-6 text-center">
        <Link href="/">
          <Button 
            variant="outline" 
            size="lg"
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors px-6 py-3 text-base h-12 font-semibold"
            data-testid="button-back-home-vip"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}