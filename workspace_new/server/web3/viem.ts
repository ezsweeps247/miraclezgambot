import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, encodePacked, toHex } from 'viem';

/**
 * Viem-based Web3 layer for PlayerPass1155 NFT interactions
 * Uses viem for all blockchain operations (signatures, reads, writes)
 */

// Initialize clients
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY;
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS as Address | undefined;

// Public client for reading blockchain data
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// Wallet client for signing transactions (only if private key is available)
let walletClient: ReturnType<typeof createWalletClient> | null = null;
let signerAccount: ReturnType<typeof privateKeyToAccount> | null = null;

if (OPERATOR_PRIVATE_KEY) {
  try {
    signerAccount = privateKeyToAccount(OPERATOR_PRIVATE_KEY as Hex);
    walletClient = createWalletClient({
      account: signerAccount,
      chain: baseSepolia,
      transport: http(RPC_URL),
    });
    console.log('✅ Viem wallet client initialized');
    console.log('  Network: Base Sepolia (Chain ID: 84532)');
    console.log('  Signer:', signerAccount.address);
  } catch (error) {
    console.error('❌ Failed to initialize viem wallet client:', error);
  }
}

export { walletClient };

/**
 * Sign a mint request for PlayerPass1155.mintWithSig()
 * Generates an ECDSA signature that matches the contract's verification logic
 * 
 * @param to - Recipient address
 * @param tokenId - Token ID to mint
 * @param amount - Amount to mint
 * @param salt - Unique salt for replay protection
 * @returns Signature hex string
 */
export async function signMint(
  to: Address,
  tokenId: number,
  amount: number,
  salt: string
): Promise<Hex> {
  if (!signerAccount || !NFT_CONTRACT_ADDRESS) {
    throw new Error('Signer account or NFT contract address not configured');
  }

  // Build the message hash matching the contract's verification:
  // keccak256(abi.encodePacked(address(this), "MINT", to, id, amount, salt))
  const messageHash = keccak256(
    encodePacked(
      ['address', 'string', 'address', 'uint256', 'uint256', 'bytes32'],
      [
        NFT_CONTRACT_ADDRESS,
        'MINT',
        to,
        BigInt(tokenId),
        BigInt(amount),
        salt as Hex,
      ]
    )
  );

  // Sign the message hash (this will automatically add the Ethereum signed message prefix)
  const signature = await signerAccount.signMessage({
    message: { raw: messageHash },
  });

  return signature;
}

/**
 * Get contract configuration
 */
export function getContractConfig() {
  if (!NFT_CONTRACT_ADDRESS) {
    throw new Error('NFT_CONTRACT_ADDRESS not configured');
  }

  return {
    address: NFT_CONTRACT_ADDRESS,
    chainId: baseSepolia.id,
    chain: baseSepolia,
  };
}

/**
 * Get the signer address
 */
export function getSignerAddress(): Address {
  if (!signerAccount) {
    throw new Error('Signer not initialized');
  }
  return signerAccount.address;
}

/**
 * Check if viem service is ready
 */
export function isViemReady(): boolean {
  return !!(signerAccount && walletClient && NFT_CONTRACT_ADDRESS);
}

/**
 * Generate a unique salt for mint replay protection
 */
export function generateSalt(): Hex {
  // Generate a random 32-byte hex string
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return toHex(randomBytes);
}
