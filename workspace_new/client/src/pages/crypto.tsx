import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import PaymentModal from "@/components/payment-modal";
import TransactionFlow from "@/components/TransactionFlow";
import { 
  Bitcoin, 
  Copy, 
  Download, 
  Upload, 
  Clock, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Gift,
  ArrowLeft
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface ExchangeRate {
  currency: string;
  usdRate: number;
  creditsRate: number;
  lastUpdated: string;
}

interface CryptoWallet {
  id: string;
  currency: string;
  address: string;
  balance: string;
  isActive: boolean;
}

interface CryptoDeposit {
  id: string;
  currency: string;
  amount: string;
  status: string;
  confirmations: number;
  requiredConfirmations: number;
  creditsAmount?: number;
  createdAt: string;
}

interface CryptoWithdrawal {
  id: string;
  currency: string;
  amount: string;
  toAddress: string;
  status: string;
  creditsAmount: number;
  createdAt: string;
}

const SUPPORTED_CURRENCIES = ['BTC', 'ETH', 'USDT', 'LTC', 'DOGE', 'TRX', 'BNB', 'ADA', 'XRP', 'SOL'];

const getCurrencyIcon = (currency: string) => {
  const icons: Record<string, string> = {
    BTC: '₿',
    ETH: 'Ξ',
    USDT: '₮',
    LTC: 'Ł',
    DOGE: 'Ð'
  };
  return icons[currency] || '₿';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'CONFIRMED': return 'bg-green-500';
    case 'PENDING': return 'bg-yellow-500';
    case 'PROCESSING': return 'bg-blue-500';
    case 'FAILED': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

export default function Crypto() {
  const [location] = useLocation();
  
  // Get URL parameters for pre-selection
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const urlCurrency = urlParams.get('currency')?.toUpperCase();
  const urlTab = urlParams.get('tab') || 'deposit';
  
  const [selectedCurrency, setSelectedCurrency] = useState(
    urlCurrency && SUPPORTED_CURRENCIES.includes(urlCurrency) ? urlCurrency : 'BTC'
  );
  const [activeTab, setActiveTab] = useState(urlTab);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Update currency when URL changes
  useEffect(() => {
    if (urlCurrency && SUPPORTED_CURRENCIES.includes(urlCurrency)) {
      setSelectedCurrency(urlCurrency);
    }
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [urlCurrency, urlTab]);
  
  // Fetch pending bonus selection
  const { data: pendingBonus } = useQuery<any>({
    queryKey: ['/api/bonuses/pending']
  });

  // Fetch available bonuses for selection
  const { data: bonusData, refetch: refetchBonuses } = useQuery<{
    bonuses: Array<{
      id: string;
      bonusType: string;
      percentage: number;
      minDeposit: number;
      wageringMultiplier: number;
      description: string;
      status: 'available' | 'claimed' | 'locked';
      eligibleOn?: number | null;
      currentDepositCount?: number;
    }>;
    dailyDepositCount: number;
    currentDate: string;
  }>({
    queryKey: ['/api/bonuses/available']
  });

  // State for bonus selection
  const [selectedBonus, setSelectedBonus] = useState<string | null>(null);
  const [isSelectingBonus, setIsSelectingBonus] = useState(false);

  // Fetch supported currencies from NOWPayments
  const { data: currencies, isLoading: currenciesLoading, error: currenciesError } = useQuery<any[]>({
    queryKey: ['/api/crypto/currencies'],
  });
  
  // Fallback currencies if API fails
  const fallbackCurrencies = [
    { currency: 'BTC', name: 'Bitcoin', logo: '₿', minDeposit: 0.0001, network: 'Bitcoin' },
    { currency: 'ETH', name: 'Ethereum', logo: 'Ξ', minDeposit: 0.001, network: 'Ethereum' },
    { currency: 'USDT', name: 'Tether USD', logo: '₮', minDeposit: 1, network: 'TRC20' },
    { currency: 'LTC', name: 'Litecoin', logo: 'Ł', minDeposit: 0.01, network: 'Litecoin' },
    { currency: 'DOGE', name: 'Dogecoin', logo: 'Ð', minDeposit: 10, network: 'Dogecoin' },
    { currency: 'TRX', name: 'TRON', logo: 'T', minDeposit: 10, network: 'TRON' },
    { currency: 'BNB', name: 'Binance Coin', logo: 'B', minDeposit: 0.01, network: 'BSC' },
    { currency: 'ADA', name: 'Cardano', logo: '₳', minDeposit: 1, network: 'Cardano' },
    { currency: 'XRP', name: 'Ripple', logo: 'X', minDeposit: 1, network: 'Ripple' },
    { currency: 'SOL', name: 'Solana', logo: 'S', minDeposit: 0.01, network: 'Solana' }
  ];
  
  const availableCurrencies = (currencies && currencies.length > 0) ? currencies : fallbackCurrencies;

  // Fetch NOWPayments status
  const { data: paymentStatus } = useQuery<any>({
    queryKey: ['/api/crypto/status'],
  });

  // Fetch exchange rates
  const { data: rates } = useQuery<Record<string, number>>({
    queryKey: ['/api/crypto/rates'],
  });

  // Fetch user's crypto wallets
  const { data: wallets } = useQuery<CryptoWallet[]>({
    queryKey: ['/api/crypto/wallets'],
  });

  // Fetch specific wallet for selected currency
  const { data: currentWallet } = useQuery<CryptoWallet>({
    queryKey: ['/api/crypto/wallet', selectedCurrency],
    queryFn: () => fetch(`/api/crypto/wallet/${selectedCurrency}`)
      .then(res => res.json())
  });

  // Fetch deposit history
  const { data: deposits } = useQuery<CryptoDeposit[]>({
    queryKey: ['/api/crypto/deposits'],
  });

  // Fetch withdrawal history
  const { data: withdrawals } = useQuery<CryptoWithdrawal[]>({
    queryKey: ['/api/crypto/withdrawals'],
  });

  // Deposit mutation using NOWPayments
  const depositMutation = useMutation({
    mutationFn: async (data: { currency: string; amount: number }) => {
      const response = await apiRequest('POST', '/api/crypto/deposit', {
        currency: data.currency,
        usdAmount: data.amount  // Backend expects 'usdAmount', not 'amount'
      });
      return response.json();
    },
    onSuccess: (data) => {
      setDepositAmount('');
      queryClient.invalidateQueries({ queryKey: ['/api/crypto/deposits'] });
      
      // Prepare payment data for modal
      const paymentInfo = {
        depositId: data.payment?.id || crypto.randomUUID(),
        paymentId: data.payment?.paymentId || crypto.randomUUID(),
        payAddress: data.payment?.address || data.payment?.paymentUrl || 'Payment address will be generated',
        payAmount: data.payment?.amount || parseFloat(depositAmount),
        payCurrency: (data.payment?.currency || selectedCurrency).toUpperCase(),
        orderId: data.payment?.orderId || `order_${Date.now()}`,
        usdAmount: parseFloat(depositAmount)
      };
      
      setPaymentData(paymentInfo);
      setShowPaymentModal(true);
      
      toast({
        title: "Payment Created",
        description: `Send ${paymentInfo.payAmount} ${paymentInfo.payCurrency} to complete your deposit`,
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Payment Creation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Withdrawal mutation
  const withdrawMutation = useMutation({
    mutationFn: async (data: { currency: string; usdAmount: number; address: string }) => {
      const response = await apiRequest('POST', '/api/crypto/withdraw', data);
      return response.json();
    },
    onSuccess: () => {
      setWithdrawAmount('');
      setWithdrawAddress('');
      queryClient.invalidateQueries({ queryKey: ['/api/crypto/withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal is being processed. It will be sent to the blockchain shortly.",
        variant: "default"
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
      variant: "default"
    });
  };

  // Handle bonus selection
  const handleSelectBonus = async (bonusId: string, bonusType: string) => {
    setIsSelectingBonus(true);
    
    try {
      const response = await apiRequest('POST', '/api/bonuses/select', {
        bonusType: bonusType
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedBonus(bonusId);
        queryClient.invalidateQueries({ queryKey: ['/api/bonuses/pending'] });
        refetchBonuses();
        toast({
          title: "Bonus Selected!",
          description: data.message || `Bonus selected! Make a deposit to claim it.`
        });
      } else {
        toast({
          title: "Selection Failed",
          description: data.error || "Failed to select bonus",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to select bonus",
        variant: "destructive"
      });
    } finally {
      setIsSelectingBonus(false);
    }
  };

  const getCurrentRate = () => {
    if (!rates || typeof rates !== 'object') return null;
    const rate = rates[selectedCurrency.toLowerCase()];
    if (rate) {
      return {
        currency: selectedCurrency.toLowerCase(),
        usdRate: rate
      };
    }
    return null;
  };

  const formatAmount = (amount: string | number, decimals = 8) => {
    return parseFloat(amount.toString()).toFixed(decimals);
  };

  return (
    <div className="px-4 py-6 pb-20">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-[10px] font-bold mb-2">Cryptocurrency</h2>
        <p className="text-casino-text">Deposit and withdraw cryptocurrencies</p>
      </div>

      {/* Tab Navigation - Moved to Top */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#1a1a1a] border border-[#2a2a2a] w-full h-12 p-1 rounded-lg shadow-lg mb-6">
          <TabsTrigger 
            value="deposit" 
            className="flex-1 h-full flex items-center justify-center gap-2 rounded-md transition-all duration-300 text-gray-400 hover:text-white data-[state=active]:text-purple-300 data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-600/20 data-[state=active]:to-purple-700/30 data-[state=active]:border-b-2 data-[state=active]:border-b-purple-500"
            data-testid="tab-deposit"
          >
            <Download style={{width: '3.5px', height: '3.5px'}} className="" />
            <span className="text-[8px] font-semibold">Deposit</span>
          </TabsTrigger>
          <TabsTrigger 
            value="withdraw" 
            className="flex-1 h-full flex items-center justify-center gap-2 rounded-md transition-all duration-300 text-gray-400 hover:text-white data-[state=active]:text-purple-300 data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-600/20 data-[state=active]:to-purple-700/30 data-[state=active]:border-b-2 data-[state=active]:border-b-purple-500"
            data-testid="tab-withdraw"
          >
            <Upload style={{width: '3.5px', height: '3.5px'}} className="" />
            <span className="text-[8px] font-semibold">Withdraw</span>
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="flex-1 h-full flex items-center justify-center gap-2 rounded-md transition-all duration-300 text-gray-400 hover:text-white data-[state=active]:text-purple-300 data-[state=active]:bg-gradient-to-b data-[state=active]:from-purple-600/20 data-[state=active]:to-purple-700/30 data-[state=active]:border-b-2 data-[state=active]:border-b-purple-500"
            data-testid="tab-history"
          >
            <Clock style={{width: '3.5px', height: '3.5px'}} className="" />
            <span className="text-[8px] font-semibold">History</span>
          </TabsTrigger>
        </TabsList>

        {/* Animated Transaction Flow Visualization */}
        <Card className="bg-casino-card border-casino-accent/20 mb-6">
          <CardContent className="pt-6">
            <TransactionFlow 
              transactions={[
                ...(deposits || []).map(d => ({
                  id: d.id,
                  type: 'deposit' as const,
                  currency: d.currency,
                  amount: parseFloat(d.amount),
                  // Backend already returns values in dollars, not cents
                  usdValue: d.creditsAmount ? d.creditsAmount : parseFloat(d.amount),
                  status: d.status.toLowerCase() as any,
                  confirmations: d.confirmations,
                  requiredConfirmations: d.requiredConfirmations,
                  timestamp: new Date(d.createdAt).getTime()
                })),
                ...(withdrawals || []).map(w => ({
                  id: w.id,
                  type: 'withdrawal' as const,
                  currency: w.currency,
                  amount: parseFloat(w.amount),
                  // Backend already returns values in dollars, not cents
                  usdValue: w.creditsAmount,
                  status: w.status.toLowerCase() as any,
                  timestamp: new Date(w.createdAt).getTime()
                }))
              ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20)}
              isLive={true}
            />
          </CardContent>
        </Card>

        {/* NOWPayments Status & Supported Currencies */}
        <Card className="bg-casino-card border-casino-accent/20 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp style={{width: '3px', height: '3px'}} className=" mr-2" />
              Real Cryptocurrency Processing
              {paymentStatus?.message === 'OK' && (
                <Badge className="ml-2 bg-green-500">LIVE</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {availableCurrencies.slice(0, 10).map((currency) => (
                <div key={currency.currency} className="text-center">
                  <div className="text-[10px] mb-1">{getCurrencyIcon(currency.currency.toUpperCase())}</div>
                  <div className="text-white font-semibold">{currency.currency.toUpperCase()}</div>
                  <div className="text-casino-text text-[8px]">
                    {currency.name}
                  </div>
                  <div className="text-casino-accent text-[8px]">
                    {currenciesLoading ? 'Loading...' : currenciesError ? 'Mock Mode' : 'Real crypto'}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-4 text-casino-text text-[8px]">
              Powered by NOWPayments - Real blockchain transactions
            </div>
          </CardContent>
        </Card>

        <TabsContent value="deposit">
          {/* Bonus Selection Section */}
          {bonusData && bonusData.bonuses.length > 0 && (
            <Card className="bg-gradient-to-br from-purple-900/20 via-black to-black border-[#D4AF37]/30 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Gift style={{width: '3px', height: '3px'}} className=" text-[#D4AF37]" />
                  Select a Deposit Bonus
                </CardTitle>
                <p className="text-gray-400 text-[8px]">
                  Choose a bonus before making your deposit to maximize your credits!
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {bonusData.bonuses.map((bonus, index) => {
                    const isAvailable = bonus.status === 'available';
                    const isSelected = selectedBonus === bonus.id || (pendingBonus?.hasPending && pendingBonus.bonusType === bonus.bonusType);
                    
                    return (
                      <div
                        key={bonus.id}
                        className={`relative p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer ${
                          isSelected
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                            : isAvailable
                            ? 'border-gray-600 bg-gray-900/50 hover:border-[#D4AF37]/50'
                            : 'border-gray-800 bg-gray-900/30 opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => isAvailable && !isSelected && handleSelectBonus(bonus.id, bonus.bonusType)}
                        data-testid={`crypto-bonus-${index + 1}`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-[#D4AF37] text-black px-2 py-1 rounded-full text-[8px] font-bold">
                            Selected
                          </div>
                        )}
                        
                        <div className="text-center">
                          <div className="text-[10px] font-bold text-[#D4AF37] mb-1">
                            {bonus.percentage}%
                          </div>
                          <div className="text-white font-semibold mb-2">
                            {bonus.bonusType === 'first_deposit' ? 'First Deposit' :
                             bonus.bonusType === 'second_deposit' ? 'Second Deposit' :
                             'Third Deposit'}
                          </div>
                          <div className="text-[8px] text-gray-400 mb-3">
                            Min: {bonus.minDeposit} SC • {bonus.wageringMultiplier}x wagering
                          </div>
                          
                          {isAvailable && !isSelected && (
                            <Button
                              size="sm"
                              disabled={isSelectingBonus}
                              className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-black"
                              data-testid={`select-crypto-bonus-${index + 1}`}
                            >
                              {isSelectingBonus ? 'Selecting...' : 'Select'}
                            </Button>
                          )}
                          
                          {!isAvailable && (
                            <div className="text-[8px] text-red-400">
                              {bonus.status === 'locked' ? `Unlocks after ${bonus.eligibleOn} deposits` : 'Already claimed'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {pendingBonus?.hasPending && (
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-green-400 text-[8px]">
                      <CheckCircle style={{width: '3.5px', height: '3.5px'}} className="" />
                      Bonus selected! Make a deposit of at least {pendingBonus.minDeposit} SC to claim it.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Show pending bonus selection if exists */}
          {pendingBonus && pendingBonus.hasPending && (
            <Card className="bg-gradient-to-br from-[#D4AF37]/10 to-yellow-600/10 border-[#D4AF37]/50 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#D4AF37]/20 rounded-lg">
                      <Gift style={{width: '3px', height: '3px'}} className="text-[#D4AF37]" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">
                        {pendingBonus.bonusType.replace('_', ' ').toUpperCase()} Bonus Selected!
                      </h3>
                      <p className="text-casino-text text-[8px]">
                        Deposit at least ${pendingBonus.minDeposit} to claim your {pendingBonus.percentage}% bonus
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-[#D4AF37]">
                      {pendingBonus.percentage}%
                    </div>
                    <div className="text-[8px] text-casino-text">Bonus</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#D4AF37]/20 text-casino-text text-[8px]">
                  💡 Your bonus will be automatically applied after your deposit is confirmed
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Currency Selection */}
            <Card className="bg-casino-card border-casino-accent/20">
              <CardHeader>
                <CardTitle className="text-white">Select Currency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {availableCurrencies.slice(0, 8).map((currency) => (
                    <Button
                      key={currency.currency}
                      variant={selectedCurrency === currency.currency.toUpperCase() ? "default" : "outline"}
                      onClick={() => setSelectedCurrency(currency.currency.toUpperCase())}
                      className="h-8 text-[8px] flex items-center justify-center"
                    >
                      <span className="text-[8px] mr-1.5">{getCurrencyIcon(currency.currency.toUpperCase())}</span>
                      {currency.currency.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Create Payment */}
            <Card className="bg-casino-card border-casino-accent/20">
              <CardHeader>
                <CardTitle className="text-white">Create Deposit Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="deposit-amount" className="text-casino-text">
                      Amount (USD)
                    </Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      step="0.01"
                      min="1"
                      max="10000"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="bg-casino-dark border-casino-accent/30 text-white"
                      placeholder="Enter USD amount"
                    />
                    <div className="text-casino-text text-[8px] mt-1">
                      Minimum: $1.00 | Maximum: $10,000
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => depositMutation.mutate({
                      currency: selectedCurrency,
                      amount: parseFloat(depositAmount)
                    })}
                    disabled={!depositAmount || parseFloat(depositAmount) < 1 || depositMutation.isPending}
                    className="w-full h-8 text-[8px] bg-casino-primary hover:bg-casino-primary/90"
                  >
                    {depositMutation.isPending ? "Creating Payment..." : "Create Payment"}
                  </Button>
                  
                  <div className="text-casino-text text-[8px]">
                    💡 A real crypto payment will be created with NOWPayments. You'll receive the exact address and amount to send.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exchange Info */}
          <Card className="bg-casino-card border-casino-accent/20 mt-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-casino-text mb-2">Conversion Rate</div>
                <div className="text-white text-[10px]">
                  $1.00 USD = 1 SC
                </div>
                <div className="text-casino-text text-[8px] mt-1">
                  Real cryptocurrency automatically converted to SC
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw">
          <Card className="bg-casino-card border-casino-accent/20">
            <CardHeader>
              <CardTitle className="text-white">Withdraw Cryptocurrency</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Currency Selection */}
              <div>
                <Label className="text-casino-text">Currency</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {availableCurrencies.slice(0, 10).map((currency) => (
                    <Button
                      key={currency.currency}
                      variant={selectedCurrency === currency.currency.toUpperCase() ? "default" : "outline"}
                      onClick={() => setSelectedCurrency(currency.currency.toUpperCase())}
                      className="h-8 text-[8px]"
                    >
                      {currency.currency}
                    </Button>
                  )) || SUPPORTED_CURRENCIES.slice(0, 10).map((currency) => (
                    <Button
                      key={currency}
                      variant={selectedCurrency === currency ? "default" : "outline"}
                      onClick={() => setSelectedCurrency(currency)}
                      className="h-8 text-[8px]"
                    >
                      {currency}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <Label htmlFor="withdraw-amount" className="text-casino-text">
                  Amount (USD)
                </Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  step="0.01"
                  min="1"
                  max="10000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="bg-casino-dark border-casino-accent/30 text-white"
                  placeholder="Enter USD amount"
                />
                <div className="text-casino-text text-[8px] mt-1">
                  Minimum: $1.00 | Maximum: $10,000
                </div>
                {getCurrentRate() && withdrawAmount && getCurrentRate()?.usdRate && (
                  <div className="text-casino-text text-[8px] mt-1">
                    ≈ {(parseFloat(withdrawAmount) / getCurrentRate()!.usdRate).toFixed(8)} {selectedCurrency}
                  </div>
                )}
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="withdraw-address" className="text-casino-text">
                  Recipient Address
                </Label>
                <Input
                  id="withdraw-address"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="bg-casino-dark border-casino-accent/30 text-white"
                  placeholder={`Enter ${selectedCurrency} address`}
                />
              </div>

              <Button
                onClick={() => withdrawMutation.mutate({
                  currency: selectedCurrency.toLowerCase(),
                  usdAmount: parseFloat(withdrawAmount),
                  address: withdrawAddress
                })}
                disabled={!withdrawAmount || !withdrawAddress || withdrawMutation.isPending}
                className="w-full h-8 text-[8px] bg-casino-primary hover:bg-casino-primary/90"
              >
                {withdrawMutation.isPending ? "Processing..." : "Withdraw"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-6">
            {/* Deposits */}
            <Card className="bg-casino-card border-casino-accent/20">
              <CardHeader>
                <CardTitle className="text-white">Recent Deposits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deposits?.length ? deposits.map((deposit) => (
                    <div key={deposit.id} className="flex items-center justify-between p-3 bg-casino-dark rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-[10px]">{getCurrencyIcon(deposit.currency)}</div>
                        <div>
                          <div className="text-white font-medium">
                            {formatAmount(deposit.amount)} {deposit.currency}
                          </div>
                          <div className="text-casino-text text-[8px]">
                            {new Date(deposit.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(deposit.status)}>
                          {deposit.status}
                        </Badge>
                        {deposit.status === 'PENDING' && (
                          <div className="text-casino-text text-[8px] mt-1">
                            {deposit.confirmations}/{deposit.requiredConfirmations} confirmations
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-casino-text py-4">
                      No deposits found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Withdrawals */}
            <Card className="bg-casino-card border-casino-accent/20">
              <CardHeader>
                <CardTitle className="text-white">Recent Withdrawals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {withdrawals?.length ? withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-3 bg-casino-dark rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-[10px]">{getCurrencyIcon(withdrawal.currency)}</div>
                        <div>
                          <div className="text-white font-medium">
                            {formatAmount(withdrawal.amount)} {withdrawal.currency}
                          </div>
                          <div className="text-casino-text text-[8px]">
                            To: {withdrawal.toAddress.substring(0, 10)}...
                          </div>
                          <div className="text-casino-text text-[8px]">
                            {new Date(withdrawal.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(withdrawal.status)}>
                          {withdrawal.status}
                        </Badge>
                        <div className="text-casino-text text-[8px] mt-1">
                          {withdrawal.creditsAmount.toFixed(2)} SC
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-casino-text py-4">
                      No withdrawals found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentData={paymentData}
      />

      {/* Back to Home Button */}
      <div className="mt-8 text-center">
        <Link href="/">
          <Button 
            variant="outline" 
            size="xs" 
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
            data-testid="button-back-home-crypto"
          >
            <ArrowLeft className=" mr-1"style={{width: '2.5px', height: '2.5px'}} />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}