import express from 'express';
import { web3Service } from './index';
import { db } from '../db';
import { nftInventory, nftTransactions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { NFT_METADATA, NFTTokenId } from '../../shared/web3/types';
import type { MintRequest } from '../../shared/web3/types';
import { authenticateJWT, type AuthenticatedRequest } from '../auth';

export const web3Router = express.Router();

/**
 * GET /api/web3/status
 * Check if Web3 service is ready
 */
web3Router.get('/status', (req, res) => {
  const isReady = web3Service.isReady();
  
  if (isReady) {
    const contractInfo = web3Service.getContractInfo();
    res.json({
      ready: true,
      contract: contractInfo,
    });
  } else {
    res.json({
      ready: false,
      message: 'Web3 service not initialized. Please configure RPC_URL, OPERATOR_PRIVATE_KEY, and CONTRACT_ADDRESS environment variables.',
    });
  }
});

/**
 * POST /api/web3/mint
 * Mint NFT to user wallet
 */
web3Router.post('/mint', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    if (!web3Service.isReady()) {
      return res.status(503).json({ error: 'Web3 service not available' });
    }

    const { walletAddress, tokenId, amount = 1 } = req.body as MintRequest;

    if (!walletAddress || tokenId === undefined) {
      return res.status(400).json({ error: 'Missing required fields: walletAddress, tokenId' });
    }

    // Validate token ID
    if (!Object.values(NFTTokenId).includes(tokenId)) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Mint NFT on blockchain
    const result = await web3Service.mintNFT({
      walletAddress,
      tokenId,
      amount,
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Record transaction in database
    const contractInfo = web3Service.getContractInfo();
    await db.insert(nftTransactions).values({
      userId,
      walletAddress,
      transactionHash: result.transactionHash!,
      transactionType: 'MINT',
      tokenId,
      amount,
      toAddress: walletAddress,
      chainId: contractInfo.chainId,
      contractAddress: contractInfo.address,
      status: 'PENDING',
    });

    res.json({
      success: true,
      transactionHash: result.transactionHash,
      tokenId,
      amount,
    });
  } catch (error: any) {
    console.error('Mint error:', error);
    res.status(500).json({ error: error.message || 'Failed to mint NFT' });
  }
});

/**
 * GET /api/web3/inventory/:walletAddress
 * Get user's NFT inventory
 */
web3Router.get('/inventory/:walletAddress', async (req, res) => {
  try {
    if (!web3Service.isReady()) {
      return res.status(503).json({ error: 'Web3 service not available' });
    }

    const { walletAddress } = req.params;

    // Get all possible token IDs
    const tokenIds = Object.values(NFTTokenId).filter(id => typeof id === 'number') as number[];

    // Fetch inventory from blockchain
    const inventory = await web3Service.getUserInventory(walletAddress, tokenIds);

    // Add metadata to NFTs
    const nftsWithMetadata = inventory.nfts.map(nft => ({
      ...nft,
      metadata: NFT_METADATA[nft.tokenId],
    }));

    res.json({
      ...inventory,
      nfts: nftsWithMetadata,
    });
  } catch (error: any) {
    console.error('Inventory error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch inventory' });
  }
});

/**
 * GET /api/web3/balance/:walletAddress/:tokenId
 * Get balance for a specific NFT
 */
web3Router.get('/balance/:walletAddress/:tokenId', async (req, res) => {
  try {
    if (!web3Service.isReady()) {
      return res.status(503).json({ error: 'Web3 service not available' });
    }

    const { walletAddress, tokenId } = req.params;
    const balance = await web3Service.getBalance(walletAddress, parseInt(tokenId));

    res.json({
      walletAddress,
      tokenId: parseInt(tokenId),
      balance,
    });
  } catch (error: any) {
    console.error('Balance error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch balance' });
  }
});

/**
 * GET /api/web3/transactions
 * Get user's NFT transaction history
 */
web3Router.get('/transactions', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const transactions = await db.query.nftTransactions.findMany({
      where: eq(nftTransactions.userId, userId),
      orderBy: (nftTransactions, { desc }) => [desc(nftTransactions.createdAt)],
      limit: 50,
    });

    res.json({ transactions });
  } catch (error: any) {
    console.error('Transactions error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/web3/metadata/:tokenId
 * Get metadata for a specific token ID
 */
web3Router.get('/metadata/:tokenId', (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const metadata = NFT_METADATA[tokenId];

    if (!metadata) {
      return res.status(404).json({ error: 'Token not found' });
    }

    res.json({
      tokenId,
      ...metadata,
      image: `https://api.miraclez.gaming/nft/images/${tokenId}.png`, // Update with actual image URL
    });
  } catch (error: any) {
    console.error('Metadata error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch metadata' });
  }
});
