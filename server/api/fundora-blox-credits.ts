import { Router } from 'express';
import { db } from '../db';
import { playerCredits, creditTransactions } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateApiKey } from '../middleware/apiAuth';

const router = Router();

// Helper function to get or create player credit account
async function getOrCreatePlayerCredit(apiKeyId: number, externalPlayerId: string) {
  const [existing] = await db
    .select()
    .from(playerCredits)
    .where(and(
      eq(playerCredits.apiKeyId, apiKeyId),
      eq(playerCredits.externalPlayerId, externalPlayerId)
    ))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [newAccount] = await db
    .insert(playerCredits)
    .values({
      apiKeyId,
      externalPlayerId,
      balance: '0',
    })
    .returning();

  return newAccount;
}

// Helper function to record transaction
async function recordTransaction(
  playerCreditId: number,
  type: string,
  amount: string,
  balanceBefore: string,
  balanceAfter: string,
  reference?: string,
  metadata?: any
) {
  const [transaction] = await db
    .insert(creditTransactions)
    .values({
      playerCreditId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      reference,
      metadata,
    })
    .returning();

  return transaction;
}

// POST /api/game/credits/load - Load credits into player account
router.post('/load', authenticateApiKey, async (req, res) => {
  try {
    const apiKeyId = req.apiKey!.id;
    const { externalPlayerId, amount, reference, metadata } = req.body;

    if (!externalPlayerId || amount === undefined || amount === null) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'externalPlayerId and amount are required'
      });
    }

    const loadAmount = parseFloat(amount.toString());
    if (loadAmount <= 0 || isNaN(loadAmount)) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      });
    }

    // Execute in a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Insert or get existing credit account using ON CONFLICT
      // This ensures only one row per (apiKeyId, externalPlayerId)
      await tx
        .insert(playerCredits)
        .values({
          apiKeyId,
          externalPlayerId,
          balance: '0',
        })
        .onConflictDoNothing({
          target: [playerCredits.apiKeyId, playerCredits.externalPlayerId],
        });

      // Now get and lock the row for update
      const [currentCredit] = await tx
        .select()
        .from(playerCredits)
        .where(and(
          eq(playerCredits.apiKeyId, apiKeyId),
          eq(playerCredits.externalPlayerId, externalPlayerId)
        ))
        .for('update');
      
      const currentBalance = parseFloat(currentCredit.balance);
      const newBalance = currentBalance + loadAmount;

      // Update balance
      await tx
        .update(playerCredits)
        .set({
          balance: newBalance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(playerCredits.id, currentCredit.id));

      // Record transaction
      const [transaction] = await tx
        .insert(creditTransactions)
        .values({
          playerCreditId: currentCredit.id,
          type: 'load',
          amount: loadAmount.toString(),
          balanceBefore: currentBalance.toString(),
          balanceAfter: newBalance.toString(),
          reference,
          metadata,
        })
        .returning();

      return { currentBalance, newBalance, loadAmount, transaction, externalPlayerId };
    });

    res.json({
      success: true,
      externalPlayerId: result.externalPlayerId,
      balanceBefore: result.currentBalance.toFixed(2),
      balanceAfter: result.newBalance.toFixed(2),
      amountLoaded: result.loadAmount.toFixed(2),
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        createdAt: result.transaction.createdAt,
      }
    });
  } catch (error) {
    console.error('Load credits error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to load credits'
    });
  }
});

// POST /api/game/credits/redeem - Redeem/withdraw credits from player account
router.post('/redeem', authenticateApiKey, async (req, res) => {
  try {
    const apiKeyId = req.apiKey!.id;
    const { externalPlayerId, amount, reference, metadata } = req.body;

    if (!externalPlayerId || amount === undefined || amount === null) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'externalPlayerId and amount are required'
      });
    }

    const redeemAmount = parseFloat(amount.toString());
    if (redeemAmount <= 0 || isNaN(redeemAmount)) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      });
    }

    // Execute in a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Insert or get existing credit account using ON CONFLICT
      // This ensures only one row per (apiKeyId, externalPlayerId)
      await tx
        .insert(playerCredits)
        .values({
          apiKeyId,
          externalPlayerId,
          balance: '0',
        })
        .onConflictDoNothing({
          target: [playerCredits.apiKeyId, playerCredits.externalPlayerId],
        });

      // Now get and lock the row for update
      const [currentCredit] = await tx
        .select()
        .from(playerCredits)
        .where(and(
          eq(playerCredits.apiKeyId, apiKeyId),
          eq(playerCredits.externalPlayerId, externalPlayerId)
        ))
        .for('update');
      
      const currentBalance = parseFloat(currentCredit.balance);

      if (currentBalance < redeemAmount) {
        throw new Error(`Insufficient balance: has ${currentBalance.toFixed(2)} but attempting to redeem ${redeemAmount.toFixed(2)}`);
      }

      const newBalance = currentBalance - redeemAmount;

      // Update balance
      await tx
        .update(playerCredits)
        .set({
          balance: newBalance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(playerCredits.id, currentCredit.id));

      // Record transaction
      const [transaction] = await tx
        .insert(creditTransactions)
        .values({
          playerCreditId: currentCredit.id,
          type: 'redeem',
          amount: redeemAmount.toString(),
          balanceBefore: currentBalance.toString(),
          balanceAfter: newBalance.toString(),
          reference,
          metadata,
        })
        .returning();

      return { currentBalance, newBalance, redeemAmount, transaction, externalPlayerId };
    });

    res.json({
      success: true,
      externalPlayerId: result.externalPlayerId,
      balanceBefore: result.currentBalance.toFixed(2),
      balanceAfter: result.newBalance.toFixed(2),
      amountRedeemed: result.redeemAmount.toFixed(2),
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        createdAt: result.transaction.createdAt,
      }
    });
  } catch (error) {
    console.error('Redeem credits error:', error);
    
    // Handle insufficient balance error
    if (error instanceof Error && error.message.startsWith('Insufficient balance:')) {
      return res.status(400).json({
        error: 'Insufficient balance',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to redeem credits'
    });
  }
});

// GET /api/game/credits/balance/:playerId - Get player's credit balance
router.get('/balance/:playerId', authenticateApiKey, async (req, res) => {
  try {
    const apiKeyId = req.apiKey!.id;
    const { playerId } = req.params;

    const playerCredit = await getOrCreatePlayerCredit(apiKeyId, playerId);

    res.json({
      externalPlayerId: playerId,
      balance: parseFloat(playerCredit.balance).toFixed(2),
      createdAt: playerCredit.createdAt,
      updatedAt: playerCredit.updatedAt,
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch credit balance'
    });
  }
});

// GET /api/game/credits/transactions/:playerId - Get player's credit transaction history
router.get('/transactions/:playerId', authenticateApiKey, async (req, res) => {
  try {
    const apiKeyId = req.apiKey!.id;
    const { playerId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const playerCredit = await getOrCreatePlayerCredit(apiKeyId, playerId);

    const transactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.playerCreditId, playerCredit.id))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);

    res.json({
      externalPlayerId: playerId,
      currentBalance: parseFloat(playerCredit.balance).toFixed(2),
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount).toFixed(2),
        balanceBefore: parseFloat(t.balanceBefore).toFixed(2),
        balanceAfter: parseFloat(t.balanceAfter).toFixed(2),
        reference: t.reference,
        metadata: t.metadata,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch credit transactions'
    });
  }
});

export default router;
