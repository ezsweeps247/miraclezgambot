import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  DollarSign, 
  History, 
  ArrowUp, 
  Clock,
  CheckCircle,
  InfoIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RakebackBalance {
  userId: string;
  availableAmount: number;
  totalEarned: number;
  lastUpdated: string;
}

interface RakebackTransaction {
  id: string;
  userId: string;
  type: 'RAKEBACK_EARNED' | 'RAKEBACK_WITHDRAWAL';
  amount: number;
  gameId?: string;
  gameName?: string;
  description?: string;
  createdAt: string;
}

interface RakebackStats {
  currentBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  rakebackRate: number;
}

export default function Rakeback() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');

  // Fetch rakeback balance
  const { data: balance, isLoading: balanceLoading } = useQuery<RakebackBalance>({
    queryKey: ["/api/rakeback/balance"],
    queryFn: () => apiRequest('GET', '/api/rakeback/balance').then(res => res.json()),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch rakeback transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<RakebackTransaction[]>({
    queryKey: ["/api/rakeback/transactions"],
    queryFn: () => apiRequest('GET', '/api/rakeback/transactions?limit=20').then(res => res.json())
  });

  // Fetch rakeback stats
  const { data: stats, isLoading: statsLoading } = useQuery<RakebackStats>({
    queryKey: ["/api/rakeback/stats"],
    queryFn: () => apiRequest('GET', '/api/rakeback/stats').then(res => res.json())
  });

  // Withdraw rakeback mutation
  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest('POST', '/api/rakeback/withdraw', { amount });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rakeback/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rakeback/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rakeback/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] }); // Update main balance
      const withdrawnAmount = parseFloat(withdrawAmount);
      setWithdrawAmount('');
      toast({
        title: "Withdrawal Successful",
        description: `Successfully withdrew ${formatCurrency(withdrawnAmount)} from rakeback balance to SC`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to withdraw rakeback",
        variant: "destructive"
      });
    }
  });

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive"
      });
      return;
    }

    if (amount > (balance?.availableAmount || 0)) {
      toast({
        title: "Insufficient Balance",
        description: "Withdrawal amount exceeds available rakeback balance",
        variant: "destructive"
      });
      return;
    }

    withdrawMutation.mutate(amount);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'RAKEBACK_EARNED':
        return <TrendingUp className=" text-green-500"style={{width: '3px', height: '3px'}} />;
      case 'RAKEBACK_WITHDRAWAL':
        return <ArrowUp className=" text-blue-500"style={{width: '3px', height: '3px'}} />;
      default:
        return <DollarSign className=" text-gray-500"style={{width: '3px', height: '3px'}} />;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'RAKEBACK_EARNED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Earned</Badge>;
      case 'RAKEBACK_WITHDRAWAL':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Withdrawn</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (balanceLoading || transactionsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-casino-dark text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-800 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-800 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-casino-dark text-white p-6" data-testid="rakeback-page">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-[10px] font-bold bg-gradient-to-r from-casino-gold to-yellow-400 bg-clip-text text-transparent" data-testid="text-rakeback-title">
            Rakeback System
          </h1>
          <p className="text-casino-text">
            Earn {((stats?.rakebackRate || 0.05) * 100).toFixed(1)}% rakeback on every bet you place
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-casino-card border-casino-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[8px] font-medium">Available Balance</CardTitle>
              <DollarSign className=" text-casino-gold"style={{width: '3px', height: '3px'}} />
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold text-casino-gold" data-testid="text-rakeback-balance">
                {formatCurrency(balance?.availableAmount || 0)}
              </div>
              <p className="text-[8px] text-casino-text">
                Ready to withdraw to SC balance
              </p>
            </CardContent>
          </Card>

          <Card className="bg-casino-card border-casino-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[8px] font-medium">Total Earned</CardTitle>
              <TrendingUp className=" text-green-500"style={{width: '3px', height: '3px'}} />
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold text-green-500" data-testid="text-total-earned">
                {formatCurrency(stats?.totalEarned || 0)}
              </div>
              <p className="text-[8px] text-casino-text">
                Lifetime rakeback earnings
              </p>
            </CardContent>
          </Card>

          <Card className="bg-casino-card border-casino-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[8px] font-medium">Total Withdrawn</CardTitle>
              <ArrowUp className=" text-blue-500"style={{width: '3px', height: '3px'}} />
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold text-blue-500" data-testid="text-total-withdrawn">
                {formatCurrency(stats?.totalWithdrawn || 0)}
              </div>
              <p className="text-[8px] text-casino-text">
                Total withdrawn to SC balance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Withdraw Section */}
        <Card className="bg-casino-card border-casino-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ArrowUp className=" text-casino-gold"style={{width: '3px', height: '3px'}} />
              <span>Withdraw Rakeback</span>
            </CardTitle>
            <CardDescription>
              Transfer your rakeback earnings to your main SC balance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-500 bg-blue-500/10">
              <InfoIcon className=""style={{width: '3px', height: '3px'}} />
              <AlertDescription className="text-blue-400 text-[8px]">
                Rakeback funds will be transferred to your Sweeps Cash (SC) balance and can be used for gameplay or redemption.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="withdraw-amount">Withdrawal Amount (SC)</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={balance?.availableAmount || 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount to withdraw"
                  className="bg-casino-dark border-casino-border text-white"
                  data-testid="input-withdraw-amount"
                />
                <p className="text-[8px] text-casino-text mt-1">
                  Available: {formatCurrency(balance?.availableAmount || 0)}
                </p>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleWithdraw}
                  disabled={withdrawMutation.isPending || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  className="bg-casino-gold hover:bg-casino-gold/90 text-black font-medium px-8"
                  data-testid="button-withdraw-rakeback"
                >
                  {withdrawMutation.isPending ? 'Processing...' : 'Withdraw'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="bg-casino-card border-casino-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className=" text-casino-gold"style={{width: '3px', height: '3px'}} />
              <span>Transaction History</span>
            </CardTitle>
            <CardDescription>
              Your recent rakeback earnings and withdrawals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!transactions || transactions.length === 0 ? (
              <div className="text-center py-8 text-casino-text">
                <History className=" mx-auto mb-4 opacity-50"style={{width: '3.5px', height: '3.5px'}} />
                <p>No rakeback transactions yet</p>
                <p className="text-[8px]">Start playing to earn rakeback!</p>
              </div>
            ) : (
              <div className="space-y-3" data-testid="rakeback-transactions">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-casino-dark rounded-lg border border-casino-border"
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {transaction.type === 'RAKEBACK_EARNED' ? 'Rakeback Earned' : 'Rakeback Withdrawn'}
                          </span>
                          {getTransactionBadge(transaction.type)}
                        </div>
                        <p className="text-[8px] text-casino-text">
                          {transaction.gameName && (
                            <span>from {transaction.gameName} • </span>
                          )}
                          {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                        </p>
                        {transaction.description && (
                          <p className="text-[8px] text-casino-text">{transaction.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${
                        transaction.type === 'RAKEBACK_EARNED' ? 'text-green-500' : 'text-blue-500'
                      }`}>
                        {transaction.type === 'RAKEBACK_EARNED' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}