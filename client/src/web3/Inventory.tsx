import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Sparkles } from 'lucide-react';
import type { UserInventory } from '../../../shared/web3/types';

export function Inventory() {
  const { address, isConnected } = useAccount();

  const { data: inventory, isLoading } = useQuery<UserInventory>({
    queryKey: ['/api/web3/inventory', address],
    enabled: isConnected && !!address,
  });

  if (!isConnected || !address) {
    return (
      <Card className="bg-gray-900 border-purple-600/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            NFT Inventory
          </CardTitle>
          <CardDescription>
            Connect your wallet to view your NFT collection
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-purple-600/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            NFT Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 bg-gray-800" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-purple-600/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            NFT Inventory
          </div>
          <Badge variant="outline" className="border-purple-600/50">
            {inventory?.totalNFTs || 0} NFTs
          </Badge>
        </CardTitle>
        <CardDescription>
          Your Miraclez Gaming NFT collection
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!inventory?.nfts || inventory.nfts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-16 h-16 text-gray-600 mb-4" />
            <p className="text-gray-400 mb-2">No NFTs yet</p>
            <p className="text-sm text-gray-500">
              Earn achievements and unlock NFTs by playing games!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.nfts.map((nft) => (
              <Card
                key={nft.tokenId}
                className="bg-gray-800/50 border-purple-600/20 hover:border-purple-600/50 transition-colors"
                data-testid={`card-nft-${nft.tokenId}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 p-3 rounded-lg">
                      <Sparkles className="w-6 h-6 text-purple-400" />
                    </div>
                    <Badge className="bg-purple-600/20 text-purple-300 border-purple-600/30">
                      ×{nft.balance}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold text-white mb-1" data-testid={`text-nft-name-${nft.tokenId}`}>
                    {nft.metadata?.name || `NFT #${nft.tokenId}`}
                  </h3>
                  
                  {nft.metadata?.description && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                      {nft.metadata.description}
                    </p>
                  )}
                  
                  {nft.metadata?.attributes && (
                    <div className="flex flex-wrap gap-1">
                      {nft.metadata.attributes.slice(0, 2).map((attr, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs border-gray-600 text-gray-400"
                        >
                          {attr.value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
