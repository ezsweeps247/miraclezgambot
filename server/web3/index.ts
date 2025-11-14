import { ethers } from 'ethers';
import { signerService } from './signer';
import { BUUNIX1155_ABI } from '../../shared/web3/abis';
import type { MintRequest, MintResponse, NFTBalance, UserInventory } from '../../shared/web3/types';

/**
 * Web3 Service - Main service for blockchain interactions
 */

class Web3Service {
  private contract: ethers.Contract | null = null;
  private contractAddress: string | null = null;
  private chainId: number | null = null;

  /**
   * Initialize Web3 service
   */
  async initialize() {
    try {
      const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
      
      if (!CONTRACT_ADDRESS) {
        console.warn('⚠️  NFT Contract not configured - missing CONTRACT_ADDRESS');
        return false;
      }

      // Initialize signer first
      const signerInitialized = await signerService.initialize();
      if (!signerInitialized) {
        return false;
      }

      const signer = signerService.getSigner();
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, BUUNIX1155_ABI, signer);
      this.contractAddress = CONTRACT_ADDRESS;
      
      const networkInfo = await signerService.getNetworkInfo();
      this.chainId = networkInfo.chainId;

      // Verify contract
      const name = await this.contract.name();
      const symbol = await this.contract.symbol();
      
      console.log('✅ NFT Contract initialized');
      console.log('  Address:', CONTRACT_ADDRESS);
      console.log('  Name:', name);
      console.log('  Symbol:', symbol);
      console.log('  Chain ID:', this.chainId);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Web3 service:', error);
      return false;
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.contract !== null && signerService.isInitialized();
  }

  /**
   * Mint NFT to user wallet
   */
  async mintNFT(request: MintRequest): Promise<MintResponse> {
    if (!this.contract) {
      throw new Error('Web3 service not initialized');
    }

    try {
      const { walletAddress, tokenId, amount } = request;
      
      // Call mint function on contract
      const tx = await this.contract.mint(
        walletAddress,
        tokenId,
        amount,
        '0x' // Empty data
      );

      console.log(`🔄 Minting NFT - Token ID: ${tokenId}, Amount: ${amount}`);
      console.log(`  To: ${walletAddress}`);
      console.log(`  Tx: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      console.log(`✅ NFT Minted - Block: ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: tx.hash,
        tokenId,
        amount,
      };
    } catch (error: any) {
      console.error('❌ Mint failed:', error);
      return {
        success: false,
        tokenId: request.tokenId,
        amount: request.amount,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Get NFT balance for a user
   */
  async getBalance(walletAddress: string, tokenId: number): Promise<string> {
    if (!this.contract) {
      throw new Error('Web3 service not initialized');
    }

    try {
      const balance = await this.contract.balanceOf(walletAddress, tokenId);
      return balance.toString();
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      return '0';
    }
  }

  /**
   * Get all NFT balances for a user (batch query)
   */
  async getBalances(walletAddress: string, tokenIds: number[]): Promise<NFTBalance[]> {
    if (!this.contract) {
      throw new Error('Web3 service not initialized');
    }

    try {
      const addresses = new Array(tokenIds.length).fill(walletAddress);
      const balances = await this.contract.balanceOfBatch(addresses, tokenIds);
      
      return tokenIds.map((tokenId, index) => ({
        tokenId,
        balance: balances[index].toString(),
      }));
    } catch (error) {
      console.error('❌ Failed to get balances:', error);
      return tokenIds.map(tokenId => ({ tokenId, balance: '0' }));
    }
  }

  /**
   * Get user's full NFT inventory
   */
  async getUserInventory(walletAddress: string, tokenIds: number[]): Promise<UserInventory> {
    const balances = await this.getBalances(walletAddress, tokenIds);
    
    // Filter out zero balances
    const ownedNFTs = balances.filter(nft => BigInt(nft.balance) > BigInt(0));
    
    return {
      walletAddress,
      nfts: ownedNFTs,
      totalNFTs: ownedNFTs.reduce((sum, nft) => sum + Number(nft.balance), 0),
    };
  }

  /**
   * Get token URI
   */
  async getTokenURI(tokenId: number): Promise<string> {
    if (!this.contract) {
      throw new Error('Web3 service not initialized');
    }

    try {
      return await this.contract.uri(tokenId);
    } catch (error) {
      console.error('❌ Failed to get token URI:', error);
      return '';
    }
  }

  /**
   * Get contract info
   */
  getContractInfo() {
    if (!this.contract || !this.contractAddress || !this.chainId) {
      throw new Error('Web3 service not initialized');
    }

    return {
      address: this.contractAddress,
      chainId: this.chainId,
    };
  }
}

// Singleton instance
export const web3Service = new Web3Service();
