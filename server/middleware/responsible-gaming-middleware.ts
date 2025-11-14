import { Request, Response, NextFunction } from 'express';
import { and, eq, sql, gte } from 'drizzle-orm';
import { db } from '../db';
import { 
  responsibleGamingLimits, 
  selfExclusions,
  coolingOffPeriods,
  bets,
  gamingSessions
} from '@shared/schema';
import { type AuthenticatedRequest } from '../auth';

export interface ResponsibleGamingCheck {
  canProceed: boolean;
  reason?: string;
  blockedUntil?: Date;
  blockType?: 'self-exclusion' | 'cooling-off' | 'limit-exceeded';
  limitType?: string;
}

export async function checkResponsibleGamingLimits(
  userId: string,
  action: 'BET' | 'DEPOSIT',
  amount: number
): Promise<ResponsibleGamingCheck> {
  try {
    const now = new Date();

    // Check self-exclusion
    const [selfExclusion] = await db
      .select()
      .from(selfExclusions)
      .where(and(
        eq(selfExclusions.userId, userId),
        eq(selfExclusions.isActive, true)
      ))
      .limit(1);

    if (selfExclusion && (!selfExclusion.endDate || new Date(selfExclusion.endDate) > now)) {
      return {
        canProceed: false,
        reason: 'You are currently self-excluded from gambling',
        blockedUntil: selfExclusion.endDate || undefined,
        blockType: 'self-exclusion'
      };
    }

    // Check cooling-off period
    const [coolingOff] = await db
      .select()
      .from(coolingOffPeriods)
      .where(and(
        eq(coolingOffPeriods.userId, userId),
        eq(coolingOffPeriods.isActive, true),
        gte(coolingOffPeriods.endTime, now)
      ))
      .limit(1);

    if (coolingOff) {
      return {
        canProceed: false,
        reason: 'You are currently in a cooling-off period',
        blockedUntil: coolingOff.endTime,
        blockType: 'cooling-off'
      };
    }

    // For betting, check loss limits
    if (action === 'BET') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get active limits
      const limits = await db
        .select()
        .from(responsibleGamingLimits)
        .where(and(
          eq(responsibleGamingLimits.userId, userId),
          eq(responsibleGamingLimits.isActive, true)
        ));

      const limitsByType: Record<string, any> = {};
      limits.forEach(limit => {
        limitsByType[limit.type] = {
          amount: limit.amount,
          timeMinutes: limit.timeMinutes
        };
      });

      // Check session time limit
      if (limitsByType['SESSION_TIME']) {
        const [activeSession] = await db
          .select()
          .from(gamingSessions)
          .where(and(
            eq(gamingSessions.userId, userId),
            eq(gamingSessions.isActive, true)
          ))
          .limit(1);

        if (activeSession && activeSession.startTime) {
          const sessionMinutes = Math.floor((now.getTime() - new Date(activeSession.startTime).getTime()) / (1000 * 60));
          if (sessionMinutes >= limitsByType['SESSION_TIME'].timeMinutes) {
            return {
              canProceed: false,
              reason: 'Session time limit reached',
              blockType: 'limit-exceeded',
              limitType: 'SESSION_TIME'
            };
          }
        }
      }

      // Check loss limits
      const periods = [
        { type: 'DAILY_LOSS', startDate: today },
        { type: 'WEEKLY_LOSS', startDate: weekStart },
        { type: 'MONTHLY_LOSS', startDate: monthStart }
      ];

      for (const period of periods) {
        const limit = limitsByType[period.type];
        if (!limit?.amount) continue;

        // Get current losses for the period
        const lossResult = await db
          .select({
            totalLoss: sql<number>`COALESCE(SUM(CASE WHEN CAST(${bets.profit} AS DECIMAL) < 0 THEN ABS(CAST(${bets.profit} AS DECIMAL)) ELSE 0 END), 0)`,
          })
          .from(bets)
          .where(
            and(
              eq(bets.userId, userId),
              gte(bets.createdAt, period.startDate)
            )
          );

        const currentLoss = lossResult[0]?.totalLoss || 0;
        const limitAmount = parseFloat(limit.amount);

        if (currentLoss + amount > limitAmount) {
          return {
            canProceed: false,
            reason: `${period.type.replace('_', ' ').toLowerCase()} limit would be exceeded`,
            blockType: 'limit-exceeded',
            limitType: period.type
          };
        }
      }

      // Check session loss limit
      if (limitsByType['SESSION_LOSS']) {
        const [activeSession] = await db
          .select()
          .from(gamingSessions)
          .where(and(
            eq(gamingSessions.userId, userId),
            eq(gamingSessions.isActive, true)
          ))
          .limit(1);

        if (activeSession) {
          const sessionLoss = Math.max(0, -Number(activeSession.netWinLoss || 0));
          const limitAmount = parseFloat(limitsByType['SESSION_LOSS'].amount);

          if (sessionLoss + amount > limitAmount) {
            return {
              canProceed: false,
              reason: 'Session loss limit would be exceeded',
              blockType: 'limit-exceeded',
              limitType: 'SESSION_LOSS'
            };
          }
        }
      }
    }

    return { canProceed: true };
  } catch (error) {
    console.error('Error checking responsible gaming limits:', error);
    // In case of error, allow the action but log it
    return { canProceed: true };
  }
}

// Middleware function for Express routes
export function responsibleGamingMiddleware(action: 'BET' | 'DEPOSIT') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const amount = req.body.amount || 0;
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise<ResponsibleGamingCheck>((resolve) => {
        setTimeout(() => {
          console.warn('Responsible gaming check timed out, allowing action');
          resolve({ canProceed: true });
        }, 2000); // 2 second timeout
      });
      
      const checkPromise = checkResponsibleGamingLimits(req.user.userId, action, amount);
      const check = await Promise.race([checkPromise, timeoutPromise]);

      if (!check.canProceed) {
        return res.status(403).json({
          error: 'Action blocked by responsible gaming limits',
          reason: check.reason,
          blockedUntil: check.blockedUntil,
          blockType: check.blockType,
          limitType: check.limitType
        });
      }

      next();
    } catch (error) {
      console.error('Responsible gaming middleware error:', error);
      // Continue on error, but log it
      next();
    }
  };
}