import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { authenticateJWT, type AuthenticatedRequest } from '../auth';
import { db } from '../db';
import { transactions, balances } from '@shared/schema';

const router = Router();

// Input validation schemas
const selectBonusSchema = z.object({
  bonusType: z.enum(['first_deposit', 'second_deposit', 'third_deposit'])
});

const updateWageringSchema = z.object({
  betAmount: z.number().positive()
});

// GET /api/bonuses/wagering-requirements - Check wagering requirements for withdrawal
router.get('/wagering-requirements', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const wageringCheck = await storage.checkWageringRequirements(userId);
    
    res.json(wageringCheck);
  } catch (error) {
    console.error('Error checking wagering requirements:', error);
    res.status(500).json({ error: 'Failed to check wagering requirements' });
  }
});

// GET /api/bonuses/available - Get available bonuses for user
router.get('/available', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    
    // Get current date for daily tracking
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get user's daily deposit count
    const dailyDepositCount = await storage.getUserDailyDepositCount(userId, today);
    
    // Get all available deposit bonuses
    const allBonuses = await storage.getAllDepositBonuses();
    
    // Get user's active bonuses for today
    const userActiveBonuses = await storage.getUserActiveBonuses(userId);
    
    // Get user's bonus history to check if already claimed today
    const userBonusHistory = await storage.getUserBonusHistory(userId);
    
    // Filter bonuses claimed today
    const todayBonuses = userBonusHistory.filter(bonus => {
      const claimedDate = new Date(bonus.claimedAt);
      claimedDate.setHours(0, 0, 0, 0);
      return claimedDate.getTime() === today.getTime();
    });
    
    // Map bonuses with their availability status
    const availableBonuses = allBonuses.map(bonus => {
      // Check if this specific bonus type was claimed today
      const claimedToday = todayBonuses.some(ub => {
        const bonusMatch = allBonuses.find(b => b.id === ub.bonusId);
        return bonusMatch?.bonusType === bonus.bonusType;
      });
      
      // Check if user has an active bonus of this type
      const activeBonus = userActiveBonuses.find(ub => {
        const bonusMatch = allBonuses.find(b => b.id === ub.bonusId);
        return bonusMatch?.bonusType === bonus.bonusType;
      });
      
      // Determine status based on deposit count and claim status
      let status: 'available' | 'claimed' | 'locked';
      let eligibleOn: number | null = null;
      
      if (claimedToday || activeBonus) {
        status = 'claimed';
      } else if (
        (bonus.bonusType === 'first_deposit' && dailyDepositCount === 0) ||
        (bonus.bonusType === 'second_deposit' && dailyDepositCount === 1) ||
        (bonus.bonusType === 'third_deposit' && dailyDepositCount === 2)
      ) {
        status = 'available';
      } else {
        status = 'locked';
        // Calculate which deposit number this bonus is eligible on
        if (bonus.bonusType === 'first_deposit') eligibleOn = 1;
        else if (bonus.bonusType === 'second_deposit') eligibleOn = 2;
        else if (bonus.bonusType === 'third_deposit') eligibleOn = 3;
      }
      
      return {
        id: bonus.id,
        bonusType: bonus.bonusType,
        percentage: Number(bonus.percentage),
        minDeposit: Number(bonus.minDeposit),
        wageringMultiplier: bonus.wageringMultiplier,
        description: bonus.description,
        status,
        eligibleOn,
        currentDepositCount: dailyDepositCount,
        wageringProgress: activeBonus ? {
          wageredAmount: Number(activeBonus.wageredAmount),
          wageringRequirement: Number(activeBonus.wageringRequirement),
          percentage: (Number(activeBonus.wageredAmount) / Number(activeBonus.wageringRequirement)) * 100
        } : null
      };
    });
    
    res.json({
      bonuses: availableBonuses,
      dailyDepositCount,
      currentDate: today.toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching available bonuses:', error);
    res.status(500).json({ error: 'Failed to fetch available bonuses' });
  }
});

