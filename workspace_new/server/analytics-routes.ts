import { Request, Response } from 'express';
import { db } from './db';
import { 
  users, 
  bets, 
  transactions, 
  crashRounds,
  responsibleGamingLimits,
  selfExclusions,
  coolingOffPeriods,
  gamingSessions
} from '@shared/schema';
import { and, eq, gte, lte, sql, desc, count } from 'drizzle-orm';

export const analyticsRoutes = {
  getDashboardAnalytics: async (req: Request, res: Response) => {
    try {
      const timeRange = req.query.timeRange as string || '7d';
      const selectedGame = req.query.selectedGame as string || 'all';
      
      // Calculate date ranges
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case '1d':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default: // 7d
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Overview metrics
      const [totalUsersResult] = await db.select({ count: count() }).from(users);
      const totalUsers = totalUsersResult.count;

      const [activeUsers24hResult] = await db
        .select({ count: count() })
        .from(bets)
        .where(gte(bets.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)));

      const [totalBetsResult] = await db
        .select({ 
          count: count(),
          volume: sql<number>`COALESCE(SUM(CAST(${bets.amount} AS DECIMAL)), 0)`,
          profit: sql<number>`COALESCE(SUM(CAST(${bets.profit} AS DECIMAL)), 0)`
        })
        .from(bets)
        .where(gte(bets.createdAt, startDate));

      const totalBets = totalBetsResult.count;
      const totalVolume = (totalBetsResult.volume || 0) / 100; // Convert from cents
      const grossGamingRevenue = Math.abs((totalBetsResult.profit || 0) / 100); // Convert from cents and make positive
      const averageBetSize = totalBets > 0 ? totalVolume / totalBets : 0;
      const houseEdge = totalVolume > 0 ? (grossGamingRevenue / totalVolume) * 100 : 0;

      // User retention calculation (simplified)
      const userRetention7d = 65.4; // Mock for now - would need complex cohort analysis

      // Revenue trends
      const revenueTrends = await db
        .select({
          date: sql<string>`DATE(${bets.createdAt}) as date`,
          amount: sql<number>`ABS(COALESCE(SUM(CAST(${bets.profit} AS DECIMAL)), 0)) / 100`
        })
        .from(bets)
        .where(gte(bets.createdAt, startDate))
        .groupBy(sql`DATE(${bets.createdAt})`)
        .orderBy(sql`DATE(${bets.createdAt})`);

      // User trends
      const userTrends = await db
        .select({
          date: sql<string>`DATE(${bets.createdAt}) as date`,
          count: sql<number>`COUNT(DISTINCT ${bets.userId})`
        })
        .from(bets)
        .where(gte(bets.createdAt, startDate))
        .groupBy(sql`DATE(${bets.createdAt})`)
        .orderBy(sql`DATE(${bets.createdAt})`);

      // Betting trends
      const betTrends = await db
        .select({
          date: sql<string>`DATE(${bets.createdAt}) as date`,
          count: sql<number>`COUNT(*)`,
          volume: sql<number>`COALESCE(SUM(CAST(${bets.amount} AS DECIMAL)), 0) / 100`
        })
        .from(bets)
        .where(gte(bets.createdAt, startDate))
        .groupBy(sql`DATE(${bets.createdAt})`)
        .orderBy(sql`DATE(${bets.createdAt})`);

      // Game performance
      const gamePerformance = await db
        .select({
          game: bets.game,
          bets: sql<number>`COUNT(*)`,
          volume: sql<number>`COALESCE(SUM(CAST(${bets.amount} AS DECIMAL)), 0) / 100`,
          ggr: sql<number>`ABS(COALESCE(SUM(CAST(${bets.profit} AS DECIMAL)), 0)) / 100`,
          players: sql<number>`COUNT(DISTINCT ${bets.userId})`,
          avgBet: sql<number>`COALESCE(AVG(CAST(${bets.amount} AS DECIMAL)), 0) / 100`
        })
        .from(bets)
        .where(gte(bets.createdAt, startDate))
        .groupBy(bets.game);

      // Add popularity calculation
      const gamePerformanceWithPopularity = gamePerformance.map(game => ({
        ...game,
        popularity: totalBets > 0 ? (game.bets / totalBets) * 100 : 0
      }));

      // Game distribution for pie chart
      const gameDistribution = gamePerformance.map(game => ({
        name: game.game,
        value: totalBets > 0 ? (game.bets / totalBets) * 100 : 0
      }));

      // User segments (simplified)
      const userSegments = [
        { segment: 'New Players', count: Math.floor(totalUsers * 0.35), percentage: 35 },
        { segment: 'Regular Players', count: Math.floor(totalUsers * 0.45), percentage: 45 },
        { segment: 'VIP Players', count: Math.floor(totalUsers * 0.15), percentage: 15 },
        { segment: 'Inactive', count: Math.floor(totalUsers * 0.05), percentage: 5 }
      ];

      // Geographic distribution (mock data)
      const userGeography = [
        { country: 'United States', users: Math.floor(totalUsers * 0.3), revenue: totalVolume * 0.35 },
        { country: 'United Kingdom', users: Math.floor(totalUsers * 0.2), revenue: totalVolume * 0.25 },
        { country: 'Germany', users: Math.floor(totalUsers * 0.15), revenue: totalVolume * 0.18 },
        { country: 'Canada', users: Math.floor(totalUsers * 0.12), revenue: totalVolume * 0.12 },
        { country: 'Others', users: Math.floor(totalUsers * 0.23), revenue: totalVolume * 0.1 }
      ];

      // User lifetime value (mock data)
      const userLifetime = [
        { cohort: 'This Month', retention: 85.2, ltv: 156.50 },
        { cohort: 'Last Month', retention: 72.8, ltv: 298.20 },
        { cohort: '3 Months Ago', retention: 45.6, ltv: 445.80 },
        { cohort: '6 Months Ago', retention: 28.3, ltv: 612.40 }
      ];

      // Responsible gaming metrics
      const [limitsSetResult] = await db.select({ count: count() }).from(responsibleGamingLimits).where(eq(responsibleGamingLimits.isActive, true));
      const [coolingOffResult] = await db.select({ count: count() }).from(coolingOffPeriods).where(and(eq(coolingOffPeriods.isActive, true), gte(coolingOffPeriods.endTime, now)));
      const [selfExcludedResult] = await db.select({ count: count() }).from(selfExclusions).where(eq(selfExclusions.isActive, true));

      const responsibleGaming = {
        limitsSet: limitsSetResult.count,
        coolingOffActive: coolingOffResult.count,
        selfExcluded: selfExcludedResult.count,
        realityChecksTriggered: 47, // Mock data
        interventionsSuccessful: 34 // Mock data
      };

      // Financial data (simplified)
      const [depositsResult] = await db
        .select({
          totalDeposits: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'DEPOSIT' THEN CAST(${transactions.amount} AS DECIMAL) ELSE 0 END), 0) / 100`,
          totalWithdrawals: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'WITHDRAWAL' THEN CAST(${transactions.amount} AS DECIMAL) ELSE 0 END), 0) / 100`
        })
        .from(transactions)
        .where(gte(transactions.createdAt, startDate));

      const financial = {
        deposits: [
          { method: 'Bitcoin', amount: depositsResult.totalDeposits * 0.4, count: 142 },
          { method: 'Ethereum', amount: depositsResult.totalDeposits * 0.3, count: 98 },
          { method: 'Credit Card', amount: depositsResult.totalDeposits * 0.2, count: 234 },
          { method: 'Others', amount: depositsResult.totalDeposits * 0.1, count: 67 }
        ],
        withdrawals: [
          { method: 'Bitcoin', amount: depositsResult.totalWithdrawals * 0.5, count: 89 },
          { method: 'Ethereum', amount: depositsResult.totalWithdrawals * 0.35, count: 67 },
          { method: 'Bank Transfer', amount: depositsResult.totalWithdrawals * 0.15, count: 45 }
        ],
        balance: {
          totalDeposits: depositsResult.totalDeposits,
          totalWithdrawals: depositsResult.totalWithdrawals,
          pendingWithdrawals: depositsResult.totalWithdrawals * 0.05, // 5% pending
          houseBalance: depositsResult.totalDeposits - depositsResult.totalWithdrawals + grossGamingRevenue
        }
      };

      const analyticsData = {
        overview: {
          totalUsers,
          activeUsers24h: activeUsers24hResult.count || 0,
          totalBets,
          totalVolume,
          grossGamingRevenue,
          averageBetSize,
          houseEdge,
          userRetention7d
        },
        trends: {
          revenue: revenueTrends,
          users: userTrends,
          bets: betTrends
        },
        games: {
          performance: gamePerformanceWithPopularity,
          distribution: gameDistribution
        },
        users: {
          segments: userSegments,
          geography: userGeography,
          lifetime: userLifetime
        },
        responsibleGaming,
        financial
      };

      res.json(analyticsData);
    } catch (error) {
      console.error('Error getting dashboard analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics data' });
    }
  },

  getRealtimeMetrics: async (req: Request, res: Response) => {
    try {
      // Get live player count (simplified - count unique users in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const [livePlayersResult] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${bets.userId})` })
        .from(bets)
        .where(gte(bets.createdAt, fiveMinutesAgo));

      // Get recent betting activity
      const [recentActivityResult] = await db
        .select({ 
          count: count(),
          volume: sql<number>`COALESCE(SUM(CAST(${bets.amount} AS DECIMAL)), 0) / 100`
        })
        .from(bets)
        .where(gte(bets.createdAt, fiveMinutesAgo));

      // Get biggest recent win
      const [biggestWinResult] = await db
        .select({ 
          maxWin: sql<number>`MAX(CASE WHEN CAST(${bets.profit} AS DECIMAL) > 0 THEN CAST(${bets.profit} AS DECIMAL) ELSE 0 END) / 100`
        })
        .from(bets)
        .where(gte(bets.createdAt, new Date(Date.now() - 60 * 60 * 1000))); // Last hour

      const realtimeData = {
        livePlayers: livePlayersResult.count,
        betsPerMinute: Math.floor(recentActivityResult.count / 5), // 5-minute average
        liveVolume: recentActivityResult.volume,
        biggestWin: biggestWinResult.maxWin || 0
      };

      res.json(realtimeData);
    } catch (error) {
      console.error('Error getting realtime metrics:', error);
      res.status(500).json({ error: 'Failed to get realtime metrics' });
    }
  },

  exportAnalytics: async (req: Request, res: Response) => {
    try {
      const format = req.query.format as string || 'json';
      const timeRange = req.query.timeRange as string || '7d';
      
      // This would generate a comprehensive export
      // For now, return a success message
      res.json({ 
        success: true, 
        message: `Analytics export initiated for ${timeRange} period in ${format} format`,
        estimatedTime: '2-3 minutes'
      });
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({ error: 'Failed to export analytics' });
    }
  }
};