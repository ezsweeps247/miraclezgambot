import express, { Router } from 'express';
import { db } from '../db';
import { wallets, nftMints, nftRewards, balances } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateJWT, type AuthenticatedRequest } from '../auth';
import { signMint, generateSalt, getContractConfig, publicClient, isViemReady } from '../web3/viem';
import { type Address, type Hex } from 'viem';
import rateLimit from 'express-rate-limit';

export const nftRouter = Router();

// Rate limiters
const mintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 mints per hour per user
  message: 'Too many mint requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const linkWalletLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 wallet link attempts per 15 minutes
  message: 'Too many wallet link attempts. Please try again later.',
});

/**
 * POST /api/nft/link-wallet
 * Link a wallet address to the user's account
 */
nftRouter.post('/link-wallet', authenticateJWT, linkWalletLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { address, chainId } = req.body;
    
    if (!address || !chainId) {
      return res.status(400).json({ error: 'Address and chainId are required' });
    }

    // Validate address format (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    // Check if wallet is already linked to this user
    const existingWallet = await db.query.wallets.findFirst({
      where: and(
        eq(wallets.userId, userId),
        eq(wallets.chainId, chainId),
        eq(wallets.address, address.toLowerCase())
      ),
    });

    if (existingWallet) {
      return res.json({ 
        success: true, 
        wallet: existingWallet,
        message: 'Wallet already linked' 
      });
    }

    // Link the wallet
    const [wallet] = await db.insert(wallets).values({
      userId,
      chainId,
      address: address.toLowerCase(),
    }).returning();

    res.json({ 
      success: true, 
      wallet,
      message: 'Wallet linked successfully' 
    });
  } catch (error) {
    console.error('Error linking wallet:', error);
    res.status(500).json({ error: 'Failed to link wallet' });
  }
});

/**
 * GET /api/nft/config
 * Get NFT contract configuration
 */
nftRouter.get('/config', (req, res) => {
  try {
    if (!isViemReady()) {
      return res.status(503).json({ 
        error: 'NFT service not configured',
        message: 'NFT_CONTRACT_ADDRESS or OPERATOR_PRIVATE_KEY not set'
      });
    }

    const config = getContractConfig();
    const baseUri = process.env.NFT_BASE_URI || 'https://cdn.buunix.app/nft/pass/metadata/';

    res.json({
      chainId: config.chainId,
      contractAddress: config.address,
      baseUri,
      chainName: 'Base Sepolia',
      explorerUrl: 'https://sepolia.basescan.org',
    });
  } catch (error) {
    console.error('Error getting NFT config:', error);
    res.status(500).json({ error: 'Failed to get NFT configuration' });
  }
});

/**
 * POST /api/nft/mint/pass
 * Generate a signature for minting a Player Pass NFT
 * The frontend will use this signature to call mintWithSig on-chain
 */
nftRouter.post('/mint/pass', authenticateJWT, mintLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!isViemReady()) {
      return res.status(503).json({ error: 'NFT service not configured' });
    }

    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    // Check if user has already minted a Player Pass
    const existingMint = await db.query.nftMints.findFirst({
      where: and(
        eq(nftMints.userId, userId),
        eq(nftMints.tokenId, 1), // Player Pass is tokenId 1
        eq(nftMints.address, address.toLowerCase())
      ),
    });

    if (existingMint) {
      return res.status(400).json({ 
        error: 'Player Pass already minted',
        message: 'You have already minted your Player Pass NFT'
      });
    }

    // Generate unique salt
    const salt = generateSalt();

    // Token ID 1 = Player Pass, Amount 1
    const tokenId = 1;
    const amount = 1;

    // Generate signature
    const signature = await signMint(
      address as Address,
      tokenId,
      amount,
      salt
    );

    // Store mint record (txHash will be updated later via reward endpoint)
    const [mint] = await db.insert(nftMints).values({
      userId,
      address: address.toLowerCase(),
      tokenId,
      amount,
      salt,
      txHash: null,
    }).returning();

    res.json({
      success: true,
      signature,
      salt,
      tokenId,
      amount,
      contractAddress: getContractConfig().address,
      message: 'Signature generated. Use this to mint your Player Pass on-chain.',
    });
  } catch (error: any) {
    console.error('Error generating mint signature:', error);
    res.status(500).json({ 
      error: 'Failed to generate mint signature',
      message: error.message || 'Unknown error'
    });
  }
});

