import { useState, useEffect } from 'react';
import { X, Gift, Send, DollarSign, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
}

export function TipModal({ isOpen, onClose, recipientId, recipientName }: TipModalProps) {
  const [, navigate] = useLocation();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();
  
  // Fetch current balance
  const { data: balance } = useQuery<{ available: number; locked: number; currency: string }>({
    queryKey: ['/api/balance'],
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
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setMessage('');
    }
  }, [isOpen]);
  
  // Send tip mutation
  const sendTipMutation = useMutation({
    mutationFn: async ({ amount, message }: { amount: number; message?: string }) => {
      const response = await apiRequest('POST', '/api/tips/send', {
        toUserId: recipientId,
        amount,
        message: message || undefined
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Show success animation
      setIsAnimating(true);
      
      // Play success sound (if available)
      const audio = new Audio('/sounds/success.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
      
      toast({
        title: 'Tip Sent! 🎉',
        description: `You tipped ${recipientName} ${amount} credits`,
      });
      
      // Invalidate balance query
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      
      // Close modal after animation
      setTimeout(() => {
        onClose();
        setIsAnimating(false);
      }, 2000);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Failed to send tip';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  });
  
  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const tipAmount = parseFloat(amount);
    
    // Validation
    if (isNaN(tipAmount) || tipAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid tip amount',
        variant: 'destructive',
      });
      return;
    }
    
    if (tipAmount < 0.01) {
      toast({
        title: 'Minimum Amount',
        description: 'Minimum tip amount is 0.01 credits',
        variant: 'destructive',
      });
      return;
    }
    
    if (balance && tipAmount > balance.available) {
      toast({
        title: 'Insufficient Balance',
        description: `You only have ${balance.available.toFixed(2)} credits available`,
        variant: 'destructive',
      });
      return;
    }
    
    // Send the tip
    sendTipMutation.mutate({ amount: tipAmount, message });
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
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tip-modal-title"
            className="fixed inset-x-4 top-16 max-w-md mx-auto bg-[#1a1a2e] rounded-2xl z-[110] shadow-2xl overflow-hidden"
          >
            {/* Success Animation Overlay */}
            <AnimatePresence>
              {isAnimating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600/20 to-pink-600/20 z-20 pointer-events-none"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: 0 }}
                    animate={{ scale: 1.5, rotate: 360 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Sparkles style={{width: '4px', height: '4px'}} className="text-yello" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-purple-600/20">
              <div className="flex items-center gap-2">
                <Gift style={{width: '3px', height: '3px'}} className="text-purple-400" />
                <h2 id="tip-modal-title" className="text-[10px] font-bold text-white">
                  Send Tip to {recipientName}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-purple-600/10 transition-colors"
                aria-label="Close tip modal"
                data-testid="tip-modal-close"
              >
                <X style={{width: '3px', height: '3px'}} className="text-gray-400" />
              </button>
            </div>
            
            {/* Content */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Current Balance Display */}
              <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-lg p-3 border border-purple-600/20">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-gray-400">Your Balance</span>
                  <span className="text-[10px] font-bold text-white">
                    {balance ? balance.available.toFixed(2) : '0.00'} credits
                  </span>
                </div>
              </div>
              
              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="tip-amount" className="text-[8px] text-white">Amount</Label>
                <div className="relative">
                  <DollarSign style={{width: '3.5px', height: '3.5px'}} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="tip-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance?.available || 0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-10 bg-[#0f0f1a] border-purple-600/20 text-white placeholder:text-gray-500 focus:border-purple-500"
                    required
                    data-testid="tip-amount-input"
                  />
                </div>
              </div>
              
              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-5 gap-2">
                {[1, 5, 10, 25, 50].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(value)}
                    className="bg-purple-600/10 border-purple-600/20 hover:bg-purple-600/20 text-white"
                    data-testid={`quick-amount-${value}`}
                  >
                    {value}
                  </Button>
                ))}
              </div>
              
              {/* Message Input */}
              <div className="space-y-2">
                <Label htmlFor="tip-message" className="text-[8px] text-white">Message (optional)</Label>
                <Textarea
                  id="tip-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message with your tip..."
                  className="bg-[#0f0f1a] border-purple-600/20 text-white placeholder:text-gray-500 focus:border-purple-500 min-h-[80px]"
                  maxLength={200}
                  data-testid="tip-message-input"
                />
                <p className="text-[8px] text-gray-500">
                  {message.length}/200 characters
                </p>
              </div>
              
              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 bg-transparent border-purple-600/20 text-white hover:bg-purple-600/10"
                  disabled={sendTipMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!amount || parseFloat(amount) <= 0 || sendTipMutation.isPending}
                  className="flex-1 bg-gradient-to-b from-purple-700 to-pink-600 hover:from-purple-800 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all"
                  data-testid="send-tip-button"
                >
                  {sendTipMutation.isPending ? (
                    <>
                      <Loader2 style={{width: '3.5px', height: '3.5px'}} className="mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                      Send Tip
                    </>
                  )}
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
                  className="text-[8px] w-full text-gray-400 hover:text-white"
                  data-testid="button-back-home-tip"
                >
                  <ArrowLeft className=" mr-2"style={{width: '3px', height: '3px'}} />
                  Back to Home
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}