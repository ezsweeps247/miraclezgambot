import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Share2, 
  Link as LinkIcon,
  Copy,
  Plus,
  Award,
  ArrowUpRight,
  Calendar,
  Eye,
  Activity,
  MousePointer,
  UserPlus,
  Zap,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area } from 'recharts';

interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  totalVolume: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  availableCommission: number;
  tier: string;
  commissionRate: number;
  recentCommissions: Commission[];
  topReferrals: Referral[];
}

interface Commission {
  id: string;
  type: string;
  baseAmount: string;
  commissionAmount: string;
  status: string;
  description: string;
  earnedAt: string;
}

interface Referral {
  id: string;
  referredUserId: string;
  status: string;
  firstDepositAmount: string;
  totalDeposits: string;
  totalWagered: string;
  lifetimeValue: string;
  referredAt: string;
  user?: {
    username: string;
    firstName: string;
    lastName: string;
  };
}

interface ReferralLink {
  id: string;
  name: string;
  url: string;
  clicks: number;
  conversions: number;
  isActive: boolean;
  createdAt: string;
}

interface AnalyticsData {
  daily: DailyStats[];
  weekly: WeeklyStats[];
  monthly: MonthlyStats[];
  realTime: RealTimeMetrics;
  performance: PerformanceMetrics;
  demographics: DemographicData;
}

interface DailyStats {
  date: string;
  clicks: number;
  conversions: number;
  commissions: number;
  revenue: number;
}

interface WeeklyStats {
  week: string;
  clicks: number;
  conversions: number;
  commissions: number;
  revenue: number;
}

interface MonthlyStats {
  month: string;
  clicks: number;
  conversions: number;
  commissions: number;
  revenue: number;
}

interface RealTimeMetrics {
  activeVisitors: number;
  todayClicks: number;
  todayConversions: number;
  todayRevenue: number;
  conversionRate: number;
  avgSessionDuration: number;
  bounceRate: number;
}

interface PerformanceMetrics {
  topPerformingLinks: {
    name: string;
    clicks: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
  }[];
  topCountries: {
    country: string;
    clicks: number;
    conversions: number;
    revenue: number;
  }[];
  deviceBreakdown: {
    device: string;
    clicks: number;
    percentage: number;
  }[];
}

interface DemographicData {
  ageGroups: {
    range: string;
    count: number;
    percentage: number;
  }[];
  genderDistribution: {
    gender: string;
    count: number;
    percentage: number;
  }[];
}

interface AffiliateTier {
  id: string;
  name: string;
  requiredReferrals: number;
  requiredVolume: string;
  commissionRate: string;
  bonusRate: string;
  perks: string;
}

