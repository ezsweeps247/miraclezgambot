import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Gift, ArrowLeft, Check, AlertCircle, Loader } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RedemptionResult {
  success: boolean;
  message: string;
  rewards?: {
    gcCredited: number | null;
    scCredited: number | null;
    bonusCreated: boolean;
  };
}

export default function RedeemCode() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [code, setCode] = useState('');
  const [redemptionResult, setRedemptionResult] = useState<RedemptionResult | null>(null);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-center text-white text-xl">Authentication Required</CardTitle>
            <CardDescription className="text-center text-sm">
              Please log in to redeem codes
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => setLocation('/')}
              className="bg-golden hover:bg-golden/90 text-black text-sm"
              data-testid="button-go-home"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const redeemMutation = useMutation({
    mutationFn: async (redemptionCode: string) => {
      const response = await apiRequest('POST', '/api/redeem-code', { code: redemptionCode });
      return response.json() as Promise<RedemptionResult>;
    },
    onSuccess: (data) => {
      setRedemptionResult(data);
      if (data.success) {
        // Invalidate balance queries to refresh user balance
        queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
        toast({
          title: "Code Redeemed!",
          description: data.message,
          duration: 5000,
        });
      }
    },
    onError: (error: Error) => {
      const errorMessage = error.message || 'Failed to redeem code. Please try again.';
      setRedemptionResult({
        success: false,
        message: errorMessage
      });
      toast({
        title: "Redemption Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a redemption code",
        variant: "destructive",
      });
      return;
    }
    setRedemptionResult(null);
    redeemMutation.mutate(code.trim().toUpperCase());
  };

  const resetForm = () => {
    setCode('');
    setRedemptionResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      {/* Header */}
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 pt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setLocation('/')}
            className="mb-4 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors text-sm"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Games
          </Button>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Gift className="w-6 h-6 text-golden mr-3" />
              <h1 className="text-3xl font-bold text-white">Redeem Code</h1>
            </div>
            <p className="text-gray-400 text-sm max-w-2xl mx-auto">
              Enter your redemption code to claim Gold Credits, Sweeps Cash, or special bonuses
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Redemption Form */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">Enter Redemption Code</CardTitle>
              <CardDescription className="text-sm">
                Have a promotional code? Enter it here to claim your rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!redemptionResult && (
                <form onSubmit={handleRedeem} className="space-y-6">
                  <div>
                    <Label htmlFor="redemption-code" className="text-white text-sm">Redemption Code</Label>
                    <Input
                      id="redemption-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Enter your code here"
                      className="bg-gray-700 border-gray-600 text-white mt-2 font-mono text-sm"
                      data-testid="input-redemption-code"
                      disabled={redeemMutation.isPending}
                      maxLength={50}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Codes are not case-sensitive
                    </p>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full bg-golden hover:bg-golden/90 text-black py-3 text-sm font-semibold"
                    disabled={redeemMutation.isPending || !code.trim()}
                    data-testid="button-redeem-code"
                  >
                    {redeemMutation.isPending ? (
                      <>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        Redeeming...
                      </>
                    ) : (
                      <>
                        <Gift className="w-5 h-5 mr-2" />
                        Redeem Code
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Success Result */}
              {redemptionResult?.success && (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="rounded-full bg-green-500 p-4">
                      <Check className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Code Redeemed Successfully!</h3>
                    <p className="text-gray-300 text-sm mb-4">{redemptionResult.message}</p>
                    
                    {redemptionResult.rewards && (
                      <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-white text-base mb-2">Rewards Received:</h4>
                        {redemptionResult.rewards.gcCredited && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 text-sm">Gold Credits:</span>
                            <span className="text-golden font-bold text-base">
                              +{redemptionResult.rewards.gcCredited.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {redemptionResult.rewards.scCredited && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 text-sm">Sweeps Cash:</span>
                            <span className="text-purple-400 font-bold text-base">
                              +{redemptionResult.rewards.scCredited.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {redemptionResult.rewards.bonusCreated && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 text-sm">Bonus Created:</span>
                            <span className="text-green-400 font-bold text-base">✓</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      onClick={resetForm}
                      variant="outline"
                      className="flex-1 text-sm"
                      data-testid="button-redeem-another"
                    >
                      Redeem Another Code
                    </Button>
                    <Button 
                      onClick={() => setLocation('/')}
                      className="flex-1 bg-golden hover:bg-golden/90 text-black text-sm"
                      data-testid="button-start-playing"
                    >
                      Start Playing
                    </Button>
                  </div>
                </div>
              )}

              {/* Error Result */}
              {redemptionResult && !redemptionResult.success && (
                <div className="text-center space-y-4">
                  <Alert className="border-red-500/50 bg-red-500/10">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <AlertDescription className="text-red-300 text-sm">
                      {redemptionResult.message}
                    </AlertDescription>
                  </Alert>

                  <Button 
                    onClick={resetForm}
                    variant="outline"
                    className="w-full text-sm"
                    data-testid="button-try-again"
                  >
                    Try Another Code
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">How Redemption Codes Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-300">
              <div>
                <h4 className="font-semibold text-white text-base mb-2">What are Redemption Codes?</h4>
                <p className="text-sm">
                  Redemption codes are special promotional codes that give you free Gold Credits, 
                  Sweeps Cash, or special bonuses to enhance your gaming experience.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white text-base mb-2">Types of Rewards</h4>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-golden rounded-full mr-2"></div>
                    <span><strong className="text-golden">Gold Credits (GC)</strong> - For playing games</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                    <span><strong className="text-purple-400">Sweeps Cash (SC)</strong> - Can be redeemed for prizes</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span><strong className="text-green-400">Bonuses</strong> - Special deposit bonuses</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white text-base mb-2">Where to Find Codes</h4>
                <ul className="text-sm space-y-1">
                  <li>• Social media promotions</li>
                  <li>• Email newsletters</li>
                  <li>• Special events and tournaments</li>
                  <li>• VIP member exclusive codes</li>
                </ul>
              </div>

              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-400">
                  <strong>Note:</strong> Each code has usage limits and may expire. 
                  Some codes are limited to one use per account.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}