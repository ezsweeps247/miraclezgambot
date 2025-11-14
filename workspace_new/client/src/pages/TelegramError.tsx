import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TelegramError() {
  const [errorMessage, setErrorMessage] = useState<string>('Authentication failed');

  useEffect(() => {
    // Get error from localStorage
    const storedError = localStorage.getItem('telegram_auth_error');
    if (storedError) {
      try {
        const errorData = JSON.parse(storedError);
        setErrorMessage(errorData.message || 'Authentication failed');
      } catch (e) {
        console.error('Failed to parse stored error:', e);
      }
    }
  }, []);

  const handleRetry = () => {
    // Clear error and reload
    localStorage.removeItem('telegram_auth_error');
    window.location.reload();
  };

  const handleContactSupport = () => {
    // Open Telegram support chat
    const tg = window.Telegram?.WebApp;
    if (tg && 'openTelegramLink' in tg) {
      (tg as any).openTelegramLink('https://t.me/MiraclezSupport');
    } else {
      // Fallback: open in new window
      window.open('https://t.me/MiraclezSupport', '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1212] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1a1f1f] border border-[#2a2f2f] rounded-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle style={{width: '3.5px', height: '3.5px'}} className=" text-red-500" />
          </div>
        </div>

        <h1 className="text-[10px] font-bold text-white mb-3">
          Connection Failed
        </h1>

        <p className="text-[8px] text-gray-400 mb-2">
          We couldn't authenticate your Telegram account.
        </p>

        <div className="bg-[#0f1212] border border-[#2a2f2f] rounded-lg p-4 mb-6">
          <p className="text-[8px] text-gray-500 font-mono break-words">
            {errorMessage}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            className="w-full bg-[#D4AF37] hover:bg-[#c49d2e] text-black"
            data-testid="button-retry"
          >
            <RefreshCw style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
            Try Again
          </Button>

          <Button
            onClick={handleContactSupport}
            variant="outline"
            className="w-full border-[#2a2f2f] hover:bg-[#2a2f2f]"
            data-testid="button-support"
          >
            <MessageCircle style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
            Contact Support
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-[#2a2f2f]">
          <p className="text-[8px] text-gray-500">
            This usually happens when the bot is not properly configured. Please contact our support team for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