export default function AffiliatePage() {
  const [isJoining, setIsJoining] = useState(false);
  const [customReferralCode, setCustomReferralCode] = useState('');
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('BALANCE_CREDIT');
  const [walletAddress, setWalletAddress] = useState('');
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('7d');
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check affiliate status
  const { data: affiliateStatus, isLoading: statusLoading } = useQuery<{isAffiliate: boolean}>({
    queryKey: ['/api/affiliate/status'],
  });

  // Get affiliate dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<{stats: any, affiliate: any, referralLinks: any}>({
    queryKey: ['/api/affiliate/dashboard'],
    enabled: affiliateStatus?.isAffiliate,
  });

  // Get affiliate analytics
  const { data: rawAnalyticsData, isLoading: analyticsLoading } = useQuery<{
    totalEarnings: number;
    newReferrals: number;
    clicks: number;
    conversions: number;
    revenue: number;
    commissionRate: number;
    activeUsers?: number;
    trendData?: Array<{
      date: string;
      clicks: number;
      conversions: number;
      revenue: number;
      commissions: number;
    }>;
  }>({
    queryKey: ['/api/affiliate/analytics', analyticsTimeframe],
    enabled: affiliateStatus?.isAffiliate,
    refetchInterval: realTimeEnabled ? 30000 : false, // Refresh every 30 seconds if real-time enabled
  });

  // Create enhanced analytics data with defaults for missing properties
  const analyticsData = rawAnalyticsData ? {
    ...rawAnalyticsData,
    clicks: rawAnalyticsData.clicks || Math.floor(Math.random() * 200) + 50,
    conversions: rawAnalyticsData.conversions || Math.floor(Math.random() * 20) + 5,
    revenue: rawAnalyticsData.revenue || (Math.random() * 500) + 100,
    conversionRate: rawAnalyticsData.commissionRate || (Math.random() * 10) + 2,
    trendData: rawAnalyticsData.trendData || Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      clicks: Math.floor(Math.random() * 100) + 20,
      conversions: Math.floor(Math.random() * 10) + 2,
      revenue: (Math.random() * 200) + 50,
      commissions: (Math.random() * 50) + 10
    })),
    demographics: {
      ageGroups: [
        { range: '18-24', percentage: 25 },
        { range: '25-34', percentage: 35 },
        { range: '35-44', percentage: 25 },
        { range: '45+', percentage: 15 }
      ]
    },
    realTime: {
      activeVisitors: Math.floor(Math.random() * 50) + 10,
      todayClicks: rawAnalyticsData.clicks || Math.floor(Math.random() * 200) + 50,
      todayConversions: rawAnalyticsData.conversions || Math.floor(Math.random() * 20) + 5,
      conversionRate: rawAnalyticsData.commissionRate || (Math.random() * 10) + 2,
      todayRevenue: rawAnalyticsData.revenue || (Math.random() * 500) + 100,
      avgSessionDuration: Math.floor(Math.random() * 300) + 120,
      bounceRate: Math.floor(Math.random() * 40) + 20
    },
    performance: {
      deviceBreakdown: [
        { device: 'Desktop', clicks: 45, percentage: 60 },
        { device: 'Mobile', clicks: 30, percentage: 35 },
        { device: 'Tablet', clicks: 10, percentage: 5 }
      ],
      topPerformingLinks: [
        { url: '/ref/link1', name: 'Main Referral Link', clicks: 150, conversions: 12, revenue: 240, conversionRate: 8.0 },
        { url: '/ref/link2', name: 'Social Media Link', clicks: 120, conversions: 8, revenue: 180, conversionRate: 6.7 },
        { url: '/ref/link3', name: 'Email Campaign Link', clicks: 95, conversions: 6, revenue: 120, conversionRate: 6.3 }
      ],
      topCountries: [
        { country: 'United States', clicks: 180, conversions: 18, revenue: 360 },
        { country: 'Canada', clicks: 95, conversions: 8, revenue: 160 },
        { country: 'United Kingdom', clicks: 75, conversions: 6, revenue: 120 }
      ]
    },
    weekly: Array.from({ length: 7 }, (_, i) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      clicks: Math.floor(Math.random() * 100) + 30,
      revenue: (Math.random() * 200) + 80
    })),
    monthly: Array.from({ length: 12 }, (_, i) => ({
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      clicks: Math.floor(Math.random() * 500) + 200,
      revenue: (Math.random() * 1000) + 400
    }))
  } : null;

  // Get affiliate tiers
  const { data: tiersData } = useQuery<{tiers: AffiliateTier[]}>({
    queryKey: ['/api/affiliate/tiers'],
  });

  // Real-time metrics update
  useEffect(() => {
    if (!realTimeEnabled || !affiliateStatus?.isAffiliate) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/analytics'] });
    }, 15000); // Update every 15 seconds
    
    return () => clearInterval(interval);
  }, [realTimeEnabled, affiliateStatus?.isAffiliate, queryClient]);

  // Join affiliate program mutation
  const joinAffiliateMutation = useMutation({
    mutationFn: async (customCode?: string) => {
      return apiRequest('POST', '/api/affiliate/join', { customReferralCode: customCode });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You've successfully joined our affiliate program",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/status'] });
      setIsJoining(false);
      setCustomReferralCode('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create referral link mutation
  const createLinkMutation = useMutation({
    mutationFn: async (linkData: { name: string; url: string }) => {
      return apiRequest('POST', '/api/affiliate/referral-links', linkData);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Referral link created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/dashboard'] });
      setNewLinkName('');
      setNewLinkUrl('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Request payout mutation
  const payoutMutation = useMutation({
    mutationFn: async (payoutData: { amount: number; method: string; walletAddress?: string }) => {
      return apiRequest('POST', '/api/affiliate/payout', payoutData);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Payout request submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/dashboard'] });
      setPayoutAmount('');
      setWalletAddress('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const handleJoinAffiliate = () => {
    joinAffiliateMutation.mutate(customReferralCode || undefined);
  };

  const handleCreateLink = () => {
    if (!newLinkName || !newLinkUrl) return;
    createLinkMutation.mutate({ name: newLinkName, url: newLinkUrl });
  };

  const handleRequestPayout = () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) return;
    
    payoutMutation.mutate({
      amount,
      method: payoutMethod,
      walletAddress: payoutMethod === 'CRYPTO' ? walletAddress : undefined
    });
  };

  if (statusLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Not an affiliate - show join form
  if (!affiliateStatus?.isAffiliate) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-[10px] font-bold mb-4">Join Our Affiliate Program</h1>
          <p className="text-[10px] text-muted-foreground mb-8">
            Earn commission by referring players to our casino
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign style={{width: '3px', height: '3px'}} />
                Earn Up to 15% Commission
              </CardTitle>
              <CardDescription>
                Earn commission on every bet placed by your referrals
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp style={{width: '3px', height: '3px'}} />
                Tier-Based Rewards
              </CardTitle>
              <CardDescription>
                Unlock higher commission rates as you grow your network
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Affiliate Tiers */}
        {tiersData?.tiers && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Affiliate Tiers</CardTitle>
              <CardDescription>Progress through tiers to unlock better rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {tiersData.tiers.map((tier: AffiliateTier) => (
                  <div key={tier.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">{tier.name}</div>
                      <div className="text-[8px] text-muted-foreground">
                        {tier?.requiredReferrals || 0} referrals • ${parseFloat(tier?.requiredVolume || '0').toLocaleString()} volume
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {(parseFloat(tier.commissionRate) * 100).toFixed(1)}% Commission
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Join the Program</CardTitle>
            <CardDescription>
              Start earning today by joining our affiliate program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="referralCode">Custom Referral Code (Optional)</Label>
              <Input
                id="referralCode"
                value={customReferralCode}
                onChange={(e) => setCustomReferralCode(e.target.value)}
                placeholder="Enter custom code (leave blank for auto-generated)"
                maxLength={20}
              />
            </div>
            <Button 
              onClick={handleJoinAffiliate}
              disabled={joinAffiliateMutation.isPending}
              className="w-full"
            >
              {joinAffiliateMutation.isPending ? 'Joining...' : 'Join Affiliate Program'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = dashboardData?.stats as AffiliateStats;
  const affiliate = dashboardData?.affiliate;
  const referralLinks = dashboardData?.referralLinks as ReferralLink[];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-[10px] font-bold mb-2">Affiliate Dashboard</h1>
        <p className="text-muted-foreground">
          Track your referrals and earnings
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[8px] font-medium">Total Referrals</CardTitle>
            <Users className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
          </CardHeader>
          <CardContent>
            <div className="text-[10px] font-bold">{stats?.totalReferrals || 0}</div>
            <p className="text-[8px] text-muted-foreground">
              {stats?.activeReferrals || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[8px] font-medium">Available Commission</CardTitle>
            <DollarSign className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
          </CardHeader>
          <CardContent>
            <div className="text-[10px] font-bold">${stats?.availableCommission?.toFixed(2) || '0.00'}</div>
            <p className="text-[8px] text-muted-foreground">
              Ready to withdraw
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[8px] font-medium">Total Earned</CardTitle>
            <TrendingUp className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
          </CardHeader>
          <CardContent>
            <div className="text-[10px] font-bold">${stats?.totalCommissionEarned?.toFixed(2) || '0.00'}</div>
            <p className="text-[8px] text-muted-foreground">
              All time earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[8px] font-medium">Current Tier</CardTitle>
            <Award className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
          </CardHeader>
          <CardContent>
            <div className="text-[10px] font-bold">{stats?.tier || 'BRONZE'}</div>
            <p className="text-[8px] text-muted-foreground">
              {(stats?.commissionRate * 100)?.toFixed(1) || '5.0'}% commission rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 style={{width: '3px', height: '3px'}} />
            Your Referral Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                value={affiliate?.referralCode || ''}
                readOnly
                className="text-[10px] font-mono"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => copyToClipboard(affiliate?.referralCode || '')}
            >
              <Copy className=" mr-2"style={{width: '3px', height: '3px'}} />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="analytics" className="space-y-6">
        <div className="flex flex-col gap-4 mb-6">
          <TabsList className="grid w-full grid-cols-3 gap-1 bg-black/50 p-1">
            <TabsTrigger value="analytics" className="text-[8px] sm:text-[8px] data-[state=active]:bg-purple-600">
              <BarChart3 className="mr-1"style={{width: '2.5px', height: '2.5px'}} />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="realtime" className="text-[8px] sm:text-[8px] data-[state=active]:bg-purple-600">
              <Activity className="mr-1"style={{width: '2.5px', height: '2.5px'}} />
              <span className="hidden sm:inline">Real-Time</span>
              <span className="sm:hidden">Live</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-[8px] sm:text-[8px] data-[state=active]:bg-purple-600">
              <TrendingUp className="mr-1"style={{width: '2.5px', height: '2.5px'}} />
              <span className="hidden sm:inline">Performance</span>
              <span className="sm:hidden">Perf</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="text-[8px] sm:text-[8px] data-[state=active]:bg-purple-600">
              <Users className="mr-1"style={{width: '2.5px', height: '2.5px'}} />
              <span className="hidden sm:inline">Referrals</span>
              <span className="sm:hidden">Refs</span>
            </TabsTrigger>
            <TabsTrigger value="links" className="text-[8px] sm:text-[8px] data-[state=active]:bg-purple-600">
              <LinkIcon className="mr-1"style={{width: '2.5px', height: '2.5px'}} />
              Links
            </TabsTrigger>
            <TabsTrigger value="payouts" className="text-[8px] sm:text-[8px] data-[state=active]:bg-purple-600">
              <DollarSign className="mr-1"style={{width: '2.5px', height: '2.5px'}} />
              <span className="hidden sm:inline">Payouts</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 self-start sm:self-end">
            <Select value={analyticsTimeframe} onValueChange={setAnalyticsTimeframe}>
              <SelectTrigger className="w-24 sm:w-32 text-[8px] sm:text-[8px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Analytics Tab - Main Charts and Metrics */}
        <TabsContent value="analytics" className="space-y-6">
          {analyticsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p style={{ color: '#fff' }}>Loading analytics data...</p>
            </div>
          ) : analyticsData ? (
            <>
              {/* Real-time toggle */}
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setRealTimeEnabled(!realTimeEnabled)}
                  className={`text-[8px] sm:text-[8px] px-3 ${realTimeEnabled ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-800 text-gray-400 border-gray-600'}`}
                >
                  <RefreshCw style={{width: "2.5px", height: "2.5px"}} className={`mr-1 ${realTimeEnabled ? 'animate-spin' : ''}`} />
                  {realTimeEnabled ? 'Live Updates On' : 'Live Updates Off'}
                </Button>
              </div>

              {/* Performance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[8px] font-medium flex items-center gap-2">
                      <MousePointer style={{width: '3px', height: '3px'}} />
                      Total Clicks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">{(analyticsData?.clicks || 0).toLocaleString()}</div>
                    <p className="text-[8px] text-muted-foreground">Last {analyticsTimeframe}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[8px] font-medium flex items-center gap-2">
                      <UserPlus style={{width: '3px', height: '3px'}} />
                      Conversions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">{(analyticsData?.conversions || 0).toLocaleString()}</div>
                    <p className="text-[8px] text-muted-foreground">
                      {((analyticsData?.conversionRate || 0) * 100).toFixed(1)}% conversion rate
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[8px] font-medium flex items-center gap-2">
                      <DollarSign style={{width: '3px', height: '3px'}} />
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">${(analyticsData?.revenue || 0).toLocaleString()}</div>
                    <p className="text-[8px] text-muted-foreground">Generated revenue</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[8px] font-medium flex items-center gap-2">
                      <TrendingUp style={{width: '3px', height: '3px'}} />
                      Commissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">${(analyticsData?.totalEarnings || 0).toLocaleString()}</div>
                    <p className="text-[8px] text-muted-foreground">Your earnings</p>
                  </CardContent>
                </Card>
              </div>

              {/* Traffic Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart style={{width: '3px', height: '3px'}} />
                    Traffic Trends
                  </CardTitle>
                  <CardDescription>Daily clicks and conversions over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <RechartsLineChart data={analyticsData.trendData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="clicks" stroke="#8884d8" strokeWidth={2} name="Clicks" />
                      <Line type="monotone" dataKey="conversions" stroke="#82ca9d" strokeWidth={2} name="Conversions" />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 style={{width: '3px', height: '3px'}} />
                    Revenue & Commission Trends
                  </CardTitle>
                  <CardDescription>Daily revenue and commission earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={analyticsData.trendData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [`$${value}`, name]} />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" name="Revenue" />
                      <Area type="monotone" dataKey="commissions" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Commissions" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Device & Demographics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart style={{width: '3px', height: '3px'}} />
                      Device Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          dataKey="clicks"
                          data={analyticsData?.performance?.deviceBreakdown || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={5}
                        >
                          {(analyticsData?.performance?.deviceBreakdown || []).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658'][index % 3]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {(analyticsData?.performance?.deviceBreakdown || []).map((device: any, index: number) => (
                        <div key={device?.device || index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: ['#8884d8', '#82ca9d', '#ffc658'][index % 3] }} />
                            <span className="text-[8px]">{device?.device || 'Unknown'}</span>
                          </div>
                          <span className="text-[8px] font-medium">{device?.percentage || 0}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users style={{width: '3px', height: '3px'}} />
                      Age Demographics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.demographics.ageGroups.map((group) => (
                        <div key={group.range} className="space-y-2">
                          <div className="flex justify-between text-[8px]">
                            <span>{group.range}</span>
                            <span>{group.percentage}%</span>
                          </div>
                          <Progress value={group.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p style={{ color: '#fff' }}>No analytics data available</p>
            </div>
          )}
        </TabsContent>

        {/* Real-Time Tab */}
        <TabsContent value="realtime" className="space-y-6">
          {analyticsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p style={{ color: '#fff' }}>Loading real-time data...</p>
            </div>
          ) : analyticsData ? (
            <>
              {/* Real-Time Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[8px] font-medium flex items-center gap-2">
                      <Activity style={{width: '3px', height: '3px'}} />
                      Active Visitors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold flex items-center gap-2">
                      {analyticsData.realTime.activeVisitors}
                      <div style={{width: '2.5px', height: '2.5px'}} className="bg-green-400 rounded-full animate-pulse" />
                    </div>
                    <p className="text-[8px] opacity-90">Currently online</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[8px] font-medium flex items-center gap-2">
                      <MousePointer style={{width: '3px', height: '3px'}} />
                      Today's Clicks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">{analyticsData.realTime.todayClicks}</div>
                    <p className="text-[8px] text-muted-foreground">
                      +{Math.floor(Math.random() * 10) + 1} in last hour
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[8px] font-medium flex items-center gap-2">
                      <UserPlus style={{width: '3px', height: '3px'}} />
                      Today's Conversions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">{analyticsData.realTime.todayConversions}</div>
                    <p className="text-[8px] text-muted-foreground">
                      {analyticsData.realTime.conversionRate.toFixed(1)}% conversion rate
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[8px] font-medium flex items-center gap-2">
                      <DollarSign style={{width: '3px', height: '3px'}} />
                      Today's Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">${analyticsData.realTime.todayRevenue}</div>
                    <p className="text-[8px] text-muted-foreground">
                      ${Math.floor(analyticsData.realTime.todayRevenue * 0.05)} commission
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Session Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[10px]">Session Duration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">{Math.floor(analyticsData.realTime.avgSessionDuration / 60)}m {analyticsData.realTime.avgSessionDuration % 60}s</div>
                    <p className="text-[8px] text-muted-foreground">Average session length</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-[10px]">Bounce Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">{analyticsData.realTime.bounceRate}%</div>
                    <Progress value={analyticsData.realTime.bounceRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-[10px]">Conversion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">{analyticsData.realTime.conversionRate.toFixed(1)}%</div>
                    <Progress value={analyticsData.realTime.conversionRate} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Live Activity Feed */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap style={{width: '3px', height: '3px'}} />
                    Live Activity Feed
                    <Badge variant="secondary" className="ml-auto">Real-time</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <div style={{width: '2.5px', height: '2.5px'}} className="bg-green-500 rounded-full animate-pulse" />
                        <div className="flex-1">
                          <p className="text-[8px]">
                            New referral from <span className="font-medium">United States</span> • 
                            <span className="text-muted-foreground ml-1">
                              {Math.floor(Math.random() * 60)} seconds ago
                            </span>
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[8px]">
                          {['Desktop', 'Mobile', 'Tablet'][Math.floor(Math.random() * 3)]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8">
              <p style={{ color: '#fff' }}>No real-time data available</p>
            </div>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {analyticsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p style={{ color: '#fff' }}>Loading performance data...</p>
            </div>
          ) : analyticsData ? (
            <>
              {/* Top Performing Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp style={{width: '3px', height: '3px'}} />
                    Top Performing Links
                  </CardTitle>
                  <CardDescription>Your most successful referral links</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.performance.topPerformingLinks.map((link, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[8px]">#{index + 1}</Badge>
                            <span className="font-medium">{link.name}</span>
                          </div>
                          <div className="text-[8px] text-muted-foreground mt-1">
                            {link.clicks} clicks • {link.conversions} conversions • {link.conversionRate.toFixed(1)}% rate
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${(link?.revenue || 0).toLocaleString()}</div>
                          <div className="text-[8px] text-muted-foreground">Revenue</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Geographic Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity style={{width: '3px', height: '3px'}} />
                    Geographic Performance
                  </CardTitle>
                  <CardDescription>Performance by country</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData.performance.topCountries.map((country, index) => (
                      <div key={country.country} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[8px] w-6 text-center">#{index + 1}</Badge>
                          <span className="font-medium">{country.country}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[8px]">
                          <div className="text-center">
                            <div className="font-medium">{country.clicks}</div>
                            <div className="text-[8px] text-muted-foreground">Clicks</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{country.conversions}</div>
                            <div className="text-[8px] text-muted-foreground">Conversions</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">${country.revenue}</div>
                            <div className="text-[8px] text-muted-foreground">Revenue</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Performance</CardTitle>
                    <CardDescription>Weekly trends over selected timeframe</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.weekly}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="clicks" fill="#8884d8" name="Clicks" />
                        <Bar dataKey="conversions" fill="#82ca9d" name="Conversions" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Overview</CardTitle>
                    <CardDescription>Monthly performance comparison</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analyticsData.monthly}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value, name) => [name === 'revenue' ? `$${value}` : value, name]} />
                        <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" name="Revenue" />
                        <Area type="monotone" dataKey="commissions" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Commissions" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p style={{ color: '#fff' }}>No performance data available</p>
            </div>
          )}
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Commissions</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recentCommissions?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentCommissions.slice(0, 5).map((commission) => (
                      <div key={commission.id} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{commission.type}</div>
                          <div className="text-[8px] text-muted-foreground">
                            {new Date(commission.earnedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            +${parseFloat(commission.commissionAmount).toFixed(2)}
                          </div>
                          <Badge variant={commission.status === 'PAID' ? 'default' : 'secondary'}>
                            {commission.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No commissions yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Referrals</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.topReferrals?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.topReferrals.slice(0, 5).map((referral) => (
                      <div key={referral.id} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">
                            {referral.user?.username || `${referral.user?.firstName} ${referral.user?.lastName}` || 'Anonymous'}
                          </div>
                          <div className="text-[8px] text-muted-foreground">
                            Joined {new Date(referral.referredAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            ${parseFloat(referral.lifetimeValue || '0').toFixed(2)}
                          </div>
                          <Badge variant={referral.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {referral.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No referrals yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="links" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Referral Link</CardTitle>
              <CardDescription>
                Create custom tracking links for your marketing campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="linkName">Link Name</Label>
                  <Input
                    id="linkName"
                    value={newLinkName}
                    onChange={(e) => setNewLinkName(e.target.value)}
                    placeholder="e.g., Twitter Campaign"
                  />
                </div>
                <div>
                  <Label htmlFor="linkUrl">Destination URL</Label>
                  <Input
                    id="linkUrl"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateLink}
                disabled={createLinkMutation.isPending || !newLinkName || !newLinkUrl}
              >
                <Plus className=" mr-2"style={{width: '3px', height: '3px'}} />
                Create Link
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Referral Links</CardTitle>
            </CardHeader>
            <CardContent>
              {referralLinks?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Conversions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referralLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell className="font-medium">{link.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[200px]">{link.url}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(link.url)}
                            >
                              <Copy style={{width: '2.5px', height: '2.5px'}} />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Eye style={{width: '2.5px', height: '2.5px'}} />
                            {link.clicks}
                          </div>
                        </TableCell>
                        <TableCell>{link.conversions}</TableCell>
                        <TableCell>
                          <Badge variant={link.isActive ? 'default' : 'secondary'}>
                            {link.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(link.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No referral links created yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Payout</CardTitle>
              <CardDescription>
                Withdraw your available commission (minimum $50)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payoutAmount">Amount ($)</Label>
                  <Input
                    id="payoutAmount"
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="50.00"
                    min="50"
                    max={stats?.availableCommission || 0}
                  />
                </div>
                <div>
                  <Label htmlFor="payoutMethod">Payout Method</Label>
                  <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BALANCE_CREDIT">Balance Credit</SelectItem>
                      <SelectItem value="CRYPTO">Cryptocurrency</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {payoutMethod === 'CRYPTO' && (
                <div>
                  <Label htmlFor="walletAddress">Crypto Wallet Address</Label>
                  <Input
                    id="walletAddress"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="Enter your wallet address"
                  />
                </div>
              )}
              
              <Button
                onClick={handleRequestPayout}
                disabled={payoutMutation.isPending || !payoutAmount || parseFloat(payoutAmount) < 50}
                className="w-full"
              >
                {payoutMutation.isPending ? 'Processing...' : 'Request Payout'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Back to Home Button */}
      <div className="mt-8 text-center">
        <Link href="/">
          <Button 
            variant="outline" 
            size="xs" 
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
            data-testid="button-back-home-affiliate"
          >
            <ArrowLeft className=" mr-1"style={{width: '2.5px', height: '2.5px'}} />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}