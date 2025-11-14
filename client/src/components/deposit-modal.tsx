import { X, Wallet, Bitcoin, CreditCard, AlertCircle, ArrowLeft, Lock, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
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

  const handleNowPaymentsDeposit = () => {
    // Check if user is in SC mode before allowing deposit
    if (balance?.balanceMode !== 'SC') {
      return; // This will be handled by the disabled state and UI
    }
    
    // Navigate to crypto page with deposit tab active
    onClose();
    navigate('/crypto');
    // Set the deposit tab as active
    setTimeout(() => {
      const depositTab = document.querySelector('[value="deposit"]') as HTMLElement;
      if (depositTab) depositTab.click();
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
            aria-labelledby="deposit-modal-title"
            className="fixed inset-x-4 top-[50%] -translate-y-1/2 max-w-md mx-auto bg-[#0A0A0A] border border-[#1a1a1a] rounded-2xl z-[110] shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* Scrollable Content Wrapper */}
            <div className="flex flex-col max-h-[85vh]">
              {/* Header - Fixed */}
              <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Wallet style={{width: '3px', height: '3px'}} className="text-purple-400" />
                  <h2 id="deposit-modal-title" className="text-[10px] font-bold text-white">Deposit Funds</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-[#1a1a1a] transition-colors"
                  aria-label="Close deposit modal"
                >
                  <X style={{width: '3px', height: '3px'}} className="text-gray-400" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Balance Display with Mode Information */}
                <div className="p-4 border-b border-[#1a1a1a]">
                  <div className="text-center">
                    <p className="text-[8px] text-gray-400 mb-2">Current Balance</p>
                    <p className="text-[10px] font-bold text-white">
                      {balance?.balanceMode === 'SC' 
                        ? `$${balance.sweepsCashTotal.toFixed(2)}` 
                        : `${balance?.available.toFixed(2) || '0.00'} GC`
                      }
                    </p>
                    <p className="text-[8px] text-gray-500 mt-1">
                      {balance?.balanceMode === 'SC' ? 'Sweeps Cash' : 'Gold Credits (Play Money)'}
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
                          Real Money Deposits Restricted
                        </h3>
                        <p className="text-[8px] text-yellow-300 mb-3">
                          You're currently in Gold Credits (GC) mode. To make real money deposits, please switch to Sweeps Cash (SC) mode using the balance toggle.
                        </p>
                        <p className="text-[8px] text-yellow-400">
                          GC = Play money only • SC = Real money that can be redeemed
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Deposit Options */}
                <div className="p-4 space-y-3">
              {/* NOWPayments Option */}
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Bitcoin style={{width: '4px', height: '4px'}} className="text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">Crypto Deposit</h3>
                    <p className="text-[8px] text-gray-400 mb-3">
                      Bitcoin, ETH, USDT & 100+ cryptos
                    </p>
                    <Button
                      onClick={handleNowPaymentsDeposit}
                      disabled={balance?.balanceMode !== 'SC'}
                      className={
                        balance?.balanceMode === 'SC'
                          ? "w-full bg-gradient-to-b from-purple-700 to-purple-500 hover:from-purple-800 hover:to-purple-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                          : "w-full bg-gray-600 text-gray-300 cursor-not-allowed"
                      }
                    >
                      {balance?.balanceMode === 'SC' 
                        ? 'Deposit via NOWPayments'
                        : 'Switch to SC Mode to Deposit'
                      }
                    </Button>
                  </div>
                </div>
              </div>

              {/* Card Payment Option (Coming Soon) */}
              <div className="bg-[#1a1a1a]/50 rounded-lg p-4 opacity-60">
                <div className="flex items-start gap-3">
                  <CreditCard style={{width: '4px', height: '4px'}} className="text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-gray-400 font-semibold mb-1">Card Payment</h3>
                    <p className="text-[8px] text-gray-500 mb-3">
                      Deposit using credit or debit card
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
                  <div className="flex items-start gap-2 mb-4">
                    <AlertCircle style={{width: '3.5px', height: '3.5px'}} className="text-yellow-500 mt-0.5" />
                    <div className="text-[8px] text-gray-400">
                      <p className="mb-1">Minimum deposit: $10.00</p>
                      <p>Processing time: Instant for crypto</p>
                    </div>
                  </div>
                  
                  {/* Back to Home Button */}
                  <Button
                    onClick={() => {
                      onClose();
                      navigate('/');
                    }}
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-400 hover:text-white"
                    data-testid="button-back-home-deposit"
                  >
                    <ArrowLeft className=" mr-2"style={{width: '3px', height: '3px'}} />
                    Back to Home
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}