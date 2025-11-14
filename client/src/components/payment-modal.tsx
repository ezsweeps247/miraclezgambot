import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle, Clock, ExternalLink, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface PaymentData {
  depositId: string;
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  orderId: string;
  usdAmount: number;
  goldCoins?: number;
  bonusCoins?: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: PaymentData | null;
}

export default function PaymentModal({ isOpen, onClose, paymentData }: PaymentModalProps) {
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Copied",
      description: "Payment address copied to clipboard",
      variant: "default"
    });
  };

  if (!paymentData) return null;

  const getCurrencyIcon = (currency: string) => {
    const icons: Record<string, string> = {
      BTC: '₿',
      ETH: 'Ξ',
      USDT: '₮',
      LTC: 'Ł',
      DOGE: 'Ð',
      TRX: 'T',
      BNB: 'B',
      ADA: '₳',
      XRP: 'X'
    };
    return icons[currency] || '₿';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-casino-card border-casino-accent max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[10px] text-white flex items-center">
            <span className="text-[10px] mr-2">{getCurrencyIcon(paymentData.payCurrency)}</span>
            Payment Created
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status */}
          <div className="text-center">
            <Badge className="text-[8px] bg-yellow-500 text-black mb-2">
              <Clock style={{width: '3.5px', height: '3.5px'}} className="mr-1" />
              Awaiting Payment
            </Badge>
            <p className="text-casino-text text-[8px]">
              Send the exact amount to the address below
            </p>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <div className="bg-casino-dark p-4 rounded-lg">
              <div className="text-casino-text text-[8px] mb-1">Amount to Send</div>
              <div className="text-white text-[10px] font-bold">
                {paymentData.payAmount} {paymentData.payCurrency}
              </div>
              <div className="text-casino-text text-[8px]">
                ≈ ${(paymentData.usdAmount || 0).toFixed(2)} USD = ${(paymentData.usdAmount || 0).toFixed(2)} SC
              </div>
            </div>

            <div className="bg-casino-dark p-4 rounded-lg">
              <div className="text-casino-text text-[8px] mb-2">Payment Address</div>
              <div className="text-white text-[8px] font-mono break-all mb-3">
                {paymentData.payAddress}
              </div>
              <Button
                onClick={() => copyToClipboard(paymentData.payAddress)}
                className="w-full"
                variant="outline"
              >
                {copied ? (
                  <>
                    <CheckCircle style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                    Copy Address
                  </>
                )}
              </Button>
            </div>

            <div className="bg-casino-dark p-4 rounded-lg">
              <div className="text-casino-text text-[8px] mb-1">Payment ID</div>
              <div className="text-white text-[8px] font-mono">
                {paymentData.paymentId}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
            <div className="text-yellow-400 text-[8px] font-semibold mb-2">
              Important Instructions
            </div>
            <ul className="text-casino-text text-[8px] space-y-1">
              <li>• Send exactly {paymentData.payAmount} {paymentData.payCurrency}</li>
              <li>• Only send {paymentData.payCurrency} to this address</li>
              <li>• Payment will be confirmed automatically</li>
              <li>• Sweeps Cash (SC) will be added to your account after confirmation</li>
              <li>• Do not send from an exchange (use your own wallet)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Primary Buy Now Button */}
            <Button
              onClick={async () => {
                try {
                  // Call the mock payment endpoint with package info
                  const response = await fetch('/api/crypto/complete-mock-payment', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                      usdAmount: paymentData.usdAmount,
                      currency: paymentData.payCurrency,
                      paymentId: paymentData.paymentId,
                      goldCoins: paymentData.goldCoins,
                      sweepsCash: paymentData.bonusCoins
                    })
                  });
                  
                  if (!response.ok) {
                    throw new Error('Payment failed');
                  }
                  
                  const result = await response.json();
                  
                  toast({
                    title: "Payment Successful!",
                    description: `$${result.scAdded} SC (Sweeps Cash) has been added to your account`,
                    variant: "default"
                  });
                  
                  // Refresh balance and purchase limit by invalidating queries
                  queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/purchase-limit'] });
                  
                  onClose();
                } catch (error) {
                  toast({
                    title: "Payment Failed",
                    description: "Failed to process payment. Please try again.",
                    variant: "destructive"
                  });
                }
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12"
            >
              Buy Now - Add ${(paymentData.usdAmount || 0).toFixed(2)} SC
            </Button>
            
            {/* Secondary Actions */}
            <div className="flex space-x-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                I'll Pay Later
              </Button>
              <Button
                onClick={() => {
                  // Open blockchain explorer (implement based on currency)
                  const explorerUrl = `https://blockchair.com/${paymentData.payCurrency.toLowerCase()}/address/${paymentData.payAddress}`;
                  window.open(explorerUrl, '_blank');
                }}
                className="flex-1 bg-casino-primary hover:bg-casino-primary/90"
              >
                <ExternalLink style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                View Address
              </Button>
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
                data-testid="button-back-home-payment"
              >
                <ArrowLeft className=" mr-2"style={{width: '3px', height: '3px'}} />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}