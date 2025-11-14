import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  BarChart3,
  PieChart,
  Activity,
  Shield,
  Download,
  Filter,
  Calendar,
  Eye,
  Target,
  Zap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPC, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers24h: number;
    totalBets: number;
    totalVolume: number;
    grossGamingRevenue: number;
    averageBetSize: number;
    houseEdge: number;
    userRetention7d: number;
  };
  trends: {
    revenue: Array<{ date: string; amount: number; }>;
    users: Array<{ date: string; count: number; }>;
    bets: Array<{ date: string; count: number; volume: number; }>;
  };
  games: {
    performance: Array<{
      game: string;
      bets: number;
      volume: number;
      ggr: number;
      players: number;
      avgBet: number;
      popularity: number;
    }>;
    distribution: Array<{ name: string; value: number; }>;
  };
  users: {
    segments: Array<{ segment: string; count: number; percentage: number; }>;
    geography: Array<{ country: string; users: number; revenue: number; }>;
    lifetime: Array<{ cohort: string; retention: number; ltv: number; }>;
  };
  responsibleGaming: {
    limitsSet: number;
    coolingOffActive: number;
    selfExcluded: number;
    realityChecksTriggered: number;
    interventionsSuccessful: number;
  };
  financial: {
    deposits: Array<{ method: string; amount: number; count: number; }>;
    withdrawals: Array<{ method: string; amount: number; count: number; }>;
    balance: {
      totalDeposits: number;
      totalWithdrawals: number;
      pendingWithdrawals: number;
      houseBalance: number;
    };
  };
}

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedGame, setSelectedGame] = useState('all');

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/dashboard', timeRange, selectedGame],
    refetchInterval: 30000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88', '#ff0080'];

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-[10px] font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into casino performance and user behavior.
          </p>
        </div>
        
        <div className="flex gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className=" mr-2"style={{width: '3px', height: '3px'}} />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[8px] font-medium">Total Users</CardTitle>
              <Users className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold">{formatNumber(analytics.overview.totalUsers)}</div>
              <p className="text-[8px] text-muted-foreground">
                {analytics.overview.activeUsers24h} active in 24h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[8px] font-medium">Gaming Volume</CardTitle>
              <BarChart3 className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold">{formatCurrency(analytics.overview.totalVolume)}</div>
              <p className="text-[8px] text-muted-foreground">
                {formatNumber(analytics.overview.totalBets)} total bets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[8px] font-medium">Gross Gaming Revenue</CardTitle>
              <DollarSign className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold text-green-600">
                {formatCurrency(analytics.overview.grossGamingRevenue)}
              </div>
              <p className="text-[8px] text-muted-foreground">
                {formatPercentage(analytics.overview.houseEdge)} house edge
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[8px] font-medium">User Retention</CardTitle>
              <Target className=" text-muted-foreground"style={{width: '3px', height: '3px'}} />
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold">{formatPercentage(analytics.overview.userRetention7d)}</div>
              <p className="text-[8px] text-muted-foreground">7-day retention rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="responsible">Safety</TabsTrigger>
          <TabsTrigger value="realtime">Live</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {analytics && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>Daily gross gaming revenue over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analytics.trends.revenue}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <CartesianGrid strokeDasharray="3 3" />
                        <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
                        <Area type="monotone" dataKey="amount" stroke="#8884d8" fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Activity</CardTitle>
                    <CardDescription>Daily active users and bet volume</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analytics.trends.users}>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <CartesianGrid strokeDasharray="3 3" />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#82ca9d" strokeWidth={2} name="Active Users" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Betting Activity</CardTitle>
                  <CardDescription>Number of bets and wagered volume over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.trends.bets}>
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <CartesianGrid strokeDasharray="3 3" />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Bet Count" />
                      <Bar yAxisId="right" dataKey="volume" fill="#82ca9d" name="Volume ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Games Tab */}
        <TabsContent value="games" className="space-y-6">
          {analytics && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Game Performance</CardTitle>
                    <CardDescription>Revenue and activity by game type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.games.performance.map((game, index) => (
                        <div key={game.game} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <div>
                              <p className="font-medium">{game.game}</p>
                              <p className="text-[8px] text-muted-foreground">{formatNumber(game.players)} players</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(game.ggr)}</p>
                            <p className="text-[8px] text-muted-foreground">{formatNumber(game.bets)} bets</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Game Popularity</CardTitle>
                    <CardDescription>Distribution of player preferences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPC data={analytics.games.distribution}>
                        {analytics.games.distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
                      </RechartsPC>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {analytics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>User Segments</CardTitle>
                    <CardDescription>Player classification by activity</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analytics.users.segments.map((segment) => (
                      <div key={segment.segment} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{segment.segment}</span>
                          <span className="text-[8px] text-muted-foreground">{formatPercentage(segment.percentage)}</span>
                        </div>
                        <Progress value={segment.percentage} className="h-2" />
                        <p className="text-[8px] text-muted-foreground">{formatNumber(segment.count)} users</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Geographic Distribution</CardTitle>
                    <CardDescription>Top markets by user count</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analytics.users.geography.map((geo) => (
                      <div key={geo.country} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{geo.country}</p>
                          <p className="text-[8px] text-muted-foreground">{formatNumber(geo.users)} users</p>
                        </div>
                        <p className="text-[8px] font-medium">{formatCurrency(geo.revenue)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Lifetime Value</CardTitle>
                    <CardDescription>Cohort analysis and retention</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analytics.users.lifetime.map((cohort) => (
                      <div key={cohort.cohort} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{cohort.cohort}</span>
                          <span className="text-[8px] font-medium">{formatCurrency(cohort.ltv)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[8px] text-muted-foreground">Retention:</span>
                          <Progress value={cohort.retention} className="h-1 flex-1" />
                          <span className="text-[8px] text-muted-foreground">{formatPercentage(cohort.retention)}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          {analytics && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[8px]">Total Deposits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold text-green-600">
                      {formatCurrency(analytics.financial.balance.totalDeposits)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[8px]">Total Withdrawals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold text-red-600">
                      {formatCurrency(analytics.financial.balance.totalWithdrawals)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[8px]">Pending Withdrawals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold text-orange-600">
                      {formatCurrency(analytics.financial.balance.pendingWithdrawals)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[8px]">House Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold text-blue-600">
                      {formatCurrency(analytics.financial.balance.houseBalance)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Deposit Methods</CardTitle>
                    <CardDescription>Breakdown by payment method</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.financial.deposits.map((method) => (
                        <div key={method.method} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <p className="font-medium">{method.method}</p>
                            <p className="text-[8px] text-muted-foreground">{formatNumber(method.count)} transactions</p>
                          </div>
                          <p className="font-medium">{formatCurrency(method.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Withdrawal Methods</CardTitle>
                    <CardDescription>Breakdown by payment method</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.financial.withdrawals.map((method) => (
                        <div key={method.method} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <p className="font-medium">{method.method}</p>
                            <p className="text-[8px] text-muted-foreground">{formatNumber(method.count)} transactions</p>
                          </div>
                          <p className="font-medium">{formatCurrency(method.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Responsible Gaming Tab */}
        <TabsContent value="responsible" className="space-y-6">
          {analytics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[8px] flex items-center gap-2">
                      <Shield className=""style={{width: '3px', height: '3px'}} />
                      Limits Set
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">{formatNumber(analytics.responsibleGaming.limitsSet)}</div>
                    <p className="text-[8px] text-muted-foreground">Active users with limits</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[8px] flex items-center gap-2">
                      <Activity className=""style={{width: '3px', height: '3px'}} />
                      Cooling Off
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold text-orange-600">{formatNumber(analytics.responsibleGaming.coolingOffActive)}</div>
                    <p className="text-[8px] text-muted-foreground">Currently in cooling-off</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[8px] flex items-center gap-2">
                      <Shield className=""style={{width: '3px', height: '3px'}} />
                      Self-Excluded
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold text-red-600">{formatNumber(analytics.responsibleGaming.selfExcluded)}</div>
                    <p className="text-[8px] text-muted-foreground">Currently self-excluded</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[8px] flex items-center gap-2">
                      <Eye className=""style={{width: '3px', height: '3px'}} />
                      Reality Checks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold">{formatNumber(analytics.responsibleGaming.realityChecksTriggered)}</div>
                    <p className="text-[8px] text-muted-foreground">Triggered this period</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[8px] flex items-center gap-2">
                      <Target className=""style={{width: '3px', height: '3px'}} />
                      Success Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold text-green-600">
                      {formatPercentage((analytics.responsibleGaming.interventionsSuccessful / Math.max(analytics.responsibleGaming.realityChecksTriggered, 1)) * 100)}
                    </div>
                    <p className="text-[8px] text-muted-foreground">Intervention success</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Responsible Gaming Effectiveness</CardTitle>
                  <CardDescription>Impact of responsible gaming tools on user behavior</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <p className="font-medium">Limit Adherence Rate</p>
                      <Progress value={85} className="h-3" />
                      <p className="text-[8px] text-muted-foreground">85% of users stay within set limits</p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="font-medium">Early Intervention Success</p>
                      <Progress value={73} className="h-3" />
                      <p className="text-[8px] text-muted-foreground">73% respond positively to reality checks</p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="font-medium">Voluntary Tool Usage</p>
                      <Progress value={42} className="h-3" />
                      <p className="text-[8px] text-muted-foreground">42% actively use safety tools</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Real-time Tab */}
        <TabsContent value="realtime" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[8px] flex items-center gap-2">
                  <Zap className=" text-green-500"style={{width: '3px', height: '3px'}} />
                  Live Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[10px] font-bold">247</div>
                <p className="text-[8px] text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[8px] flex items-center gap-2">
                  <Activity className=" text-blue-500"style={{width: '3px', height: '3px'}} />
                  Bets/Min
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[10px] font-bold">142</div>
                <p className="text-[8px] text-muted-foreground">Last 5 minutes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[8px] flex items-center gap-2">
                  <DollarSign className=" text-green-500"style={{width: '3px', height: '3px'}} />
                  Live Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[10px] font-bold">$8,420</div>
                <p className="text-[8px] text-muted-foreground">Last hour</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[8px] flex items-center gap-2">
                  <TrendingUp className=" text-purple-500"style={{width: '3px', height: '3px'}} />
                  Hot Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[10px] font-bold">7.2x</div>
                <p className="text-[8px] text-muted-foreground">Biggest multiplier</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Live Activity Feed</CardTitle>
              <CardDescription>Real-time casino activity and big wins</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center space-x-3">
                      <div style={{width: '2.5px', height: '2.5px'}} className="bg-green-500 rounded-full animate-pulse" />
                      <div>
                        <p className="font-medium">Player wins big on CryptoCoaster!</p>
                        <p className="text-[8px] text-muted-foreground">Anonymous • Just now</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[8px] text-green-600">+$1,250</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}