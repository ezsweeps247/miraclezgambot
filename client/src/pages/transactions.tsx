import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, TrendingUp, TrendingDown, Gamepad2, CreditCard, Gift, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: string;
  amount: number | string;
  meta?: {
    game?: string;
    description?: string;
    currency?: string;
    status?: string;
  };
  createdAt: string;
}

export default function Transactions() {
  const [, navigate] = useLocation();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCurrency, setFilterCurrency] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for demonstration - in real app this would come from API
  const mockTransactions: Transaction[] = [
    {
      id: "tx_001",
      type: "deposit",
      amount: 100.00,
      currency: "SC",
      status: "completed",
      timestamp: "2024-01-15T10:30:00Z",
      description: "Deposit via Credit Card"
    },
    {
      id: "tx_002",
      type: "bet",
      amount: -5.00,
      currency: "SC",
      game: "Mines",
      status: "completed",
      timestamp: "2024-01-15T11:45:00Z",
      description: "Bet on Mines game"
    },
    {
      id: "tx_003",
      type: "payout",
      amount: 15.75,
      currency: "SC",
      game: "Mines",
      status: "completed",
      timestamp: "2024-01-15T11:46:00Z",
      description: "Payout from Mines win"
    },
    {
      id: "tx_004",
      type: "bonus",
      amount: 1000,
      currency: "GC",
      status: "completed",
      timestamp: "2024-01-14T09:00:00Z",
      description: "Welcome bonus"
    },
    {
      id: "tx_005",
      type: "bet",
      amount: -250,
      currency: "GC",
      game: "Dice",
      status: "completed",
      timestamp: "2024-01-14T14:20:00Z",
      description: "Bet on Dice game"
    },
    {
      id: "tx_006",
      type: "withdrawal",
      amount: -25.00,
      currency: "SC",
      status: "pending",
      timestamp: "2024-01-13T16:30:00Z",
      description: "Withdrawal to Bank Account"
    }
  ];

  const { data: transactionsData, isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Transform API data to match display format
  const transactions = (transactionsData || mockTransactions).map((tx: any) => {
    // Normalize the data structure
    const normalizedTx = {
      id: tx.id,
      type: tx.type?.toLowerCase() || 'unknown',
      amount: typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount,
      currency: tx.meta?.currency || tx.currency || 'SC',
      game: tx.meta?.game || tx.game,
      status: tx.meta?.status || tx.status || 'completed',
      timestamp: tx.createdAt || tx.timestamp,
      description: tx.meta?.description || tx.description || `${tx.type} transaction`
    };
    return normalizedTx;
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <TrendingUp style={{width: '3.5px', height: '3.5px'}} className="text-green-400" />;
      case 'withdrawal': return <TrendingDown style={{width: '3.5px', height: '3.5px'}} className="text-red-400" />;
      case 'bet': return <Gamepad2 style={{width: '3.5px', height: '3.5px'}} className="text-blue-400" />;
      case 'payout': return <TrendingUp style={{width: '3.5px', height: '3.5px'}} className="text-green-400" />;
      case 'bonus': return <Gift style={{width: '3.5px', height: '3.5px'}} className="text-golden" />;
      case 'refund': return <TrendingUp style={{width: '3.5px', height: '3.5px'}} className="text-yellow-400" />;
      default: return <CreditCard style={{width: '3.5px', height: '3.5px'}} className="text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Unknown</Badge>;
    }
  };

  const filteredTransactions = transactions.filter((tx: any) => {
    const matchesType = filterType === "all" || tx.type === filterType;
    const matchesCurrency = filterCurrency === "all" || tx.currency === filterCurrency;
    const matchesSearch = searchTerm === "" || 
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.game?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesCurrency && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/10 mr-4"
            data-testid="button-back"
          >
            <ArrowLeft style={{width: '3px', height: '3px'}} className="" />
          </Button>
          <h1 className="text-[10px] font-bold text-white">Transaction History</h1>
        </div>

        {/* Filters */}
        <Card className="bg-black/40 backdrop-blur-xl border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Filters</CardTitle>
            <CardDescription className="text-gray-400">
              Filter your transactions by type, currency, or search
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[8px] text-gray-400 mb-2 block">Type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-transaction-type">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="deposit">Deposits</SelectItem>
                    <SelectItem value="withdrawal">Withdrawals</SelectItem>
                    <SelectItem value="bet">Bets</SelectItem>
                    <SelectItem value="payout">Payouts</SelectItem>
                    <SelectItem value="bonus">Bonuses</SelectItem>
                    <SelectItem value="refund">Refunds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[8px] text-gray-400 mb-2 block">Currency</label>
                <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-currency">
                    <SelectValue placeholder="All currencies" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10">
                    <SelectItem value="all">All Currencies</SelectItem>
                    <SelectItem value="GC">Gold Credits (GC)</SelectItem>
                    <SelectItem value="SC">Sweeps Cash (SC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[8px] text-gray-400 mb-2 block">Search</label>
                <div className="relative">
                  <Search style={{width: '3.5px', height: '3.5px'}} className="absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/5 border-white/10 text-white pl-10"
                    data-testid="input-search-transactions"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <Card className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock style={{width: '3.5px', height: '3.5px'}} className="text-gray-400 mb-4" />
                <h3 className="text-[10px] font-semibold text-white mb-2">No Transactions Found</h3>
                <p className="text-gray-400 text-center">
                  {searchTerm || filterType !== "all" || filterCurrency !== "all" 
                    ? "Try adjusting your filters or search term."
                    : "You haven't made any transactions yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTransactions.map((transaction: any) => (
              <Card key={transaction.id} className="bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-colors" data-testid={`card-transaction-${transaction.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-white/5 rounded-lg">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <h3 className="text-white font-medium capitalize" data-testid="text-transaction-type">{transaction.type}</h3>
                        <p className="text-gray-400 text-[8px]" data-testid="text-transaction-description">{transaction.description}</p>
                        {transaction.game && (
                          <p className="text-golden text-[8px]" data-testid="text-transaction-game">Game: {transaction.game}</p>
                        )}
                        <p className="text-gray-500 text-[8px]" data-testid="text-transaction-date">
                          {transaction.timestamp ? format(new Date(transaction.timestamp), "MMM d, yyyy 'at' h:mm a") : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.amount >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="text-transaction-amount">
                          {transaction.amount >= 0 ? '+' : ''}{Number(transaction.amount || 0).toFixed(2)} {transaction.currency}
                        </p>
                        <p className="text-gray-400 text-[8px]" data-testid="text-transaction-id">ID: {transaction.id.substring(0, 8)}...</p>
                      </div>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary */}
        {filteredTransactions.length > 0 && (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10 mt-6">
            <CardContent className="p-4">
              <div className="text-center text-gray-400">
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}