// POST /api/bonuses/select - Select a bonus (does not claim it - bonus is applied after deposit)
router.post('/select', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const validation = selectBonusSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: validation.error.errors 
      });
    }
    
    const { bonusType } = validation.data;
    
    // Get current date for daily tracking
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get user's daily deposit count
    const dailyDepositCount = await storage.getUserDailyDepositCount(userId, today);
    
    // Validate deposit count eligibility
    const expectedCount = bonusType === 'first_deposit' ? 0 : 
                        bonusType === 'second_deposit' ? 1 : 2;
    
    if (dailyDepositCount !== expectedCount) {
      return res.status(400).json({ 
        error: `You are not eligible for ${bonusType.replace('_', ' ')}. Current deposit count: ${dailyDepositCount}` 
      });
    }
    
    // Get the bonus configuration
    const bonusConfig = await storage.getDepositBonusByType(bonusType);
    
    if (!bonusConfig) {
      return res.status(404).json({ error: 'Bonus configuration not found' });
    }
    
    // Check if user already has a pending bonus selection
    const existingSelection = await storage.getPendingBonusSelection(userId);
    if (existingSelection) {
      // Expire the existing selection
      await storage.expirePendingBonusSelections(userId);
    }
    
    // Check if user already claimed this bonus type today
    const userBonusHistory = await storage.getUserBonusHistory(userId);
    const todayBonuses = userBonusHistory.filter(bonus => {
      const claimedDate = new Date(bonus.claimedAt);
      claimedDate.setHours(0, 0, 0, 0);
      return claimedDate.getTime() === today.getTime();
    });
    
    const alreadyClaimed = todayBonuses.some(ub => ub.bonusId === bonusConfig.id);
    
    if (alreadyClaimed) {
      return res.status(400).json({ 
        error: `You have already claimed the ${bonusType.replace('_', ' ')} today` 
      });
    }
    
    // Check for active bonuses of this type
    const activeBonuses = await storage.getUserActiveBonuses(userId);
    const hasActiveBonus = activeBonuses.some(ub => ub.bonusId === bonusConfig.id);
    
    if (hasActiveBonus) {
      return res.status(400).json({ 
        error: 'You already have an active bonus. Complete it before selecting a new one.' 
      });
    }
    
    // Create pending bonus selection (does NOT apply the bonus yet)
    const selection = await storage.createPendingBonusSelection({
      userId,
      bonusType,
      bonusId: bonusConfig.id,
      status: 'pending',
      sessionId: req.sessionID // Store session ID for verification
    });
    
    res.json({
      success: true,
      message: `${bonusType.replace('_', ' ')} bonus selected! Make a deposit of at least $${bonusConfig.minDeposit} to claim it.`,
      bonusType,
      bonusPercentage: Number(bonusConfig.percentage),
      minDeposit: Number(bonusConfig.minDeposit),
      wageringMultiplier: bonusConfig.wageringMultiplier,
      selectionId: selection.id
    });
    
  } catch (error: any) {
    console.error('Error claiming bonus:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to claim bonus'
    });
  }
});

// GET /api/bonuses/pending-selection - Get user's pending bonus selection
router.get('/pending-selection', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const pendingSelection = await storage.getPendingBonusSelection(userId);
    
    if (!pendingSelection) {
      return res.json({ hasSelection: false });
    }
    
    // Get bonus details
    const bonusConfig = await storage.getDepositBonusByType(pendingSelection.bonusType);
    
    res.json({
      hasSelection: true,
      selection: {
        id: pendingSelection.id,
        bonusType: pendingSelection.bonusType,
        bonusPercentage: bonusConfig ? Number(bonusConfig.percentage) : 0,
        minDeposit: bonusConfig ? Number(bonusConfig.minDeposit) : 10,
        wageringMultiplier: bonusConfig?.wageringMultiplier || 15,
        selectedAt: pendingSelection.selectedAt,
        expectedDepositAmount: pendingSelection.expectedDepositAmount ? 
          Number(pendingSelection.expectedDepositAmount) : null
      }
    });
  } catch (error) {
    console.error('Error fetching pending bonus selection:', error);
    res.status(500).json({ error: 'Failed to fetch pending bonus selection' });
  }
});

