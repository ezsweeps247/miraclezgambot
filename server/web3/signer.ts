import { ethers } from 'ethers';

/**
 * Web3 Signer Service
 * Manages blockchain transaction signing using operator wallet
 */

class SignerService {
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private initialized = false;

  /**
   * Initialize the signer with environment variables
   */
  async initialize() {
    const RPC_URL = process.env.RPC_URL;
    const OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY;

    if (!RPC_URL || !OPERATOR_PRIVATE_KEY) {
      console.warn('⚠️  Web3 not configured - missing RPC_URL or OPERATOR_PRIVATE_KEY');
      return false;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(RPC_URL);
      this.signer = new ethers.Wallet(OPERATOR_PRIVATE_KEY, this.provider);
      
      // Verify connection
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(this.signer.address);
      
      console.log('✅ Web3 Signer initialized');
      console.log('  Network:', network.name, '(Chain ID:', Number(network.chainId), ')');
      console.log('  Operator:', this.signer.address);
      console.log('  Balance:', ethers.formatEther(balance), 'ETH');
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Web3 signer:', error);
      return false;
    }
  }

  /**
   * Get the signer instance
   */
  getSigner(): ethers.Wallet {
    if (!this.initialized || !this.signer) {
      throw new Error('Signer not initialized. Call initialize() first.');
    }
    return this.signer;
  }

  /**
   * Get the provider instance
   */
  getProvider(): ethers.JsonRpcProvider {
    if (!this.initialized || !this.provider) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }
    return this.provider;
  }

  /**
   * Get operator address
   */
  getOperatorAddress(): string {
    if (!this.initialized || !this.signer) {
      throw new Error('Signer not initialized');
    }
    return this.signer.address;
  }

  /**
   * Check if signer is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get network information
   */
  async getNetworkInfo() {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    
    const network = await this.provider.getNetwork();
    const blockNumber = await this.provider.getBlockNumber();
    
    return {
      name: network.name,
      chainId: Number(network.chainId),
      blockNumber,
    };
  }

  /**
   * Get gas price
   */
  async getGasPrice(): Promise<bigint> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice || BigInt(0);
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string, confirmations: number = 1) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    
    return await this.provider.waitForTransaction(txHash, confirmations);
  }
}

// Singleton instance
export const signerService = new SignerService();
