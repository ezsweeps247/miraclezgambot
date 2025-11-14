import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  MapPin, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Globe,
  Activity,
  Clock
} from "lucide-react";

interface IPCheckResult {
  ip: string;
  allowed: boolean;
  location?: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
  };
  restrictions?: {
    maxBet?: number;
    maxDeposit?: number;
    requiresKYC?: boolean;
  };
  reason?: string;
  timestamp: string;
}

interface JurisdictionStatus {
  allowed: boolean;
  location?: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
  };
  restrictions?: {
    maxBet?: number;
    maxDeposit?: number;
    requiresKYC?: boolean;
  };
  reason?: string;
  timestamp: string;
}

export default function GeofencingTest() {
  const [testIP, setTestIP] = useState('');
  const { toast } = useToast();

  // Get current jurisdiction status
  const { data: currentStatus, refetch: refetchStatus } = useQuery<JurisdictionStatus>({
    queryKey: ['/api/jurisdiction/status'],
  });

  // Test IP mutation
  const testIPMutation = useMutation({
    mutationFn: async (ip: string) => {
      const response = await apiRequest('POST', '/api/jurisdiction/check-ip', { ip });
      return response.json() as Promise<IPCheckResult>;
    },
    onSuccess: (data) => {
      toast({
        title: "IP Test Complete",
        description: `IP ${data.ip} is ${data.allowed ? 'allowed' : 'blocked'} from ${data.location?.country || 'Unknown'}`,
        variant: data.allowed ? "default" : "destructive"
      });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleTestIP = () => {
    if (!testIP.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid IP address",
        variant: "destructive"
      });
      return;
    }
    testIPMutation.mutate(testIP.trim());
  };

  const formatRestrictions = (restrictions?: JurisdictionStatus['restrictions']) => {
    if (!restrictions) return 'None';
    
    const items = [];
    if (restrictions.maxBet) items.push(`Max Bet: $${restrictions.maxBet}`);
    if (restrictions.maxDeposit) items.push(`Max Deposit: $${restrictions.maxDeposit}`);
    if (restrictions.requiresKYC) items.push('KYC Required');
    
    return items.length > 0 ? items.join(', ') : 'None';
  };

  return (
    <div className="space-y-6">
      <Card className="bg-casino-card border-casino-accent/20">
        <CardHeader>
          <CardTitle className="text-[10px] text-white flex items-center">
            <Activity style={{width: '3px', height: '3px'}} className="mr-2" />
            Geofencing Testing Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="current" className="space-y-4">
            <TabsList className="bg-casino-dark">
              <TabsTrigger value="current" className="data-[state=active]:bg-casino-primary">
                Current Status
              </TabsTrigger>
              <TabsTrigger value="test" className="data-[state=active]:bg-casino-primary">
                Test IP Address
              </TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-4">
              {currentStatus && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="bg-casino-dark border-casino-accent/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-casino-text">Access Status</span>
                        <Badge 
                          variant={currentStatus.allowed ? "default" : "destructive"}
                          className={currentStatus.allowed ? "bg-green-600" : "bg-red-600"}
                        >
                          {currentStatus.allowed ? (
                            <CheckCircle style={{width: '3px', height: '3px'}} className="mr-1" />
                          ) : (
                            <AlertTriangle style={{width: '3px', height: '3px'}} className="mr-1" />
                          )}
                          {currentStatus.allowed ? 'ALLOWED' : 'BLOCKED'}
                        </Badge>
                      </div>
                      
                      {currentStatus.location && (
                        <div className="space-y-1 text-[8px]">
                          <div className="text-[10px] flex items-center text-white">
                            <MapPin style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                            {currentStatus.location.country}
                          </div>
                          <div className="text-casino-text">
                            {currentStatus.location.region && `${currentStatus.location.region}, `}
                            {currentStatus.location.city}
                          </div>
                          <div className="text-casino-text">
                            Code: {currentStatus.location.countryCode}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-casino-dark border-casino-accent/30">
                    <CardContent className="pt-4">
                      <div className="mb-2">
                        <span className="text-casino-text">Restrictions</span>
                      </div>
                      <div className="text-white text-[8px]">
                        {formatRestrictions(currentStatus.restrictions)}
                      </div>
                      
                      {currentStatus.restrictions?.requiresKYC && (
                        <Alert className="mt-3 bg-yellow-500/10 border-yellow-500/20">
                          <Shield style={{width: '3px', height: '3px'}} className="" />
                          <AlertDescription className="text-yellow-200">
                            KYC verification required for this jurisdiction
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {currentStatus?.reason && (
                <Alert className="bg-casino-dark border-casino-accent/30">
                  <AlertTriangle style={{width: '3px', height: '3px'}} className="" />
                  <AlertDescription className="text-casino-text">
                    {currentStatus.reason}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center text-casino-text text-[8px]">
                  <Clock style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                  Last checked: {currentStatus ? new Date(currentStatus.timestamp).toLocaleString() : 'Never'}
                </div>
                <Button 
                  onClick={() => refetchStatus()}
                  size="sm"
                  variant="outline"
                >
                  Refresh Status
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-ip" className="text-white">
                    Test IP Address
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="test-ip"
                      value={testIP}
                      onChange={(e) => setTestIP(e.target.value)}
                      placeholder="Enter IP address (e.g., 8.8.8.8)"
                      className="bg-casino-dark border-casino-accent/30 text-white"
                    />
                    <Button 
                      onClick={handleTestIP}
                      disabled={testIPMutation.isPending}
                      className="bg-casino-primary hover:bg-casino-primary/90"
                    >
                      {testIPMutation.isPending ? (
                        "Testing..."
                      ) : (
                        <>
                          <Search style={{width: '3.5px', height: '3.5px'}} className="mr-2" />
                          Test
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {testIPMutation.data && (
                  <Card className="bg-casino-dark border-casino-accent/30">
                    <CardHeader>
                      <CardTitle className="text-white text-[10px] flex items-center">
                        <Globe style={{width: '3px', height: '3px'}} className="mr-2" />
                        Test Results for {testIPMutation.data.ip}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-casino-text">Status</span>
                        <Badge 
                          variant={testIPMutation.data.allowed ? "default" : "destructive"}
                          className={testIPMutation.data.allowed ? "bg-green-600" : "bg-red-600"}
                        >
                          {testIPMutation.data.allowed ? 'ALLOWED' : 'BLOCKED'}
                        </Badge>
                      </div>

                      {testIPMutation.data.location && (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-casino-text">Country</span>
                            <span className="text-white">{testIPMutation.data.location.country}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-casino-text">Region</span>
                            <span className="text-white">{testIPMutation.data.location.region || 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-casino-text">City</span>
                            <span className="text-white">{testIPMutation.data.location.city || 'Unknown'}</span>
                          </div>
                        </div>
                      )}

                      {testIPMutation.data.restrictions && (
                        <div className="space-y-2">
                          <span className="text-casino-text">Restrictions</span>
                          <div className="text-white text-[8px]">
                            {formatRestrictions(testIPMutation.data.restrictions)}
                          </div>
                        </div>
                      )}

                      {testIPMutation.data.reason && (
                        <Alert className="bg-red-500/10 border-red-500/20">
                          <AlertTriangle style={{width: '3px', height: '3px'}} className="" />
                          <AlertDescription className="text-red-200">
                            {testIPMutation.data.reason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="text-casino-text text-[8px]">
                  💡 This tool helps test jurisdiction restrictions for different IP addresses. 
                  Use it to verify that geofencing works correctly for various locations.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}