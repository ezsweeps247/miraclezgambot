import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Shield, Lock, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function SelfExclusion() {
  const [exclusionType, setExclusionType] = useState<'temporary' | 'permanent'>('temporary');
  const [duration, setDuration] = useState('30');
  const [reason, setReason] = useState('');
  const { toast } = useToast();

  const selfExclusionMutation = useMutation({
    mutationFn: async (data: { type: string; duration?: number; reason: string }) => {
      const response = await apiRequest('POST', '/api/self-exclusion', data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Self-Exclusion Activated',
        description: exclusionType === 'permanent' 
          ? 'Your account has been permanently closed.' 
          : `Your account is now suspended for ${duration} days.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process self-exclusion request',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    selfExclusionMutation.mutate({
      type: exclusionType,
      duration: exclusionType === 'temporary' ? parseInt(duration) : undefined,
      reason,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-[10px] font-bold mb-4">Self-Exclusion</h1>
          <p className="text-muted-foreground text-[10px]">
            Take control of your gaming experience with our self-exclusion tools
          </p>
        </div>

        <div className="space-y-6">
          {/* What is Self-Exclusion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[10px] flex items-center gap-2">
                <Shield className=" text-[#D4AF37]"style={{width: '3px', height: '3px'}} />
                What is Self-Exclusion?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Self-exclusion is a responsible gaming tool that allows you to voluntarily restrict your access 
                to the Miraclez Gaming platform for a specified period or permanently. This helps you take a 
                break if you feel your gaming is becoming problematic.
              </p>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[10px] flex items-center gap-2">
                <Clock className=" text-[#D4AF37]"style={{width: '3px', height: '3px'}} />
                How Self-Exclusion Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-[10px] font-semibold mb-2">Temporary Self-Exclusion</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Choose a period from 1 day to 365 days</li>
                  <li>Your account will be locked during this time</li>
                  <li>You cannot access games or make purchases</li>
                  <li>The exclusion cannot be reversed once activated</li>
                  <li>Your account will automatically reopen after the period expires</li>
                </ul>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold mb-2">Permanent Closure</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Your account will be permanently closed</li>
                  <li>All Gold Coins and Social Coins will be forfeited</li>
                  <li>Any unexchanged prizes will be lost</li>
                  <li>This action is irreversible</li>
                  <li>You will not be able to create a new account</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Self-Exclusion Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[10px] flex items-center gap-2">
                <Lock className=" text-[#D4AF37]"style={{width: '3px', height: '3px'}} />
                Request Self-Exclusion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-[10px] font-semibold mb-3 block">Exclusion Type</Label>
                  <RadioGroup value={exclusionType} onValueChange={(value: any) => setExclusionType(value)}>
                    <div className="flex items-center space-x-2 mb-3">
                      <RadioGroupItem value="temporary" id="temporary" data-testid="radio-temporary" />
                      <Label htmlFor="temporary" className="font-normal cursor-pointer">
                        Temporary Self-Exclusion
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="permanent" id="permanent" data-testid="radio-permanent" />
                      <Label htmlFor="permanent" className="font-normal cursor-pointer">
                        Permanent Account Closure
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {exclusionType === 'temporary' && (
                  <div>
                    <Label htmlFor="duration" className="text-[10px] font-semibold mb-3 block">
                      Exclusion Duration
                    </Label>
                    <RadioGroup value={duration} onValueChange={setDuration}>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1" id="1day" data-testid="radio-1-day" />
                          <Label htmlFor="1day" className="font-normal cursor-pointer">1 Day</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="7" id="7days" data-testid="radio-7-days" />
                          <Label htmlFor="7days" className="font-normal cursor-pointer">7 Days</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="30" id="30days" data-testid="radio-30-days" />
                          <Label htmlFor="30days" className="font-normal cursor-pointer">30 Days</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="90" id="90days" data-testid="radio-90-days" />
                          <Label htmlFor="90days" className="font-normal cursor-pointer">90 Days</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="180" id="180days" data-testid="radio-180-days" />
                          <Label htmlFor="180days" className="font-normal cursor-pointer">180 Days</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="365" id="365days" data-testid="radio-365-days" />
                          <Label htmlFor="365days" className="font-normal cursor-pointer">365 Days (1 Year)</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div>
                  <Label htmlFor="reason" className="text-[10px] font-semibold mb-3 block">
                    Reason (Optional)
                  </Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Tell us why you're choosing self-exclusion..."
                    className="min-h-[100px]"
                    data-testid="textarea-reason"
                  />
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className=" text-orange-500 flex-shrink-0 mt-0.5"style={{width: '3px', height: '3px'}} />
                    <div className="space-y-2">
                      <p className="font-semibold text-orange-500">Important Notice</p>
                      <p className="text-[8px] text-muted-foreground">
                        {exclusionType === 'permanent' 
                          ? 'Permanent closure is irreversible. All coins and prizes will be forfeited. You will not be able to reactivate your account or create a new one.'
                          : 'Once activated, temporary self-exclusion cannot be reversed or shortened. Your account will remain locked for the full duration you select.'}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={selfExclusionMutation.isPending}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-black"
                  data-testid="button-activate-exclusion"
                >
                  <Lock style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                  {selfExclusionMutation.isPending 
                    ? 'Processing...' 
                    : exclusionType === 'permanent' 
                      ? 'Permanently Close Account' 
                      : `Activate ${duration}-Day Self-Exclusion`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Additional Support */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[10px] flex items-center gap-2">
                <CheckCircle className=" text-[#D4AF37]"style={{width: '3px', height: '3px'}} />
                Need More Help?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                If you're struggling with problem gaming, professional help is available:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>
                  <strong>National Council on Problem Gambling:</strong>{' '}
                  <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline">
                    www.ncpgambling.org
                  </a>
                  {' | '}1-800-522-4700
                </li>
                <li>
                  <strong>Gamblers Anonymous:</strong>{' '}
                  <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline">
                    www.gamblersanonymous.org
                  </a>
                </li>
                <li>
                  <strong>Responsible Gambling Council:</strong>{' '}
                  <a href="https://www.responsiblegambling.org" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] hover:underline">
                    www.responsiblegambling.org
                  </a>
                </li>
              </ul>
              <p className="text-muted-foreground mt-4">
                You can also view our complete{' '}
                <Link href="/responsible-gaming">
                  <span className="text-[#D4AF37] hover:underline cursor-pointer">Responsible Gaming Policy</span>
                </Link>
                {' '}for more information about staying safe while gaming.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
