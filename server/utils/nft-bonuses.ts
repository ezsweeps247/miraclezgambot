import { db } from '../db';
import { wallets } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { publicClient, getContractConfig, isViemReady } from '../web3/viem';
import { type Address } from 'viem';

/**
 * Check if a user has a Player Pass NFT
 * @param userId - User ID to check (UUID string)
 * @returns True if user holds at least 1 Player Pass NFT
 */
export async function hasPlayerPass(userId: string): Promise<boolean> {
  try {
    if (!isViemReady()) {
      return false;
    }

    // Get user's linked wallets
    const userWallets = await db.query.wallets.findMany({
      where: eq(wallets.userId, userId),
    });

    if (userWallets.length === 0) {
      return false;
    }

    const config = getContractConfig();

    // Check balance for each wallet
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

    for (const wallet of userWallets) {
      try {
        const balance = await publicClient.readContract({
          address: config.address,
          abi: playerPassAbi,
          functionName: 'balanceOf',
          args: [wallet.address as Address, BigInt(1)], // tokenId 1 = Player Pass
        });

        if (balance > 0n) {
          return true;
        }
      } catch (error) {
        console.error(`Error checking NFT balance for wallet ${wallet.address}:`, error);
      }
    }

    return false;
  } catch (error) {
    console.error('Error in hasPlayerPass:', error);
    return false;
  }
}

/**
 * Apply NFT holder bonuses to game winnings
 * @param userId - User ID (UUID string)
 * @param gcAmount - Original GC win amount (in cents)
 * @param scAmount - Original SC win amount
 * @returns Object with bonus-adjusted amounts
 */
export async function applyNFTBonuses(
  userId: string,
  gcAmount: number,
  scAmount: number
): Promise<{ gcAmount: number; scAmount: number; bonusApplied: boolean }> {
  const holdsPlayerPass = await hasPlayerPass(userId);

  if (!holdsPlayerPass) {
    return { gcAmount, scAmount, bonusApplied: false };
  }

  // Apply +5% GC bonus on wins
  const bonusGC = Math.floor(gcAmount * 0.05);
  const bonusSC = Number((scAmount * 0.02).toFixed(2)); // +2% SC bonus

  return {
    gcAmount: gcAmount + bonusGC,
    scAmount: Number((scAmount + bonusSC).toFixed(2)),
    bonusApplied: true,
  };
}

/**
 * Apply reload bonus for SC purchases (NFT holders get +2%)
 * @param userId - User ID (UUID string)
 * @param scPurchaseAmount - Amount of SC being purchased
 * @returns Bonus SC amount to add
 */
export async function applyReloadBonus(
  userId: string,
  scPurchaseAmount: number
): Promise<number> {
  const holdsPlayerPass = await hasPlayerPass(userId);

  if (!holdsPlayerPass) {
    return 0;
  }

  // +2% reload bonus for Player Pass holders
  return Number((scPurchaseAmount * 0.02).toFixed(2));
}
