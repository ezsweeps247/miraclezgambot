/**
 * Web3 TypeScript types
 */

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
}

export interface MintRequest {
  walletAddress: string;
  tokenId: number;
  amount: number;
  metadata?: NFTMetadata;
}

export interface MintResponse {
  success: boolean;
  transactionHash?: string;
  tokenId: number;
  amount: number;
  error?: string;
}

export interface NFTBalance {
  tokenId: number;
  balance: string;
  metadata?: NFTMetadata;
}

export interface UserInventory {
  walletAddress: string;
  nfts: NFTBalance[];
  totalNFTs: number;
}

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  blockNumber?: number;
}

export interface ContractInfo {
  address: string;
  chainId: number;
  name: string;
  symbol: string;
}

// NFT Token IDs (you can define specific IDs for different NFT types)
export enum NFTTokenId {
  // Achievement NFTs
  FIRST_WIN = 1,
  HIGH_ROLLER = 2,
  JACKPOT_WINNER = 3,
  
  // Game-specific NFTs
  FUNDORA_BLOX_MASTER = 10,
  DICE_CHAMPION = 11,
  SLOTS_LEGEND = 12,
  
  // VIP Tier NFTs
  VIP_BRONZE = 20,
  VIP_SILVER = 21,
  VIP_GOLD = 22,
  VIP_PLATINUM = 23,
  VIP_DIAMOND = 24,
  
  // Special Event NFTs
  GRAND_OPENING = 100,
  ANNIVERSARY = 101,
}

export const NFT_METADATA: Record<number, Omit<NFTMetadata, 'image'>> = {
  [NFTTokenId.FIRST_WIN]: {
    name: 'First Victory',
    description: 'Commemorates your first win on Miraclez Gaming',
    attributes: [
      { trait_type: 'Category', value: 'Achievement' },
      { trait_type: 'Rarity', value: 'Common' },
    ],
  },
  [NFTTokenId.HIGH_ROLLER]: {
    name: 'High Roller',
    description: 'Awarded for placing high-stakes bets',
    attributes: [
      { trait_type: 'Category', value: 'Achievement' },
      { trait_type: 'Rarity', value: 'Rare' },
    ],
  },
  [NFTTokenId.FUNDORA_BLOX_MASTER]: {
    name: 'Fundora Blox Master',
    description: 'Master of the Fundora Blox game',
    attributes: [
      { trait_type: 'Category', value: 'Game Achievement' },
      { trait_type: 'Game', value: 'Fundora Blox' },
      { trait_type: 'Rarity', value: 'Epic' },
    ],
  },
  [NFTTokenId.VIP_PLATINUM]: {
    name: 'Platinum VIP',
    description: 'Platinum tier VIP member badge',
    attributes: [
      { trait_type: 'Category', value: 'VIP' },
      { trait_type: 'Tier', value: 'Platinum' },
      { trait_type: 'Rarity', value: 'Legendary' },
    ],
  },
};