// DELETE /api/bonuses/pending-selection - Cancel pending bonus selection
router.delete('/pending-selection', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    await storage.expirePendingBonusSelections(userId);
    
    res.json({
      success: true,
      message: 'Bonus selection cancelled'
    });
  } catch (error) {
    console.error('Error cancelling bonus selection:', error);
    res.status(500).json({ error: 'Failed to cancel bonus selection' });
  }
});

// GET /api/bonuses/active - Get user's active bonuses with wagering progress
router.get('/active', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    
    // Get all active bonuses for the user
    const activeBonuses = await storage.getUserActiveBonuses(userId);
    
    // Get bonus configurations to include details
    const allBonuses = await storage.getAllDepositBonuses();
    
    // Map active bonuses with their details and progress
    const bonusesWithProgress = activeBonuses.map(bonus => {
      const config = allBonuses.find(b => b.id === bonus.bonusId);
      const wageredAmount = Number(bonus.wageredAmount);
      const requirement = Number(bonus.wageringRequirement);
      const progressPercentage = requirement > 0 ? (wageredAmount / requirement) * 100 : 0;
      
      // Check if bonus has expired (24 hours after claim)
      const claimedAt = new Date(bonus.claimedAt);
      const expiresAt = new Date(claimedAt.getTime() + 24 * 60 * 60 * 1000);
      const isExpired = new Date() > expiresAt;
      
      return {
        id: bonus.id,
        bonusType: config?.bonusType || 'unknown',
        description: config?.description || '',
        depositAmount: Number(bonus.depositAmount),
        bonusAmount: Number(bonus.bonusAmount),
        wageringRequirement: requirement,
        wageredAmount: wageredAmount,
        progressPercentage: Math.min(100, progressPercentage),
        remaining: Math.max(0, requirement - wageredAmount),
        status: isExpired ? 'expired' : bonus.status,
        claimedAt: bonus.claimedAt,
        expiresAt: expiresAt.toISOString(),
        completedAt: bonus.completedAt
      };
    });
    
    // Filter out expired bonuses and update their status if needed
    const validBonuses = [];
    for (const bonus of bonusesWithProgress) {
      if (bonus.status === 'expired' && activeBonuses.find(b => b.id === bonus.id)?.status === 'active') {
        // Update expired bonus in database
        await storage.expireUserBonus(bonus.id);
      } else if (bonus.status === 'active') {
        validBonuses.push(bonus);
      }
    }
    
    res.json({
      bonuses: validBonuses,
      total: validBonuses.length
    });
    
  } catch (error) {
    console.error('Error fetching active bonuses:', error);
    res.status(500).json({ error: 'Failed to fetch active bonuses' });
  }
});

// POST /api/bonuses/update-wagering - Update wagering progress when user places bets
router.post('/update-wagering', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const validation = updateWageringSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: validation.error.errors 
      });
    }
    
    const { betAmount } = validation.data;
    
    // Get all active bonuses for the user
    const activeBonuses = await storage.getUserActiveBonuses(userId);
    
    if (activeBonuses.length === 0) {
      return res.json({
        success: true,
        message: 'No active bonuses to update',
        updatedBonuses: []
      });
    }
    
    const updatedBonuses = [];
    
    // Update wagering for each active bonus
    for (const bonus of activeBonuses) {
      // Check if bonus has expired (24 hours after claim)
      const claimedAt = new Date(bonus.claimedAt);
      const expiresAt = new Date(claimedAt.getTime() + 24 * 60 * 60 * 1000);
      
      if (new Date() > expiresAt) {
        // Expire the bonus
        await storage.expireUserBonus(bonus.id);
        continue;
      }
      
      const currentWagered = Number(bonus.wageredAmount);
      const requirement = Number(bonus.wageringRequirement);
      const newWagered = Math.min(currentWagered + betAmount, requirement);
      
      // Update wagered amount
      await storage.updateUserBonusWagering(bonus.id, newWagered.toString());
      
      // Check if wagering requirement is met
      if (newWagered >= requirement) {
        await storage.completeUserBonus(bonus.id);
        updatedBonuses.push({
          id: bonus.id,
          wageredAmount: newWagered,
          wageringRequirement: requirement,
          progressPercentage: 100,
          status: 'completed',
          message: 'Wagering requirement completed!'
        });
      } else {
        updatedBonuses.push({
          id: bonus.id,
          wageredAmount: newWagered,
          wageringRequirement: requirement,
          progressPercentage: (newWagered / requirement) * 100,
          remaining: requirement - newWagered,
          status: 'active'
        });
      }
    }
    
    res.json({
      success: true,
      betAmount,
      updatedBonuses,
      message: updatedBonuses.some(b => b.status === 'completed') 
        ? 'Wagering requirement completed for some bonuses!' 
        : 'Wagering progress updated'
    });
    
  } catch (error) {
    console.error('Error updating wagering progress:', error);
    res.status(500).json({ error: 'Failed to update wagering progress' });
  }
});

