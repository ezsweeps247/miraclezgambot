import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  ArrowLeft, 
  Clock, 
  Target, 
  Flame, 
  Gift,
  CheckCircle,
  Calendar,
  TrendingUp,
  Zap,
  Crown,
  DicesIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { WheelSpinner } from '@/components/WheelSpinner';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'achievement';
  progress: number;
  target: number;
  reward: {
    type: 'credits' | 'sweeps' | 'xp';
    amount: number;
  };
  completed: boolean;
  expiresAt?: string;
  icon: any;
  difficulty: 'easy' | 'medium' | 'hard';
}

const dailyChallenges: Challenge[] = [
  {
    id: 'daily-login',
    title: 'Daily Login',
    description: 'Sign in to the casino',
    type: 'daily',
    progress: 1,
    target: 1,
    reward: { type: 'credits', amount: 100 },
    completed: true,
    expiresAt: '2025-09-27T00:00:00Z',
    icon: Calendar,
    difficulty: 'easy'
  },
  {
    id: 'daily-games',
    title: 'Game Explorer',
    description: 'Play 3 different games',
    type: 'daily',
    progress: 1,
    target: 3,
    reward: { type: 'credits', amount: 250 },
    completed: false,
    expiresAt: '2025-09-27T00:00:00Z',
    icon: DicesIcon,
    difficulty: 'easy'
  },
  {
    id: 'daily-wins',
    title: 'Lucky Streak',
    description: 'Win 5 games today',
    type: 'daily',
    progress: 2,
    target: 5,
    reward: { type: 'sweeps', amount: 0.5 },
    completed: false,
    expiresAt: '2025-09-27T00:00:00Z',
    icon: Target,
    difficulty: 'medium'
  },
  {
    id: 'daily-crash',
    title: 'High Roller',
    description: 'Cash out at 5x or higher in Crash',
    type: 'daily',
    progress: 0,
    target: 1,
    reward: { type: 'credits', amount: 500 },
    completed: false,
    expiresAt: '2025-09-27T00:00:00Z',
    icon: TrendingUp,
    difficulty: 'hard'
  }
];

const weeklyChallenges: Challenge[] = [
  {
    id: 'weekly-playtime',
    title: 'Dedicated Player',
    description: 'Play for 7 consecutive days',
    type: 'weekly',
    progress: 3,
    target: 7,
    reward: { type: 'sweeps', amount: 2.0 },
    completed: false,
    expiresAt: '2025-10-03T00:00:00Z',
    icon: Flame,
    difficulty: 'medium'
  },
  {
    id: 'weekly-games',
    title: 'Game Master',
    description: 'Play all 13 casino games',
    type: 'weekly',
    progress: 8,
    target: 13,
    reward: { type: 'credits', amount: 2500 },
    completed: false,
    expiresAt: '2025-10-03T00:00:00Z',
    icon: Crown,
    difficulty: 'hard'
  },
  {
    id: 'weekly-wagering',
    title: 'Big Spender',
    description: 'Wager 10,000 credits total',
    type: 'weekly',
    progress: 4250,
    target: 10000,
    reward: { type: 'sweeps', amount: 5.0 },
    completed: false,
    expiresAt: '2025-10-03T00:00:00Z',
    icon: Trophy,
    difficulty: 'hard'
  }
];

const achievements: Challenge[] = [
  {
    id: 'first-win',
    title: 'First Victory',
    description: 'Win your first game',
    type: 'achievement',
    progress: 1,
    target: 1,
    reward: { type: 'credits', amount: 500 },
    completed: true,
    icon: Trophy,
    difficulty: 'easy'
  },
  {
    id: 'crash-master',
    title: 'Crash Master',
    description: 'Cash out at 10x or higher',
    type: 'achievement',
    progress: 1,
    target: 1,
    reward: { type: 'sweeps', amount: 1.0 },
    completed: true,
    icon: Zap,
    difficulty: 'hard'
  },
  {
    id: 'slots-jackpot',
    title: 'Jackpot Hunter',
    description: 'Hit the jackpot in Slots',
    type: 'achievement',
    progress: 0,
    target: 1,
    reward: { type: 'sweeps', amount: 10.0 },
    completed: false,
    icon: Crown,
    difficulty: 'hard'
  },
  {
    id: 'enigma-solver',
    title: 'Puzzle Master',
    description: 'Complete all 5 levels of Enigma',
    type: 'achievement',
    progress: 2,
    target: 5,
    reward: { type: 'credits', amount: 1000 },
    completed: false,
    icon: Target,
    difficulty: 'medium'
  }
];

