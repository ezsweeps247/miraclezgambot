import express from 'express';
import { db } from '../db';
import { nftInventory, nftTransactions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { web3Service } from './index';
import { authenticateJWT, type AuthenticatedRequest } from '../auth';

/**
 * Webhook handlers for blockchain events
 * Can be used with services like Alchemy, Infura, or custom blockchain listeners
 */

export const webhookRouter = express.Router();

/**
 * POST /api/web3/webhook/transaction
 * Handle transaction confirmation webhook
 * 
 * SECURITY NOTE: This endpoint expects trusted callers (e.g., Alchemy, Infura webhooks).
 * If exposed publicly, implement webhook signature verification using the service's signing key.
 */
webhookRouter.post('/transaction', async (req, res) => {
  try {
    const { transactionHash, status, confirmations, blockNumber } = req.body;

    if (!transactionHash) {
      return res.status(400).json({ error: 'Missing transactionHash' });
    }

    // Find transaction in database
    const [transaction] = await db
      .select()
      .from(nftTransactions)
      .where(eq(nftTransactions.transactionHash, transactionHash))
      .limit(1);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Update transaction status
    await db
      .update(nftTransactions)
      .set({
        status: status || 'CONFIRMED',
        confirmations: confirmations || 1,
        blockNumber: blockNumber ? Number(blockNumber) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(nftTransactions.transactionHash, transactionHash));

    // If confirmed and it's a mint, update inventory
    if (status === 'CONFIRMED' && transaction.transactionType === 'MINT') {
      await updateInventory(
        transaction.userId,
        transaction.walletAddress,
        transaction.tokenId,
        transaction.amount,
        transaction.contractAddress,
        transaction.chainId
      );
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/web3/webhook/sync
 * Manually trigger inventory sync for a user
 */
webhookRouter.post('/sync', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'Missing walletAddress' });
    }

    if (!web3Service.isReady()) {
      return res.status(503).json({ error: 'Web3 service not available' });
    }

    // Sync all known token IDs
    const tokenIds = Object.values(require('../../shared/web3/types').NFTTokenId)
      .filter(id => typeof id === 'number') as number[];

    const balances = await web3Service.getBalances(walletAddress, tokenIds);
    const contractInfo = web3Service.getContractInfo();

    // Update inventory for each token
    for (const { tokenId, balance } of balances) {
      if (BigInt(balance) > BigInt(0)) {
        await updateInventory(
          userId,
          walletAddress,
          tokenId,
          Number(balance),
          contractInfo.address,
          contractInfo.chainId
        );
      }
    }

    res.json({ success: true, synced: balances.length });
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper function to update user's NFT inventory
 */
async function updateInventory(
  userId: string,
  walletAddress: string,
  tokenId: number,
  amount: number,
  contractAddress: string,
  chainId: number
) {
  // Check if inventory entry exists
  const [existing] = await db
    .select()
    .from(nftInventory)
    .where(
      and(
        eq(nftInventory.userId, userId),
        eq(nftInventory.walletAddress, walletAddress),
        eq(nftInventory.tokenId, tokenId),
        eq(nftInventory.chainId, chainId)
      )
    )
    .limit(1);

  const metadata = require('../../shared/web3/types').NFT_METADATA[tokenId];

  if (existing) {
    // Update existing entry
    await db
      .update(nftInventory)
      .set({
        balance: amount,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(nftInventory.id, existing.id));
  } else {
    // Create new entry
    await db.insert(nftInventory).values({
      userId,
      walletAddress,
      tokenId,
      balance: amount,
      chainId,
      contractAddress,
      metadata,
    });
  }
}

export { updateInventory };
