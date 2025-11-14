import { X, Wallet, Bitcoin, CreditCard, AlertCircle, Lock, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface CashoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export function CashoutModal({ isOpen, onClose }: CashoutModalProps) {
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
  
  // Fetch wagering requirements when modal opens
  const { data: wageringData, isLoading: isLoadingWagering } = useQuery<WageringData>({
    queryKey: ["/api/bonuses/wagering-requirements"],
    enabled: isOpen,
  });
  
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleNowPaymentsRedeem = () => {
    // Check if user is in SC mode before allowing withdrawal
    if (balance?.balanceMode !== 'SC') {
      return; // This will be handled by the disabled state and UI
    }
    
    // Navigate to crypto page with withdraw tab active
    onClose();
    navigate('/crypto');
    // Set the withdraw tab as active
    setTimeout(() => {
      const withdrawTab = document.querySelector('[value="withdraw"]') as HTMLElement;
      if (withdrawTab) withdrawTab.click();
    }, 100);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Modal - Optimized for mobile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cashout-modal-title"
            className="fixed inset-x-4 top-8 max-w-md mx-auto bg-[#0A0A0A] border border-[#1a1a1a] rounded-2xl z-[110] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Scrollable Content Wrapper */}
            <div className="flex flex-col max-h-[90vh]">
              {/* Header - Fixed */}
              <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Wallet style={{width: '3px', height: '3px'}} className="text-purple-400" />
                  <h2 id="cashout-modal-title" className="text-[10px] font-bold text-white">Cashout</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-[#1a1a1a] transition-colors"
                  aria-label="Close cashout modal"
                >
                  <X style={{width: '3px', height: '3px'}} className="text-gray-400" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto purple-scrollbar">
                {/* Balance Display with Mode Information */}
                <div className="p-4 border-b border-[#1a1a1a]">
                  <div className="text-center">
                    <p className="text-[8px] text-gray-400 mb-2">Available Balance</p>
                    <p className="text-[10px] font-bold text-white">
                      {balance?.balanceMode === 'SC' 
                        ? `$${balance.sweepsCashRedeemable.toFixed(2)}` 
                        : `${balance?.available.toFixed(2) || '0.00'} GC`
                      }
                    </p>
                    <p className="text-[8px] text-gray-500 mt-1">
                      {balance?.balanceMode === 'SC' ? 'Redeemable Sweeps Cash' : 'Gold Credits (Play Money)'}
                    </p>
                  </div>
                </div>

                {/* GC Mode Warning */}
                {balance?.balanceMode === 'GC' && (
                  <div className="p-4 bg-yellow-900/20 border-b border-yellow-900/30">
                    <div className="flex items-start gap-3">
                      <Lock style={{width: '3px', height: '3px'}} className="text-yellow-500 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-yellow-400 font-semibold mb-1">
                          Real Money Withdrawals Restricted
                        </h3>
                        <p className="text-[8px] text-yellow-300 mb-3">
                          You're currently in Gold Credits (GC) mode. To make real money withdrawals, please switch to Sweeps Cash (SC) mode using the balance toggle.
                        </p>
                        <p className="text-[8px] text-yellow-400">
                          GC = Play money only • SC = Real money that can be redeemed
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wagering Requirements Warning */}
                {wageringData?.hasActiveBonus && wageringData?.remainingToWager > 0 && (
                  <div className="p-4 bg-orange-900/20 border-b border-orange-900/30">
                    <div className="flex items-start gap-3">
                      <Lock style={{width: '3px', height: '3px'}} className="text-orange-500 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-orange-400 font-semibold mb-2">
                          Active Bonus Wagering Requirements
                        </h3>
                        <p className="text-[8px] text-orange-300 mb-3">
                          You must complete wagering requirements before withdrawing.
                        </p>
                        
                        {/* Total Progress */}
                        <div className="mb-4">
                          <div className="flex justify-between text-[8px] text-gray-300 mb-1">
                            <span>Total Progress</span>
                            <span>
                              ${wageringData.totalWagered.toFixed(2)} / ${wageringData.totalWageringRequired.toFixed(2)}
                            </span>
                          </div>
                          <Progress 
                            value={(wageringData.totalWagered / wageringData.totalWageringRequired) * 100} 
                            className="h-2 bg-[#1a1a1a]" 
                          />
                          <p className="text-[8px] text-orange-400 mt-1">
                            Remaining to wager: <span className="font-bold">${wageringData.remainingToWager.toFixed(2)}</span>
                          </p>
                        </div>
                        
                        {/* Individual Bonus Progress */}
                        {wageringData.activeBonuses.map((bonus: any) => (
                          <div key={bonus.id} className="bg-[#0A0A0A] rounded-lg p-3 mb-2">
                            <div className="flex justify-between text-[8px] text-gray-300 mb-1">
                              <span className="capitalize">{bonus.bonusType.replace('_', ' ')}</span>
                              <span>{bonus.percentageComplete}% complete</span>
                            </div>
                            <Progress 
                              value={bonus.percentageComplete} 
                              className="h-1.5 bg-[#1a1a1a]" 
                            />
                            <div className="flex justify-between text-[8px] text-gray-400 mt-1">
                              <span>${bonus.wagered.toFixed(2)} wagered</span>
                              <span>${bonus.remainingToWager.toFixed(2)} remaining</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cashout Options */}
                <div className="p-4 space-y-3">
                  {/* NOWPayments Option */}
                  <div className="bg-[#1a1a1a] rounded-lg p-4 overflow-hidden">
                    <div className="flex items-start gap-3">
                      <Bitcoin style={{width: '4px', height: '4px'}} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold mb-1">Crypto Withdrawal</h3>
                        <p className="text-[8px] text-gray-400 mb-3">
                          BTC, ETH, USDT & 100+ cryptos
                        </p>
                        <Button
                          onClick={handleNowPaymentsRedeem}
                          disabled={
                            balance?.balanceMode !== 'SC' || 
                            (wageringData?.hasActiveBonus && wageringData?.remainingToWager > 0)
                          }
                          className="w-full bg-gradient-to-b from-purple-700 to-purple-500 hover:from-purple-800 hover:to-purple-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-[8px] sm:text-[8px] px-2 py-2 min-h-[40px] whitespace-normal break-words shadow-md hover:shadow-lg transition-all"
                        >
                          <span className="block">
                            {balance?.balanceMode !== 'SC'
                              ? 'Switch to SC Mode to Withdraw'
                              : wageringData?.hasActiveBonus && wageringData?.remainingToWager > 0
                              ? `Complete $${wageringData.remainingToWager.toFixed(2)} wagering first`
                              : 'Redeem via NOWPayments'
                            }
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Bank Transfer Option (Coming Soon) */}
                  <div className="bg-[#1a1a1a]/50 rounded-lg p-4 opacity-60">
                    <div className="flex items-start gap-3">
                      <CreditCard style={{width: '4px', height: '4px'}} className="text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-gray-400 font-semibold mb-1">Bank Transfer</h3>
                        <p className="text-[8px] text-gray-500 mb-3">
                          Direct withdrawal to your bank
                        </p>
                        <Button
                          disabled
                          className="w-full bg-gray-700 text-gray-400 cursor-not-allowed"
                        >
                          Coming Soon
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Footer */}
                <div className="p-4 border-t border-[#1a1a1a]">
                  <div className="flex items-start gap-2">
                    <AlertCircle style={{width: '3.5px', height: '3.5px'}} className="text-yellow-500 mt-0.5" />
                    <div className="text-[8px] text-gray-400">
                      <p className="mb-1">Minimum withdrawal: $10.00</p>
                      <p>Processing: 1-24 hours for crypto</p>
                    </div>
                  </div>
                  
                  {/* Back to Home Button */}
                  <div className="mt-6 pt-4 border-t border-gray-800">
                    <Button
                      onClick={() => {
                        onClose();
                        navigate('/');
                      }}
                      variant="ghost"
                      size="sm"
                      className="w-full text-gray-400 hover:text-white"
                      data-testid="button-back-home-cashout"
                    >
                      <ArrowLeft className=" mr-2"style={{width: '3px', height: '3px'}} />
                      Back to Home
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}