import { storage } from "../storage";
import { db } from "../db";
import { balances, users } from "@shared/schema";
import { eq } from "drizzle-orm";

interface StartGameRequest {
  userId: string;
  stake: number; // Stake in dollars (e.g., 0.5, 1, 2, 5, 10, 20, or 0 for FREE)
}

interface EndGameRequest {
  userId: string;
  stake: number; // Stake in dollars
  highestRow: number;
  blocksStacked: number;
  prize: number; // Prize in dollars
  prizeType: 'cash' | 'points' | null;
}

export async function startFundoraBloxGame(request: StartGameRequest) {
  const { userId, stake } = request;

  // Validate stake
  const validStakes = [0, 0.5, 1, 2, 5, 10, 20];
  if (!validStakes.includes(stake)) {
    throw new Error('Invalid stake amount');
  }

  // FREE mode - no balance deduction
  if (stake === 0) {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');
    
    return {
      success: true,
      balanceMode: user.balanceMode || 'GC',
      message: 'Free game started'
    };
  }

  // Convert stake to cents for paid games
  const stakeInCents = Math.floor(stake * 100);

  // Execute all operations atomically within a transaction
  return await db.transaction(async (tx) => {
    // Get user with row-level lock
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for('update');

    if (!user) throw new Error('User not found');

    const userBalanceMode = user.balanceMode || 'GC';

    // Get balance with row-level lock
    const [balance] = await tx
      .select()
      .from(balances)
      .where(eq(balances.userId, userId))
      .for('update');

    if (!balance) throw new Error('Balance not found');

    // Deduct stake from balance based on mode
    if (userBalanceMode === 'SC') {
      // SC Mode: Use Sweeps Cash
      const sweepsCashBalance = parseFloat(balance.sweepsCashTotal?.toString() || '0');
      const sweepsCashBalanceInCents = Math.floor(sweepsCashBalance * 100);

      if (sweepsCashBalanceInCents < stakeInCents) {
        throw new Error('Insufficient sweeps cash balance');
      }

      // Update sweeps cash balance atomically
      const newTotal = sweepsCashBalance - (stakeInCents / 100);
      const newRedeemable = parseFloat(balance.sweepsCashRedeemable?.toString() || '0') - (stakeInCents / 100);

      await tx
        .update(balances)
        .set({
          sweepsCashTotal: newTotal.toFixed(2),
          sweepsCashRedeemable: newRedeemable.toFixed(2)
        })
        .where(eq(balances.userId, userId));

      // Record transaction
      await storage.createTransaction({
        userId,
        type: 'BET',
        amount: -stakeInCents,
        meta: { game: 'FUNDORA_BLOX', stake, currency: 'SC' }
      });
    } else {
      // GC Mode: Use regular balance (Gold Coins)
      if (balance.available < stakeInCents) {
        throw new Error('Insufficient gold coins balance');
      }

      // Deduct stake from available balance atomically
      const newAvailable = balance.available - stakeInCents;
      
      await tx
        .update(balances)
        .set({ available: newAvailable })
        .where(eq(balances.userId, userId));

      // Record transaction
      await storage.createTransaction({
        userId,
        type: 'BET',
        amount: -stakeInCents,
        meta: { game: 'FUNDORA_BLOX', stake, currency: 'GC' }
      });
    }

    return {
      success: true,
      balanceMode: userBalanceMode,
      message: 'Game started, stake deducted'
    };
  });
}

export async function endFundoraBloxGame(request: EndGameRequest) {
  const { userId, stake, highestRow, blocksStacked, prize, prizeType } = request;

  // Convert amounts to cents
  const stakeInCents = stake === 0 ? 0 : Math.floor(stake * 100);
  const prizeInCents = Math.floor(prize * 100);
  const profitInCents = prizeInCents - stakeInCents;

  // Execute all operations atomically within a transaction
  return await db.transaction(async (tx) => {
    // Get user with row-level lock
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for('update');

    if (!user) throw new Error('User not found');

    const userBalanceMode = user.balanceMode || 'GC';

    // Get balance with row-level lock
    const [balance] = await tx
      .select()
      .from(balances)
      .where(eq(balances.userId, userId))
      .for('update');

    if (!balance) throw new Error('Balance not found');

    let betId: string | null = null;

    // Only create bet record for non-FREE games (stake > 0)
    if (stakeInCents > 0) {
      const bet = await storage.createBet({
        userId,
        game: 'FUNDORA_BLOX',
        amount: stakeInCents,
        potential_win: prizeInCents,
        result: profitInCents > 0 ? 'WIN' : 'LOSE',
        profit: profitInCents,
        gameMode: userBalanceMode === 'SC' ? 'real' : 'fun'
      });
      betId = bet.id;
    }

    // Add prize to balance if won
    if (prizeInCents > 0 && prizeType === 'cash') {
      if (userBalanceMode === 'SC') {
        // Add to sweeps cash atomically
        const currentTotal = parseFloat(balance.sweepsCashTotal?.toString() || '0');
        const currentRedeemable = parseFloat(balance.sweepsCashRedeemable?.toString() || '0');
        
        const newTotal = currentTotal + (prizeInCents / 100);
        const newRedeemable = currentRedeemable + (prizeInCents / 100);

        await tx
          .update(balances)
          .set({
            sweepsCashTotal: newTotal.toFixed(2),
            sweepsCashRedeemable: newRedeemable.toFixed(2)
          })
          .where(eq(balances.userId, userId));

        // Record payout transaction
        await storage.createTransaction({
          userId,
          type: 'PAYOUT',
          amount: prizeInCents,
          meta: { game: 'FUNDORA_BLOX', stake, prize, currency: 'SC' }
        });
      } else {
        // Add to gold coins atomically
        const newAvailable = balance.available + prizeInCents;
        
        await tx
          .update(balances)
          .set({ available: newAvailable })
          .where(eq(balances.userId, userId));

        // Record payout transaction
        await storage.createTransaction({
          userId,
          type: 'PAYOUT',
          amount: prizeInCents,
          meta: { game: 'FUNDORA_BLOX', stake, prize, currency: 'GC' }
        });
      }
    }

    // Create Fundora Blox game record with amounts in cents
    await storage.createFundoraBloxGame({
      userId,
      betId,
      stake: stakeInCents,
      highestRow,
      blocksStacked,
      prize: prizeInCents > 0 ? prizeInCents : null,
      prizeType: prizeInCents > 0 ? prizeType : null,
      balanceMode: userBalanceMode
    });

    return {
      success: true,
      result: profitInCents > 0 ? 'WIN' : 'LOSE',
      stake,
      prize,
      profit: profitInCents / 100, // Convert back to dollars for response
      highestRow,
      blocksStacked,
      balanceMode: userBalanceMode
    };
  });
}
