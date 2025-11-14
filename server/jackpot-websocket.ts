import { storage } from './storage';
import { db } from './db';
import { jackpotPools, jackpotWinners } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

// Function to broadcast jackpot updates to all connected clients
export async function broadcastJackpotUpdate(jackpotPoolId: string, broadcast: (data: any) => void) {
  try {
    // Get the updated jackpot pool
    const [pool] = await db
      .select()
      .from(jackpotPools)
      .where(eq(jackpotPools.id, jackpotPoolId));
    
    if (pool) {
      broadcast({
        type: 'jackpotUpdate',
        pool: {
          id: pool.id,
          tier: pool.tier,
          currency: pool.currency,
          amount: pool.currentAmount.toString(),
          lastWonAt: pool.lastWonAt
        }
      });
    }
  } catch (error) {
    console.error('Error broadcasting jackpot update:', error);
  }
}

// Function to broadcast jackpot winner announcement
export function broadcastJackpotWin(
  winnerId: string,
  winnerUsername: string,
  tier: string,
  currency: string,
  amount: string,
  broadcast: (data: any) => void
) {
  broadcast({
    type: 'jackpotWin',
    winner: {
      id: winnerId,
      username: winnerUsername,
      tier,
      currency,
      amount
    }
  });
}

// Function to periodically broadcast all jackpot amounts
export async function broadcastAllJackpots(broadcast: (data: any) => void) {
  try {
    const pools = await storage.getAllJackpotPools();
    
    // Get recent winners (last 20)
    const recentWinners = await db
      .select({
        id: jackpotWinners.id,
        userId: jackpotWinners.userId,
        tier: jackpotPools.tier,
        currency: jackpotWinners.currency,
        amount: jackpotWinners.amountWon,
        gameName: jackpotWinners.gameName,
        wonAt: jackpotWinners.wonAt,
      })
      .from(jackpotWinners)
      .innerJoin(jackpotPools, eq(jackpotWinners.jackpotPoolId, jackpotPools.id))
      .orderBy(desc(jackpotWinners.wonAt))
      .limit(20);
    
    const jackpotData = pools.map(pool => ({
      id: pool.id,
      tier: pool.tier,
      currency: pool.currency,
      amount: pool.currentAmount.toString(),
      seedAmount: pool.seedAmount.toString(),
      contributionRate: pool.contributionPercentage.toString(),
      seedGrowthRate: pool.seedGrowthRate?.toString() || '0.02',
      lastWonAt: pool.lastWonAt,
      lastWinnerId: pool.lastWinnerId,
      lastWinAmount: pool.lastWinAmount?.toString(),
      totalWins: pool.totalWinCount,
      gameEligibility: pool.gameEligibility || ['all']
    }));
    
    const payload = {
      type: 'allJackpots',
      jackpots: jackpotData,
      recentWinners: recentWinners.slice(0, 20)
    };
    
    console.log(`Broadcasting ${jackpotData.length} jackpot pools with ${recentWinners.length} recent winners`);
    console.log('Payload sample:', JSON.stringify({
      jackpotCount: jackpotData.length,
      recentWinnerCount: recentWinners.length,
      firstJackpot: jackpotData[0],
      hasRecentWinners: recentWinners.length > 0
    }));
    
    broadcast(payload);
  } catch (error) {
    console.error('Error broadcasting all jackpots:', error);
  }
}
