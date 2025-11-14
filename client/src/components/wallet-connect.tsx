import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Wallet, 
  Shield, 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  features: string[];
  supported: boolean;
  popular?: boolean;
  recommended?: boolean;
}

interface ConnectedWallet {
  address: string;
  balance: number;
  currency: string;
  network: string;
  status: 'connected' | 'connecting' | 'disconnected';
}

const walletOptions: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: 'Most popular Ethereum wallet',
    features: ['Browser Extension', 'Mobile App', 'Hardware Support'],
    supported: true,
    popular: true,
    recommended: true
  },
  {
    id: 'trust-wallet',
    name: 'Trust Wallet',
    icon: '🛡️',
    description: 'Mobile-first multi-chain wallet',
    features: ['Multi-Chain', 'Mobile Native', 'DApp Browser'],
    supported: true,
    popular: true
  },
  {
    id: 'coinbase-wallet',
    name: 'Coinbase Wallet',
    icon: '🔵',
    description: 'Easy-to-use wallet by Coinbase',
    features: ['User-Friendly', 'DeFi Access', 'Recovery Phrase'],
    supported: true
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    description: 'Leading Solana wallet',
    features: ['Solana Native', 'NFT Support', 'Staking'],
    supported: true
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: 'Connect any mobile wallet',
    features: ['Universal Protocol', '200+ Wallets', 'QR Code'],
    supported: true
  },
  {
    id: 'ledger',
    name: 'Ledger',
    icon: '🔐',
    description: 'Hardware wallet security',
    features: ['Hardware Security', 'Cold Storage', 'Multi-Currency'],
    supported: true,
    recommended: true
  }
];

