import { BiconomySmartAccountV2, createSmartAccountClient } from "@biconomy/account";
import { ethers } from "ethers";

// Biconomy configuration
const POLYGON_CHAIN_ID = 137;
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
const BUNDLER_URL = process.env.BICONOMY_BUNDLER_URL;
const PAYMASTER_URL = process.env.BICONOMY_PAYMASTER_URL;

interface BiconomyConfig {
  chainId: number;
  bundlerUrl?: string;
  paymasterUrl?: string;
}

export class BiconomyService {
  private provider: ethers.JsonRpcProvider;
  private config: BiconomyConfig;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    this.config = {
      chainId: POLYGON_CHAIN_ID,
      bundlerUrl: BUNDLER_URL,
      paymasterUrl: PAYMASTER_URL
    };

    if (!BUNDLER_URL || !PAYMASTER_URL) {
      console.warn('⚠️  Biconomy Smart Accounts disabled: Missing BICONOMY_BUNDLER_URL or BICONOMY_PAYMASTER_URL');
      console.warn('   Get these from https://dashboard.biconomy.io');
    } else {
      console.log('✅ Biconomy Smart Accounts enabled');
      console.log(`   Chain: Polygon (${POLYGON_CHAIN_ID})`);
    }
  }

  /**
   * Create a smart account for a Telegram user
   * @param telegramUserId - Telegram user ID to use as signer seed
   * @param privateKey - Optional: User's private key (if already generated)
   */
  async createSmartAccountForTelegramUser(
    telegramUserId: string,
    privateKey?: string
  ): Promise<BiconomySmartAccountV2 | null> {
    if (!BUNDLER_URL || !PAYMASTER_URL) {
      throw new Error('Biconomy not configured. Set BICONOMY_BUNDLER_URL and BICONOMY_PAYMASTER_URL');
    }

    try {
      // Create or use existing wallet as signer
      let wallet: ethers.Wallet;
      
      if (privateKey) {
        // Use existing private key
        wallet = new ethers.Wallet(privateKey, this.provider);
      } else {
        // Generate deterministic wallet from Telegram user ID
        // ⚠️ WARNING: This is for demo/testing only
        // Production should use secure key management or let users connect their own wallets
        const hash = ethers.keccak256(ethers.toUtf8Bytes(`telegram_${telegramUserId}`));
        wallet = new ethers.Wallet(hash, this.provider);
      }

      // Create Biconomy Smart Account
      const smartAccount = await createSmartAccountClient({
        signer: wallet,
        chainId: this.config.chainId,
        bundlerUrl: BUNDLER_URL,
        paymasterUrl: PAYMASTER_URL,
      });

      const smartAccountAddress = await smartAccount.getAccountAddress();
      console.log(`✅ Smart Account created for Telegram user ${telegramUserId}`);
      console.log(`   EOA: ${wallet.address}`);
      console.log(`   Smart Account: ${smartAccountAddress}`);

      return smartAccount;
    } catch (error) {
      console.error('Error creating Biconomy Smart Account:', error);
      return null;
    }
  }

  /**
   * Create a smart account with custom signer
   * @param signer - ethers.Signer or Wallet
   */
  async createSmartAccount(signer: ethers.Signer): Promise<BiconomySmartAccountV2 | null> {
    if (!BUNDLER_URL || !PAYMASTER_URL) {
      throw new Error('Biconomy not configured. Set BICONOMY_BUNDLER_URL and BICONOMY_PAYMASTER_URL');
    }

    try {
      const smartAccount = await createSmartAccountClient({
        signer: signer,
        chainId: this.config.chainId,
        bundlerUrl: BUNDLER_URL,
        paymasterUrl: PAYMASTER_URL,
      });

      const smartAccountAddress = await smartAccount.getAccountAddress();
      const signerAddress = await signer.getAddress();
      
      console.log(`✅ Smart Account created`);
      console.log(`   EOA: ${signerAddress}`);
      console.log(`   Smart Account: ${smartAccountAddress}`);

      return smartAccount;
    } catch (error) {
      console.error('Error creating Biconomy Smart Account:', error);
      return null;
    }
  }

  /**
   * Get smart account address for a Telegram user without creating the full account
   * @param telegramUserId - Telegram user ID
   */
  async getSmartAccountAddress(telegramUserId: string): Promise<string | null> {
    try {
      // Generate deterministic wallet
      const hash = ethers.keccak256(ethers.toUtf8Bytes(`telegram_${telegramUserId}`));
      const wallet = new ethers.Wallet(hash, this.provider);

      // For getting just the address, we can use a simpler approach
      // This would need to match your smart account factory configuration
      return wallet.address; // Placeholder - actual implementation depends on your setup
    } catch (error) {
      console.error('Error getting smart account address:', error);
      return null;
    }
  }

  /**
   * Check if Biconomy is properly configured
   */
  isConfigured(): boolean {
    return !!(BUNDLER_URL && PAYMASTER_URL);
  }

  /**
   * Get configuration status
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      chainId: this.config.chainId,
      chainName: 'Polygon',
      hasBundler: !!BUNDLER_URL,
      hasPaymaster: !!PAYMASTER_URL,
      rpcUrl: POLYGON_RPC_URL
    };
  }
}

// Export singleton instance
export const biconomyService = new BiconomyService();
