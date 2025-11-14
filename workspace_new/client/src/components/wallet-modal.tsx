
import { useState } from 'react';
import { X, Wallet, CreditCard, Coins, TrendingUp, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: balance } = useQuery({
    queryKey: ["/api/balance"],
    enabled: isOpen,
    refetchInterval: 3000,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-[#1a1a1a] border-gray-800">
        {/* Header */}
        <CardHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">My Wallet</CardTitle>
                <CardDescription className="text-gray-400 text-[12px]">
                  Manage your funds and transactions
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Balance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-purple-300" />
                  <span className="text-sm text-purple-300">Total Balance</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {balance?.total?.toFixed(2) || '0.00'} {balance?.currency || 'SC'}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-700/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-300" />
                  <span className="text-sm text-green-300">Available</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {balance?.available?.toFixed(2) || '0.00'} {balance?.currency || 'SC'}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-blue-300" />
                  <span className="text-sm text-blue-300">In Play</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {balance?.locked?.toFixed(2) || '0.00'} {balance?.currency || 'SC'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-900">
              <TabsTrigger value="overview" className="text-[12px] data-[state=active]:bg-purple-700">
                Overview
              </TabsTrigger>
              <TabsTrigger value="deposit" className="text-[12px] data-[state=active]:bg-purple-700">
                Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="text-[12px] data-[state=active]:bg-purple-700">
                Withdraw
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Recent Transactions</CardTitle>
                  <CardDescription className="text-[12px]">Your latest wallet activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-400">
                    <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No recent transactions</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deposit" className="mt-4">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ArrowDownToLine className="w-5 h-5 text-green-500" />
                    Deposit Funds
                  </CardTitle>
                  <CardDescription className="text-[12px]">Add funds to your wallet</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-400 text-sm">
                      Choose your preferred deposit method below
                    </p>
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Credit/Debit Card
                    </Button>
                    <Button className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800">
                      <Coins className="w-4 h-4 mr-2" />
                      Cryptocurrency
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="withdraw" className="mt-4">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ArrowUpFromLine className="w-5 h-5 text-blue-500" />
                    Withdraw Funds
                  </CardTitle>
                  <CardDescription className="text-[12px]">Cash out your winnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-400 text-sm">
                      Available balance: {balance?.available?.toFixed(2) || '0.00'} {balance?.currency || 'SC'}
                    </p>
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      disabled={!balance?.available || balance.available <= 0}
                    >
                      <ArrowUpFromLine className="w-4 h-4 mr-2" />
                      Request Withdrawal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
