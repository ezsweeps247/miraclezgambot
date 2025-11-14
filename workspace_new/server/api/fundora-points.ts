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

/**
 * POST /api/game/points/redeem
 * Redeem bonus points for in-store products
 * 
 * Request Body:
 * {
 *   "externalPlayerId": "user123",
 *   "pointsAmount": 1000,
 *   "productId": "PRODUCT_SKU_001",
 *   "productName": "Premium Coffee",
 *   "productPrice": 5.99,
 *   "orderId": "ORDER_12345",
 *   "metadata": {
 *     "storeName": "Main Street Cafe",
 *     "storeId": "STORE_001",
 *     "redemptionMethod": "qr_code"
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "externalPlayerId": "user123",
 *   "pointsRedeemed": 1000,
 *   "balanceBefore": 5000,
 *   "balanceAfter": 4000,
 *   "redemption": {
 *     "transactionId": 123,
 *     "productId": "PRODUCT_SKU_001",
 *     "productName": "Premium Coffee",
 *     "orderId": "ORDER_12345",
 *     "redeemedAt": "2025-01-15T10:30:00.000Z"
 *   }
 * }
 */
router.post('/redeem', authenticateApiKey, async (req, res) => {
  try {
    const apiKeyId = req.apiKey!.id;
    const {
      externalPlayerId,
      pointsAmount,
      productId,
      productName,
      productPrice,
      orderId,
      metadata = {}
    } = req.body;

    // Validation
    if (!externalPlayerId) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'externalPlayerId is required'
      });
    }

    if (!pointsAmount || pointsAmount <= 0) {
      return res.status(400).json({
        error: 'Invalid points amount',
        message: 'pointsAmount must be a positive number'
      });
    }

    if (!productId || !productName) {
      return res.status(400).json({
        error: 'Missing product information',
        message: 'productId and productName are required'
      });
    }

    const redeemAmount = parseFloat(pointsAmount.toString());
    if (isNaN(redeemAmount)) {
      return res.status(400).json({
        error: 'Invalid points amount',
        message: 'pointsAmount must be a valid number'
      });
    }

    // Execute in a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Insert or get existing credit account
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

      // Get and lock the row for update
      const [currentCredit] = await tx
        .select()
        .from(playerCredits)
        .where(and(
          eq(playerCredits.apiKeyId, apiKeyId),
          eq(playerCredits.externalPlayerId, externalPlayerId)
        ))
        .for('update');
      
      const currentBalance = parseFloat(currentCredit.balance);

      // Check sufficient balance
      if (currentBalance < redeemAmount) {
        throw new Error(`INSUFFICIENT_BALANCE:${currentBalance}:${redeemAmount}`);
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

      // Record transaction with detailed metadata
      const transactionMetadata = {
        type: 'product_redemption',
        productId,
        productName,
        productPrice,
        orderId,
        ...metadata,
        redeemedAt: new Date().toISOString(),
      };

      const [transaction] = await tx
        .insert(creditTransactions)
        .values({
          playerCreditId: currentCredit.id,
          type: 'redeem_points',
          amount: redeemAmount.toString(),
          balanceBefore: currentBalance.toString(),
          balanceAfter: newBalance.toString(),
          reference: orderId || `REDEMPTION_${Date.now()}`,
          metadata: transactionMetadata,
        })
        .returning();

      return {
        currentBalance,
        newBalance,
        redeemAmount,
        transaction,
        externalPlayerId,
        productId,
        productName,
        orderId
      };
    });

    res.json({
      success: true,
      externalPlayerId: result.externalPlayerId,
      pointsRedeemed: result.redeemAmount,
      balanceBefore: result.currentBalance,
      balanceAfter: result.newBalance,
      redemption: {
        transactionId: result.transaction.id,
        productId: result.productId,
        productName: result.productName,
        orderId: result.orderId,
        redeemedAt: result.transaction.createdAt,
      }
    });
  } catch (error) {
    console.error('Points redemption error:', error);
    
    // Handle insufficient balance error
    if (error instanceof Error && error.message.startsWith('INSUFFICIENT_BALANCE:')) {
      const [, currentBalance, attemptedAmount] = error.message.split(':');
      return res.status(400).json({
        error: 'Insufficient points',
        message: `Player has ${parseFloat(currentBalance).toFixed(0)} points but attempting to redeem ${parseFloat(attemptedAmount).toFixed(0)} points`,
        currentBalance: parseFloat(currentBalance),
        attemptedAmount: parseFloat(attemptedAmount),
      });
    }
    
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to redeem points'
    });
  }
});

