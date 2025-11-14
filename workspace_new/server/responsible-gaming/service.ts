import { storage } from "../storage";
import type { 
  ResponsibleGamingLimit, 
  SelfExclusion, 
  GamingSession, 
  CoolingOffPeriod,
  RealityCheck 
} from "../../shared/schema";

interface LimitCheckResult {
  allowed: boolean;
  limitType?: string;
  limitAmount?: number;
  currentAmount?: number;
  resetTime?: Date;
  message?: string;
}

interface SessionInfo {
  sessionId: string;
  duration: number;
  totalWagered: number;
  netWinLoss: number;
  gamesPlayed: number;
}

class ResponsibleGamingService {
  
  /**
   * Check if a user can place a bet based on their responsible gaming limits
   */
  async checkBetAllowed(userId: string, betAmount: number): Promise<LimitCheckResult> {
    try {
      // Check if user is self-excluded
      const selfExclusion = await this.getActiveSelfExclusion(userId);
      if (selfExclusion) {
        return {
          allowed: false,
          message: `Account is self-excluded until ${selfExclusion.endDate || 'permanently'}`
        };
      }

      // Check if user is in cooling-off period
      const coolingOff = await this.getActiveCoolingOffPeriod(userId);
      if (coolingOff) {
        return {
          allowed: false,
          message: `Account is in cooling-off period until ${coolingOff.endTime}`
        };
      }

      // Check deposit limits
      const depositLimitCheck = await this.checkDepositLimits(userId, betAmount);
      if (!depositLimitCheck.allowed) {
        return depositLimitCheck;
      }

      // Check loss limits
      const lossLimitCheck = await this.checkLossLimits(userId, betAmount);
      if (!lossLimitCheck.allowed) {
        return lossLimitCheck;
      }

      // Check session limits
      const sessionLimitCheck = await this.checkSessionLimits(userId, betAmount);
      if (!sessionLimitCheck.allowed) {
        return sessionLimitCheck;
      }

      return { allowed: true };
    } catch (error) {
      console.error("Error checking bet allowance:", error);
      return {
        allowed: false,
        message: "Unable to verify bet limits at this time"
      };
    }
  }

