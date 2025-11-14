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
  UNRANKED: <Users style={{width: '3px', height: '3px'}} className="" />,
  WOOD: <Star style={{width: '3px', height: '3px'}} className="" />,
  BRONZE: <Trophy style={{width: '3px', height: '3px'}} className=" text-orange-600" />,
  SILVER: <Trophy style={{width: '3px', height: '3px'}} className=" text-gray-400" />,
  GOLD: <Trophy style={{width: '3px', height: '3px'}} className=" text-yellow-500" />,
  PLATINUM: <Crown style={{width: '3px', height: '3px'}} className=" text-gray-300" />,
  JADE: <Gem style={{width: '3px', height: '3px'}} className=" text-green-500" />,
  SAPPHIRE: <Gem style={{width: '3px', height: '3px'}} className=" text-blue-500" />,
  RUBY: <Gem style={{width: '3px', height: '3px'}} className=" text-red-500" />,
  DIAMOND: <Gem style={{width: '3px', height: '3px'}} className=" text-cyan-400" />
};

const benefitIcons: { [key: string]: JSX.Element } = {
  INSTANT_RAKEBACK: <TrendingUp style={{width: '2.5px', height: '2.5px'}} className="" />,
  WEEKLY_BONUS: <Calendar style={{width: '2.5px', height: '2.5px'}} className="" />,
  LEVEL_UP_BONUS: <Star style={{width: '2.5px', height: '2.5px'}} className="" />,
  RANK_UP_BONUS: <Trophy style={{width: '2.5px', height: '2.5px'}} className="" />,
  MONTHLY_BONUS: <Calendar style={{width: '2.5px', height: '2.5px'}} className="" />,
  BONUS_INCREASE: <TrendingUp style={{width: '2.5px', height: '2.5px'}} className="" />,
  VIP_HOST: <Users style={{width: '2.5px', height: '2.5px'}} className="" />,
  MIRACLEZ_EVENTS: <Gift style={{width: '2.5px', height: '2.5px'}} className="" />
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
    <div className="container mx-auto p-2 max-w-7xl space-y-2">
      {/* VIP Status Overview */}
      <Card className="casino-card" data-testid="card-vip-overview">
        <CardHeader className="p-2">
          <CardTitle className="casino-gradient-text flex items-center gap-1 text-[10px]">
            <Crown style={{width: '3px', height: '3px'}} className="" />
            VIP Program
          </CardTitle>
          <CardDescription className="casino-body text-[8px]">Earn experience with every bet and unlock exclusive rewards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-2">
          {/* Current Level Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: vipStatus?.levelColor + '20', border: `1px solid ${vipStatus?.levelColor}` }}
              >
                {levelIcons[vipStatus?.currentLevel || 'UNRANKED']}
              </div>
              <div>
                <h3 className="casino-heading text-[10px]" data-testid="text-current-level">
                  {vipStatus?.currentLevel || 'UNRANKED'}
                </h3>
                <p className="casino-body text-[8px]" data-testid="text-experience">
                  {vipStatus?.currentExperience || 0} Experience
                </p>
              </div>
            </div>
            {vipStatus?.nextLevel && (
              <div className="text-right">
                <p className="casino-body text-[8px]">Next Level</p>
                <p className="casino-heading text-[10px] flex items-center gap-1" data-testid="text-next-level">
                  {levelIcons[vipStatus.nextLevel]}
                  {vipStatus.nextLevel}
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {vipStatus?.nextLevel && (
            <div className="space-y-1">
              <div className="flex justify-between text-[8px]">
                <span data-testid="text-progress-current">{vipStatus.currentExperience} XP</span>
                <span data-testid="text-progress-next">{vipStatus.nextLevelExperience} XP</span>
              </div>
              <Progress 
                value={vipStatus.progress} 
                className="h-1 bg-gray-700"
                data-testid="progress-vip"
              />
              <p className="text-center text-[10px] text-gray-400">
                {vipStatus.progress}% Complete
              </p>
            </div>
          )}

          {/* Current Benefits */}
          {currentLevelInfo && currentLevelInfo.benefits.length > 0 && (
            <div>
              <h4 className="font-semibold mb-1 text-[10px]">Your Current Benefits</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                {currentLevelInfo.benefits.map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-1 p-1 bg-purple-900/30 rounded-lg"
                    data-testid={`benefit-current-${benefit.type}`}
                  >
                    {benefitIcons[benefit.type]}
                    <div>
                      <p className="text-[10px] font-medium">{formatBenefitName(benefit.type)}</p>
                      <p className="text-[8px] text-gray-400">
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
            <div className="border-t border-gray-700 pt-2">
              <h4 className="font-semibold mb-1 text-[10px]">Available Rewards</h4>
              <div className="space-y-1">
                {pendingRewards.map(reward => (
                  <div 
                    key={reward.id}
                    className="flex items-center justify-between p-1 bg-green-900/20 rounded-lg border border-green-500/30"
                    data-testid={`reward-pending-${reward.id}`}
                  >
                    <div className="flex items-center gap-1">
                      <Gift style={{width: '3px', height: '3px'}} className=" text-green-400" />
                      <div>
                        <p className="font-medium text-[10px]">{formatBenefitName(reward.type)}</p>
                        <p className="text-[8px] text-gray-400">{reward.amount} SC</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 px-2 py-1 text-[8px] h-auto"
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
      <Card data-testid="card-vip-levels">
        <CardHeader className="p-2">
          <CardTitle className="text-[10px]">VIP Levels</CardTitle>
          <CardDescription className="text-[8px]">Click on any level to see its benefits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 p-2">
          {vipLevels?.map(level => {
            const isCurrentLevel = level.level === vipStatus?.currentLevel;
            const isExpanded = expandedLevel === level.level;
            
            return (
              <div key={level.id} className="border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => handleLevelClick(level.level)}
                  className={`w-full p-2 flex items-center justify-between transition-colors ${
                    isCurrentLevel ? 'bg-purple-900/30' : 'hover:bg-gray-800/50'
                  }`}
                  data-testid={`button-level-${level.level}`}
                >
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundColor: level.color + '20', 
                        border: `1px solid ${level.color}` 
                      }}
                    >
                      {levelIcons[level.level]}
                    </div>
                    <div className="text-left">
                      <p className="font-bold flex items-center gap-1 text-[10px]">
                        {level.level}
                        {isCurrentLevel && (
                          <Badge variant="default" className="bg-purple-600 text-[8px] px-1 py-0">
                            Current
                          </Badge>
                        )}
                      </p>
                      <p className="text-[8px] text-gray-400">
                        {level.experienceRequired.toLocaleString()} XP Required
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp style={{width: '3px', height: '3px'}} className="" /> : <ChevronDown style={{width: '3px', height: '3px'}} className="" />}
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
                      <div className="p-2 bg-gray-800/30 border-t border-gray-700">
                        {level.benefits.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                            {level.benefits.map((benefit, index) => (
                              <div 
                                key={index}
                                className="flex items-center gap-1 p-1"
                                data-testid={`benefit-${level.level}-${benefit.type}`}
                              >
                                {benefitIcons[benefit.type]}
                                <div>
                                  <p className="text-[10px] font-medium">
                                    {formatBenefitName(benefit.type)}
                                  </p>
                                  <p className="text-[8px] text-gray-400">
                                    {benefit.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[8px] text-gray-400">No benefits at this level</p>
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
      <Card data-testid="card-vip-info">
        <CardHeader className="p-2">
          <CardTitle className="text-[10px]">How VIP Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-2">
          <div className="space-y-1">
            <div className="flex items-start gap-1">
              <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 text-[8px]">
                1
              </div>
              <div>
                <h4 className="font-semibold text-[10px]">Play & Earn Experience</h4>
                <p className="text-[8px] text-gray-400">
                  Every $1 wagered = 1 Experience Point. The more you play, the faster you level up!
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-1">
              <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 text-[8px]">
                2
              </div>
              <div>
                <h4 className="font-semibold text-[10px]">Level Up & Unlock Benefits</h4>
                <p className="text-[8px] text-gray-400">
                  Progress through 9 VIP levels, each with increasingly better rewards and perks.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-1">
              <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 text-[8px]">
                3
              </div>
              <div>
                <h4 className="font-semibold text-[10px]">Claim Your Rewards</h4>
                <p className="text-[8px] text-gray-400">
                  Receive instant rakeback, weekly bonuses, level-up bonuses, and exclusive perks!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back to Home Button */}
      <div className="mt-2 text-center">
        <Link href="/">
          <Button 
            variant="outline" 
            size="sm"
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors px-2 py-1 text-[8px] h-auto"
            data-testid="button-back-home-vip"
          >
            <ArrowLeft style={{width: '3px', height: '3px'}} className=" mr-1" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}