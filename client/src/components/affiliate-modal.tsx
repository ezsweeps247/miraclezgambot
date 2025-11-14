import { X, Users, Trophy, DollarSign, Link2, Gift, TrendingUp, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface AffiliateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AffiliateData {
  code: string;
}

interface AnalyticsData {
  totalEarnings: number;
  newReferrals: number;
  activeUsers: number;
  commissionRate: number;
}

export function AffiliateModal({ isOpen, onClose }: AffiliateModalProps) {
  const [, navigate] = useLocation();
  const [copiedCode, setCopiedCode] = useState(false);
  const { toast } = useToast();
  
  // Fetch affiliate analytics
  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ['/api/affiliate/analytics/7d'],
    enabled: isOpen,
  });
  
  // Fetch user affiliate code
  const { data: affiliateData } = useQuery<AffiliateData>({
    queryKey: ['/api/affiliate/code'],
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

  const handleCopyCode = () => {
    if (affiliateData?.code) {
      navigator.clipboard.writeText(affiliateData.code);
      setCopiedCode(true);
      toast({
        title: 'Copied!',
        description: 'Affiliate code copied to clipboard',
      });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}?ref=${affiliateData?.code || ''}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Copied!',
      description: 'Affiliate link copied to clipboard',
    });
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

          {/* Modal - Positioned above taskbar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="affiliate-modal-title"
            className="fixed inset-x-4 bottom-16 max-w-md mx-auto bg-[#0A0A0A] border border-[#1a1a1a] rounded-2xl z-[110] shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* Scrollable Content Wrapper */}
            <div className="flex flex-col max-h-[85vh]">
              {/* Header - Fixed */}
              <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Users style={{width: '3px', height: '3px'}} className="text-purple-400" />
                  <h2 id="affiliate-modal-title" className="text-[10px] font-bold text-white">Affiliates</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-[#1a1a1a] transition-colors"
                  aria-label="Close affiliate modal"
                  data-testid="affiliate-close"
                >
                  <X style={{width: '3px', height: '3px'}} className="text-gray-400" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto purple-scrollbar">
                {/* Affiliate Code Section */}
                <div className="p-4 border-b border-[#1a1a1a]">
                  <h3 className="text-[8px] text-gray-400 mb-3">Your Affiliate Code</h3>
                  <div className="bg-[#1a1a1a] rounded-lg p-3 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-white">
                      {affiliateData?.code || 'LOADING...'}
                    </span>
                    <Button
                      onClick={handleCopyCode}
                      size="sm"
                      variant={copiedCode ? "default" : "outline"}
                      className="ml-3"
                      data-testid="copy-code"
                    >
                      {copiedCode ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  
                  <div className="mt-3">
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      className="w-full"
                      data-testid="copy-link"
                    >
                      <Link2 style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                      Copy Affiliate Link
                    </Button>
                  </div>
                </div>

                {/* Stats Overview */}
                <div className="p-4 space-y-4">
                  <h3 className="text-[8px] text-gray-400 mb-3">Last 7 Days Performance</h3>
                  
                  {/* Total Earnings */}
                  <div className="bg-purple-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign style={{width: '3px', height: '3px'}} className="text-purple-400" />
                        <span className="text-[8px] text-gray-300">Total Earnings</span>
                      </div>
                      <span className="text-[10px] font-bold text-purple-400">
                        ${analytics?.totalEarnings?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>

                  {/* Referrals Count */}
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users style={{width: '3px', height: '3px'}} className="text-blue-400" />
                        <span className="text-[8px] text-gray-300">New Referrals</span>
                      </div>
                      <span className="text-[10px] font-bold text-white">
                        {analytics?.newReferrals || 0}
                      </span>
                    </div>
                  </div>

                  {/* Active Users */}
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp style={{width: '3px', height: '3px'}} className="text-green-400" />
                        <span className="text-[8px] text-gray-300">Active Users</span>
                      </div>
                      <span className="text-[10px] font-bold text-white">
                        {analytics?.activeUsers || 0}
                      </span>
                    </div>
                  </div>

                  {/* Commission Rate */}
                  <div className="bg-[#1a1a1a] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Trophy style={{width: '3px', height: '3px'}} className="text-yellow-400" />
                        <span className="text-[8px] text-gray-300">Commission Rate</span>
                      </div>
                      <span className="text-[10px] font-bold text-white">
                        {analytics?.commissionRate || 25}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Affiliate Program Info */}
                <div className="p-4 bg-purple-900/10 border-t border-purple-900/30">
                  <h3 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
                    <Gift style={{width: '3px', height: '3px'}} />
                    Affiliate Program Benefits
                  </h3>
                  <ul className="space-y-2 text-[8px] text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>Earn 25% commission on all referred users' losses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>Lifetime earnings from your referrals</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>Real-time tracking and analytics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>Weekly payouts with no minimum threshold</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>Dedicated support for top affiliates</span>
                    </li>
                  </ul>
                </div>

                {/* Call to Action */}
                <div className="p-4 space-y-3">
                  <p className="text-[8px] text-gray-500 mb-3 text-center">
                    Share your affiliate link with friends and start earning today!
                  </p>
                  
                  {/* Social Share Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = `${window.location.origin}?ref=${affiliateData?.code || ''}`;
                        const text = `Join Miraclez Gaming with my referral link and get exclusive bonuses! 🎰`;
                        window.open(`https://telegram.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      data-testid="share-telegram"
                      className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.68c.223-.198-.054-.308-.346-.11l-6.4 4.02-2.76-.918c-.6-.187-.612-.6.125-.89l10.782-4.156c.5-.18.94.12.78.88z"/>
                      </svg>
                      <span className="text-[8px]">Telegram</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = `${window.location.origin}?ref=${affiliateData?.code || ''}`;
                        const text = `Join Miraclez Gaming with my referral link and get exclusive bonuses! 🎰 ${link}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      data-testid="share-whatsapp"
                      className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.18-.32.08-1.33.35.36-1.29.09-.33-.19-.32a8.188 8.188 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zM8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.86-.87 2.07 0 1.22.89 2.39 1 2.56.12.17 1.76 2.67 4.25 3.73.59.27 1.05.42 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.27-.25-.14-1.47-.74-1.69-.82-.23-.08-.37-.12-.56.12-.16.25-.64.81-.78.97-.15.17-.29.19-.53.07-.26-.13-1.06-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.38.11-.51.11-.11.27-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43-.14 0-.3-.01-.47-.01z"/>
                      </svg>
                      <span className="text-[8px]">WhatsApp</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = `${window.location.origin}?ref=${affiliateData?.code || ''}`;
                        const text = `Join @MiraclezGaming with my referral link and get exclusive bonuses! 🎰`;
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
                      }}
                      data-testid="share-twitter"
                      className="flex flex-col items-center gap-1 h-auto py-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span className="text-[8px]">Twitter</span>
                    </Button>
                  </div>
                  
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={handleCopyLink}
                    data-testid="share-button"
                  >
                    <Link2 style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                    Copy Link to Share
                  </Button>
                </div>

                {/* Back to Home Button */}
                <div className="mt-6 pt-4 border-t border-gray-800">
                  <Button
                    onClick={() => {
                      onClose();
                      navigate('/');
                    }}
                    variant="outline"
                    size="xs"
                    className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black"
                    data-testid="button-back-home-affiliate"
                  >
                    <ArrowLeft className=" mr-1"style={{width: '2.5px', height: '2.5px'}} />
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