  /**
   * Check deposit limits
   */
  private async checkDepositLimits(userId: string, amount: number): Promise<LimitCheckResult> {
    const limits = await storage.getUserResponsibleGamingLimits(userId);
    
    for (const limit of limits) {
      if (!limit.isActive || !limit.amount) continue;
      
      const now = new Date();
      let startTime: Date;
      
      switch (limit.type) {
        case 'DAILY_DEPOSIT':
          startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'WEEKLY_DEPOSIT':
          const dayOfWeek = now.getDay();
          startTime = new Date(now.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
          startTime.setHours(0, 0, 0, 0);
          break;
        case 'MONTHLY_DEPOSIT':
          startTime = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          continue;
      }
      
      const periodSpent = await storage.getUserDepositSum(userId, startTime, now);
      const totalAfterBet = periodSpent + amount;
      
      if (totalAfterBet > parseFloat(limit.amount)) {
        const resetTime = this.getNextResetTime(limit.type, now);
        return {
          allowed: false,
          limitType: limit.type,
          limitAmount: parseFloat(limit.amount),
          currentAmount: periodSpent,
          resetTime,
          message: `${limit.type.replace('_', ' ').toLowerCase()} limit of ${limit.amount} would be exceeded`
        };
      }
    }
    
    return { allowed: true };
  }

  /**
   * Check loss limits
   */
  private async checkLossLimits(userId: string, amount: number): Promise<LimitCheckResult> {
    const limits = await storage.getUserResponsibleGamingLimits(userId);
    
    for (const limit of limits) {
      if (!limit.isActive || !limit.amount) continue;
      
      const now = new Date();
      let startTime: Date;
      
      switch (limit.type) {
        case 'DAILY_LOSS':
          startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'WEEKLY_LOSS':
          const dayOfWeek = now.getDay();
          startTime = new Date(now.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
          startTime.setHours(0, 0, 0, 0);
          break;
        case 'MONTHLY_LOSS':
          startTime = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          continue;
      }
      
      const periodLoss = await storage.getUserLossSum(userId, startTime, now);
      const potentialLoss = periodLoss + amount; // Worst case: user loses entire bet
      
      if (potentialLoss > parseFloat(limit.amount)) {
        const resetTime = this.getNextResetTime(limit.type, now);
        return {
          allowed: false,
          limitType: limit.type,
          limitAmount: parseFloat(limit.amount),
          currentAmount: periodLoss,
          resetTime,
          message: `${limit.type.replace('_', ' ').toLowerCase()} limit of ${limit.amount} would be exceeded`
        };
      }
    }
    
    return { allowed: true };
  }

  /**
   * Check session limits
   */
  private async checkSessionLimits(userId: string, amount: number): Promise<LimitCheckResult> {
    const limits = await storage.getUserResponsibleGamingLimits(userId);
    const activeSession = await storage.getActiveGamingSession(userId);
    
    if (!activeSession) return { allowed: true };
    
    for (const limit of limits) {
      if (!limit.isActive) continue;
      
      if (limit.type === 'SESSION_TIME' && limit.timeMinutes) {
        const sessionDuration = (Date.now() - activeSession.startTime.getTime()) / (1000 * 60);
        if (sessionDuration >= limit.timeMinutes) {
          return {
            allowed: false,
            limitType: limit.type,
            message: `Session time limit of ${limit.timeMinutes} minutes exceeded`
          };
        }
      }
      
      if (limit.type === 'SESSION_LOSS' && limit.amount) {
        const sessionLoss = Math.abs(Math.min(0, parseFloat(activeSession.netWinLoss || "0")));
        const potentialLoss = sessionLoss + amount;
        
        if (potentialLoss > parseFloat(limit.amount)) {
          return {
            allowed: false,
            limitType: limit.type,
            limitAmount: parseFloat(limit.amount),
            currentAmount: sessionLoss,
            message: `Session loss limit of ${limit.amount} would be exceeded`
          };
        }
      }
    }
    
    return { allowed: true };
  }

  /**
   * Get next reset time for a limit type
   */
  private getNextResetTime(limitType: string, now: Date): Date {
    switch (limitType) {
      case 'DAILY_DEPOSIT':
      case 'DAILY_LOSS':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
        
      case 'WEEKLY_DEPOSIT':
      case 'WEEKLY_LOSS':
        const nextWeek = new Date(now);
        const daysToAdd = 7 - now.getDay();
        nextWeek.setDate(nextWeek.getDate() + daysToAdd);
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek;
        
      case 'MONTHLY_DEPOSIT':
      case 'MONTHLY_LOSS':
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return nextMonth;
        
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to next day
    }
  }

  /**
   * Start a gaming session
   */
  async startGamingSession(userId: string): Promise<string> {
    // End any existing active session
    await this.endActiveGamingSession(userId);
    
    const sessionId = crypto.randomUUID();
    await storage.createGamingSession({
      id: sessionId,
      userId,
      isActive: true
    });
    
    return sessionId;
  }

  /**
   * Update gaming session with bet activity
   */
  async updateGamingSession(userId: string, wagered: number, winLoss: number): Promise<void> {
    const activeSession = await storage.getActiveGamingSession(userId);
    if (!activeSession) {
      // Start a new session if none exists
      await this.startGamingSession(userId);
      return this.updateGamingSession(userId, wagered, winLoss);
    }
    
    await storage.updateGamingSession(activeSession.id, {
      totalWagered: (parseFloat(activeSession.totalWagered || "0") + wagered).toString(),
      netWinLoss: (parseFloat(activeSession.netWinLoss || "0") + winLoss).toString(),
      gamesSessions: (activeSession.gamesSessions || 0) + 1
    });
    
    // Check if reality check should be triggered
    await this.checkRealityCheck(userId, activeSession.id);
  }

  /**
   * End active gaming session
   */
  async endActiveGamingSession(userId: string): Promise<void> {
    const activeSession = await storage.getActiveGamingSession(userId);
    if (activeSession) {
      await storage.updateGamingSession(activeSession.id, {
        endTime: new Date(),
        isActive: false
      });
    }
  }

  /**
   * Check if reality check should be triggered
   */
  private async checkRealityCheck(userId: string, sessionId: string): Promise<void> {
    const session = await storage.getGamingSession(sessionId);
    if (!session) return;
    
    const sessionDuration = (Date.now() - session.startTime.getTime()) / (1000 * 60);
    const totalWagered = parseFloat(session.totalWagered || "0");
    
    // Trigger reality check every 60 minutes or every $500 wagered
    const shouldTrigger = (sessionDuration >= 60 && sessionDuration % 60 < 1) || 
                         (totalWagered >= 500 && Math.floor(totalWagered / 500) > Math.floor((totalWagered - parseFloat(session.totalWagered || "0")) / 500));
    
    if (shouldTrigger) {
      await storage.createRealityCheck({
        userId,
        sessionId,
        sessionDuration: Math.floor(sessionDuration),
        totalWagered: totalWagered.toString()
      });
    }
  }

  /**
   * Get active self-exclusion for user
   */
  async getActiveSelfExclusion(userId: string): Promise<SelfExclusion | null> {
    const exclusions = await storage.getUserSelfExclusions(userId);
    const now = new Date();
    
    for (const exclusion of exclusions) {
      if (!exclusion.isActive) continue;
      
      if (exclusion.type === 'PERMANENT') {
        return exclusion;
      }
      
      if (exclusion.endDate && exclusion.endDate > now) {
        return exclusion;
      }
    }
    
    return null;
  }

  /**
   * Get active cooling-off period for user
   */
  async getActiveCoolingOffPeriod(userId: string): Promise<CoolingOffPeriod | null> {
    const periods = await storage.getUserCoolingOffPeriods(userId);
    const now = new Date();
    
    for (const period of periods) {
      if (period.isActive && period.endTime > now) {
        return period;
      }
    }
    
    return null;
  }

  /**
   * Set responsible gaming limit
   */
  async setLimit(userId: string, type: string, amount?: number, timeMinutes?: number): Promise<void> {
    // Deactivate existing limits of the same type
    await storage.deactivateResponsibleGamingLimits(userId, type);
    
    // Create new limit
    await storage.createResponsibleGamingLimit({
      userId,
      type,
      amount: amount?.toString(),
      timeMinutes,
      isActive: true,
      activeFrom: new Date()
    });
  }

  /**
   * Request self-exclusion
   */
  async requestSelfExclusion(userId: string, type: 'TEMPORARY' | 'PERMANENT', duration?: string, reason?: string): Promise<void> {
    const endDate = type === 'TEMPORARY' && duration ? this.calculateEndDate(duration) : undefined;
    
    // End any active gaming session
    await this.endActiveGamingSession(userId);
    
    await storage.createSelfExclusion({
      userId,
      type,
      endDate,
      reason,
      isActive: true
    });
  }

  /**
   * Request cooling-off period
   */
  async requestCoolingOff(userId: string, duration: '24H' | '48H' | '7D' | '30D', reason?: string): Promise<void> {
    const endTime = this.calculateEndDate(duration);
    
    // End any active gaming session
    await this.endActiveGamingSession(userId);
    
    await storage.createCoolingOffPeriod({
      userId,
      duration,
      endTime,
      reason,
      isActive: true
    });
  }

  /**
   * Calculate end date based on duration string
   */
  private calculateEndDate(duration: string): Date {
    const now = new Date();
    
    switch (duration) {
      case '24H':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '48H':
        return new Date(now.getTime() + 48 * 60 * 60 * 1000);
      case '7D':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case '30D':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case '6M':
        const sixMonths = new Date(now);
        sixMonths.setMonth(sixMonths.getMonth() + 6);
        return sixMonths;
      case '1Y':
        const oneYear = new Date(now);
        oneYear.setFullYear(oneYear.getFullYear() + 1);
        return oneYear;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get user's current responsible gaming status
   */
  async getUserStatus(userId: string): Promise<{
    limits: ResponsibleGamingLimit[];
    selfExclusion: SelfExclusion | null;
    coolingOff: CoolingOffPeriod | null;
    activeSession: GamingSession | null;
    pendingRealityChecks: RealityCheck[];
  }> {
    const [limits, selfExclusion, coolingOff, activeSession, realityChecks] = await Promise.all([
      storage.getUserResponsibleGamingLimits(userId),
      this.getActiveSelfExclusion(userId),
      this.getActiveCoolingOffPeriod(userId),
      storage.getActiveGamingSession(userId),
      storage.getUserPendingRealityChecks(userId)
    ]);
    
    return {
      limits,
      selfExclusion,
      coolingOff,
      activeSession,
      pendingRealityChecks: realityChecks
    };
  }
}

export const responsibleGamingService = new ResponsibleGamingService();