/**
 * POST /api/nft/reward/after-mint
 * Award SC/GC to user after successful mint
 * Called by frontend after on-chain mint is confirmed
 */
nftRouter.post('/reward/after-mint', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { txHash, salt, tokenId } = req.body;
    
    if (!txHash || !salt || tokenId === undefined) {
      return res.status(400).json({ error: 'txHash, salt, and tokenId are required' });
    }

    // Verify the mint record exists and belongs to this user
    const mintRecord = await db.query.nftMints.findFirst({
      where: and(
        eq(nftMints.userId, userId),
        eq(nftMints.salt, salt),
        eq(nftMints.tokenId, tokenId)
      ),
    });

    if (!mintRecord) {
      return res.status(404).json({ error: 'Mint record not found' });
    }

    // Check if already rewarded
    if (mintRecord.txHash) {
      return res.status(400).json({ 
        error: 'Reward already claimed',
        message: 'This mint has already been rewarded'
      });
    }

    // Update mint record with txHash
    await db.update(nftMints)
      .set({ txHash })
      .where(eq(nftMints.id, mintRecord.id));

    // Check for reward policy
    const rewardPolicy = await db.query.nftRewards.findFirst({
      where: and(
        eq(nftRewards.tokenId, tokenId),
        eq(nftRewards.reason, 'first_mint')
      ),
    });

    let scReward = 0;
    let gcReward = 0;

    if (rewardPolicy) {
      scReward = Number(rewardPolicy.scReward);
      gcReward = Number(rewardPolicy.gcReward);

      // Award SC and/or GC to user
      if (scReward > 0 || gcReward > 0) {
        const userBalance = await db.query.balances.findFirst({
          where: eq(balances.userId, userId),
        });

        if (userBalance) {
          // Award GC (stored in cents)
          if (gcReward > 0) {
            const gcAmount = Math.floor(gcReward * 100); // Convert to cents
            await db.update(balances)
              .set({ 
                available: userBalance.available + gcAmount 
              })
              .where(eq(balances.userId, userId));
          }

          // Award SC
          if (scReward > 0) {
            await db.update(balances)
              .set({ 
                sweepsCashRedeemable: (Number(userBalance.sweepsCashRedeemable) + scReward).toFixed(2)
              })
              .where(eq(balances.userId, userId));
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Mint confirmed and rewards awarded',
      rewards: {
        sc: scReward,
        gc: gcReward,
      },
      txHash,
    });
  } catch (error) {
    console.error('Error awarding mint rewards:', error);
    res.status(500).json({ error: 'Failed to award rewards' });
  }
});

/**
 * GET /api/nft/holds/:address
 * Query on-chain NFT balances for an address
 */
nftRouter.get('/holds/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    if (!isViemReady()) {
      return res.status(503).json({ error: 'NFT service not configured' });
    }

    const config = getContractConfig();

    // Query Player Pass balance (tokenId 1)
    const playerPassAbi = [
      {
        inputs: [
          { name: 'account', type: 'address' },
          { name: 'id', type: 'uint256' }
        ],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      }
    ] as const;

    const balance = await publicClient.readContract({
      address: config.address,
      abi: playerPassAbi,
      functionName: 'balanceOf',
      args: [address as Address, BigInt(1)],
    });

    res.json({
      address,
      balances: [
        {
          tokenId: 1,
          balance: balance.toString(),
          name: 'Player Pass',
        }
      ],
      hasPlayerPass: balance > 0n,
    });
  } catch (error: any) {
    console.error('Error querying NFT balances:', error);
    res.status(500).json({ 
      error: 'Failed to query balances',
      message: error.message || 'Unknown error'
    });
  }
});

/**
 * GET /api/nft/user/wallets
 * Get all linked wallets for the authenticated user
 */
nftRouter.get('/user/wallets', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userWallets = await db.query.wallets.findMany({
      where: eq(wallets.userId, userId),
    });

    res.json({
      wallets: userWallets,
    });
  } catch (error) {
    console.error('Error fetching user wallets:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});
