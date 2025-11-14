import { Router } from 'express';
import { db } from '../db';
import { gameSessions, gameHistory } from '@shared/schema';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import { authenticateApiKey } from '../middleware/apiAuth';

const router = Router();

// GET /api/game/analytics/overview - Overall analytics for the API key
router.get('/overview', authenticateApiKey, async (req, res) => {
  try {
    const apiKeyId = req.apiKey!.id;
    const timeRange = req.query.range || '7';
    
    // Validate timeRange parameter
    const validRanges = ['7', '30', '90', 'all'];
    if (!validRanges.includes(timeRange.toString())) {
      return res.status(400).json({
        error: 'Invalid range parameter',
        message: 'Range must be one of: 7, 30, 90, all'
      });
    }
    
    let dateFilter = sql`TRUE`;
    if (timeRange !== 'all') {
      const days = parseInt(timeRange.toString());
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter = gte(gameSessions.createdAt, startDate);
    }

    // Get session statistics
    const [stats] = await db
      .select({
        totalSessions: sql<number>`COUNT(*)`,
        completedSessions: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
        activeSessions: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`,
        totalScore: sql<number>`COALESCE(SUM(score), 0)`,
        totalStakes: sql<number>`COALESCE(SUM(CAST(stake AS DECIMAL)), 0)`,
        totalPrizes: sql<number>`COALESCE(SUM(CAST(prize AS DECIMAL)), 0)`,
        averageScore: sql<number>`COALESCE(AVG(score), 0)`,
        averageBlocksStacked: sql<number>`COALESCE(AVG(blocks_stacked), 0)`,
        highestRow: sql<number>`COALESCE(MAX(highest_row), 0)`,
        uniquePlayers: sql<number>`COUNT(DISTINCT external_player_id)`,
      })
      .from(gameSessions)
      .where(and(
        eq(gameSessions.apiKeyId, apiKeyId),
        dateFilter
      ));

    // Get stake distribution
    const stakeDistribution = await db
      .select({
        stake: gameSessions.stake,
        count: sql<number>`COUNT(*)`,
        totalPrizes: sql<number>`COALESCE(SUM(CAST(prize AS DECIMAL)), 0)`,
      })
      .from(gameSessions)
      .where(and(
        eq(gameSessions.apiKeyId, apiKeyId),
        dateFilter
      ))
      .groupBy(gameSessions.stake);

    // Get top performers
    const topPlayers = await db
      .select({
        externalPlayerId: gameSessions.externalPlayerId,
        playerName: gameSessions.playerName,
        totalSessions: sql<number>`COUNT(*)`,
        totalScore: sql<number>`COALESCE(SUM(score), 0)`,
        totalPrizes: sql<number>`COALESCE(SUM(CAST(prize AS DECIMAL)), 0)`,
        highestRow: sql<number>`MAX(highest_row)`,
      })
      .from(gameSessions)
      .where(and(
        eq(gameSessions.apiKeyId, apiKeyId),
        eq(gameSessions.status, 'completed'),
        dateFilter
      ))
      .groupBy(gameSessions.externalPlayerId, gameSessions.playerName)
      .orderBy(desc(sql`COALESCE(SUM(score), 0)`))
      .limit(10);

    res.json({
      timeRange,
      statistics: stats,
      stakeDistribution,
      topPlayers: topPlayers.filter(p => p.externalPlayerId),
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch analytics overview'
    });
  }
});

// GET /api/game/analytics/sessions/stats - Session statistics
router.get('/sessions/stats', authenticateApiKey, async (req, res) => {
  try {
    const apiKeyId = req.apiKey!.id;
    const groupBy = req.query.groupBy || 'day';
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 365);

    // Validate groupBy parameter
    const validGroupings = ['hour', 'day', 'week', 'month'];
    if (!validGroupings.includes(groupBy.toString())) {
      return res.status(400).json({
        error: 'Invalid groupBy parameter',
        message: 'groupBy must be one of: hour, day, week, month'
      });
    }

    let dateFormat;
    switch (groupBy) {
      case 'hour':
        dateFormat = sql`DATE_TRUNC('hour', created_at)`;
        break;
      case 'week':
        dateFormat = sql`DATE_TRUNC('week', created_at)`;
        break;
      case 'month':
        dateFormat = sql`DATE_TRUNC('month', created_at)`;
        break;
      default:
        dateFormat = sql`DATE_TRUNC('day', created_at)`;
    }

    const sessionStats = await db
      .select({
        period: dateFormat,
        totalSessions: sql<number>`COUNT(*)`,
        completedSessions: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
        totalScore: sql<number>`COALESCE(SUM(score), 0)`,
        totalStakes: sql<number>`COALESCE(SUM(CAST(stake AS DECIMAL)), 0)`,
        totalPrizes: sql<number>`COALESCE(SUM(CAST(prize AS DECIMAL)), 0)`,
      })
      .from(gameSessions)
      .where(eq(gameSessions.apiKeyId, apiKeyId))
      .groupBy(dateFormat)
      .orderBy(desc(dateFormat))
      .limit(limit);

    res.json({
      groupBy,
      data: sessionStats,
    });
  } catch (error) {
    console.error('Session stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch session statistics'
    });
  }
});

// GET /api/game/analytics/players/:playerId - Player-specific analytics
router.get('/players/:playerId/stats', authenticateApiKey, async (req, res) => {
  try {
    const apiKeyId = req.apiKey!.id;
    const { playerId } = req.params;

    // Get player's session statistics
    const [playerStats] = await db
      .select({
        totalSessions: sql<number>`COUNT(*)`,
        completedSessions: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
        activeSessions: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`,
        totalScore: sql<number>`COALESCE(SUM(score), 0)`,
        averageScore: sql<number>`COALESCE(AVG(score), 0)`,
        highestScore: sql<number>`COALESCE(MAX(score), 0)`,
        totalStakes: sql<number>`COALESCE(SUM(CAST(stake AS DECIMAL)), 0)`,
        totalPrizes: sql<number>`COALESCE(SUM(CAST(prize AS DECIMAL)), 0)`,
        averageBlocksStacked: sql<number>`COALESCE(AVG(blocks_stacked), 0)`,
        highestRow: sql<number>`COALESCE(MAX(highest_row), 0)`,
        lastPlayedAt: sql<Date>`MAX(created_at)`,
      })
      .from(gameSessions)
      .where(and(
        eq(gameSessions.apiKeyId, apiKeyId),
        eq(gameSessions.externalPlayerId, playerId)
      ));

    // Get player's recent sessions
    const recentSessions = await db
      .select({
        sessionToken: gameSessions.sessionToken,
        score: gameSessions.score,
        stake: gameSessions.stake,
        prize: gameSessions.prize,
        prizeType: gameSessions.prizeType,
        blocksStacked: gameSessions.blocksStacked,
        highestRow: gameSessions.highestRow,
        status: gameSessions.status,
        createdAt: gameSessions.createdAt,
        endedAt: gameSessions.endedAt,
      })
      .from(gameSessions)
      .where(and(
        eq(gameSessions.apiKeyId, apiKeyId),
        eq(gameSessions.externalPlayerId, playerId)
      ))
      .orderBy(desc(gameSessions.createdAt))
      .limit(20);

    res.json({
      playerId,
      statistics: playerStats,
      recentSessions,
    });
  } catch (error) {
    console.error('Player stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch player statistics'
    });
  }
});

export default router;
