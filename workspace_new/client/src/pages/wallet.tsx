import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import LiquidWallet from "@/components/LiquidWallet";
import LiquidTransactionStream from "@/components/LiquidTransactionStream";
import LiquidBackground from "@/components/LiquidBackground";
import { CryptoTransactionFlow } from "@/components/CryptoTransactionFlow";
import { 
  Wallet as WalletIcon, 
  Plus, 
  Minus, 
  Dice1, 
  Coins, 
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
  Copy,
  ExternalLink,
  AlertTriangle,
  ArrowUpDown,
  Bitcoin,
  DollarSign,
  Info,
  QrCode,
  ArrowLeft,
  Gift,
  Crown,
  Flame
} from "lucide-react";
import { Link } from "wouter";

interface CryptoWallet {
  id: string;
  currency: string;
  address: string;
  balance: string;
}

interface CryptoDeposit {
  id: string;
  currency: string;
  amount: string;
  address: string;
  txHash?: string;
  status: string;
  creditsAmount?: number;
  createdAt: string;
}

interface CryptoWithdrawal {
  id: string;
  currency: string;
  amount: string;
  toAddress: string;
  txHash?: string;
  status: string;
  creditsAmount: number;
  networkFee?: string;
  createdAt: string;
}

interface ExchangeRate {
  currency: string;
  rate: number;
  lastUpdated?: string;
}

interface Balance {
  available: number;
  locked: number;
  total: number;
  currency: string;
  sweepsCashTotal: number;
  sweepsCashRedeemable: number;
  balanceMode: 'GC' | 'SC';
}

