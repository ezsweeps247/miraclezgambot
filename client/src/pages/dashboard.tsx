// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, TrendingUp, TrendingDown, DollarSign, Dice1, Gamepad2, Zap, Download, Filter, Users, Share2, Copy, Award, Plus, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCredits } from "@/lib/utils";

interface GameHistory {
  id: string;
  gameType: 'DICE' | 'SLOTS' | 'CRASH';
  betAmount: number;
  payout: number;
  multiplier: number;
  result: any;
  createdAt: string;
  status: 'WIN' | 'LOSS';
}

interface DepositHistory {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  transactionHash?: string;
  createdAt: string;
  completedAt?: string;
}

interface WithdrawalHistory {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED';
  address?: string;
  transactionHash?: string;
  createdAt: string;
  completedAt?: string;
}

interface AffiliateData {
  isAffiliate: boolean;
  affiliate?: {
    id: string;
    referralCode: string;
    tier: string;
    commissionRate: string;
    totalReferrals: number;
    activeReferrals: number;
    totalCommissionEarned: string;
    availableCommission: string;
    status: string;
  };
  stats?: {
    totalReferrals: number;
    activeReferrals: number;
    totalCommissionEarned: number;
    availableCommission: number;
    tier: string;
    commissionRate: number;
    recentCommissions: Commission[];
    topReferrals: Referral[];
  };
  referralLinks?: ReferralLink[];
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

export default function DashboardPage() {
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [depositFilter, setDepositFilter] = useState<string>("all");
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("6months");
  const [customReferralCode, setCustomReferralCode] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate date range
  const getDateRange = (range: string) => {
    const now = new Date();
    switch (range) {
      case "1month":
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case "3months":
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case "6months":
        return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      case "1year":
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      default:
        return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    }
  };

  // Fetch gaming history
  const { data: gameHistory, isLoading: gameLoading } = useQuery<GameHistory[]>({
    queryKey: ['/api/user/game-history', timeRange, gameFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeRange,
        gameType: gameFilter === 'all' ? '' : gameFilter,
      });
      const response = await fetch(`/api/user/game-history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch game history');
      return response.json();
    },
  });

  // Fetch deposit history
  const { data: depositHistory, isLoading: depositLoading } = useQuery<DepositHistory[]>({
    queryKey: ['/api/user/deposit-history', timeRange, depositFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeRange,
        status: depositFilter === 'all' ? '' : depositFilter,
      });
      const response = await fetch(`/api/user/deposit-history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch deposit history');
      return response.json();
    },
  });

