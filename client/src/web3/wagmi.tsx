import { createConfig, http, useAccount, useConnect, useDisconnect, useWalletClient, useReadContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { type Address, type Hex } from 'viem';

// PlayerPass1155 ABI (minimal subset needed for frontend)
export const playerPassAbi = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'id', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'salt', type: 'bytes32' },
      { name: 'signature', type: 'bytes' }
    ],
    name: 'mintWithSig',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' }
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'id', type: 'uint256' }],
    name: 'uri',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  }
] as const;

// Wagmi configuration
export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected({ target: 'metaMask' }),
    injected({ target: 'walletConnect' }),
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
});

// Hook to get chain configuration from backend
export function useChainConfig() {
  return useQuery({
    queryKey: ['/api/nft/config'],
  });
}

// Hook to link wallet to user account
export function useLinkWallet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ address, chainId }: { address: Address; chainId: number }) => {
      const res = await apiRequest('POST', '/api/nft/link-wallet', {
        address,
        chainId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/user/wallets'] });
      toast({
        title: 'Success',
        description: 'Wallet linked successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link wallet',
        variant: 'destructive',
      });
    },
  });
}

// Hook to get mint signature from backend and execute mint
export function useMintPass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: walletClient } = useWalletClient();
  const { data: config } = useChainConfig();

  return useMutation({
    mutationFn: async ({ address }: { address: Address }) => {
      if (!walletClient) {
        throw new Error('Wallet not connected');
      }

      if (!config) {
        throw new Error('NFT config not loaded');
      }

      // Step 1: Get signature from backend
      const res = await apiRequest('POST', '/api/nft/mint/pass', {
        address,
      });
      const signatureData = await res.json();

      const { signature, salt, tokenId, amount, contractAddress } = signatureData as {
        signature: Hex;
        salt: Hex;
        tokenId: number;
        amount: number;
        contractAddress: Address;
      };

      // Step 2: Execute mintWithSig on-chain
      const txHash = await walletClient.writeContract({
        address: contractAddress as Address,
        abi: playerPassAbi,
        functionName: 'mintWithSig',
        args: [
          address,
          BigInt(tokenId),
          BigInt(amount),
          salt as Hex,
          signature as Hex,
        ],
      });

      // Step 3: Notify backend of successful mint
      const rewardRes = await apiRequest('POST', '/api/nft/reward/after-mint', {
        txHash,
        salt,
        tokenId,
      });
      await rewardRes.json();

      return { txHash, tokenId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/nft/holds'] });
      toast({
        title: 'Player Pass Minted!',
        description: `Your Player Pass NFT has been minted. TX: ${data.txHash.slice(0, 10)}...`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Mint Failed',
        description: error.message || 'Failed to mint Player Pass',
        variant: 'destructive',
      });
    },
  });
}

// Hook to check NFT balances
export function useBalances(address?: Address) {
  const { data: config } = useChainConfig();

  return useQuery({
    queryKey: ['/api/nft/holds', address],
    enabled: !!address && !!config,
  });
}

// Hook to read on-chain balance directly
export function usePlayerPassBalance(address?: Address) {
  const { data: config } = useChainConfig() as { data?: { contractAddress?: Address } };

  return useReadContract({
    address: (config?.contractAddress || '0x') as Address,
    abi: playerPassAbi,
    functionName: 'balanceOf',
    args: address ? [address, BigInt(1)] : undefined,
    query: {
      enabled: !!address && !!config?.contractAddress,
    },
  });
}

// Hook to get user's linked wallets
export function useUserWallets() {
  return useQuery({
    queryKey: ['/api/nft/user/wallets'],
  });
}

// Re-export wagmi hooks for convenience
export { useAccount, useConnect, useDisconnect, useWalletClient };