export default function ChallengesPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data for streak info
  const { data: userData } = useQuery<any>({
    queryKey: ['/api/me'],
    enabled: !!user
  });

  // Daily Wheel Spinner mutation
  const [isSpinning, setIsSpinning] = useState(false);
  const spinWheelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/me/spin-wheel');
      return response.json();
    },
    onMutate: () => {
      setIsSpinning(true);
    },
    onSuccess: (data) => {
      // Keep spinning animation for 2 seconds
      setTimeout(() => {
        setIsSpinning(false);
        
        if (data.success) {
          queryClient.invalidateQueries({ queryKey: ['/api/me'] });
          queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
          
          const currencyLabel = data.rewardType === 'GC' ? 'Gold Coins' : 'Sweeps Cash';
          toast({
            title: `🎉 You Won ${data.rewardAmount} ${data.rewardType}!`,
            description: `Congratulations! You earned ${data.rewardAmount} ${currencyLabel} from the Daily Wheel!`,
          });
        } else if (data.alreadySpun) {
          toast({
            title: "Already Spun Today",
            description: "You've already spun the wheel today. Come back tomorrow!",
            variant: "destructive"
          });
        }
      }, 2000);
    },
    onError: () => {
      setIsSpinning(false);
      toast({
        title: "Error",
        description: "Failed to spin the wheel. Please try again.",
        variant: "destructive"
      });
    }
  });

  // SC streak claim mutation
  const claimScStreakMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/me/claim-sc-streak');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['/api/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
        
        if (data.rewardGiven) {
          toast({
            title: "SC Streak Claimed! 🎉",
            description: `Day ${data.streak} streak! You earned ${data.rewardAmount} SC`,
          });
        } else {
          toast({
            title: "Streak Updated",
            description: `Day ${data.streak} streak! Keep going to earn rewards from day 3!`,
          });
        }
      } else if (data.alreadyClaimed) {
        toast({
          title: "Already Claimed",
          description: "You've already claimed your SC streak today. Come back tomorrow!",
          variant: "destructive"
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to claim SC streak. Please try again.",
        variant: "destructive"
      });
    }
  });

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatReward = (reward: Challenge['reward']) => {
    switch (reward.type) {
      case 'credits':
        return `${reward.amount.toLocaleString()} Credits`;
      case 'sweeps':
        return `${reward.amount} SC`;
      case 'xp':
        return `${reward.amount} XP`;
    }
  };

  const getDifficultyColor = (difficulty: Challenge['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'hard':
        return 'bg-red-500';
    }
  };

  const renderChallenge = (challenge: Challenge) => (
    <Card 
      key={challenge.id}
      className={`bg-casino-card border-casino-border transition-all hover:border-[#D4AF37] ${
        challenge.completed ? 'opacity-75' : ''
      }`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className={`p-1.5 rounded-full ${challenge.completed ? 'bg-green-500/20' : 'bg-[#D4AF37]/20'}`}>
            {challenge.completed ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <challenge.icon className="w-5 h-5 text-[#D4AF37]" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <h3 className="text-sm font-semibold text-white truncate">
                {challenge.title}
              </h3>
              <Badge 
                variant="secondary" 
                className={`text-xs px-1 py-0 text-white ${getDifficultyColor(challenge.difficulty)}`}
              >
                {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
              </Badge>
              {challenge.completed && (
                <Badge className="bg-green-500 text-white text-xs px-1 py-0">
                  <CheckCircle className="w-4 h-4 mr-0.5" />
                  Done
                </Badge>
              )}
            </div>
            
            <p className="text-gray-400 mb-2 text-sm">
              {challenge.description}
            </p>
            
            {!challenge.completed && (
              <div className="mb-2">
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs text-gray-400">Progress</span>
                  <span className="text-base text-white">{challenge.progress}/{challenge.target}</span>
                </div>
                <Progress 
                  value={(challenge.progress / challenge.target) * 100} 
                  className="h-1.5"
                />
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Gift className="w-5 h-5 text-[#D4AF37]" />
                <span className="text-[#D4AF37] font-medium text-base">
                  {formatReward(challenge.reward)}
                </span>
              </div>
              
              {challenge.expiresAt && !challenge.completed && (
                <div className="flex items-center gap-0.5 text-xs text-gray-400">
                  <Clock className="w-4 h-4" />
                  {formatTimeRemaining(challenge.expiresAt)}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const getTabStats = (challenges: Challenge[]) => {
    const completed = challenges.filter(c => c.completed).length;
    const total = challenges.length;
    return { completed, total };
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="text-gray-400 hover:text-white mb-4 rounded-lg text-sm"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Casino
          </Button>
        </div>

        <Card className="bg-casino-card border-casino-border">
          <CardContent className="p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <h2 className="text-lg font-semibold mb-2 text-white">Sign In Required</h2>
            <p className="text-sm text-gray-400 mb-6">
              Please sign in to view and complete challenges.
            </p>
            <Button 
              onClick={() => setLocation('/')}
              className="bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold text-sm"
              data-testid="button-go-home"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dailyStats = getTabStats(dailyChallenges);
  const weeklyStats = getTabStats(weeklyChallenges);
  const achievementStats = getTabStats(achievements);

  return (
    <div className="container mx-auto p-2 max-w-6xl">
      <div className="mb-3">
        <Button 
          variant="outline" 
          size="xs"
          onClick={() => setLocation('/')}
          className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black mb-2 text-sm h-6 px-2"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-5 h-5 mr-0.5" />
          Back
        </Button>
        
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-6 h-6 text-[#D4AF37]" />
          <h1 className="text-3xl font-bold text-white">Challenges</h1>
        </div>
        <p className="text-sm text-gray-400">Complete challenges to earn rewards</p>
      </div>

      {/* Daily Rewards Section */}
      <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-[#D4AF37]/30 mb-3">
        <CardHeader className="p-3">
          <CardTitle className="flex items-center gap-1.5 text-white text-base">
            <Gift className="w-5 h-5 text-[#D4AF37]" />
            Daily Login Rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-0">
          {/* GC Streak (Automatic - Read Only) */}
          <div className="bg-black/30 rounded-lg p-2 border border-green-500/30">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Flame className="w-5 h-5 text-green-400" />
                <span className="text-white font-semibold text-sm">GC Streak (Auto)</span>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs px-1 py-0">
                {userData?.loginStreak || 0} Days
              </Badge>
            </div>
            <p className="text-gray-400 text-sm mb-1">
              Auto reward: 50 GC/day from day 3, max 500 GC.
            </p>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-500">Longest:</span>
              <span className="text-white font-medium">{userData?.longestStreak || 0} days</span>
            </div>
          </div>

          {/* Daily Wheel Spinner */}
          <div className="bg-black/30 rounded-lg p-2 border border-[#D4AF37]/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-5 h-5 text-[#D4AF37]" />
                <span className="text-white font-semibold text-sm">Daily Wheel Spinner</span>
              </div>
              <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/50 text-xs px-1 py-0">
                Daily Bonus
              </Badge>
            </div>
            <p className="text-gray-400 text-sm mb-2 text-center">
              Spin once per day for random rewards!
            </p>
            <div className="flex justify-center" data-testid="wheel-spinner-container">
              <WheelSpinner
                onSpin={() => spinWheelMutation.mutate()}
                isSpinning={isSpinning}
                disabled={userData?.lastWheelSpinDate === new Date().toISOString().split('T')[0]}
              />
            </div>
            <p className="text-xs text-center text-gray-500 mt-2">
              Prizes: 25-500 GC or 1-25 SC
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-1 bg-casino-card border border-casino-border p-1">
          <TabsTrigger 
            value="daily" 
            className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-600/30 data-[state=active]:to-purple-700/40 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-b-purple-500 px-2 py-1.5"
            data-testid="tab-daily-challenges"
          >
            <div className="flex items-center gap-1 w-full justify-center">
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-medium">Daily</span>
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {dailyStats.completed}/{dailyStats.total}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="weekly"
            className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-600/30 data-[state=active]:to-purple-700/40 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-b-purple-500 px-2 py-1.5"
            data-testid="tab-weekly-challenges"
          >
            <div className="flex items-center gap-1 w-full justify-center">
              <Flame className="w-5 h-5" />
              <span className="text-sm font-medium">Weekly</span>
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {weeklyStats.completed}/{weeklyStats.total}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="achievements"
            className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-600/30 data-[state=active]:to-purple-700/40 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-b-purple-500 px-2 py-1.5"
            data-testid="tab-achievements"
          >
            <div className="flex items-center gap-1 w-full justify-center">
              <Trophy className="w-5 h-5" />
              <span className="text-sm font-medium">Achieve</span>
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {achievementStats.completed}/{achievementStats.total}
              </Badge>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-3">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-white mb-1">Daily Challenges</h2>
            <p className="text-sm text-gray-400">Reset every day at midnight UTC</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {dailyChallenges.map(renderChallenge)}
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="mt-3">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-white mb-1">Weekly Challenges</h2>
            <p className="text-sm text-gray-400">Reset every Monday at midnight UTC</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {weeklyChallenges.map(renderChallenge)}
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="mt-3">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-white mb-1">Achievements</h2>
            <p className="text-sm text-gray-400">Permanent challenges that unlock special rewards</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {achievements.map(renderChallenge)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <Card className="mt-4 bg-casino-card border-casino-border">
        <CardHeader className="p-3">
          <CardTitle className="text-center text-white text-lg">Your Challenge Progress</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-base font-bold text-[#D4AF37] mb-0.5">
                {dailyStats.completed + weeklyStats.completed + achievementStats.completed}
              </div>
              <div className="text-xs text-gray-400">Total Completed</div>
            </div>
            <div>
              <div className="text-base font-bold text-[#D4AF37] mb-0.5">
                {dailyStats.total + weeklyStats.total + achievementStats.total}
              </div>
              <div className="text-xs text-gray-400">Total Available</div>
            </div>
            <div>
              <div className="text-base font-bold text-[#D4AF37] mb-0.5">
                {Math.round(((dailyStats.completed + weeklyStats.completed + achievementStats.completed) / 
                (dailyStats.total + weeklyStats.total + achievementStats.total)) * 100)}%
              </div>
              <div className="text-xs text-gray-400">Completion Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}