  // Fetch withdrawal history
  const { data: withdrawalHistory, isLoading: withdrawalLoading } = useQuery<WithdrawalHistory[]>({
    queryKey: ['/api/user/withdrawal-history', timeRange, withdrawalFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeRange,
        status: withdrawalFilter === 'all' ? '' : withdrawalFilter,
      });
      const response = await fetch(`/api/user/withdrawal-history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch withdrawal history');
      return response.json();
    },
  });

  // Check affiliate status
  const { data: affiliateStatus } = useQuery({
    queryKey: ['/api/affiliate/status'],
    retry: false,
  });

  // Get affiliate dashboard data (only if user is an affiliate)
  const { data: affiliateData } = useQuery({
    queryKey: ['/api/affiliate/dashboard'],
    enabled: affiliateStatus?.isAffiliate,
    retry: false,
  });

  // Join affiliate program mutation
  const joinAffiliateMutation = useMutation({
    mutationFn: async (customCode?: string) => {
      return apiRequest('/api/affiliate/join', {
        method: 'POST',
        body: { customReferralCode: customCode }
      });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You've joined the affiliate program",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/dashboard'] });
      setCustomReferralCode('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join affiliate program",
        variant: "destructive",
      });
    },
  });

  // Utility functions
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

  // Calculate statistics
  const gameStats = gameHistory ? {
    totalBets: gameHistory.length,
    totalWagered: gameHistory.reduce((sum, game) => sum + game.betAmount, 0),
    totalWon: gameHistory.reduce((sum, game) => sum + (game.payout || 0), 0),
    winRate: gameHistory.length > 0 ? (gameHistory.filter(g => g.status === 'WIN').length / gameHistory.length * 100) : 0,
  } : { totalBets: 0, totalWagered: 0, totalWon: 0, winRate: 0 };

  const depositStats = depositHistory ? {
    totalDeposits: depositHistory.filter(d => d.status === 'COMPLETED').length,
    totalAmount: depositHistory.filter(d => d.status === 'COMPLETED').reduce((sum, deposit) => sum + deposit.amount, 0),
  } : { totalDeposits: 0, totalAmount: 0 };

  const withdrawalStats = withdrawalHistory ? {
    totalWithdrawals: withdrawalHistory.filter(w => w.status === 'COMPLETED').length,
    totalAmount: withdrawalHistory.filter(w => w.status === 'COMPLETED').reduce((sum, withdrawal) => sum + withdrawal.amount, 0),
  } : { totalWithdrawals: 0, totalAmount: 0 };

  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case 'DICE': return <Dice1 style={{width: '3.5px', height: '3.5px'}} className="" />;
      case 'SLOTS': return <Gamepad2 style={{width: '3.5px', height: '3.5px'}} className="" />;
      case 'CRASH': return <Zap style={{width: '3.5px', height: '3.5px'}} className="" />;
      default: return <DollarSign style={{width: '3.5px', height: '3.5px'}} className="" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'WIN':
        return <Badge className="bg-green-500">Win</Badge>;
      case 'LOSS':
        return <Badge variant="destructive">Loss</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-[10px] font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          View your gaming activity, deposits, and withdrawals history.
        </p>
      </div>

      {/* Time Range Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Calendar style={{width: '3px', height: '3px'}} />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[8px] font-medium">Total Bets</CardTitle>
            <TrendingUp className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
          </CardHeader>
          <CardContent>
            <div className="text-[10px] font-bold">{gameStats.totalBets}</div>
            <p className="text-[8px] text-muted-foreground">
              Win Rate: {gameStats.winRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[8px] font-medium">Total Wagered</CardTitle>
            <DollarSign className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
          </CardHeader>
          <CardContent>
            <div className="text-[10px] font-bold">{formatCredits(gameStats.totalWagered)}</div>
            <p className="text-[8px] text-muted-foreground">
              Won: {formatCredits(gameStats.totalWon)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[8px] font-medium">Total Deposits</CardTitle>
            <TrendingUp className=" text-green-500"style={{width: '3px', height: '3px'}} />
          </CardHeader>
          <CardContent>
            <div className="text-[10px] font-bold">{depositStats.totalDeposits}</div>
            <p className="text-[8px] text-muted-foreground">
              {formatCredits(depositStats.totalAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[8px] font-medium">Total Withdrawals</CardTitle>
            <TrendingDown className=" text-red-500"style={{width: '3px', height: '3px'}} />
          </CardHeader>
          <CardContent>
            <div className="text-[10px] font-bold">{withdrawalStats.totalWithdrawals}</div>
            <p className="text-[8px] text-muted-foreground">
              {formatCredits(withdrawalStats.totalAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* History Tabs */}
      <Tabs defaultValue="gaming" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="gaming">Gaming History</TabsTrigger>
          <TabsTrigger value="deposits">Deposit History</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawal History</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        {/* Gaming History */}
        <TabsContent value="gaming">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Gaming History</CardTitle>
                  <CardDescription>
                    Your recent gaming activity and results
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter style={{width: '3.5px', height: '3.5px'}} className="" />
                  <Select value={gameFilter} onValueChange={setGameFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Games</SelectItem>
                      <SelectItem value="DICE">Dice</SelectItem>
                      <SelectItem value="SLOTS">Slots</SelectItem>
                      <SelectItem value="CRASH">Crash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {gameLoading ? (
                <div className="text-center py-8">Loading game history...</div>
              ) : gameHistory && gameHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Game</TableHead>
                      <TableHead>Bet Amount</TableHead>
                      <TableHead>Multiplier</TableHead>
                      <TableHead>Payout</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gameHistory.map((game) => (
                      <TableRow key={game.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getGameIcon(game.gameType)}
                            {game.gameType}
                          </div>
                        </TableCell>
                        <TableCell>{formatCredits(game.betAmount)}</TableCell>
                        <TableCell>{game.multiplier ? `${game.multiplier}x` : '-'}</TableCell>
                        <TableCell>{game.payout ? formatCredits(game.payout) : '-'}</TableCell>
                        <TableCell>{getStatusBadge(game.status)}</TableCell>
                        <TableCell>{format(new Date(game.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No gaming history found for the selected period.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deposit History */}
        <TabsContent value="deposits">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Deposit History</CardTitle>
                  <CardDescription>
                    Your deposit transactions and status
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter style={{width: '3.5px', height: '3.5px'}} className="" />
                  <Select value={depositFilter} onValueChange={setDepositFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {depositLoading ? (
                <div className="text-center py-8">Loading deposit history...</div>
              ) : depositHistory && depositHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depositHistory.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell className="font-medium">
                          {typeof deposit.amount === 'number' ? formatCredits(deposit.amount) : '$0.00'}
                        </TableCell>
                        <TableCell>{deposit.method}</TableCell>
                        <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                        <TableCell>
                          {deposit.transactionHash ? (
                            <code className="text-[8px] bg-muted px-2 py-1 rounded">
                              {deposit.transactionHash.slice(0, 10)}...
                            </code>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{format(new Date(deposit.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No deposit history found for the selected period.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawal History */}
        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Withdrawal History</CardTitle>
                  <CardDescription>
                    Your withdrawal requests and status
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter style={{width: '3.5px', height: '3.5px'}} className="" />
                  <Select value={withdrawalFilter} onValueChange={setWithdrawalFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {withdrawalLoading ? (
                <div className="text-center py-8">Loading withdrawal history...</div>
              ) : withdrawalHistory && withdrawalHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalHistory.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell className="font-medium">
                          {typeof withdrawal.amount === 'number' ? formatCredits(withdrawal.amount) : '$0.00'}
                        </TableCell>
                        <TableCell>{withdrawal.method}</TableCell>
                        <TableCell>
                          {withdrawal.address ? (
                            <code className="text-[8px] bg-muted px-2 py-1 rounded">
                              {withdrawal.address.slice(0, 10)}...
                            </code>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                        <TableCell>
                          {withdrawal.transactionHash ? (
                            <code className="text-[8px] bg-muted px-2 py-1 rounded">
                              {withdrawal.transactionHash.slice(0, 10)}...
                            </code>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{format(new Date(withdrawal.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No withdrawal history found for the selected period.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals">
          {!affiliateStatus?.isAffiliate ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className=""style={{width: '3px', height: '3px'}} />
                  Join Our Referral Program
                </CardTitle>
                <CardDescription>
                  Start earning commission by referring players to our casino
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 border rounded-lg">
                    <DollarSign className=" mx-auto mb-2 text-casino-gold"style={{width: '3.5px', height: '3.5px'}} />
                    <h3 className="font-semibold">Earn Commission</h3>
                    <p className="text-[8px] text-muted-foreground">Up to 15% on referral betting</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Award className=" mx-auto mb-2 text-casino-neon"style={{width: '3.5px', height: '3.5px'}} />
                    <h3 className="font-semibold">Tier System</h3>
                    <p className="text-[8px] text-muted-foreground">Higher tiers, better rewards</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Share2 className=" mx-auto mb-2 text-casino-red"style={{width: '3.5px', height: '3.5px'}} />
                    <h3 className="font-semibold">Easy Sharing</h3>
                    <p className="text-[8px] text-muted-foreground">Custom referral codes & links</p>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="customCode">Custom Referral Code (Optional)</Label>
                  <Input
                    id="customCode"
                    value={customReferralCode}
                    onChange={(e) => setCustomReferralCode(e.target.value)}
                    placeholder="Enter custom code or leave blank for auto-generated"
                    maxLength={20}
                  />
                </div>
                
                <Button 
                  onClick={handleJoinAffiliate}
                  disabled={joinAffiliateMutation.isPending}
                  className="w-full"
                >
                  {joinAffiliateMutation.isPending ? 'Joining...' : 'Join Referral Program'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Affiliate Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[8px] font-medium">Total Referrals</CardTitle>
                    <Users className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">{affiliateData?.stats?.totalReferrals || 0}</div>
                    <p className="text-[8px] text-muted-foreground">
                      {affiliateData?.stats?.activeReferrals || 0} active
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[8px] font-medium">Available Commission</CardTitle>
                    <DollarSign className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">
                      ${affiliateData?.stats?.availableCommission?.toFixed(2) || '0.00'}
                    </div>
                    <p className="text-[8px] text-muted-foreground">Ready to withdraw</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[8px] font-medium">Total Earned</CardTitle>
                    <TrendingUp className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">
                      ${affiliateData?.stats?.totalCommissionEarned?.toFixed(2) || '0.00'}
                    </div>
                    <p className="text-[8px] text-muted-foreground">All time earnings</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[8px] font-medium">Current Tier</CardTitle>
                    <Award className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">{affiliateData?.stats?.tier || 'BRONZE'}</div>
                    <p className="text-[8px] text-muted-foreground">
                      {((affiliateData?.stats?.commissionRate || 0.05) * 100).toFixed(1)}% commission rate
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Referral Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className=""style={{width: '3px', height: '3px'}} />
                    Your Referral Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Input
                        value={affiliateData?.affiliate?.referralCode || ''}
                        readOnly
                        className="text-[10px] font-mono"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(affiliateData?.affiliate?.referralCode || '')}
                    >
                      <Copy className=" mr-2"style={{width: '3px', height: '3px'}} />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Commissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Commissions</CardTitle>
                  <CardDescription>Your latest referral earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  {affiliateData?.stats?.recentCommissions?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Commission</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {affiliateData.stats.recentCommissions.map((commission) => (
                          <TableRow key={commission.id}>
                            <TableCell className="font-medium">{commission.type}</TableCell>
                            <TableCell>${parseFloat(commission.baseAmount).toFixed(2)}</TableCell>
                            <TableCell className="text-green-500">
                              +${parseFloat(commission.commissionAmount).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={commission.status === 'PAID' ? 'default' : 'secondary'}>
                                {commission.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(commission.earnedAt), 'MMM dd, yyyy')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No commissions yet. Start referring players to earn!
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Referrals */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Referrals</CardTitle>
                  <CardDescription>Your most valuable referrals</CardDescription>
                </CardHeader>
                <CardContent>
                  {affiliateData?.stats?.topReferrals?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Total Deposits</TableHead>
                          <TableHead>Total Wagered</TableHead>
                          <TableHead>Lifetime Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {affiliateData.stats.topReferrals.map((referral) => (
                          <TableRow key={referral.id}>
                            <TableCell className="font-medium">
                              {referral.user?.username || 
                               `${referral.user?.firstName || ''} ${referral.user?.lastName || ''}`.trim() ||
                               'Anonymous'}
                            </TableCell>
                            <TableCell>${parseFloat(referral.totalDeposits || '0').toFixed(2)}</TableCell>
                            <TableCell>${parseFloat(referral.totalWagered || '0').toFixed(2)}</TableCell>
                            <TableCell className="text-green-500">
                              ${parseFloat(referral.lifetimeValue || '0').toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={referral.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                {referral.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(referral.referredAt), 'MMM dd, yyyy')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No referrals yet. Share your referral code to get started!
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Back to Home Button */}
      <div className="mt-8 text-center">
        <Link href="/">
          <Button 
            variant="outline" 
            size="lg" 
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
            data-testid="button-back-home-dashboard"
          >
            <ArrowLeft className=" mr-2"style={{width: '3px', height: '3px'}} />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}