import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, RefreshCw, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export default function FundoraBloxNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [selectedStake, setSelectedStake] = useState('1');
  const [isLoading, setIsLoading] = useState(false);

  // Get user balance
  const { data: balance, isLoading: balanceLoading } = useQuery<{
    available: number;
    locked: number;
    currency: string;
    total: number;
    sweepsCashTotal: number;
    sweepsCashRedeemable: number;
    balanceMode: string;
  }>({
    queryKey: ['/api/balance'],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  // Get Fundora Blox balance
  const { data: fundoraBalance, refetch: refetchFundoraBalance } = useQuery<{
    balance: number;
    currency: string;
  }>({
    queryKey: ['/api/fundora-blox/balance'],
    enabled: !!sessionUrl,
    refetchInterval: 10000,
  });

  // Create game session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (stake: string) => {
      const response = await apiRequest('POST', '/api/fundora-blox/session', {
        stake,
      });
      return response.json() as Promise<{
        success: boolean;
        embedUrl: string;
        session: string;
        expiresAt: string;
      }>;
    },
    onSuccess: (data) => {
      if (data.success && data.embedUrl) {
        setSessionUrl(data.embedUrl);
        toast({
          title: 'Game session created!',
          description: 'Loading Fundora Blox...',
        });
        queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      }
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to start game',
        description: error.message || 'Please try again',
      });
    },
  });

  // Sync credits mutation
  const syncCreditsMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest('POST', '/api/fundora-blox/sync-credits', {
        amount,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Credits synced!',
        description: 'Your credits have been loaded to Fundora Blox',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      refetchFundoraBalance();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to sync credits',
        description: error.message || 'Please try again',
      });
    },
  });

  // Redeem credits mutation
  const redeemCreditsMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest('POST', '/api/fundora-blox/redeem', {
        amount,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Credits redeemed!',
        description: 'Your credits have been returned to your main balance',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      refetchFundoraBalance();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to redeem credits',
        description: error.message || 'Please try again',
      });
    },
  });

  const handleStartGame = async () => {
    if (!selectedStake) {
      toast({
        variant: 'destructive',
        title: 'Please select a stake',
      });
      return;
    }

    const stakeAmount = parseFloat(selectedStake);
    if (balance && balance.available < stakeAmount) {
      toast({
        variant: 'destructive',
        title: 'Insufficient balance',
        description: 'Please add funds to play',
      });
      return;
    }

    setIsLoading(true);
    try {
      await createSessionMutation.mutateAsync(selectedStake);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncCredits = async () => {
    const amount = parseFloat(prompt('Enter amount to load to Fundora Blox:') || '0');
    if (amount > 0) {
      await syncCreditsMutation.mutateAsync(amount);
    }
  };

  const handleRedeemCredits = async () => {
    if (!fundoraBalance) return;
    const amount = parseFloat(prompt(`Enter amount to redeem (max: ${fundoraBalance.balance}):`) || '0');
    if (amount > 0 && amount <= fundoraBalance.balance) {
      await redeemCreditsMutation.mutateAsync(amount);
    }
  };

  const handleNewSession = () => {
    setSessionUrl(null);
    setSelectedStake('1');
  };

  // If no API key is configured, show fallback to original game
  const isApiConfigured = process.env.FUNDORA_BLOX_API_KEY !== undefined;

  if (!isApiConfigured) {
    // Redirect to original game if API is not configured
    useEffect(() => {
      setLocation('/fundora-blox');
    }, []);
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <button
          onClick={() => setLocation('/')}
          className="bg-gradient-to-r from-[#B8941A] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#F4D06F] text-black font-semibold px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm flex items-center gap-2"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </div>

      {!sessionUrl ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Fundora Blox
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Select your stake and start playing!
              </p>
            </div>

            {/* Balance Display */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Available Balance:
                </span>
                <span className="text-lg font-bold">
                  ${balance?.available.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>

            {/* Stake Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Stake:</label>
              <Select value={selectedStake} onValueChange={setSelectedStake}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose stake amount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.25">$0.25</SelectItem>
                  <SelectItem value="0.50">$0.50</SelectItem>
                  <SelectItem value="1">$1.00</SelectItem>
                  <SelectItem value="2">$2.00</SelectItem>
                  <SelectItem value="5">$5.00</SelectItem>
                  <SelectItem value="10">$10.00</SelectItem>
                  <SelectItem value="25">$25.00</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Button */}
            <Button
              onClick={handleStartGame}
              className="w-full"
              size="lg"
              disabled={isLoading || createSessionMutation.isPending}
            >
              {isLoading || createSessionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Game...
                </>
              ) : (
                <>
                  Start Playing
                  <DollarSign className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Control Bar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button onClick={handleNewSession} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  New Session
                </Button>
                <Button onClick={() => setLocation('/')} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Exit Game
                </Button>
              </div>
              
              {fundoraBalance && (
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Fundora Balance:
                    </span>
                    <span className="ml-2 font-bold">
                      ${fundoraBalance.balance.toFixed(2)}
                    </span>
                  </div>
                  <Button
                    onClick={handleSyncCredits}
                    variant="outline"
                    size="sm"
                    disabled={syncCreditsMutation.isPending}
                  >
                    Load Credits
                  </Button>
                  <Button
                    onClick={handleRedeemCredits}
                    variant="outline"
                    size="sm"
                    disabled={redeemCreditsMutation.isPending || !fundoraBalance.balance}
                  >
                    Redeem Credits
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Game Iframe */}
          <div className="relative w-full" style={{ paddingTop: '56.25%' /* 16:9 aspect ratio */ }}>
            <iframe
              src={sessionUrl}
              className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
              frameBorder="0"
              allow="fullscreen"
              title="Fundora Blox Game"
            />
          </div>
        </div>
      )}
    </div>
  );
}