import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { NFTTokenId, NFT_METADATA } from '../../../shared/web3/types';

interface MintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MintModal({ open, onOpenChange }: MintModalProps) {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [selectedTokenId, setSelectedTokenId] = useState<number>(NFTTokenId.FIRST_WIN);

  const mintMutation = useMutation({
    mutationFn: async (tokenId: number) => {
      if (!address) throw new Error('Wallet not connected');
      
      const response = await apiRequest('POST', '/api/web3/mint', {
        walletAddress: address,
        tokenId,
        amount: 1,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'NFT Minted Successfully! 🎉',
        description: `Transaction: ${data.transactionHash?.slice(0, 10)}...${data.transactionHash?.slice(-8)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/web3/inventory'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Mint Failed',
        description: error.message || 'Failed to mint NFT',
      });
    },
  });

  const handleMint = () => {
    if (!isConnected || !address) {
      toast({
        variant: 'destructive',
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first',
      });
      return;
    }

    mintMutation.mutate(selectedTokenId);
  };

  // Get available NFT options
  const nftOptions = Object.entries(NFTTokenId)
    .filter(([_, value]) => typeof value === 'number')
    .map(([name, id]) => ({
      id: id as number,
      name,
      metadata: NFT_METADATA[id as number],
    }));

  const selectedNFT = nftOptions.find(nft => nft.id === selectedTokenId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-purple-600/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Mint NFT
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Select an NFT to mint to your connected wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* NFT Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Select NFT
            </label>
            <Select
              value={selectedTokenId.toString()}
              onValueChange={(value) => setSelectedTokenId(Number(value))}
            >
              <SelectTrigger className="bg-gray-800 border-purple-600/30" data-testid="select-nft-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-purple-600/30">
                {nftOptions.map((nft) => (
                  <SelectItem
                    key={nft.id}
                    value={nft.id.toString()}
                    className="hover:bg-gray-700"
                  >
                    {nft.metadata?.name || nft.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* NFT Preview */}
          {selectedNFT?.metadata && (
            <div className="bg-gray-800/50 border border-purple-600/20 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-purple-400">
                {selectedNFT.metadata.name}
              </h3>
              <p className="text-sm text-gray-400">
                {selectedNFT.metadata.description}
              </p>
              {selectedNFT.metadata.attributes && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedNFT.metadata.attributes.map((attr, index) => (
                    <div
                      key={index}
                      className="bg-purple-600/20 px-2 py-1 rounded text-xs"
                    >
                      <span className="text-gray-400">{attr.trait_type}:</span>{' '}
                      <span className="text-purple-300">{attr.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Wallet Info */}
          {isConnected && address && (
            <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-3">
              <p className="text-xs text-gray-400">Minting to</p>
              <p className="font-mono text-sm text-blue-400" data-testid="text-mint-address">
                {address.slice(0, 6)}...{address.slice(-4)}
              </p>
            </div>
          )}

          {/* Mint Button */}
          <Button
            onClick={handleMint}
            disabled={!isConnected || mintMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            data-testid="button-mint-nft"
          >
            {mintMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Minting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Mint NFT
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
