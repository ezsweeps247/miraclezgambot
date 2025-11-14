import { Request, Response } from 'express';
import { and, eq, sql, gte, between, desc } from 'drizzle-orm';
import { db } from './db';
import { 
  responsibleGamingLimits, 
  selfExclusions,
  gamingSessions,
  coolingOffPeriods,
  realityChecks,
  users,
  bets,
  transactions
} from '@shared/schema';
import { authenticateJWT, type AuthenticatedRequest } from './auth';
import { randomUUID } from 'crypto';

export const responsibleGamingRoutes = {
  // Get user's responsible gaming limits and status
  async getLimits(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }



      // Get user data for self-exclusion and cooling-off status
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's responsible gaming limits
      const [userLimits] = await db
        .select()
        .from(responsibleGamingLimits)
        .where(eq(responsibleGamingLimits.userId, req.user.userId))
        .limit(1);

      const now = new Date();

      // Check if cooling-off period has expired
      let isInCoolingOff = user.isInCoolingOff;
      let coolingOffUntil = user.coolingOffUntil;
      
      if (isInCoolingOff && user.coolingOffUntil && new Date(user.coolingOffUntil) <= now) {
        // Cooling-off period expired, update user
        await db.update(users)
          .set({ 
            isInCoolingOff: false, 
            coolingOffUntil: null 
          })
          .where(eq(users.id, req.user.userId));
        isInCoolingOff = false;
        coolingOffUntil = null;
      }

      // Check if self-exclusion period has expired
      let isInSelfExclusion = user.isInSelfExclusion;
      let selfExclusionUntil = user.selfExclusionUntil;
      let selfExclusionType = user.selfExclusionType;
      
      if (isInSelfExclusion && user.selfExclusionType === 'TEMPORARY' && 
          user.selfExclusionUntil && new Date(user.selfExclusionUntil) <= now) {
        // Temporary self-exclusion expired, update user
        await db.update(users)
          .set({ 
            isInSelfExclusion: false, 
            selfExclusionUntil: null,
            selfExclusionType: null
          })
          .where(eq(users.id, req.user.userId));
        isInSelfExclusion = false;
        selfExclusionUntil = null;
        selfExclusionType = null;
      }

      res.json({
        dailyDepositLimit: userLimits?.dailyDepositLimit,
        weeklyDepositLimit: userLimits?.weeklyDepositLimit,
        monthlyDepositLimit: userLimits?.monthlyDepositLimit,
        dailyLossLimit: userLimits?.dailyLossLimit,
        weeklyLossLimit: userLimits?.weeklyLossLimit,
        monthlyLossLimit: userLimits?.monthlyLossLimit,
        sessionTimeLimit: userLimits?.sessionTimeLimit,
        sessionLossLimit: userLimits?.sessionLossLimit,
        realityCheckInterval: userLimits?.realityCheckInterval || 1800,
        isRealityCheckEnabled: userLimits?.isRealityCheckEnabled ?? true,
        isInCoolingOff,
        isInSelfExclusion,
        coolingOffUntil: coolingOffUntil?.toISOString(),
        selfExclusionUntil: selfExclusionUntil?.toISOString(),
        selfExclusionType
      });
    } catch (error) {
      console.error('Error getting responsible gaming limits:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update user's responsible gaming limits
  async updateLimits(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        dailyDepositLimit,
        weeklyDepositLimit,
        monthlyDepositLimit,
        dailyLossLimit,
        weeklyLossLimit,
        monthlyLossLimit,
        sessionTimeLimit,
        sessionLossLimit,
      } = req.body;

      // Check if user is currently in self-exclusion or cooling-off
      const [selfExclusion] = await db
        .select()
        .from(selfExclusions)
        .where(and(
          eq(selfExclusions.userId, req.user.userId),
          eq(selfExclusions.isActive, true)
        ))
        .limit(1);

      if (selfExclusion) {
        const now = new Date();
        if (!selfExclusion.endDate || new Date(selfExclusion.endDate) > now) {
          return res.status(403).json({ error: 'Cannot modify limits during self-exclusion period' });
        }
      }

      // Prepare limit updates
      const limitUpdates = [
        { type: 'DAILY_DEPOSIT', amount: dailyDepositLimit },
        { type: 'WEEKLY_DEPOSIT', amount: weeklyDepositLimit },
        { type: 'MONTHLY_DEPOSIT', amount: monthlyDepositLimit },
        { type: 'DAILY_LOSS', amount: dailyLossLimit },
        { type: 'WEEKLY_LOSS', amount: weeklyLossLimit },
        { type: 'MONTHLY_LOSS', amount: monthlyLossLimit },
        { type: 'SESSION_TIME', timeMinutes: sessionTimeLimit },
        { type: 'SESSION_LOSS', amount: sessionLossLimit },
      ];

      // Remove existing limits and add new ones
      await db
        .delete(responsibleGamingLimits)
        .where(eq(responsibleGamingLimits.userId, req.user.userId));

      // Insert new limits (only non-null values)
      const validLimits = limitUpdates.filter(limit => 
        (limit.amount !== null && limit.amount !== undefined) || 
        (limit.timeMinutes !== null && limit.timeMinutes !== undefined)
      );

      if (validLimits.length > 0) {
        await db.insert(responsibleGamingLimits).values(
          validLimits.map(limit => ({
            id: randomUUID(),
            userId: req.user!.userId,
            type: limit.type as any,
            amount: limit.amount?.toString(),
            timeMinutes: (limit as any).timeMinutes,
            isActive: true,
          }))
        );
      }

      res.json({ success: true, message: 'Responsible gaming limits updated successfully' });
    } catch (error) {
      console.error('Error updating responsible gaming limits:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get user's gaming statistics
  async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate daily betting total
      const dailyBetsResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${bets.amount} AS DECIMAL)), 0)`,
        })
        .from(bets)
        .where(
          and(
            eq(bets.userId, req.user.userId),
            gte(bets.createdAt, today)
          )
        );

      // Calculate weekly betting total
      const weeklyBetsResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${bets.amount} AS DECIMAL)), 0)`,
        })
        .from(bets)
        .where(
          and(
            eq(bets.userId, req.user.userId),
            gte(bets.createdAt, weekStart)
          )
        );

      // Calculate monthly betting total
      const monthlyBetsResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${bets.amount} AS DECIMAL)), 0)`,
        })
        .from(bets)
        .where(
          and(
            eq(bets.userId, req.user.userId),
            gte(bets.createdAt, monthStart)
          )
        );

      // Calculate losses (total bets - total profits)
      const dailyProfitResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${bets.profit} AS DECIMAL)), 0)`,
        })
        .from(bets)
        .where(
          and(
            eq(bets.userId, req.user.userId),
            gte(bets.createdAt, today)
          )
        );

      const weeklyProfitResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${bets.profit} AS DECIMAL)), 0)`,
        })
        .from(bets)
        .where(
          and(
            eq(bets.userId, req.user.userId),
            gte(bets.createdAt, weekStart)
          )
        );

      const monthlyProfitResult = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${bets.profit} AS DECIMAL)), 0)`,
        })
        .from(bets)
        .where(
          and(
            eq(bets.userId, req.user.userId),
            gte(bets.createdAt, monthStart)
          )
        );

      // Get current active session
      const [activeSession] = await db
        .select()
        .from(gamingSessions)
        .where(and(
          eq(gamingSessions.userId, req.user.userId),
          eq(gamingSessions.isActive, true)
        ))
        .limit(1);

      const dailyBets = dailyBetsResult[0]?.total || 0;
      const weeklyBets = weeklyBetsResult[0]?.total || 0;
      const monthlyBets = monthlyBetsResult[0]?.total || 0;
      
      const dailyProfit = dailyProfitResult[0]?.total || 0;
      const weeklyProfit = weeklyProfitResult[0]?.total || 0;
      const monthlyProfit = monthlyProfitResult[0]?.total || 0;

      const dailyLosses = Math.max(0, dailyBets - dailyProfit);
      const weeklyLosses = Math.max(0, weeklyBets - weeklyProfit);
      const monthlyLosses = Math.max(0, monthlyBets - monthlyProfit);

      // Calculate current session time
      let currentSessionMinutes = 0;
      if (activeSession && activeSession.startTime) {
        currentSessionMinutes = Math.floor((now.getTime() - new Date(activeSession.startTime).getTime()) / (1000 * 60));
      }

      res.json({
        dailyBets,
        weeklyBets,
        monthlyBets,
        dailyLosses,
        weeklyLosses,
        monthlyLosses,
        currentSessionMinutes,
        hasActiveSession: !!activeSession,
        sessionWagered: activeSession ? Number(activeSession.totalWagered || 0) : 0,
        sessionNetWinLoss: activeSession ? Number(activeSession.netWinLoss || 0) : 0,
      });
    } catch (error) {
      console.error('Error getting responsible gaming stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Activate cooling-off period
  async activateCoolingOff(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { duration, reason } = req.body;
      const validDurations = ['24H', '48H', '7D', '30D'];
      
      if (!validDurations.includes(duration)) {
        return res.status(400).json({ error: 'Invalid duration' });
      }

      const now = new Date();
      let endTime: Date;

      switch (duration) {
        case '24H':
          endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '48H':
          endTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
          break;
        case '7D':
          endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case '30D':
          endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          return res.status(400).json({ error: 'Invalid duration' });
      }

      // Deactivate existing cooling-off periods
      await db
        .update(coolingOffPeriods)
        .set({ isActive: false })
        .where(eq(coolingOffPeriods.userId, req.user.userId));

      // Create new cooling-off period
      const [coolingOff] = await db
        .insert(coolingOffPeriods)
        .values({
          id: randomUUID(),
          userId: req.user.userId,
          duration: duration as any,
          endTime,
          reason,
          isActive: true,
        })
        .returning();

      res.json({ success: true, coolingOffUntil: endTime });
    } catch (error) {
      console.error('Error activating cooling-off period:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Activate self-exclusion
  async activateSelfExclusion(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { type, days, reason } = req.body;
      
      if (type !== 'TEMPORARY' && type !== 'PERMANENT') {
        return res.status(400).json({ error: 'Invalid self-exclusion type' });
      }

      let endDate: Date | null = null;
      
      if (type === 'TEMPORARY') {
        if (!days || days < 1 || days > 365) {
          return res.status(400).json({ error: 'Days must be between 1 and 365 for temporary exclusion' });
        }
        endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }

      // Deactivate existing self-exclusions
      await db
        .update(selfExclusions)
        .set({ isActive: false })
        .where(eq(selfExclusions.userId, req.user.userId));

      // Create new self-exclusion
      const [exclusion] = await db
        .insert(selfExclusions)
        .values({
          id: randomUUID(),
          userId: req.user.userId,
          type: type as any,
          reason,
          endDate,
          isActive: true,
        })
        .returning();

      res.json({ success: true, selfExclusionUntil: endDate, type });
    } catch (error) {
      console.error('Error activating self-exclusion:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Check if user can perform action (bet, deposit, etc.)
  async checkLimits(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { action, amount } = req.body; // action: 'BET' | 'DEPOSIT'

      // Check self-exclusion
      const [selfExclusion] = await db
        .select()
        .from(selfExclusions)
        .where(and(
          eq(selfExclusions.userId, req.user.userId),
          eq(selfExclusions.isActive, true)
        ))
        .limit(1);

      if (selfExclusion) {
        const now = new Date();
        if (!selfExclusion.endDate || new Date(selfExclusion.endDate) > now) {
          return res.json({ 
            canProceed: false, 
            reason: 'You are currently self-excluded from gambling',
            blockedUntil: selfExclusion.endDate,
            blockType: 'self-exclusion'
          });
        }
      }

      // Check cooling-off
      const now = new Date();
      const [coolingOff] = await db
        .select()
        .from(coolingOffPeriods)
        .where(and(
          eq(coolingOffPeriods.userId, req.user.userId),
          eq(coolingOffPeriods.isActive, true),
          gte(coolingOffPeriods.endTime, now)
        ))
        .limit(1);

      if (coolingOff) {
        return res.json({ 
          canProceed: false, 
          reason: 'You are currently in a cooling-off period',
          blockedUntil: coolingOff.endTime,
          blockType: 'cooling-off'
        });
      }

      res.json({ canProceed: true });
    } catch (error) {
      console.error('Error checking limits:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Start gaming session
  async startSession(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if there's already an active session
      const [existingSession] = await db
        .select()
        .from(gamingSessions)
        .where(and(
          eq(gamingSessions.userId, req.user.userId),
          eq(gamingSessions.isActive, true)
        ))
        .limit(1);

      if (existingSession) {
        return res.json({ success: true, sessionId: existingSession.id });
      }

      // Create new session
      const [session] = await db
        .insert(gamingSessions)
        .values({
          id: randomUUID(),
          userId: req.user.userId,
          isActive: true,
        })
        .returning();

      res.json({ success: true, sessionId: session.id });
    } catch (error) {
      console.error('Error starting gaming session:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // End gaming session
  async endSession(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Find active session
      const [session] = await db
        .select()
        .from(gamingSessions)
        .where(and(
          eq(gamingSessions.userId, req.user.userId),
          eq(gamingSessions.isActive, true)
        ))
        .limit(1);

      if (session) {
        await db
          .update(gamingSessions)
          .set({
            endTime: new Date(),
            isActive: false,
          })
          .where(eq(gamingSessions.id, session.id));
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error ending gaming session:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Trigger reality check
  async triggerRealityCheck(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get current active session
      const [session] = await db
        .select()
        .from(gamingSessions)
        .where(and(
          eq(gamingSessions.userId, req.user.userId),
          eq(gamingSessions.isActive, true)
        ))
        .limit(1);

      if (!session) {
        return res.status(400).json({ error: 'No active session found' });
      }

      const now = new Date();
      const sessionDuration = Math.floor((now.getTime() - new Date(session.startTime).getTime()) / (1000 * 60));

      // Create reality check record
      const [realityCheck] = await db
        .insert(realityChecks)
        .values({
          id: randomUUID(),
          userId: req.user.userId,
          sessionId: session.id,
          sessionDuration,
          totalWagered: session.totalWagered || "0",
        })
        .returning();

      res.json({ 
        success: true, 
        realityCheckId: realityCheck.id,
        sessionDuration,
        totalWagered: session.totalWagered
      });
    } catch (error) {
      console.error('Error triggering reality check:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Respond to reality check
  async respondToRealityCheck(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { realityCheckId, response } = req.body; // response: 'CONTINUE' | 'BREAK' | 'STOP'
      
      const validResponses = ['CONTINUE', 'BREAK', 'STOP'];
      if (!validResponses.includes(response)) {
        return res.status(400).json({ error: 'Invalid response' });
      }

      // Update reality check with response
      await db
        .update(realityChecks)
        .set({
          userResponse: response as any,
          respondedAt: new Date(),
        })
        .where(eq(realityChecks.id, realityCheckId));

      // If user chose STOP, end their session
      if (response === 'STOP') {
        await db
          .update(gamingSessions)
          .set({
            endTime: new Date(),
            isActive: false,
          })
          .where(and(
            eq(gamingSessions.userId, req.user.userId),
            eq(gamingSessions.isActive, true)
          ));
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error responding to reality check:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};