export default function Wallet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCurrency, setSelectedCurrency] = useState<string>('BTC');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  const { data: balance } = useQuery<Balance>({
    queryKey: ["/api/balance"],
    staleTime: 5000,
    gcTime: 30000,
    refetchInterval: false,
    refetchOnWindowFocus: false
  });

  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
    queryFn: () => apiRequest('GET', '/api/transactions?limit=20').then(res => res.json())
  });

  // Fetch crypto data
  const { data: cryptoWallets } = useQuery<CryptoWallet[]>({
    queryKey: ["/api/crypto/wallets"],
    queryFn: () => apiRequest('GET', '/api/crypto/wallets').then(res => res.json())
  });

  const { data: cryptoDeposits } = useQuery<CryptoDeposit[]>({
    queryKey: ["/api/crypto/deposits"],
    queryFn: () => apiRequest('GET', '/api/crypto/deposits').then(res => res.json())
  });

  const { data: cryptoWithdrawals } = useQuery<CryptoWithdrawal[]>({
    queryKey: ["/api/crypto/withdrawals"],
    queryFn: () => apiRequest('GET', '/api/crypto/withdrawals').then(res => res.json())
  });

  // Fetch user data for streaks
  const { data: userData } = useQuery<{
    loginStreak?: number;
    longestStreak?: number;
    scStreakCount?: number;
    longestScStreak?: number;
    lastScClaimDate?: string;
  }>({
    queryKey: ['/api/me'],
  });

  // SC Streak claim mutation
  const claimScStreakMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/me/claim-sc-streak', {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      
      if (data.success) {
        toast({
          title: "SC Streak Claimed! 🎉",
          description: `Day ${data.streak} streak! You earned ${data.rewardAmount} SC`,
        });
      } else {
        toast({
          title: "Already Claimed",
          description: data.error || "You've already claimed your SC reward today",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim SC streak reward",
        variant: "destructive"
      });
    }
  });

  const { data: exchangeRatesData } = useQuery({
    queryKey: ["/api/crypto/rates"],
    queryFn: () => apiRequest('GET', '/api/crypto/rates').then(res => res.json())
  });

  // Convert object to array format
  const exchangeRates = exchangeRatesData ? Object.entries(exchangeRatesData).map(([currency, rate]) => ({
    currency: currency.toUpperCase(),
    rate: rate as number
  })) : [];

  const { data: supportedCurrencies } = useQuery<string[]>({
    queryKey: ["/api/crypto/currencies"],
    queryFn: () => apiRequest('GET', '/api/crypto/currencies').then(res => res.json())
  });

  // Connect wallet dialog state
  const [showWalletDialog, setShowWalletDialog] = useState(false);

  // Popular wallet options
  const popularWallets = [
    { name: 'MetaMask', icon: '🦊', url: 'https://metamask.io/download/', description: 'Most popular Ethereum wallet' },
    { name: 'Trust Wallet', icon: '🛡️', url: 'https://trustwallet.com/download', description: 'Multi-chain mobile wallet' },
    { name: 'Coinbase Wallet', icon: '💼', url: 'https://www.coinbase.com/wallet/downloads', description: 'Easy & secure wallet' },
    { name: 'Phantom', icon: '👻', url: 'https://phantom.app/download', description: 'Solana & multi-chain wallet' }
  ];

  // Handle wallet selection (opens external wallet app)
  const handleWalletConnect = (wallet: typeof popularWallets[0]) => {
    window.open(wallet.url, '_blank');
    toast({
      title: `Opening ${wallet.name}`,
      description: `Download ${wallet.name} to connect your crypto wallet`,
    });
  };

  // Crypto deposit mutation
  const cryptoDepositMutation = useMutation({
    mutationFn: async ({ currency, amount }: { currency: string; amount: string }) => {
      const response = await apiRequest('POST', '/api/crypto/deposit', { currency, usdAmount: parseFloat(amount) });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crypto/deposits"] });
      setShowDepositDialog(false);
      setDepositAmount('');
      toast({
        title: "Deposit Initiated",
        description: `Send ${selectedCurrency} to the provided address`,
      });
    },
    onError: (error) => {
      toast({
        title: "Deposit Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Crypto withdrawal mutation
  const cryptoWithdrawMutation = useMutation({
    mutationFn: async ({ currency, amount, toAddress }: { currency: string; amount: number; toAddress: string }) => {
      const response = await apiRequest('POST', '/api/crypto/withdraw', { 
        currency: currency.toLowerCase(), 
        amount, 
        address: toAddress // The API expects 'address' not 'toAddress'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crypto/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      setShowWithdrawDialog(false);
      setWithdrawAmount('');
      setWithdrawAddress('');
      toast({
        title: "Withdrawal Initiated",
        description: "Your withdrawal request has been submitted for processing",
      });
    },
    onError: (error) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const depositMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/deposit/dev');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Free Credits Added!",
        description: "1000 credits have been added to your account",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getTransactionIcon = (type: string, game?: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <Plus className="text-casino-green" />;
      case 'WITHDRAW':
        return <Minus className="text-casino-red" />;
      case 'BET':
        if (game === 'DICE') return <Dice1 className="text-casino-neon" />;
        if (game === 'SLOTS') return <Coins className="text-casino-gold" />;
        if (game === 'CRASH') return <TrendingUp className="text-casino-red" />;
        return <WalletIcon className="text-casino-text" />;
      case 'PAYOUT':
        if (game === 'DICE') return <Dice1 className="text-casino-green" />;
        if (game === 'SLOTS') return <Coins className="text-casino-green" />;
        if (game === 'CRASH') return <TrendingUp className="text-casino-green" />;
        return <WalletIcon className="text-casino-green" />;
      default:
        return <WalletIcon className="text-casino-text" />;
    }
  };

  const getTransactionTitle = (type: string, game?: string, meta?: any) => {
    switch (type) {
      case 'DEPOSIT':
        return meta?.source === 'dev_freebie' ? 'Free Credits' : 'Deposit';
      case 'WITHDRAW':
        return 'Withdrawal';
      case 'BET':
        return `${game || 'Game'} Bet`;
      case 'PAYOUT':
        return `${game || 'Game'} Win`;
      case 'REFUND':
        return 'Refund';
      default:
        return 'Transaction';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case 'BTC':
        return <Bitcoin style={{width: '3px', height: '3px'}} className=" text-orange-500" />;
      default:
        return <DollarSign style={{width: '3px', height: '3px'}} className=" text-green-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'CONFIRMED':
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500">Failed</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-blue-500">Processing</Badge>;
      case 'SENT':
        return <Badge className="bg-green-600">Sent</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getCurrentRate = (currency: string) => {
    return exchangeRates?.find(r => r.currency === currency)?.rate || 0;
  };

  const calculateCredits = (amount: string, currency: string) => {
    const rate = getCurrentRate(currency);
    return rate > 0 ? (parseFloat(amount) * rate).toFixed(2) : '0.00';
  };

  const calculateCrypto = (credits: string, currency: string) => {
    const rate = getCurrentRate(currency);
    return rate > 0 ? (parseFloat(credits) / rate).toFixed(8) : '0.00000000';
  };

  return (
    <div className="relative px-4 py-6 pb-20">
      {/* Liquid Background Effect */}
      <LiquidBackground 
        particleCount={15} 
        colors={["#D4AF37", "#FFC107", "#FFD700"]} 
        className="z-0" 
      />
      
      <div className="relative z-10">
      {/* Wallet Header */}
      <div className="text-center mb-6">
        <h2 className="text-[10px] font-bold mb-2">Wallet</h2>
        <p className="text-casino-text">Manage your casino balance</p>
      </div>

      {/* Liquid Animated Balance Card */}
      {balance && (
        <div className="mb-6">
          <LiquidWallet 
            balance={balance}
            recentTransactions={transactions?.slice(0, 5).map((t: any) => ({
              id: t.id,
              type: t.type.toLowerCase() as any,
              amount: t.amount,
              timestamp: new Date(t.createdAt).getTime()
            })) || []}
          />
        </div>
      )}

      {/* Daily Rewards Section */}
      <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-[#D4AF37]/30 mb-6">
        <CardHeader>
          <CardTitle className="text-[10px] flex items-center gap-2 text-white">
            <Gift style={{width: '3px', height: '3px'}} className=" text-[#D4AF37]" />
            Daily Rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* GC Streak (Automatic - Read Only) */}
          <div className="bg-black/30 rounded-lg p-4 border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame style={{width: '3px', height: '3px'}} className=" text-green-400" />
                <span className="text-[10px] text-white font-semibold">GC Streak (Automatic)</span>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                {userData?.loginStreak || 0} Days
              </Badge>
            </div>
            <p className="text-gray-400 text-[8px] mb-2">
              Awarded automatically when you log in. 50 GC/day from day 3, max 500 GC.
            </p>
            <div className="flex items-center gap-2 text-[8px]">
              <span className="text-gray-500">Longest:</span>
              <span className="text-white font-medium">{userData?.longestStreak || 0} days</span>
            </div>
          </div>

          {/* SC Streak (Manual Claim) */}
          <div className="bg-black/30 rounded-lg p-4 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Crown style={{width: '3px', height: '3px'}} className=" text-purple-400" />
                <span className="text-white font-semibold">SC Streak (Claim Required)</span>
              </div>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                {userData?.scStreakCount || 0} Days
              </Badge>
            </div>
            <p className="text-gray-400 text-[8px] mb-3">
              Click to claim your daily SC reward. 50 SC/day from day 3, max 500 SC.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[8px]">
                <span className="text-gray-500">Longest:</span>
                <span className="text-white font-medium">{userData?.longestScStreak || 0} days</span>
              </div>
              <Button
                onClick={() => claimScStreakMutation.mutate()}
                disabled={claimScStreakMutation.isPending || userData?.lastScClaimDate === new Date().toISOString().split('T')[0]}
                className="bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold disabled:opacity-50"
                data-testid="button-claim-sc-streak-wallet"
              >
                {claimScStreakMutation.isPending ? 'Claiming...' : userData?.lastScClaimDate === new Date().toISOString().split('T')[0] ? 'Claimed Today' : 'Claim SC Reward'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
          <DialogTrigger asChild>
            <Button variant="golden" size="lg" className="flex items-center justify-center">
              <span>Deposit</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-casino-card border-casino-accent max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Deposit Cryptocurrency</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <p className="text-casino-text">Deposit feature coming soon.</p>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="lg" className="flex items-center justify-center">
              <span>Withdraw</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-casino-card border-casino-accent max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Withdraw Cryptocurrency</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <p className="text-casino-text">Withdrawal feature coming soon.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Crypto Transaction Flow Visualization */}
      <div className="mb-6">
        <CryptoTransactionFlow />
      </div>

      {/* Crypto Wallets */}
      <Card className="bg-casino-card border-casino-accent mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Bitcoin style={{width: '3px', height: '3px'}} className=" mr-2" />
            Cryptocurrency Wallets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!cryptoWallets || cryptoWallets.length === 0 ? (
            <div className="text-center py-6">
              <Bitcoin style={{width: '3.5px', height: '3.5px'}} className="text-casino-text mx-auto mb-4 opacity-50" />
              <p className="text-casino-text mb-4">Connect Your Crypto Wallet</p>
              <p className="text-[8px] text-casino-text/70 mb-4">Connect MetaMask, Trust Wallet, or other popular wallets</p>
              <Button
                onClick={() => setShowWalletDialog(true)}
                variant="default"
                data-testid="button-connect-wallet"
              >
                Connect Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {(cryptoWallets || []).map((wallet) => (
                <div key={wallet.id} className="bg-casino-dark p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getCurrencyIcon(wallet.currency)}
                      <div>
                        <div className="text-white font-medium">{wallet.currency}</div>
                        <div className="text-casino-text text-[8px]">Balance: {wallet.balance}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={wallet.address}
                      readOnly
                      className="bg-casino-card border-casino-accent/30 text-casino-text text-[8px]"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(wallet.address)}
                      variant="outline"
                    >
                      <Copy style={{width: '3.5px', height: '3.5px'}} className="" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crypto Transaction History */}
      <Tabs defaultValue="deposits" className="mb-6">
        <TabsList className="grid w-full grid-cols-2 bg-casino-dark">
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>
        
        <TabsContent value="deposits">
          <Card className="bg-casino-card border-casino-accent">
            <CardHeader>
              <CardTitle className="text-white">Recent Deposits</CardTitle>
            </CardHeader>
            <CardContent>
              {!cryptoDeposits || cryptoDeposits.length === 0 ? (
                <div className="text-center py-6">
                  <Plus style={{width: '3.5px', height: '3.5px'}} className="text-casino-text mx-auto mb-4 opacity-50" />
                  <p className="text-casino-text">No deposits yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cryptoDeposits.map((deposit) => (
                    <div key={deposit.id} className="bg-casino-dark p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {getCurrencyIcon(deposit.currency)}
                          <div>
                            <div className="text-white font-medium">
                              {deposit.amount} {deposit.currency}
                            </div>
                            <div className="text-casino-text text-[8px]">
                              {deposit.creditsAmount ? `≈ ${deposit.creditsAmount} Credits` : 'Processing...'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(deposit.status)}
                          <div className="text-casino-text text-[8px] mt-1">
                            {formatTimeAgo(deposit.createdAt)}
                          </div>
                        </div>
                      </div>
                      {deposit.txHash && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Input
                            value={deposit.txHash}
                            readOnly
                            className="bg-casino-card border-casino-accent/30 text-casino-text text-[8px]"
                          />
                          <Button
                            size="sm"
                            onClick={() => copyToClipboard(deposit.txHash!)}
                            className="bg-casino-accent hover:bg-casino-accent/80"
                          >
                            <Copy style={{width: '3.5px', height: '3.5px'}} className="" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="withdrawals">
          <Card className="bg-casino-card border-casino-accent">
            <CardHeader>
              <CardTitle className="text-white">Recent Withdrawals</CardTitle>
            </CardHeader>
            <CardContent>
              {!cryptoWithdrawals || cryptoWithdrawals.length === 0 ? (
                <div className="text-center py-6">
                  <Minus style={{width: '3.5px', height: '3.5px'}} className="text-casino-text mx-auto mb-4 opacity-50" />
                  <p className="text-casino-text">No withdrawals yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cryptoWithdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="bg-casino-dark p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {getCurrencyIcon(withdrawal.currency)}
                          <div>
                            <div className="text-white font-medium">
                              {withdrawal.amount} {withdrawal.currency}
                            </div>
                            <div className="text-casino-text text-[8px]">
                              {withdrawal.creditsAmount} Credits
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(withdrawal.status)}
                          <div className="text-casino-text text-[8px] mt-1">
                            {formatTimeAgo(withdrawal.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="text-casino-text text-[8px]">
                        To: {withdrawal.toAddress.substring(0, 20)}...
                        {withdrawal.networkFee && ` • Fee: ${withdrawal.networkFee} ${withdrawal.currency}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Liquid Transaction Stream */}
      <Card className="bg-casino-card/80 backdrop-blur border-casino-accent/30 mb-6">
        <CardContent className="p-4">
          <LiquidTransactionStream 
            transactions={transactions?.map((t: any) => ({
              id: t.id,
              type: t.type.toLowerCase() as any,
              amount: Math.abs(t.amount),
              currency: 'Credits',
              game: t.meta?.game,
              timestamp: new Date(t.createdAt).getTime(),
              status: 'completed' as const
            })) || []}
            maxDisplay={10}
          />
        </CardContent>
      </Card>
      
      {/* Traditional Transaction History (Hidden) */}
      {false && (
      <Card className="bg-casino-card border-casino-accent mb-6">
        <CardContent className="p-4">
          <h3 className="font-bold mb-4">Transaction History</h3>
          
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-8">
              <WalletIcon style={{width: '3.5px', height: '3.5px'}} className="text-casino-text mx-auto mb-4 opacity-50" />
              <div className="text-casino-text">No transactions yet</div>
              <div className="text-[8px] text-casino-text mt-1">
                Start playing to see your transaction history
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction: any) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-2 border-b border-casino-accent last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-casino-accent/50 rounded-full flex items-center justify-center">
                      {getTransactionIcon(transaction.type, transaction.meta?.game)}
                    </div>
                    <div>
                      <div className="font-medium">
                        {getTransactionTitle(transaction.type, transaction.meta?.game, transaction.meta)}
                      </div>
                      <div className="text-[8px] text-casino-text flex items-center">
                        <Clock style={{width: '3px', height: '3px'}} className="mr-1" />
                        {formatTimeAgo(transaction.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${
                      transaction.amount >= 0 ? 'text-casino-green' : 'text-casino-red'
                    }`}>
                      {transaction.amount >= 0 ? '+' : ''}
                      {transaction.amount.toFixed(2)}
                    </div>
                    <div className="text-[8px] text-casino-text flex items-center justify-end">
                      <CheckCircle style={{width: '3px', height: '3px'}} className="mr-1" />
                      Completed
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {transactions && transactions.length >= 20 && (
            <Button
              variant="ghost"
              className="w-full mt-4 text-casino-neon hover:text-casino-gold transition-colors"
            >
              Load More Transactions
            </Button>
          )}
        </CardContent>
      </Card>
      )}

      {/* Quick Access Actions */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Link href="/provably-fair">
          <Button
            className="w-full bg-casino-card border border-casino-accent/30 text-white font-medium py-4 hover:bg-casino-accent hover:border-casino-accent transition-colors flex flex-col items-center justify-center gap-2"
            data-testid="button-provably-fair"
          >
            <Shield style={{width: '3px', height: '3px'}} className=" text-casino-green" />
            <span className="text-[8px]">Provably Fair</span>
          </Button>
        </Link>

        <Link href="/redeem-code">
          <Button
            className="w-full bg-casino-card border border-casino-accent/30 text-white font-medium py-4 hover:bg-casino-accent hover:border-casino-accent transition-colors flex flex-col items-center justify-center gap-2"
            data-testid="button-redeem"
          >
            <Gift style={{width: '3px', height: '3px'}} className=" text-golden" />
            <span className="text-[8px]">Redeem</span>
          </Button>
        </Link>

        <Link href="/purchase">
          <Button
            className="w-full bg-casino-card border border-casino-accent/30 text-white font-medium py-4 hover:bg-casino-accent hover:border-casino-accent transition-colors flex flex-col items-center justify-center gap-2"
            data-testid="button-recharge"
          >
            <Plus style={{width: '3px', height: '3px'}} className=" text-casino-neon" />
            <span className="text-[8px]">Recharge</span>
          </Button>
        </Link>
      </div>

      {/* Back to Home Button */}
      <div className="mt-8 text-center">
        <Link href="/">
          <Button 
            variant="outline" 
            size="xs" 
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors rounded-lg"
            data-testid="button-back-home-wallet"
          >
            <ArrowLeft className=" mr-1"style={{width: '2.5px', height: '2.5px'}} />
            Back to Home
          </Button>
        </Link>
      </div>
      </div>
    </div>
  );

  function DepositDialog() {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-casino-text">Select Cryptocurrency</Label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="bg-casino-dark border-casino-accent/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-casino-dark border-casino-accent">
              {['BTC', 'ETH', 'USDT', 'LTC', 'DOGE'].map((currency) => (
                <SelectItem key={currency} value={currency}>
                  <div className="flex items-center space-x-2">
                    {getCurrencyIcon(currency)}
                    <span>{currency}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-casino-text">Amount ({selectedCurrency})</Label>
          <Input
            type="number"
            step="0.00000001"
            placeholder="0.00000000"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="bg-casino-dark border-casino-accent/30 text-white"
          />
          {depositAmount && (
            <div className="text-casino-text text-[8px]">
              ≈ {calculateCredits(depositAmount, selectedCurrency)} Credits
            </div>
          )}
        </div>

        {exchangeRates && (
          <div className="bg-casino-dark p-3 rounded-lg">
            <div className="text-casino-text text-[8px] mb-2">Current Rate</div>
            <div className="text-white font-medium">
              1 {selectedCurrency} = {getCurrentRate(selectedCurrency).toFixed(2)} Credits
            </div>
          </div>
        )}

        <Alert className="border-blue-500 bg-blue-500/10">
          <Info className=""style={{width: '3px', height: '3px'}} />
          <AlertDescription className="text-blue-300 text-[8px]">
            After clicking deposit, you'll receive a unique address to send your {selectedCurrency} to. 
            Credits will be added to your account after network confirmation.
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => {
            if (!depositAmount || parseFloat(depositAmount) <= 0) {
              toast({
                title: "Invalid Amount",
                description: "Please enter a valid deposit amount",
                variant: "destructive"
              });
              return;
            }
            cryptoDepositMutation.mutate({ currency: selectedCurrency, amount: depositAmount });
          }}
          disabled={cryptoDepositMutation.isPending || !depositAmount}
          className="w-full bg-casino-green hover:bg-casino-green/90"
        >
          {cryptoDepositMutation.isPending ? 'Creating Deposit...' : 'Create Deposit'}
        </Button>
      </div>
    );
  }

  function WithdrawDialog() {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-casino-text">Select Cryptocurrency</Label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="bg-casino-dark border-casino-accent/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-casino-dark border-casino-accent">
              {['BTC', 'ETH', 'USDT', 'LTC', 'DOGE'].map((currency) => (
                <SelectItem key={currency} value={currency}>
                  <div className="flex items-center space-x-2">
                    {getCurrencyIcon(currency)}
                    <span>{currency}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-casino-text">Withdrawal Address</Label>
          <Input
            placeholder="Enter destination address"
            value={withdrawAddress}
            onChange={(e) => setWithdrawAddress(e.target.value)}
            className="bg-casino-dark border-casino-accent/30 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-casino-text">Amount (Credits)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="bg-casino-dark border-casino-accent/30 text-white"
          />
          {withdrawAmount && (
            <div className="text-casino-text text-[8px]">
              ≈ {calculateCrypto(withdrawAmount, selectedCurrency)} {selectedCurrency}
            </div>
          )}
        </div>

        {balance && (
          <div className="bg-casino-dark p-3 rounded-lg">
            <div className="text-casino-text text-[8px] mb-1">Available Balance</div>
            <div className="text-white font-medium">
              {balance.balanceMode === 'SC' 
                ? `$${balance.sweepsCashRedeemable.toFixed(2)} SC` 
                : `${balance.available.toFixed(2)} GC`
              }
            </div>
          </div>
        )}

        <Alert className="border-yellow-500 bg-yellow-500/10">
          <AlertTriangle className=""style={{width: '3px', height: '3px'}} />
          <AlertDescription className="text-yellow-400 text-[8px]">
            Network fees will be deducted from your withdrawal amount. 
            Minimum withdrawal: 100 Credits. Processing time: 1-24 hours.
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => {
            const amount = parseFloat(withdrawAmount);
            if (!withdrawAmount || amount <= 0 || amount < 100) {
              toast({
                title: "Invalid Amount",
                description: "Minimum withdrawal is 100 Credits",
                variant: "destructive"
              });
              return;
            }
            if (!withdrawAddress) {
              toast({
                title: "Missing Address",
                description: "Please enter a valid withdrawal address",
                variant: "destructive"
              });
              return;
            }
            // Convert credits to crypto amount properly
            const cryptoAmount = parseFloat(withdrawAmount) / getCurrentRate(selectedCurrency);
            cryptoWithdrawMutation.mutate({ 
              currency: selectedCurrency, 
              amount: cryptoAmount, 
              toAddress: withdrawAddress 
            });
          }}
          disabled={cryptoWithdrawMutation.isPending || !withdrawAmount || !withdrawAddress}
          className="w-full bg-casino-red hover:bg-casino-red/90"
        >
          {cryptoWithdrawMutation.isPending ? 'Processing Withdrawal...' : 'Withdraw'}
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Wallet selection dialog */}
      <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-casino-gold text-[10px] flex items-center gap-2">
              <WalletIcon style={{width: '3px', height: '3px'}} className="" />
              Connect Your Crypto Wallet
            </DialogTitle>
            <DialogDescription className="text-casino-text/70">
              Choose a wallet to connect and manage your crypto deposits
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {popularWallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => handleWalletConnect(wallet)}
                className="p-4 rounded-lg border-2 border-casino-accent/30 bg-casino-dark/50 hover:bg-casino-dark hover:border-casino-gold/50 transition-all text-left group"
                data-testid={`button-wallet-${wallet.name.toLowerCase().replace(' ', '-')}`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-[10px]">{wallet.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold group-hover:text-casino-gold transition-colors">
                      {wallet.name}
                    </h3>
                    <p className="text-[8px] text-casino-text/70 mt-1">
                      {wallet.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <Alert className="border-casino-gold/30 bg-casino-gold/5 mt-4">
            <Info className=" text-casino-gold"style={{width: '3px', height: '3px'}} />
            <AlertDescription className="text-casino-text/80 text-[8px]">
              You'll be redirected to download the wallet app. After installation, return here to connect your wallet.
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>

      <LiquidBackground variant="cosmic" />
      <div className="relative z-10 max-w-6xl mx-auto p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-8">
            <div className="text-center mb-6">
              <h1 className="text-[10px] md:text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-casino-gold via-yellow-500 to-casino-gold mb-2">
                Wallet Center
              </h1>
              <p className="text-casino-text text-[10px]">Manage your funds, transactions, and crypto assets</p>
            </div>

            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 bg-casino-dark/60 p-2 rounded-xl backdrop-blur-sm">
              <TabsTrigger value="balance" className="data-[state=active]:bg-casino-accent data-[state=active]:text-white">
                <Coins style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                Balance
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-casino-accent data-[state=active]:text-white">
                <ArrowUpDown style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="crypto" className="data-[state=active]:bg-casino-accent data-[state=active]:text-white">
                <Bitcoin style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                Crypto
              </TabsTrigger>
              <TabsTrigger value="referral" className="data-[state=active]:bg-casino-accent data-[state=active]:text-white">
                <Gift style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                Referral
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Balance Tab */}
          <TabsContent value="balance">
            {balanceRenderContent()}
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            {transactionsRenderContent()}
          </TabsContent>

          {/* Crypto Tab */}
          <TabsContent value="crypto">
            {cryptoRenderContent()}
          </TabsContent>

          {/* Referral Tab */}
          <TabsContent value="referral">
            {referralRenderContent()}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
