import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Vault as VaultIcon, Clock, TrendingUp, TrendingDown, Plus, Calendar, Coins } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, addHours } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface VaultEntry {
  id: string;
  amount: number;
  currency: 'GC' | 'SC';
  status: 'STASHED' | 'RELEASED' | 'CANCELLED';
  autoReleaseAt: string | null;
  releasedAt: string | null;
  description: string | null;
  createdAt: string;
}

export default function Vault() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [stashAmount, setStashAmount] = useState("");
  const [stashCurrency, setStashCurrency] = useState<'GC' | 'SC'>('GC');
  const [description, setDescription] = useState("");
  const [autoReleaseType, setAutoReleaseType] = useState<string>("");
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");

  // Fetch user balance
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/balance'],
  });

  // Fetch vault entries
  const { data: vaultEntries = [], isLoading: vaultLoading, refetch: refetchVault } = useQuery<VaultEntry[]>({
    queryKey: ['/api/vault/entries'],
    enabled: !!user
  });

  // Stash mutation
  const stashMutation = useMutation({
    mutationFn: async (data: {
      amount: number;
      currency: 'GC' | 'SC';
      description?: string;
      autoReleaseAt?: string;
    }) => {
      return await apiRequest('POST', '/api/vault/stash', data);
    },
    onSuccess: () => {
      toast({
        title: "Credits Stashed",
        description: "Your credits have been safely stashed in the vault.",
      });
      setStashAmount("");
      setDescription("");
      setAutoReleaseType("");
      setCustomDate("");
      setCustomTime("");
      refetchVault();
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stash credits.",
        variant: "destructive",
      });
    },
  });

  // Release mutation
  const releaseMutation = useMutation({
    mutationFn: async (entryId: string) => {
      return await apiRequest('POST', `/api/vault/release/${entryId}`);
    },
    onSuccess: () => {
      toast({
        title: "Credits Released",
        description: "Credits have been released back to your wallet.",
      });
      refetchVault();
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to release credits.",
        variant: "destructive",
      });
    },
  });

  const calculateAutoReleaseDate = () => {
    const now = new Date();
    switch (autoReleaseType) {
      case '1h': return addHours(now, 1);
      case '6h': return addHours(now, 6);
      case '12h': return addHours(now, 12);
      case '1d': return addDays(now, 1);
      case '3d': return addDays(now, 3);
      case '7d': return addDays(now, 7);
      case 'custom':
        if (customDate && customTime) {
          return new Date(`${customDate}T${customTime}`);
        }
        return null;
      default: return null;
    }
  };

  const handleStash = () => {
    const amount = parseFloat(stashAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to stash.",
        variant: "destructive",
      });
      return;
    }

    const autoReleaseAt = calculateAutoReleaseDate();

    stashMutation.mutate({
      amount,
      currency: stashCurrency,
      description: description || undefined,
      autoReleaseAt: autoReleaseAt?.toISOString(),
    });
  };

  const handleRelease = (entryId: string) => {
    releaseMutation.mutate(entryId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'STASHED':
        return <Badge className="text-[8px] bg-blue-500/20 text-blue-400 border-blue-500/30">Stashed</Badge>;
      case 'RELEASED':
        return <Badge className="text-[8px] bg-green-500/20 text-green-400 border-green-500/30">Released</Badge>;
      case 'CANCELLED':
        return <Badge className="text-[8px] bg-red-500/20 text-red-400 border-red-500/30">Cancelled</Badge>;
      default:
        return <Badge className="text-[8px] bg-gray-500/20 text-gray-400 border-gray-500/30">Unknown</Badge>;
    }
  };

  const getAvailableBalance = () => {
    if (!balance) return 0;
    return stashCurrency === 'SC' ? (balance as any).sweepsCashTotal : (balance as any).available / 100;
  };

  const totalStashed = vaultEntries
    .filter(entry => entry.status === 'STASHED')
    .reduce((total, entry) => total + Number(entry.amount), 0);

  if (balanceLoading || vaultLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-[10px] text-white">Loading vault...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/10 mr-4"
            data-testid="button-back"
          >
            <ArrowLeft style={{width: '3px', height: '3px'}} />
          </Button>
          <div className="flex items-center">
            <VaultIcon style={{width: '3.5px', height: '3.5px'}} className="text-golden mr-3" />
            <h1 className="text-[10px] font-bold text-white">Vault</h1>
          </div>
        </div>

        {/* Description */}
        <Card className="bg-black/40 backdrop-blur-xl border-white/10 mb-6">
          <CardContent className="p-6">
            <p className="text-gray-300 text-center">
              Safely store your credits in the vault with optional auto-release scheduling. 
              Set a specific time for your credits to automatically return to your wallet.
            </p>
          </CardContent>
        </Card>

        {/* Vault Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Coins style={{width: '3px', height: '3px'}} className="mr-2 text-golden" />
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold text-golden">
                {getAvailableBalance().toFixed(2)} {stashCurrency}
              </div>
              <p className="text-gray-400 text-[8px] mt-1">
                Available to stash
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <VaultIcon style={{width: '3px', height: '3px'}} className="mr-2 text-golden" />
                Total Stashed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold text-blue-400">
                {totalStashed.toFixed(2)} Credits
              </div>
              <p className="text-gray-400 text-[8px] mt-1">
                Safely stored in vault
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stash Form */}
        <Card className="bg-black/40 backdrop-blur-xl border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Plus style={{width: '3px', height: '3px'}} className="mr-2 text-golden" />
              Stash Credits
            </CardTitle>
            <CardDescription className="text-gray-400">
              Move credits from your wallet to the vault for safekeeping
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount" className="text-white">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={stashAmount}
                  onChange={(e) => setStashAmount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                  data-testid="input-stash-amount"
                />
              </div>
              <div>
                <Label htmlFor="currency" className="text-white">Currency</Label>
                <Select value={stashCurrency} onValueChange={(value: 'GC' | 'SC') => setStashCurrency(value)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10">
                    <SelectItem value="GC">Gold Credits (GC)</SelectItem>
                    <SelectItem value="SC">Sweeps Cash (SC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-white">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add a note about this stash..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                data-testid="input-description"
              />
            </div>

            <div>
              <Label htmlFor="auto-release" className="text-white">Auto-Release Schedule</Label>
              <Select value={autoReleaseType} onValueChange={setAutoReleaseType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-auto-release">
                  <SelectValue placeholder="Select auto-release time" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  <SelectItem value="none">No auto-release</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="6h">6 Hours</SelectItem>
                  <SelectItem value="12h">12 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                  <SelectItem value="3d">3 Days</SelectItem>
                  <SelectItem value="7d">1 Week</SelectItem>
                  <SelectItem value="custom">Custom Date & Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {autoReleaseType === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="custom-date" className="text-white">Date</Label>
                  <Input
                    id="custom-date"
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="bg-white/5 border-white/10 text-white"
                    data-testid="input-custom-date"
                  />
                </div>
                <div>
                  <Label htmlFor="custom-time" className="text-white">Time</Label>
                  <Input
                    id="custom-time"
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    data-testid="input-custom-time"
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleStash}
              disabled={stashMutation.isPending || !stashAmount}
              className="w-full bg-gradient-to-r from-golden to-yellow-400 hover:from-yellow-400 hover:to-golden text-black font-semibold"
              data-testid="button-stash-credits"
            >
              {stashMutation.isPending ? 'Stashing...' : 'Stash Credits'}
            </Button>
          </CardContent>
        </Card>

        {/* Vault Entries */}
        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Clock style={{width: '3px', height: '3px'}} className="mr-2 text-golden" />
              Vault History
            </CardTitle>
            <CardDescription className="text-gray-400">
              Your stashed credits and their release schedules
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vaultEntries.length === 0 ? (
              <div className="text-center py-8">
                <VaultIcon style={{width: '3.5px', height: '3.5px'}} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-[10px] font-semibold text-white mb-2">No Credits Stashed</h3>
                <p className="text-gray-400">
                  You haven't stashed any credits yet. Use the form above to start.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {vaultEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-white/5 rounded-lg">
                          {entry.status === 'STASHED' ? (
                            <TrendingDown style={{width: '3.5px', height: '3.5px'}} className="text-blue-400" />
                          ) : (
                            <TrendingUp style={{width: '3.5px', height: '3.5px'}} className="text-green-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-white font-medium">
                            {parseFloat(entry.amount).toFixed(2)} {entry.currency}
                          </h3>
                          {entry.description && (
                            <p className="text-gray-400 text-[8px]">{entry.description}</p>
                          )}
                          <p className="text-gray-500 text-[8px]">
                            Stashed: {format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          {entry.autoReleaseAt && entry.status === 'STASHED' && (
                            <p className="text-golden text-[8px]">
                              Auto-release: {format(new Date(entry.autoReleaseAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          )}
                          {entry.releasedAt && (
                            <p className="text-green-400 text-[8px]">
                              Released: {format(new Date(entry.releasedAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(entry.status)}
                        {entry.status === 'STASHED' && (
                          <Button
                            size="sm"
                            onClick={() => handleRelease(entry.id)}
                            disabled={releaseMutation.isPending}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                            data-testid={`button-release-${entry.id}`}
                          >
                            Release Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}