interface WalletConnectProps {
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function WalletConnect({ children, variant = 'default', size = 'default', className }: WalletConnectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'connecting' | 'connected' | 'error'>('select');
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's connected wallets
  const { data: userWallets } = useQuery<any[]>({
    queryKey: ['/api/user/wallets'],
    staleTime: 30000
  });

  // Check if user has any wallets connected
  const hasConnectedWallets = userWallets && userWallets.length > 0;

  // Connect wallet mutation
  const connectWalletMutation = useMutation({
    mutationFn: (walletData: { walletType: string; address: string; signature?: string }) =>
      apiRequest('POST', '/api/user/connect-wallet', walletData),
    onSuccess: (data: any) => {
      setConnectedWallet(data.wallet);
      setStep('connected');
      queryClient.invalidateQueries({ queryKey: ['/api/user/wallets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      toast({
        title: "Wallet Connected!",
        description: `Successfully connected ${selectedWallet} wallet`,
      });
    },
    onError: (error: Error) => {
      setStep('error');
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleWalletSelect = async (walletId: string) => {
    setSelectedWallet(walletId);
    setStep('connecting');

    // Simulate wallet connection process
    try {
      // In a real implementation, this would integrate with actual wallet APIs
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock wallet connection data
      const mockWalletData = {
        walletType: walletId,
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        signature: 'mock_signature'
      };

      await connectWalletMutation.mutateAsync(mockWalletData);
    } catch (error) {
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('select');
    setSelectedWallet(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setStep('select');
      setSelectedWallet(null);
      setConnectedWallet(null);
    }, 300);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Address Copied",
      description: "Wallet address copied to clipboard",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button 
            variant={variant} 
            size={size}
            className={cn(
              "relative overflow-hidden transition-all duration-300",
              hasConnectedWallets ? "bg-green-600 hover:bg-green-700 text-white" : "",
              className
            )}
          >
            <div className="flex items-center gap-2">
              <Wallet style={{width: '3px', height: '3px'}} />
              {hasConnectedWallets ? 'Wallet Connected' : 'Connect Wallet'}
            </div>
            {hasConnectedWallets && (
              <div className="absolute -top-1 -right-1">
                <div style={{width: '3px', height: '3px'}} className="bg-green-400 rounded-full animate-pulse" />
              </div>
            )}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet style={{width: '3px', height: '3px'}} />
            {step === 'select' && 'Connect Your Wallet'}
            {step === 'connecting' && 'Connecting Wallet'}
            {step === 'connected' && 'Wallet Connected'}
            {step === 'error' && 'Connection Failed'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'select' && (
            <>
              <div className="text-[8px] text-muted-foreground">
                Choose your preferred wallet to start playing with cryptocurrency
              </div>
              
              <div className="grid gap-2">
                {walletOptions.map((wallet) => (
                  <Card 
                    key={wallet.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                      !wallet.supported && "opacity-50 cursor-not-allowed",
                      wallet.recommended && "border-primary/20 bg-primary/5"
                    )}
                    onClick={() => wallet.supported && handleWalletSelect(wallet.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-[10px]">{wallet.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{wallet.name}</h3>
                              {wallet.popular && (
                                <Badge variant="secondary" className="text-[8px]">Popular</Badge>
                              )}
                              {wallet.recommended && (
                                <Badge variant="default" className="text-[8px]">Recommended</Badge>
                              )}
                            </div>
                            <p className="text-[8px] text-muted-foreground mt-1">
                              {wallet.description}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {wallet.features.map((feature) => (
                                <Badge key={feature} variant="outline" className="text-[8px]">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          {wallet.supported ? (
                            <CheckCircle style={{width: '3px', height: '3px'}} className="text-green-500" />
                          ) : (
                            <AlertCircle style={{width: '3px', height: '3px'}} className="text-yellow-500" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />
              
              <div className="flex items-center gap-2 text-[8px] text-muted-foreground">
                <Shield style={{width: '3px', height: '3px'}} />
                <span>Your wallet stays secure. We never store private keys.</span>
              </div>
            </>
          )}

          {step === 'connecting' && (
            <div className="text-center space-y-4 py-8">
              <div className="mx-auto w-16 h-16 relative">
                <RefreshCw className=" style={{width: "4px", height: "4px"}} text-primary animate-spin" />
              </div>
              <div>
                <h3 className="font-medium mb-2">Connecting to {selectedWallet}</h3>
                <p className="text-[8px] text-muted-foreground">
                  Please approve the connection in your wallet...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-[8px] text-muted-foreground">
                <Clock className=""style={{width: '2.5px', height: '2.5px'}} />
                <span>This may take a few seconds</span>
              </div>
            </div>
          )}

          {step === 'connected' && connectedWallet && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className=" text-green-600"style={{width: '3px', height: '3px'}} />
                </div>
                <h3 className="font-medium">Successfully Connected!</h3>
                <p className="text-[8px] text-muted-foreground">
                  Your wallet is now connected and ready to use
                </p>
              </div>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-medium">Wallet Address</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyAddress(connectedWallet.address)}
                      className="h-6 px-2"
                    >
                      <Copy className=""style={{width: '2.5px', height: '2.5px'}} />
                    </Button>
                  </div>
                  <div className="font-mono text-[8px] bg-muted p-2 rounded text-center">
                    {`${connectedWallet.address.slice(0, 6)}...${connectedWallet.address.slice(-4)}`}
                  </div>
                  
                  <div className="flex items-center justify-between text-[8px]">
                    <span>Balance</span>
                    <span className="font-medium">
                      {connectedWallet.balance} {connectedWallet.currency}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-[8px]">
                    <span>Network</span>
                    <Badge variant="outline">{connectedWallet.network}</Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2">
                <Button onClick={handleClose} className="flex-1">
                  <ArrowRight style={{width: '3px', height: '3px'}} className="mr-2" />
                  Start Playing
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open('#', '_blank')}>
                  <ExternalLink style={{width: '3px', height: '3px'}} />
                </Button>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-4 py-8">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className=" text-red-600"style={{width: '3px', height: '3px'}} />
              </div>
              <div>
                <h3 className="font-medium mb-2">Connection Failed</h3>
                <p className="text-[8px] text-muted-foreground">
                  Unable to connect to {selectedWallet}. Please try again or choose a different wallet.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleRetry} variant="outline" className="flex-1">
                  Try Again
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact wallet status component for header/navbar
export function WalletStatus() {
  const { data: userWallets } = useQuery<any[]>({
    queryKey: ['/api/user/wallets'],
    staleTime: 30000
  });

  const primaryWallet = userWallets?.[0];

  if (!primaryWallet) {
    return (
      <WalletConnect variant="ghost" size="sm">
        <div className="flex items-center gap-2">
          <Wallet style={{width: '3px', height: '3px'}} />
          <span className="hidden sm:inline">Connect</span>
        </div>
      </WalletConnect>
    );
  }

  return (
    <WalletConnect variant="ghost" size="sm">
      <div className="flex items-center gap-2">
        <div style={{width: '2.5px', height: '2.5px'}} className="bg-green-400 rounded-full" />
        <span className="hidden sm:inline font-mono text-[8px]">
          {primaryWallet.address ? `${primaryWallet.address.slice(0, 4)}...${primaryWallet.address.slice(-2)}` : ''}
        </span>
        <Wallet style={{width: '3px', height: '3px'}} className="sm:hidden" />
      </div>
    </WalletConnect>
  );
}