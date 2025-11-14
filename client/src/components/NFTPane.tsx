import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  wagmiConfig, 
  useAccount, 
  useConnect, 
  useDisconnect,
  useChainConfig,
  useLinkWallet,
  useMintPass,
  usePlayerPassBalance,
  useUserWallets,
} from '@/web3/wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Award, ExternalLink, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { baseSepolia } from 'wagmi/chains';

const nftQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
    },
  },
});

function NFTPaneContent() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: config, isLoading: configLoading } = useChainConfig();
  const { data: balance } = usePlayerPassBalance(address);
  const { data: userWallets } = useUserWallets();
  const linkWallet = useLinkWallet();
  const mintPass = useMintPass();

  const [isLinking, setIsLinking] = useState(false);

  const hasPlayerPass = balance && balance > 0n;
  const isWalletLinked = userWallets?.wallets?.some(
    (w: any) => w.address === address?.toLowerCase()
  );

  const handleConnect = () => {
    const injectedConnector = connectors.find((c) => c.id === 'injected');
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  const handleLinkWallet = async () => {
    if (!address) return;
    
    setIsLinking(true);
    try {
      await linkWallet.mutateAsync({
        address,
        chainId: baseSepolia.id,
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleMint = async () => {
    if (!address) return;
    await mintPass.mutateAsync({ address });
  };

  const getExplorerLink = (txHash?: string) => {
    if (!config) return '#';
    return txHash 
      ? `${config.explorerUrl}/tx/${txHash}`
      : `${config.explorerUrl}/address/${config.contractAddress}`;
  };

  if (configLoading) {
    return (
      <Card className="w-full bg-[#1a1a1a] border-gray-800" data-testid="nft-pane-loading">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-gray-800" data-testid="nft-pane">
      <CardHeader className="border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              Player Pass NFT
              {hasPlayerPass && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Owned
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-gray-400 text-[12px]">
              Unlock exclusive in-game bonuses
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Connection Status */}
        {!isConnected ? (
          <div className="text-center py-6 space-y-4">
            <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-700/30">
              <Wallet className="w-12 h-12 mx-auto mb-3 text-purple-400" />
              <p className="text-gray-300 mb-4">Connect your wallet to mint Player Pass NFT</p>
              <Button
                onClick={handleConnect}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                data-testid="button-connect-wallet"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected Wallet Info */}
            <Card className="bg-gray-900/50 border-gray-800" data-testid="card-wallet-info">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">Connected Wallet</span>
                  {isWalletLinked && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid="badge-wallet-linked">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Linked
                    </Badge>
                  )}
                </div>
                <div className="font-mono text-sm text-white break-all" data-testid="text-wallet-address">
                  {address}
                </div>
                <div className="flex gap-2 mt-3">
                  {!isWalletLinked && (
                    <Button
                      onClick={handleLinkWallet}
                      disabled={isLinking || linkWallet.isPending}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-link-wallet"
                    >
                      {isLinking || linkWallet.isPending ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                          Linking...
                        </>
                      ) : (
                        'Link to Account'
                      )}
                    </Button>
                  )}
                  <Button
                    onClick={() => disconnect()}
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    data-testid="button-disconnect"
                  >
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Player Pass Status */}
            <Card className={`border ${hasPlayerPass ? 'bg-gradient-to-br from-amber-900/30 to-amber-800/20 border-amber-700/50' : 'bg-gray-900/50 border-gray-800'}`} data-testid="card-player-pass-status">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">Player Pass</span>
                  <span className="text-2xl font-bold text-white" data-testid="text-pass-balance">
                    {balance?.toString() || '0'}
                  </span>
                </div>
                
                {hasPlayerPass ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-center gap-2 text-amber-400 mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-semibold">Active Bonuses</span>
                      </div>
                      <ul className="space-y-1 text-xs text-amber-300">
                        <li>• +5% Gold Coins on wins</li>
                        <li>• +2% Sweep Coins reload bonus</li>
                      </ul>
                    </div>
                    <Button
                      onClick={() => window.open(getExplorerLink(), '_blank')}
                      variant="outline"
                      size="sm"
                      className="w-full border-amber-700 text-amber-400 hover:bg-amber-900/30"
                      data-testid="button-view-on-explorer"
                    >
                      <ExternalLink className="w-3 h-3 mr-2" />
                      View on Explorer
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400">
                      Mint your Player Pass to unlock exclusive in-game bonuses
                    </p>
                    <Button
                      onClick={handleMint}
                      disabled={!isWalletLinked || mintPass.isPending}
                      className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50"
                      data-testid="button-mint-pass"
                    >
                      {mintPass.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Minting...
                        </>
                      ) : (
                        <>
                          <Award className="w-4 h-4 mr-2" />
                          Mint Player Pass
                        </>
                      )}
                    </Button>
                    {!isWalletLinked && (
                      <p className="text-xs text-amber-400/70 text-center">
                        Link your wallet first to mint
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Network Info */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Network: <span className="text-purple-400">{config?.chainName || 'Base Sepolia'}</span>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Wrapper with providers
export function NFTPane() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={nftQueryClient}>
        <NFTPaneContent />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
