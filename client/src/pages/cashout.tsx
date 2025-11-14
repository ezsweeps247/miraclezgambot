import { Wallet, Bitcoin, CreditCard, AlertCircle, Lock, ArrowLeft, Home } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLocation } from 'wouter';

interface WageringData {
  hasActiveBonus: boolean;
  totalWageringRequired: number;
  totalWagered: number;
  remainingToWager: number;
  activeBonuses: Array<{
    id: number;
    bonusId: number;
    bonusType: string;
    percentage: number;
    wageredAmount: string;
    wageringRequirement: string;
    status: 'active' | 'completed' | 'expired';
  }>;
}

export default function CashoutPage() {
  const [, navigate] = useLocation();
  const { data: balance } = useQuery<{
    available: number;
    locked: number;
    currency: string;
    total: number;
    sweepsCashTotal: number;
    sweepsCashRedeemable: number;
    balanceMode: 'GC' | 'SC';
  }>({
    queryKey: ["/api/balance"],
  });
  
  // Fetch wagering requirements
  const { data: wageringData, isLoading: isLoadingWagering } = useQuery<WageringData>({
    queryKey: ["/api/bonuses/wagering-requirements"],
  });

  const handleNowPaymentsRedeem = () => {
    // Check if user is in SC mode before allowing withdrawal
    if (balance?.balanceMode !== 'SC') {
      return; // This will be handled by the disabled state and UI
    }
    
    // Navigate to crypto page with withdraw tab active
    navigate('/crypto');
    // Set the withdraw tab as active
    setTimeout(() => {
      const withdrawTab = document.querySelector('[value="withdraw"]') as HTMLElement;
      if (withdrawTab) withdrawTab.click();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a] bg-[#0A0A0A] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-[#1a1a1a] text-gray-400 hover:text-white"
            data-testid="button-back-home"
          >
            <ArrowLeft style={{width: '3px', height: '3px'}} />
          </Button>
          <div className="flex items-center gap-2">
            <Wallet style={{width: '3px', height: '3px'}} className="text-purple-400" />
            <h1 className="text-[10px] font-bold text-white">Cashout</h1>
          </div>
        </div>
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          size="sm"
          className="p-2 hover:bg-[#1a1a1a] text-gray-400 hover:text-white"
          data-testid="button-home"
        >
          <Home style={{width: '3px', height: '3px'}} />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full">
        {/* Balance Display with Mode Information */}
        <div className="p-6 border-b border-[#1a1a1a] bg-gradient-to-b from-[#0A0A0A] to-[#0f0f0f]">
          <div className="text-center">
            <p className="text-[8px] text-gray-400 mb-2">Available Balance</p>
            <p className="text-[10px] font-bold text-white mb-2">
              {balance?.balanceMode === 'SC' 
                ? `$${balance.sweepsCashRedeemable.toFixed(2)}` 
                : `${balance?.available.toFixed(2) || '0.00'} GC`
              }
            </p>
            <p className="text-[8px] text-gray-500">
              {balance?.balanceMode === 'SC' ? 'Redeemable Sweeps Cash' : 'Gold Credits (Play Money)'}
            </p>
          </div>
        </div>

        {/* GC Mode Warning */}
        {balance?.balanceMode === 'GC' && (
          <div className="p-6 bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border-b border-yellow-900/30">
            <div className="flex items-start gap-4">
              <Lock style={{width: '3px', height: '3px'}} className="text-yellomt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-yellow-400 font-bold text-[10px] mb-2">
                  Real Money Withdrawals Restricted
                </h3>
                <p className="text-[8px] text-yellow-300 mb-4 leading-relaxed">
                  You're currently in Gold Credits (GC) mode. To make real money withdrawals, please switch to Sweeps Cash (SC) mode using the balance toggle.
                </p>
                <div className="bg-yellow-900/30 rounded-lg p-3">
                  <p className="text-[8px] text-yellow-400 font-medium">
                    GC = Play money only • SC = Real money that can be redeemed
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wagering Requirements Warning */}
        {wageringData?.hasActiveBonus && wageringData?.remainingToWager > 0 && (
          <div className="p-6 bg-gradient-to-r from-orange-900/20 to-red-900/20 border-b border-orange-900/30">
            <div className="flex items-start gap-4">
              <Lock style={{width: '3px', height: '3px'}} className="text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-orange-400 font-bold text-[10px] mb-3">
                  Active Bonus Wagering Requirements
                </h3>
                <p className="text-orange-300 mb-4 leading-relaxed">
                  You must complete wagering requirements before withdrawing.
                </p>
                
                {/* Total Progress */}
                <div className="mb-6 bg-orange-900/20 rounded-lg p-4">
                  <div className="flex justify-between text-[8px] text-gray-300 mb-2">
                    <span className="font-medium">Total Progress</span>
                    <span className="font-mono">
                      ${wageringData.totalWagered.toFixed(2)} / ${wageringData.totalWageringRequired.toFixed(2)}
                    </span>
                  </div>
                  <Progress 
                    value={(wageringData.totalWagered / wageringData.totalWageringRequired) * 100} 
                    className="h-3 bg-[#1a1a1a]" 
                  />
                  <p className="text-orange-400 mt-2 font-bold">
                    Remaining to wager: <span className="text-[10px]">${wageringData.remainingToWager.toFixed(2)}</span>
                  </p>
                </div>
                
                {/* Individual Bonus Progress */}
                <div className="space-y-3">
                  {wageringData.activeBonuses.map((bonus: any) => (
                    <div key={bonus.id} className="bg-[#0A0A0A] rounded-lg p-4">
                      <div className="flex justify-between text-[8px] text-gray-300 mb-2">
                        <span className="capitalize font-medium">{bonus.bonusType.replace('_', ' ')}</span>
                        <span className="text-orange-400">{bonus.percentageComplete}% complete</span>
                      </div>
                      <Progress 
                        value={bonus.percentageComplete} 
                        className="h-2 bg-[#1a1a1a]" 
                      />
                      <div className="flex justify-between text-[8px] text-gray-400 mt-2">
                        <span>${bonus.wagered.toFixed(2)} wagered</span>
                        <span>${bonus.remainingToWager.toFixed(2)} remaining</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cashout Options */}
        <div className="p-6 space-y-6">
          <h2 className="text-[10px] font-bold text-white mb-4">Withdrawal Options</h2>
          
          {/* NOWPayments Option */}
          <div className="bg-gradient-to-r from-[#1a1a1a] to-[#1f1f1f] rounded-xl p-6 border border-[#2a2a2a]">
            <div className="flex items-start gap-4">
              <div className="bg-yellow-500/20 rounded-full p-3">
                <Bitcoin style={{width: '3.5px', height: '3.5px'}} className="text-yello" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-[10px] mb-2">Crypto Withdrawal</h3>
                <p className="text-gray-400 mb-4 leading-relaxed">
                  Withdraw your funds using Bitcoin, Ethereum, USDT, and over 100 other supported cryptocurrencies. Fast and secure transactions.
                </p>
                <Button
                  onClick={handleNowPaymentsRedeem}
                  disabled={
                    balance?.balanceMode !== 'SC' || 
                    (wageringData?.hasActiveBonus && wageringData?.remainingToWager > 0)
                  }
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed text-[10px]"
                  data-testid="button-crypto-withdraw"
                >
                  {balance?.balanceMode !== 'SC'
                    ? 'Switch to SC Mode to Withdraw'
                    : wageringData?.hasActiveBonus && wageringData?.remainingToWager > 0
                    ? `Complete $${wageringData.remainingToWager.toFixed(2)} wagering first`
                    : 'Redeem via NOWPayments'
                  }
                </Button>
              </div>
            </div>
          </div>

          {/* Bank Transfer Option (Coming Soon) */}
          <div className="bg-[#1a1a1a]/50 rounded-xl p-6 border border-[#2a2a2a]/50 opacity-60">
            <div className="flex items-start gap-4">
              <div className="bg-gray-500/20 rounded-full p-3">
                <CreditCard style={{width: '3.5px', height: '3.5px'}} className="text-gray-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-gray-400 font-bold text-[10px] mb-2">Bank Transfer</h3>
                <p className="text-gray-500 mb-4 leading-relaxed">
                  Direct withdrawal to your bank account. This feature is coming soon and will provide an additional convenient withdrawal method.
                </p>
                <Button
                  disabled
                  className="w-full h-12 bg-gray-700 text-gray-400 cursor-not-allowed font-bold text-[10px]"
                  data-testid="button-bank-transfer"
                >
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="p-6 border-t border-[#1a1a1a] bg-[#0f0f0f]">
          <div className="flex items-start gap-3 mb-6">
            <AlertCircle style={{width: '3px', height: '3px'}} className="text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-[8px] text-gray-400 leading-relaxed">
              <p className="mb-2"><strong className="text-yellow-400">Minimum withdrawal:</strong> $10.00</p>
              <p><strong className="text-yellow-400">Processing time:</strong> 1-24 hours for crypto withdrawals</p>
            </div>
          </div>
          
          {/* Back to Home Button */}
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="xs"
            className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-medium"
            data-testid="button-back-home-footer"
          >
            <Home className=" mr-1"style={{width: '2.5px', height: '2.5px'}} />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}