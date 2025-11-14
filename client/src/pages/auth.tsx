import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { BrowserProvider } from 'ethers';
import { SiGoogle } from 'react-icons/si';
import miraclezLogo from '@/assets/miraclez-logo.png';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const WalletIcon = ({ children, onClick, label, disabled }: { 
  children: React.ReactNode; 
  onClick: () => void; 
  label: string;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="relative flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-800/80 hover:bg-gray-700/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
    data-testid={`button-wallet-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    </div>
    <div className="w-16 h-16 flex items-center justify-center">
      {children}
    </div>
  </button>
);

export default function Auth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [loadingWallet, setLoadingWallet] = useState('');

  const connectWallet = async (walletType: string) => {
    setIsLoading(true);
    setLoadingWallet(walletType);
    try {
      if (typeof window.ethereum === 'undefined') {
        toast({
          title: 'Wallet not found',
          description: `Please install ${walletType} to continue`,
          variant: 'destructive',
        });
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const address = accounts[0];
      const signer = await provider.getSigner();
      
      const message = `Sign this message to authenticate with Miraclez Gaming\n\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signer.signMessage(message);

      const res = await apiRequest('POST', '/api/auth/web3/login', {
        address,
        signature,
        message,
      });
      const response = await res.json();

      if (response.success) {
        toast({
          title: 'Connected!',
          description: 'Welcome to Miraclez Gaming',
        });
        setLocation('/');
      }
    } catch (error: any) {
      toast({
        title: 'Connection failed',
        description: error.message || 'Failed to connect wallet',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setLoadingWallet('');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const checkRes = await apiRequest('POST', '/api/auth/email/check', { email });
      const checkData = await checkRes.json();

      if (checkData.exists) {
        setLocation(`/login?email=${encodeURIComponent(email)}`);
      } else {
        setLocation(`/register?email=${encodeURIComponent(email)}`);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    window.location.href = '/api/auth/web/google';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#1a0a2e] to-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={miraclezLogo} alt="Miraclez Gaming" className="h-20" data-testid="logo-miraclez" />
        </div>

        <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-2xl">
          
          <div className="mb-8">
            <h2 className="text-white text-center mb-2 font-bold text-lg">
              Connect your Web3 wallet
            </h2>
            <p className="text-gray-400 text-center mb-6 text-sm">
              Experience winning in Web3 by connecting your wallet
            </p>
            
            <div className="grid grid-cols-4 gap-3 mb-6">
              <WalletIcon 
                label="MetaMask" 
                onClick={() => connectWallet('MetaMask')}
                disabled={isLoading}
              >
                <svg className="w-14 h-14" viewBox="0 0 40 40" fill="none">
                  <rect width="40" height="40" rx="8" fill="#F6851B"/>
                  <path d="M32 8L21 16L23 11L32 8Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 8L19 16L17 11L8 8Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M28 26L25 31L31 33L33 26H28Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 26L9 33L15 31L12 26H7Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 19L13 22L19 22L19 17L15 19Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M25 19L21 17V22H27L25 19Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </WalletIcon>

              <WalletIcon 
                label="Coinbase" 
                onClick={() => connectWallet('Coinbase')}
                disabled={isLoading}
              >
                <svg className="w-14 h-14" viewBox="0 0 40 40" fill="none">
                  <rect width="40" height="40" rx="8" fill="#0052FF"/>
                  <rect x="12" y="12" width="16" height="16" rx="2" fill="white"/>
                  <rect x="16" y="18" width="8" height="4" fill="#0052FF"/>
                  <rect x="18" y="16" width="4" height="8" fill="#0052FF"/>
                </svg>
              </WalletIcon>

              <WalletIcon 
                label="WalletConnect" 
                onClick={() => connectWallet('WalletConnect')}
                disabled={isLoading}
              >
                <svg className="w-14 h-14" viewBox="0 0 40 40" fill="none">
                  <rect width="40" height="40" rx="8" fill="#3B99FC"/>
                  <path d="M13 16C17.5 11.5 24.5 11.5 29 16L29.5 16.5L27 19L26.5 18.5C23.5 15.5 18.5 15.5 15.5 18.5L15 19L12.5 16.5L13 16Z" fill="white"/>
                  <circle cx="24" cy="23" r="2" fill="white"/>
                  <circle cx="16" cy="23" r="2" fill="white"/>
                </svg>
              </WalletIcon>

              <WalletIcon 
                label="Other" 
                onClick={() => connectWallet('Wallet')}
                disabled={isLoading}
              >
                <svg className="w-14 h-14" viewBox="0 0 40 40" fill="none">
                  <rect width="40" height="40" rx="8" fill="#7B3FF2"/>
                  <rect x="10" y="14" width="20" height="14" rx="2" fill="white"/>
                  <circle cx="25" cy="21" r="2" fill="#7B3FF2"/>
                  <rect x="10" y="12" width="20" height="3" rx="1.5" fill="white"/>
                </svg>
              </WalletIcon>
            </div>

            <Button
              onClick={() => connectWallet('Wallet')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-14 text-base rounded-xl shadow-lg transition-all"
              disabled={isLoading}
              data-testid="button-connect-wallet"
            >
              {isLoading && loadingWallet ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connecting {loadingWallet}...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-r from-gray-900/0 via-gray-800 to-gray-900/0 text-gray-400 font-medium">
                OR
              </span>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-white text-center mb-6 font-semibold text-base">
              Continue with your email
            </h3>
            
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/40 border-gray-600 h-14 text-base placeholder:text-gray-500 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                data-testid="input-email"
              />
              
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-14 text-base rounded-xl shadow-lg transition-all"
                disabled={isLoading}
                data-testid="button-email-auth"
              >
                {isLoading && !loadingWallet ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Sign up or Log in'
                )}
              </Button>
            </form>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-r from-gray-900/0 via-gray-800 to-gray-900/0 text-gray-400 font-medium">
                OR
              </span>
            </div>
          </div>

          <Button
            onClick={handleGoogleAuth}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold h-14 text-base rounded-xl shadow-lg transition-all"
            disabled={isLoading}
            data-testid="button-google-auth"
          >
            <SiGoogle className="mr-3 h-5 w-5" />
            Continue with Google
          </Button>

          <p className="text-gray-500 text-center mt-8 text-xs leading-relaxed">
            By continuing, you agree to our{' '}
            <button 
              onClick={() => setLocation('/terms')}
              className="text-purple-400 hover:text-purple-300 hover:underline font-medium"
              data-testid="link-terms"
            >
              Terms of Service
            </button>
            {' '}and{' '}
            <button 
              onClick={() => setLocation('/privacy')}
              className="text-purple-400 hover:text-purple-300 hover:underline font-medium"
              data-testid="link-privacy"
            >
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
