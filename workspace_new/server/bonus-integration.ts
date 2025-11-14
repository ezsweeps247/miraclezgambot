/**
 * Bonus Wagering Integration Helper
 * 
 * This module provides a helper function to update wagering progress
 * whenever a user places a bet. This should be called from all game endpoints
 * after a bet is successfully placed.
 */

import { storage } from './storage';

/**
 * Updates wagering progress for all active bonuses when a user places a bet
 * @param userId - The user's ID
 * @param betAmount - The amount wagered (in credits/dollars)
 * @returns Promise with update results
 */
export async function updateBonusWagering(userId: string, betAmount: number): Promise<void> {
  try {
    // Check if balance has dropped to $0.50 or below and reset bonus if needed
    await storage.checkAndResetBonusIfNeeded(userId);
    
    // Get all active bonuses for the user
    const activeBonuses = await storage.getUserActiveBonuses(userId);
    
    if (activeBonuses.length === 0) {
      return; // No active bonuses to update
    }
    
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
      }
    }
  } catch (error) {
    // Log error but don't fail the bet if bonus update fails
    console.error('Error updating bonus wagering:', error);
  }
}

/**
 * Example usage in game endpoints:
 * 
 * // After successfully processing a dice bet:
 * await updateBonusWagering(userId, betAmount);
 * 
 * // After successfully processing a slots bet:
 * await updateBonusWagering(userId, betAmount);
 * 
 * // After successfully processing any game bet:
 * await updateBonusWagering(userId, betAmount);
 */