// GET /api/bonuses/reset-history - Get user's bonus reset history
router.get('/reset-history', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const resetHistory = await storage.getUserBonusResetHistory(userId);
    
    // Get bonus configurations to include details
    const allBonuses = await storage.getAllDepositBonuses();
    
    // Enhance reset history with bonus details
    const enhancedHistory = resetHistory.map(reset => {
      const previousBonus = reset.previousBonusId ? 
        allBonuses.find(b => b.id === reset.previousBonusId) : null;
      const newBonus = reset.newBonusId ? 
        allBonuses.find(b => b.id === reset.newBonusId) : null;
      
      return {
        id: reset.id,
        balanceAtReset: Number(reset.balanceAtReset) / 100, // Convert to credits
        previousBonus: previousBonus ? {
          type: previousBonus.bonusType,
          percentage: Number(previousBonus.percentage),
          status: reset.previousBonusStatus
        } : null,
        newBonus: newBonus ? {
          type: newBonus.bonusType,
          percentage: Number(newBonus.percentage)
        } : null,
        resetType: reset.resetType,
        resetAt: reset.resetAt,
        metadata: reset.metadata
      };
    });
    
    res.json({
      success: true,
      history: enhancedHistory
    });
  } catch (error) {
    console.error('Error fetching bonus reset history:', error);
    res.status(500).json({ error: 'Failed to fetch bonus reset history' });
  }
});

// GET /api/bonuses/bonus-history - Get complete bonus history including resets
router.get('/bonus-history', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    
    // Get user's bonus history
    const userBonuses = await storage.getUserBonusHistory(userId);
    const resetHistory = await storage.getUserBonusResetHistory(userId);
    const allBonuses = await storage.getAllDepositBonuses();
    
    // Enhance bonus history
    const enhancedBonuses = userBonuses.map(bonus => {
      const config = allBonuses.find(b => b.id === bonus.bonusId);
      return {
        id: bonus.id,
        type: 'bonus_claimed',
        bonusType: config?.bonusType || 'unknown',
        percentage: config ? Number(config.percentage) : 0,
        depositAmount: Number(bonus.depositAmount) / 100,
        bonusAmount: Number(bonus.bonusAmount) / 100,
        wageringRequirement: Number(bonus.wageringRequirement) / 100,
        wageredAmount: Number(bonus.wageredAmount) / 100,
        status: bonus.status,
        claimedAt: bonus.claimedAt,
        completedAt: bonus.completedAt
      };
    });
    
    // Enhance reset history
    const enhancedResets = resetHistory.map(reset => ({
      id: reset.id,
      type: 'bonus_reset',
      resetType: reset.resetType,
      balanceAtReset: Number(reset.balanceAtReset) / 100,
      previousBonusStatus: reset.previousBonusStatus,
      resetAt: reset.resetAt,
      metadata: reset.metadata
    }));
    
    // Combine and sort by date
    const allHistory = [...enhancedBonuses, ...enhancedResets].sort((a, b) => {
      const dateA = new Date(a.claimedAt || a.resetAt || 0);
      const dateB = new Date(b.claimedAt || b.resetAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    res.json({
      success: true,
      history: allHistory,
      totalBonuses: enhancedBonuses.length,
      totalResets: enhancedResets.length
    });
  } catch (error) {
    console.error('Error fetching complete bonus history:', error);
    res.status(500).json({ error: 'Failed to fetch bonus history' });
  }
});

export const bonusRouter = router;