/**
 * GET /api/game/points/balance/:playerId
 * Get player's point balance
 */
router.get('/balance/:playerId', authenticateApiKey, async (req, res) => {
  try {
    const apiKeyId = req.apiKey!.id;
    const { playerId } = req.params;

    const playerCredit = await getOrCreatePlayerCredit(apiKeyId, playerId);

    res.json({
      externalPlayerId: playerId,
      pointsBalance: parseFloat(playerCredit.balance),
      lastUpdated: playerCredit.updatedAt,
    });
  } catch (error) {
    console.error('Get points balance error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch points balance'
    });
  }
});

/**
 * POST /api/game/points/award
 * Award bonus points to a player (for game completion, achievements, etc.)
 */
router.post('/award', authenticateApiKey, async (req, res) => {
  try {
    const apiKeyId = req.apiKey!.id;
    const { externalPlayerId, pointsAmount, reason, metadata = {} } = req.body;

    if (!externalPlayerId || !pointsAmount) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'externalPlayerId and pointsAmount are required'
      });
    }

    const awardAmount = parseFloat(pointsAmount.toString());
    if (awardAmount <= 0 || isNaN(awardAmount)) {
      return res.status(400).json({
        error: 'Invalid points amount',
        message: 'pointsAmount must be a positive number'
      });
    }

    const result = await db.transaction(async (tx) => {
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

      const [currentCredit] = await tx
        .select()
        .from(playerCredits)
        .where(and(
          eq(playerCredits.apiKeyId, apiKeyId),
          eq(playerCredits.externalPlayerId, externalPlayerId)
        ))
        .for('update');
      
      const currentBalance = parseFloat(currentCredit.balance);
      const newBalance = currentBalance + awardAmount;

      await tx
        .update(playerCredits)
        .set({
          balance: newBalance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(playerCredits.id, currentCredit.id));

      const [transaction] = await tx
        .insert(creditTransactions)
        .values({
          playerCreditId: currentCredit.id,
          type: 'award_points',
          amount: awardAmount.toString(),
          balanceBefore: currentBalance.toString(),
          balanceAfter: newBalance.toString(),
          reference: reason || 'Points awarded',
          metadata: {
            reason,
            ...metadata,
            awardedAt: new Date().toISOString(),
          },
        })
        .returning();

      return { currentBalance, newBalance, awardAmount, transaction, externalPlayerId };
    });

    res.json({
      success: true,
      externalPlayerId: result.externalPlayerId,
      pointsAwarded: result.awardAmount,
      balanceBefore: result.currentBalance,
      balanceAfter: result.newBalance,
      transaction: {
        id: result.transaction.id,
        awardedAt: result.transaction.createdAt,
      }
    });
  } catch (error) {
    console.error('Award points error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to award points'
    });
  }
});

/**
 * GET /api/game/points/history/:playerId
 * Get player's points transaction history
 */
router.get('/history/:playerId', authenticateApiKey, async (req, res) => {
  try {
    const apiKeyId = req.apiKey!.id;
    const { playerId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const type = req.query.type as string; // Filter by type: 'redeem_points', 'award_points'

    const playerCredit = await getOrCreatePlayerCredit(apiKeyId, playerId);

    let query = db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.playerCreditId, playerCredit.id))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);

    const transactions = await query;

    // Filter by type if specified
    const filteredTransactions = type
      ? transactions.filter(t => t.type === type)
      : transactions;

    res.json({
      externalPlayerId: playerId,
      currentBalance: parseFloat(playerCredit.balance),
      transactions: filteredTransactions.map(t => ({
        id: t.id,
        type: t.type,
        pointsAmount: parseFloat(t.amount),
        balanceBefore: parseFloat(t.balanceBefore),
        balanceAfter: parseFloat(t.balanceAfter),
        reference: t.reference,
        metadata: t.metadata,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get points history error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch points history'
    });
  }
});

export default router;
